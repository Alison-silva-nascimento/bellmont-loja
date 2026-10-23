begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(33);

select has_function('public', 'get_public_variant_availability', array[]::text[], 'public availability RPC exists');
select has_function('availability_private', 'public_variant_availability', array[]::text[], 'isolated availability helper exists');
select function_privs_are('public', 'get_public_variant_availability', array[]::text[], 'anon', array['EXECUTE'], 'anon can execute the coarse availability RPC');
select function_privs_are('public', 'get_public_variant_availability', array[]::text[], 'authenticated', array['EXECUTE'], 'authenticated can execute the coarse availability RPC');
select ok(
  not exists (
    select 1
    from pg_proc
    cross join lateral aclexplode(coalesce(pg_proc.proacl, acldefault('f', pg_proc.proowner))) as privilege
    where pg_proc.oid = 'public.get_public_variant_availability()'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'public wrapper has no EXECUTE inherited through PUBLIC'
);
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon has no USAGE on the administrative private schema');
select ok(not has_function_privilege('anon', 'private.is_admin()', 'execute'), 'anon cannot execute the administrative is_admin helper directly');
select ok(
  has_schema_privilege('anon', 'availability_private', 'usage')
  and has_function_privilege('anon', 'availability_private.public_variant_availability()', 'execute'),
  'anon has only the privileges required to reach the isolated safe helper'
);
select ok(
  has_schema_privilege('authenticated', 'availability_private', 'usage')
  and has_function_privilege('authenticated', 'availability_private.public_variant_availability()', 'execute'),
  'authenticated has only the privileges required to reach the isolated safe helper'
);
select results_eq(
  $$select count(*)::bigint from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'availability_private'$$,
  array[1::bigint], 'dedicated schema contains only the safe availability helper'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.get_public_variant_availability()'::regprocedure),
  'public wrapper is SECURITY INVOKER'
);
select ok(
  position('security definer' in lower(pg_get_functiondef('availability_private.public_variant_availability()'::regprocedure))) > 0
  and position('set search_path to ''''' in lower(pg_get_functiondef('availability_private.public_variant_availability()'::regprocedure))) > 0,
  'isolated helper is SECURITY DEFINER with an empty search path'
);
select ok(not has_table_privilege('anon', 'public.inventory', 'select'), 'anon cannot read inventory');
select ok(not has_table_privilege('anon', 'public.inventory_movements', 'select'), 'anon cannot read movements');
select ok(not has_table_privilege('anon', 'public.inventory', 'insert,update,delete'), 'anon cannot mutate inventory');

insert into public.products (code, slug, name, brand, category, status)
values
  ('TEST-PUBLIC-ACTIVE', 'test-public-active', 'Public active', 'bellmont', 'streetwear', 'active'),
  ('TEST-PUBLIC-DRAFT', 'test-public-draft', 'Public draft', 'bellmont', 'streetwear', 'draft'),
  ('TEST-PUBLIC-ARCHIVED', 'test-public-archived', 'Public archived', 'bellmont', 'streetwear', 'archived')
on conflict (code) do update set status = excluded.status;

insert into public.products (code, slug, name, brand, category, status)
values ('TEST-FIXTURE-01', 'test-public-fixture', 'Technical fixture', 'bellmont', 'streetwear', 'active')
on conflict (code) do update set status = excluded.status;

insert into public.product_variants (product_id, sku, size, is_active)
select id, code || '-ACTIVE', 'M', true from public.products where code like 'TEST-PUBLIC-%'
union all
select id, 'TEST-PUBLIC-INACTIVE-VARIANT', 'G', false from public.products where code = 'TEST-PUBLIC-ACTIVE'
union all
select id, 'TEST-FIXTURE-01-ACTIVE', 'M', true from public.products where code = 'TEST-FIXTURE-01'
on conflict (sku) do update set product_id = excluded.product_id, is_active = excluded.is_active;

insert into public.inventory (variant_id, quantity_on_hand, quantity_reserved)
select id, 5, 2 from public.product_variants where sku = 'TEST-PUBLIC-ACTIVE-ACTIVE'
on conflict (variant_id) do update set
  quantity_on_hand = excluded.quantity_on_hand,
  quantity_reserved = excluded.quantity_reserved;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select product_code, variant_sku, available, availability_status from public.get_public_variant_availability() where product_code = 'TEST-PUBLIC-ACTIVE'$$,
  $$values ('TEST-PUBLIC-ACTIVE'::text, 'TEST-PUBLIC-ACTIVE-ACTIVE'::text, true, 'available'::text)$$,
  'anon receives available status without a quantity'
);
select results_eq(
  $$select count(*)::bigint from public.get_public_variant_availability() where product_code in ('TEST-PUBLIC-DRAFT', 'TEST-PUBLIC-ARCHIVED')$$,
  array[0::bigint], 'draft and archived products are absent'
);
select results_eq(
  $$select count(*)::bigint from public.get_public_variant_availability() where product_code = 'TEST-FIXTURE-01'$$,
  array[0::bigint], 'technical fixture is absent'
);
select results_eq(
  $$select count(*)::bigint from public.get_public_variant_availability() where variant_sku = 'TEST-PUBLIC-INACTIVE-VARIANT'$$,
  array[0::bigint], 'inactive variants are absent'
);
select is(
  pg_get_function_result('public.get_public_variant_availability()'::regprocedure),
  'TABLE(product_code text, variant_sku text, available boolean, availability_status text)',
  'RPC exposes only identifiers and coarse availability'
);

reset role;
update public.inventory set quantity_reserved = quantity_on_hand
where variant_id = (select id from public.product_variants where sku = 'TEST-PUBLIC-ACTIVE-ACTIVE');
set local role anon;
select results_eq(
  $$select available, availability_status from public.get_public_variant_availability() where variant_sku = 'TEST-PUBLIC-ACTIVE-ACTIVE'$$,
  $$values (false, 'out_of_stock'::text)$$, 'fully reserved inventory is out of stock'
);

reset role;
delete from public.inventory where variant_id = (select id from public.product_variants where sku = 'TEST-PUBLIC-ACTIVE-ACTIVE');
set local role anon;
select results_eq(
  $$select available, availability_status from public.get_public_variant_availability() where variant_sku = 'TEST-PUBLIC-ACTIVE-ACTIVE'$$,
  $$values (false, 'unconfirmed'::text)$$, 'missing inventory is unconfirmed rather than available'
);
reset role;
select ok(
  not exists (
    select 1 from information_schema.parameters
    where specific_schema = 'public'
      and specific_name like 'get_public_variant_availability%'
      and parameter_name in ('quantity_on_hand', 'quantity_reserved', 'available_quantity')
  ), 'RPC metadata contains no exact quantity field'
);
select function_privs_are('availability_private', 'public_variant_availability', array[]::text[], 'anon', array['EXECUTE'], 'anon can execute only the safe isolated projection used by the wrapper');
select function_privs_are('availability_private', 'public_variant_availability', array[]::text[], 'authenticated', array['EXECUTE'], 'authenticated can execute only the safe isolated projection used by the wrapper');
select ok(
  not exists (
    select 1
    from pg_proc
    cross join lateral aclexplode(coalesce(pg_proc.proacl, acldefault('f', pg_proc.proowner))) as privilege
    where pg_proc.oid = 'availability_private.public_variant_availability()'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'isolated helper has no EXECUTE inherited through PUBLIC'
);
select ok(
  not has_function_privilege('anon', 'private.is_admin()', 'execute'),
  'PUBLIC inheritance does not make the administrative helper executable by anon'
);
select ok(not has_function_privilege('service_role', 'public.get_public_variant_availability()', 'execute'), 'service_role receives no unnecessary explicit RPC grant');
select ok(
  position('quantity_on_hand' in pg_get_function_result('public.get_public_variant_availability()'::regprocedure)) = 0
  and position('quantity_reserved' in pg_get_function_result('public.get_public_variant_availability()'::regprocedure)) = 0,
  'function result does not describe private quantity columns'
);
select ok(position('products.status = ''active''' in pg_get_functiondef('availability_private.public_variant_availability()'::regprocedure)) > 0, 'helper filters active products internally');
select ok(position('product_variants.is_active' in pg_get_functiondef('availability_private.public_variant_availability()'::regprocedure)) > 0, 'helper filters active variants internally');
select ok(position('products.code <> ''TEST-FIXTURE-01''' in pg_get_functiondef('availability_private.public_variant_availability()'::regprocedure)) > 0, 'helper excludes the technical fixture internally');
select ok(
  not has_schema_privilege('anon', 'private', 'usage')
  and not has_table_privilege('anon', 'public.inventory', 'select')
  and not has_table_privilege('anon', 'public.inventory_movements', 'select'),
  'public availability grants do not broaden access to administrative or inventory data'
);

select * from finish();
rollback;
