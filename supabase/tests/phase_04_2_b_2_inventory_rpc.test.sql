begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(37);

select has_function(
  'public', 'apply_inventory_movement', array['bigint', 'bigint', 'text'],
  'atomic inventory RPC exists'
);
select function_privs_are(
  'public', 'apply_inventory_movement', array['bigint', 'bigint', 'text'],
  'authenticated', array['EXECUTE'],
  'authenticated can execute inventory RPC'
);
select ok(
  not has_function_privilege('anon', 'public.apply_inventory_movement(bigint,bigint,text)', 'execute'),
  'anon cannot execute inventory RPC'
);
select ok(
  not has_table_privilege('anon', 'public.inventory', 'select'),
  'anon cannot read exact inventory quantities'
);
select ok(
  not has_table_privilege('anon', 'public.inventory_movements', 'select'),
  'anon cannot read inventory movements'
);
select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef('public.apply_inventory_movement(bigint,bigint,text)'::regprocedure)) > 0
  and position('for update' in lower(pg_get_functiondef('public.apply_inventory_movement(bigint,bigint,text)'::regprocedure))) > 0,
  'RPC serializes initialization and locks existing inventory rows'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inventory-admin@bellmont.invalid', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inventory-user@bellmont.invalid', '', now(), now(), now());

insert into private.admin_users (user_id)
values ('20000000-0000-0000-0000-000000000001');

insert into public.products (code, slug, name, brand, category, status)
values ('TEST-INVENTORY', 'test-inventory', 'Test Inventory', 'bellmont', 'streetwear', 'draft');

insert into public.product_variants (product_id, sku, size, color)
select id, 'TEST-INVENTORY-M', 'M', 'Branca'
from public.products where code = 'TEST-INVENTORY';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select * from public.apply_inventory_movement(1, 10, 'anon')$$,
  '42501', null, 'anon RPC call is rejected by grants'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), 10, 'non-admin')$$,
  'P0001', 'NOT_ADMIN', 'authenticated non-admin is rejected explicitly'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), 0, 'zero')$$,
  'P0001', 'INVALID_DELTA', 'zero delta is rejected'
);
select throws_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), null, 'null delta')$$,
  'P0001', 'INVALID_DELTA', 'null delta is rejected'
);
select results_eq(
  $$select count(*)::bigint from public.inventory where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  array[0::bigint], 'invalid deltas do not initialize inventory'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  array[0::bigint], 'invalid deltas create no movement'
);
select throws_ok(
  $$select * from public.apply_inventory_movement(9223372036854775807, 1, 'missing')$$,
  'P0001', 'VARIANT_NOT_FOUND', 'missing variant is rejected'
);
select throws_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), -1, 'negative initialization')$$,
  'P0001', 'INSUFFICIENT_STOCK', 'negative initialization is rejected'
);

select results_eq(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), 10, 'Entrada inicial')$$,
  $$select id, 10::bigint, 0::bigint, 10::bigint from public.product_variants where sku = 'TEST-INVENTORY-M'$$,
  'admin initializes inventory and receives the complete balance'
);
select results_eq(
  $$select quantity_on_hand, quantity_reserved from public.inventory where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  $$values (10::bigint, 0::bigint)$$,
  'initial inventory is persisted'
);
select results_eq(
  $$select movement_type, quantity_delta, quantity_after, note from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  $$values ('initial'::text, 10::bigint, 10::bigint, 'Entrada inicial'::text)$$,
  'initial movement and note are recorded once'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  array[1::bigint], 'initialization creates exactly one movement'
);

select results_eq(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), 5, 'Reposição')$$,
  $$select id, 15::bigint, 0::bigint, 15::bigint from public.product_variants where sku = 'TEST-INVENTORY-M'$$,
  'positive adjustment returns the updated balance'
);
select results_eq(
  $$select quantity_on_hand, quantity_on_hand - quantity_reserved from public.inventory where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  $$values (15::bigint, 15::bigint)$$,
  'RPC updates physical and available quantities'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  array[2::bigint], 'second operation adds exactly one movement'
);
select results_eq(
  $$select movement_type, quantity_delta, quantity_after, note from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M') order by id desc limit 1$$,
  $$values ('adjustment'::text, 5::bigint, 15::bigint, 'Reposição'::text)$$,
  'positive adjustment records its delta and note'
);

select results_eq(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), -2, 'Correção de contagem')$$,
  $$select id, 13::bigint, 0::bigint, 13::bigint from public.product_variants where sku = 'TEST-INVENTORY-M'$$,
  'valid reduction returns the updated balance'
);
select results_eq(
  $$select quantity_on_hand from public.inventory where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  array[13::bigint], 'valid reduction updates the balance'
);
select results_eq(
  $$select movement_type, quantity_delta, quantity_after, note from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M') order by id desc limit 1$$,
  $$values ('adjustment'::text, (-2)::bigint, 13::bigint, 'Correção de contagem'::text)$$,
  'reduction records its delta and note'
);
select throws_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), 9223372036854775807, 'overflow')$$,
  'P0001', 'INVALID_DELTA', 'bigint overflow is translated to invalid delta'
);
select results_eq(
  $$select quantity_on_hand from public.inventory where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  array[13::bigint], 'overflow does not change inventory'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  array[3::bigint], 'overflow creates no movement'
);
select throws_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), -20, 'invalid')$$,
  'P0001', 'INSUFFICIENT_STOCK', 'negative stock is rejected'
);

select lives_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), 1, 'Teste A')$$,
  'movement with an explicit note succeeds'
);
select lives_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), -1, null)$$,
  'following movement with a null note succeeds'
);
select results_eq(
  $$select quantity_delta, note from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M') order by id desc limit 2$$,
  $$values ((-1)::bigint, null::text), (1::bigint, 'Teste A'::text)$$,
  'null note does not reuse the previous transaction-local note'
);

update public.inventory set quantity_reserved = 8
where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M');
select throws_ok(
  $$select * from public.apply_inventory_movement((select id from public.product_variants where sku = 'TEST-INVENTORY-M'), -6, 'below reserved')$$,
  'P0001', 'BELOW_RESERVED', 'physical stock cannot fall below reserved stock'
);
select results_eq(
  $$select quantity_on_hand, quantity_reserved from public.inventory where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  $$values (13::bigint, 8::bigint)$$,
  'failed operations do not change inventory'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  array[5::bigint], 'failed operations create no movement'
);
select throws_ok(
  $$update public.inventory_movements set note = 'tampered' where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M')$$,
  'P0001', 'inventory_movements is append-only', 'movement history remains append-only'
);
select results_eq(
  $$select movement_type from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-INVENTORY-M') order by id$$,
  array['initial'::text, 'adjustment'::text, 'adjustment'::text, 'adjustment'::text, 'adjustment'::text],
  'existing movement types classify initialization and adjustments'
);

select * from finish();
rollback;
