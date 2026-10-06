begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(21);

select has_table('public', 'products', 'products table exists');
select has_table('public', 'product_variants', 'product_variants table exists');
select has_table('public', 'inventory', 'inventory table exists');
select has_table('public', 'product_images', 'product_images table exists');
select has_table('public', 'inventory_movements', 'inventory_movements table exists');

select ok((select relrowsecurity from pg_class where oid = 'public.products'::regclass), 'products has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.product_variants'::regclass), 'product_variants has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.inventory'::regclass), 'inventory has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.product_images'::regclass), 'product_images has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.inventory_movements'::regclass), 'inventory_movements has RLS enabled');

select policies_are(
  'public', 'products',
  array['products_public_read', 'products_admin_read', 'products_admin_insert', 'products_admin_update', 'products_admin_delete'],
  'products has only the expected policies'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-test@bellmont.invalid', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-test@bellmont.invalid', '', now(), now(), now());

insert into private.admin_users (user_id)
values ('10000000-0000-0000-0000-000000000001');

insert into public.products (code, slug, name, brand, category, status)
values
  ('TEST-ACTIVE', 'test-active', 'Test Active', 'bellmont', 'streetwear', 'active'),
  ('TEST-DRAFT', 'test-draft', 'Test Draft', 'bellmont', 'streetwear', 'draft');

insert into public.product_variants (product_id, sku, size)
select id, 'TEST-ACTIVE-M', 'M' from public.products where code = 'TEST-ACTIVE';

insert into public.inventory (variant_id, quantity_on_hand)
select id, 5 from public.product_variants where sku = 'TEST-ACTIVE-M';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  $$select code from public.products order by code$$,
  array['TEST-ACTIVE'::text],
  'anon reads only active products'
);
select throws_ok(
  $$insert into public.products (slug, name, brand, category) values ('anon-write', 'Anon Write', 'bellmont', 'streetwear')$$,
  '42501', null, 'anon cannot insert products'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select results_eq(
  $$select code from public.products order by code$$,
  array['TEST-ACTIVE'::text],
  'authenticated non-admin reads only active products'
);
select throws_ok(
  $$insert into public.products (slug, name, brand, category) values ('user-write', 'User Write', 'bellmont', 'streetwear')$$,
  '42501', null, 'authenticated non-admin cannot insert products'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.products (code, slug, name, brand, category, status) values ('TEST-ADMIN', 'test-admin', 'Test Admin', 'bellmont', 'streetwear', 'draft')$$,
  'admin can insert a draft product'
);
select results_eq(
  $$select count(*)::bigint from public.products where status = 'draft'$$,
  array[2::bigint],
  'admin can read draft products'
);
select throws_ok(
  $$update public.inventory set quantity_on_hand = -1 where variant_id = (select id from public.product_variants where sku = 'TEST-ACTIVE-M')$$,
  '23514', null, 'negative stock is rejected by a database constraint'
);
select throws_ok(
  $$update public.inventory set quantity_reserved = quantity_on_hand + 1 where variant_id = (select id from public.product_variants where sku = 'TEST-ACTIVE-M')$$,
  '23514', null, 'reserved stock cannot exceed on-hand stock'
);

reset role;
set local role service_role;
select throws_ok(
  $$update public.inventory_movements set note = 'tampered'$$,
  'P0001', 'inventory_movements is append-only',
  'inventory movement history cannot be updated'
);
select ok(
  not has_table_privilege('anon', 'public.inventory_movements', 'select'),
  'anon has no access to inventory movement history'
);

select * from finish();
rollback;
