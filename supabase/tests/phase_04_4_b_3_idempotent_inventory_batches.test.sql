begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(32);

select has_table('private', 'inventory_batches', 'private batch table exists');
select has_table('private', 'inventory_batch_operations', 'private operation table exists');
select has_function('public', 'prepare_inventory_batch', array['text', 'text', 'jsonb'], 'prepare wrapper exists');
select has_function('public', 'apply_inventory_batch_operation', array['text', 'text'], 'apply wrapper exists');
select ok(not has_function_privilege('anon', 'public.prepare_inventory_batch(text,text,jsonb)', 'execute'), 'anon cannot prepare batches');
select ok(not has_function_privilege('anon', 'public.apply_inventory_batch_operation(text,text)', 'execute'), 'anon cannot apply batch operations');
select ok(not has_table_privilege('anon', 'private.inventory_batches', 'select'), 'anon cannot read batches');
select ok(not has_table_privilege('anon', 'private.inventory_batch_operations', 'select'), 'anon cannot read operations');
select ok(not has_table_privilege('authenticated', 'private.inventory_batches', 'insert,update,delete'), 'authenticated cannot mutate batches directly');
select ok(
  not (select prosecdef from pg_proc where oid = 'public.prepare_inventory_batch(text,text,jsonb)'::regprocedure)
  and (select prosecdef from pg_proc where oid = 'private.prepare_inventory_batch(text,text,jsonb)'::regprocedure),
  'public wrapper is invoker and private helper is definer'
);
select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef('private.prepare_inventory_batch(text,text,jsonb)'::regprocedure)) > 0
  and position('for update' in lower(pg_get_functiondef('private.apply_inventory_batch_operation(text,text)'::regprocedure))) > 0,
  'batch preparation and application serialize concurrent requests'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'batch-admin@bellmont.invalid', '', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'batch-user@bellmont.invalid', '', now(), now(), now());

insert into private.admin_users (user_id)
values ('30000000-0000-0000-0000-000000000001');

insert into public.products (code, slug, name, brand, category, status)
values ('TEST-BATCH', 'test-batch', 'Test Batch', 'bellmont', 'streetwear', 'draft');

insert into public.product_variants (product_id, sku, size, color)
select id, sku, size, 'Preta'
from public.products
cross join (values ('TEST-BATCH-P', 'P'), ('TEST-BATCH-M', 'M')) fixture(sku, size)
where code = 'TEST-BATCH';

create or replace function pg_temp.batch_manifest(p_second_target bigint default 15)
returns jsonb
language sql
as $$
  select jsonb_agg(jsonb_build_object(
    'operation_key', 'TEST-BATCH-V1:' || v.sku,
    'variant_id', v.id,
    'product_id', p.id,
    'product_code', p.code,
    'sku', v.sku,
    'expected_quantity', 0,
    'target_quantity', case when v.sku = 'TEST-BATCH-M' then p_second_target else 15 end
  ) order by v.sku)
  from public.products p
  join public.product_variants v on v.product_id = p.id
  where p.code = 'TEST-BATCH';
$$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select * from public.prepare_inventory_batch('TEST-BATCH-V1', 'test', '[]'::jsonb)$$,
  '42501', null, 'anon call is rejected by grants'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.prepare_inventory_batch('TEST-BATCH-V1', 'test', pg_temp.batch_manifest())$$,
  'P0001', 'NOT_ADMIN', 'authenticated non-admin is rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select results_eq(
  $$select batch_status, operation_count, target_total from public.prepare_inventory_batch('TEST-BATCH-V1', 'test launch', pg_temp.batch_manifest())$$,
  $$values ('prepared'::text, 2, 30::bigint)$$,
  'admin prepares an immutable two-operation batch'
);
reset role;
select results_eq(
  $$select count(*)::bigint from private.inventory_batches where batch_key = 'TEST-BATCH-V1'$$,
  array[1::bigint], 'one batch is stored'
);
select results_eq(
  $$select count(*)::bigint from private.inventory_batch_operations where batch_id = (select id from private.inventory_batches where batch_key = 'TEST-BATCH-V1')$$,
  array[2::bigint], 'two operations are stored'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select results_eq(
  $$select batch_status, operation_count from public.prepare_inventory_batch('TEST-BATCH-V1', 'test launch', pg_temp.batch_manifest())$$,
  $$values ('prepared'::text, 2)$$,
  'identical preparation returns the existing batch'
);
select throws_ok(
  $$select * from public.prepare_inventory_batch('TEST-BATCH-V1', 'test launch', pg_temp.batch_manifest(16))$$,
  'P0001', 'IDEMPOTENCY_CONFLICT', 'same batch key with different payload is rejected'
);
select results_eq(
  $$select operation_status, quantity_on_hand, applied_delta from public.apply_inventory_batch_operation('TEST-BATCH-V1', 'TEST-BATCH-V1:TEST-BATCH-P')$$,
  $$values ('applied'::text, 15::bigint, 15::bigint)$$,
  'first operation applies its target exactly once'
);
select results_eq(
  $$select quantity_on_hand from public.inventory where variant_id = (select id from public.product_variants where sku = 'TEST-BATCH-P')$$,
  array[15::bigint], 'first operation persists target stock'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-BATCH-P')$$,
  array[1::bigint], 'first operation creates exactly one movement'
);
select results_eq(
  $$select operation_status, quantity_on_hand from public.apply_inventory_batch_operation('TEST-BATCH-V1', 'TEST-BATCH-V1:TEST-BATCH-P')$$,
  $$values ('already_applied'::text, 15::bigint)$$,
  'identical replay returns an unequivocal already-applied result'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-BATCH-P')$$,
  array[1::bigint], 'replay creates no duplicate movement'
);

update public.product_variants set is_active = false where sku = 'TEST-BATCH-M';
select throws_ok(
  $$select * from public.apply_inventory_batch_operation('TEST-BATCH-V1', 'TEST-BATCH-V1:TEST-BATCH-M')$$,
  'P0001', 'BATCH_CATALOG_MISMATCH', 'inactive variant is rejected'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements where variant_id = (select id from public.product_variants where sku = 'TEST-BATCH-M')$$,
  array[0::bigint], 'failed operation creates no movement'
);
update public.product_variants set is_active = true where sku = 'TEST-BATCH-M';

select results_eq(
  $$select operation_status, quantity_on_hand from public.apply_inventory_batch_operation('TEST-BATCH-V1', 'TEST-BATCH-V1:TEST-BATCH-M')$$,
  $$values ('applied'::text, 15::bigint)$$,
  'pending operation resumes after the blocking condition is fixed'
);
reset role;
select results_eq(
  $$select status from private.inventory_batches where batch_key = 'TEST-BATCH-V1'$$,
  array['completed'::text], 'batch completes only after every operation is applied'
);
select results_eq(
  $$select sum(quantity_on_hand) from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku like 'TEST-BATCH-%'$$,
  array[30::numeric], 'reconciled stock equals the manifest total'
);
select results_eq(
  $$select count(*)::bigint from private.inventory_batch_operations where status='applied' and batch_id=(select id from private.inventory_batches where batch_key='TEST-BATCH-V1')$$,
  array[2::bigint], 'both operation records are auditable as applied'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements m join public.product_variants v on v.id=m.variant_id where v.sku like 'TEST-BATCH-%'$$,
  array[2::bigint], 'history contains exactly one movement per applied operation'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.prepare_inventory_batch('TEST-DIVERGENT', 'divergent', pg_temp.batch_manifest())$$,
  'P0001', 'BATCH_INVENTORY_DIVERGENCE', 'preparation blocks a stale expected balance'
);
reset role;
select results_eq(
  $$select count(*)::bigint from private.inventory_batches where batch_key='TEST-DIVERGENT'$$,
  array[0::bigint], 'failed preparation leaves no partial batch'
);

select * from finish();
rollback;
