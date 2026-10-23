begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(66);

select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'order_items', 'order_items table exists');
select has_table('public', 'order_addresses', 'order_addresses table exists');
select has_table('public', 'order_payments', 'order_payments table exists');
select has_table('public', 'order_shipments', 'order_shipments table exists');
select has_table('public', 'order_status_history', 'order_status_history table exists');
select has_table('public', 'inventory_reservations', 'inventory_reservations table exists');
select has_table('public', 'payment_webhook_events', 'payment_webhook_events table exists');

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.orders'::regclass),
  'orders has RLS enabled and forced'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.order_items'::regclass),
  'order_items has RLS enabled and forced'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.order_addresses'::regclass),
  'order_addresses has RLS enabled and forced'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.order_payments'::regclass),
  'order_payments has RLS enabled and forced'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.order_shipments'::regclass),
  'order_shipments has RLS enabled and forced'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.order_status_history'::regclass),
  'order_status_history has RLS enabled and forced'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.inventory_reservations'::regclass),
  'inventory_reservations has RLS enabled and forced'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.payment_webhook_events'::regclass),
  'payment_webhook_events has RLS enabled and forced'
);

select ok(
  not has_table_privilege('anon', 'public.orders', 'select,insert,update,delete'),
  'anon has no direct orders privileges'
);
select ok(
  not has_table_privilege('anon', 'public.order_items', 'select,insert,update,delete'),
  'anon has no direct order_items privileges'
);
select ok(
  not has_table_privilege('anon', 'public.order_addresses', 'select,insert,update,delete'),
  'anon has no direct order_addresses privileges'
);
select ok(
  not has_table_privilege('anon', 'public.order_payments', 'select,insert,update,delete'),
  'anon has no direct order_payments privileges'
);
select ok(
  not has_table_privilege('anon', 'public.order_shipments', 'select,insert,update,delete'),
  'anon has no direct order_shipments privileges'
);
select ok(
  not has_table_privilege('anon', 'public.order_status_history', 'select,insert,update,delete'),
  'anon has no direct order_status_history privileges'
);
select ok(
  not has_table_privilege('anon', 'public.inventory_reservations', 'select,insert,update,delete'),
  'anon has no direct inventory_reservations privileges'
);
select ok(
  not has_table_privilege('anon', 'public.payment_webhook_events', 'select,insert,update,delete'),
  'anon has no direct payment_webhook_events privileges'
);

select ok(
  not has_table_privilege('authenticated', 'public.orders', 'insert,update,delete'),
  'authenticated cannot mutate orders directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.order_items', 'insert,update,delete'),
  'authenticated cannot mutate order_items directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.order_addresses', 'insert,update,delete'),
  'authenticated cannot mutate order_addresses directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.order_payments', 'insert,update,delete'),
  'authenticated cannot mutate order_payments directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.order_shipments', 'insert,update,delete'),
  'authenticated cannot mutate order_shipments directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.order_status_history', 'insert,update,delete'),
  'authenticated cannot mutate order_status_history directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.inventory_reservations', 'insert,update,delete'),
  'authenticated cannot mutate inventory_reservations directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.payment_webhook_events', 'select,insert,update,delete'),
  'authenticated has no direct webhook event privileges'
);

select ok(
  has_table_privilege('authenticated', 'public.orders', 'select')
  and has_table_privilege('authenticated', 'public.order_items', 'select')
  and has_table_privilege('authenticated', 'public.order_addresses', 'select')
  and has_table_privilege('authenticated', 'public.order_payments', 'select')
  and has_table_privilege('authenticated', 'public.order_shipments', 'select')
  and has_table_privilege('authenticated', 'public.order_status_history', 'select')
  and has_table_privilege('authenticated', 'public.inventory_reservations', 'select'),
  'authenticated receives only the reads mediated by RLS'
);
select has_function(
  'private', 'prevent_order_status_history_mutation', array[]::text[],
  'append-only history trigger helper exists'
);
select ok(
  (select count(*) = 10
   from pg_constraint
   where conname in (
     'orders_customer_user_id_fkey',
     'order_items_order_id_fkey',
     'order_items_product_variant_fkey',
     'order_addresses_order_id_fkey',
     'order_payments_order_id_fkey',
     'order_shipments_order_id_fkey',
     'order_status_history_order_id_fkey',
     'inventory_reservations_variant_id_fkey',
     'inventory_reservations_order_item_variant_fkey',
     'payment_webhook_events_order_payment_id_fkey'
   )),
  'order and reservation relationships are enforced by foreign keys'
);
select ok(
  (select data_type = 'numeric' and numeric_precision = 12 and numeric_scale = 2
   from information_schema.columns
   where table_schema = 'public' and table_name = 'orders' and column_name = 'grand_total'),
  'money uses numeric(12,2)'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.inventory'::regclass
      and conname = 'inventory_reserved_within_on_hand'
  ),
  'existing inventory reserved-within-on-hand protection remains present'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.inventory_movements'::regclass
      and conname = 'inventory_movements_type_valid'
      and pg_get_constraintdef(oid) like '%reservation%'
      and pg_get_constraintdef(oid) like '%sale%'
  ),
  'existing inventory ledger movement vocabulary remains compatible'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'orders-admin@bellmont.invalid', '', now(), now(), now()),
  ('51000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'orders-customer@bellmont.invalid', '', now(), now(), now()),
  ('51000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'orders-other@bellmont.invalid', '', now(), now(), now());

insert into private.admin_users (user_id)
values ('51000000-0000-0000-0000-000000000001');

insert into public.products (code, slug, name, brand, category, price, status)
values ('TEST-ORDER', 'test-order', 'Test Order Product', 'BELLMONT', 'streetwear', 80, 'draft');

insert into public.product_variants (product_id, sku, color, size)
select id, 'TEST-ORDER-P', 'Preta', 'P'
from public.products where code = 'TEST-ORDER';

insert into public.inventory (variant_id, quantity_on_hand, quantity_reserved)
select id, 15, 0 from public.product_variants where sku = 'TEST-ORDER-P';

insert into public.orders (
  order_number, record_type, source, customer_user_id, buyer_name,
  buyer_phone, buyer_email, items_subtotal, discount_total,
  shipping_total, grand_total, paid_total, idempotency_key
) values
  ('TEST-ORDER-OWN', 'commercial_order', 'website', '51000000-0000-0000-0000-000000000002',
   'Cliente Teste', '11999999999', 'customer@bellmont.invalid', 80, 0, 10, 90, 0, 'TEST-ORDER-IDEM-OWN'),
  ('TEST-ORDER-OTHER', 'commercial_order', 'website', '51000000-0000-0000-0000-000000000003',
   'Outro Cliente', '11888888888', 'other@bellmont.invalid', 80, 0, 10, 90, 0, 'TEST-ORDER-IDEM-OTHER');

insert into public.order_items (
  order_id, product_id, variant_id, product_code, variant_sku,
  product_name, brand, category, color, size, quantity,
  unit_price, discount_total, line_total
)
select o.id, p.id, v.id, p.code, v.sku, p.name, p.brand, p.category,
  v.color, v.size, 1, 80, 0, 80
from public.orders o
cross join public.products p
join public.product_variants v on v.product_id = p.id
where o.order_number = 'TEST-ORDER-OWN' and p.code = 'TEST-ORDER';

insert into public.order_addresses (
  order_id, recipient_name, postal_code, street, street_number,
  neighborhood, city, state_code
)
select id, 'Cliente Teste', '01001000', 'Praça da Sé', '1', 'Sé', 'São Paulo', 'SP'
from public.orders where order_number = 'TEST-ORDER-OWN';

insert into public.order_payments (
  order_id, provider, payment_method, amount_requested, idempotency_key
)
select id, 'test-provider', 'pix', 90, 'TEST-PAYMENT-IDEM'
from public.orders where order_number = 'TEST-ORDER-OWN';

insert into public.order_shipments (order_id)
select id from public.orders where order_number = 'TEST-ORDER-OWN';

insert into public.order_status_history (
  order_id, previous_status, new_status, change_type, actor_type, reason
)
select id, null, 'draft', 'commercial', 'system', 'test fixture'
from public.orders where order_number = 'TEST-ORDER-OWN';

insert into public.inventory_reservations (
  order_id, order_item_id, variant_id, quantity, idempotency_key, expires_at
)
select oi.order_id, oi.id, oi.variant_id, 1, 'TEST-RESERVATION-IDEM', now() + interval '15 minutes'
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.order_number = 'TEST-ORDER-OWN';

insert into public.payment_webhook_events (
  order_payment_id, provider, external_event_id, event_type
)
select id, provider, 'TEST-EVENT-1', 'payment.pending'
from public.order_payments where idempotency_key = 'TEST-PAYMENT-IDEM';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select count(*) from public.orders$$,
  '42501', null, 'anon cannot read orders'
);
select throws_ok(
  $$insert into public.orders (order_number, source, buyer_name, buyer_phone, idempotency_key) values ('ANON', 'website', 'Anon', '1', 'ANON')$$,
  '42501', null, 'anon cannot create orders'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"51000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select results_eq(
  $$select order_number from public.orders order by order_number$$,
  array['TEST-ORDER-OWN'::text],
  'authenticated customer reads only the owned order'
);
select results_eq(
  $$select count(*)::bigint from public.orders where order_number = 'TEST-ORDER-OTHER'$$,
  array[0::bigint],
  'authenticated customer cannot read another customer order'
);
select results_eq(
  $$select count(*)::bigint from public.order_items$$,
  array[1::bigint], 'customer reads owned order items'
);
select results_eq(
  $$select count(*)::bigint from public.order_addresses$$,
  array[1::bigint], 'customer reads owned address snapshot'
);
select results_eq(
  $$select count(*)::bigint from public.order_payments$$,
  array[1::bigint], 'customer reads owned payment metadata'
);
select results_eq(
  $$select count(*)::bigint from public.order_shipments$$,
  array[1::bigint], 'customer reads owned shipment metadata'
);
select results_eq(
  $$select count(*)::bigint from public.order_status_history$$,
  array[1::bigint], 'customer reads owned order timeline'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_reservations$$,
  array[1::bigint], 'customer reads owned reservation metadata'
);
select throws_ok(
  $$select count(*) from public.payment_webhook_events$$,
  '42501', null, 'customer cannot read webhook inbox'
);
select throws_ok(
  $$insert into public.orders (order_number, source, buyer_name, buyer_phone, idempotency_key) values ('DIRECT', 'website', 'Direct', '1', 'DIRECT')$$,
  '42501', null, 'authenticated customer cannot create orders directly'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select results_eq(
  $$select count(*)::bigint from public.orders$$,
  array[2::bigint], 'allowlisted admin reads all orders'
);
select ok(
  (select count(*) = 1 from public.order_items)
  and (select count(*) = 1 from public.order_addresses)
  and (select count(*) = 1 from public.order_payments)
  and (select count(*) = 1 from public.order_shipments)
  and (select count(*) = 1 from public.order_status_history)
  and (select count(*) = 1 from public.inventory_reservations),
  'allowlisted admin reads all order children'
);

reset role;
select throws_ok(
  $$insert into public.orders (order_number, source, buyer_name, buyer_phone, items_subtotal, grand_total, idempotency_key) values ('BAD-TOTAL', 'website', 'Bad', '1', 80, 79, 'BAD-TOTAL')$$,
  '23514', null, 'inconsistent order total is rejected'
);
select throws_ok(
  $$insert into public.orders (order_number, source, buyer_name, buyer_phone, commercial_status, idempotency_key) values ('BAD-STATUS', 'website', 'Bad', '1', 'unknown', 'BAD-STATUS')$$,
  '23514', null, 'invalid order status is rejected'
);
select throws_ok(
  $$insert into public.order_items (order_id, product_id, variant_id, variant_sku, product_name, category, quantity, unit_price, line_total) select o.id,p.id,v.id,v.sku,p.name,p.category,0,80,0 from public.orders o join public.products p on p.code='TEST-ORDER' join public.product_variants v on v.product_id=p.id where o.order_number='TEST-ORDER-OWN'$$,
  '23514', null, 'zero item quantity is rejected'
);
select throws_ok(
  $$insert into public.order_items (order_id, product_id, variant_id, variant_sku, product_name, category, quantity, unit_price, line_total) select o.id,p.id,v.id,v.sku,p.name,p.category,1,80,79 from public.orders o join public.products p on p.code='TEST-ORDER' join public.product_variants v on v.product_id=p.id where o.order_number='TEST-ORDER-OWN'$$,
  '23514', null, 'inconsistent line total is rejected'
);
select throws_ok(
  $$insert into public.order_addresses (order_id, recipient_name, postal_code, street, street_number, neighborhood, city, state_code, address_type) select id,'Bad','ABC','Street','1','N','C','SP','billing' from public.orders where order_number='TEST-ORDER-OWN'$$,
  '23514', null, 'invalid postal code is rejected'
);
select throws_ok(
  $$insert into public.order_payments (order_id, provider, payment_method, amount_requested, idempotency_key) select id,'test-provider','pix',90,'TEST-PAYMENT-IDEM' from public.orders where order_number='TEST-ORDER-OWN'$$,
  '23505', null, 'duplicate payment idempotency key is rejected'
);
select throws_ok(
  $$insert into public.inventory_reservations (order_id,order_item_id,variant_id,quantity,idempotency_key,expires_at) select order_id,id,variant_id,0,'BAD-ZERO',now()+interval '15 minutes' from public.order_items limit 1$$,
  '23514', null, 'zero reservation quantity is rejected'
);
select throws_ok(
  $$insert into public.inventory_reservations (order_id,order_item_id,variant_id,quantity,status,idempotency_key,expires_at) select order_id,id,variant_id,1,'consumed','BAD-LIFECYCLE',now()+interval '15 minutes' from public.order_items limit 1$$,
  '23514', null, 'inconsistent reservation lifecycle is rejected'
);
select throws_ok(
  $$insert into public.payment_webhook_events (provider, external_event_id, event_type) values ('test-provider','TEST-EVENT-1','duplicate')$$,
  '23505', null, 'duplicate provider event is rejected'
);
select throws_ok(
  $$update public.order_status_history set new_status='changed' where reason='test fixture'$$,
  'P0001', 'order_status_history is append-only', 'order timeline is append-only'
);
select throws_ok(
  $$insert into public.inventory_reservations (order_id,order_item_id,variant_id,quantity,idempotency_key,expires_at) values (999999,999999,999999,1,'ORPHAN',now()+interval '15 minutes')$$,
  '23503', null, 'orphan reservation is rejected'
);
select throws_ok(
  $$delete from public.product_variants where sku='TEST-ORDER-P'$$,
  '23503', null, 'referenced catalog variant cannot be deleted'
);
select results_eq(
  $$select quantity_on_hand, quantity_reserved from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='TEST-ORDER-P'$$,
  $$values (15::bigint, 0::bigint)$$,
  'order schema does not mutate physical or reserved inventory'
);
select results_eq(
  $$select count(*)::bigint from public.inventory_movements m join public.product_variants v on v.id=m.variant_id where v.sku='TEST-ORDER-P'$$,
  array[1::bigint],
  'order schema creates no extra inventory movements'
);

select * from finish();
rollback;
