begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(39);

select ok(
  to_regclass('public.inventory_reservations_one_active_per_item_idx') is not null,
  'active reservation uniqueness index exists'
);
select ok(
  (
    select pg_get_expr(i.indpred, i.indrelid) = '(status = ''active''::text)'
    from pg_index i
    where i.indexrelid = 'public.inventory_reservations_one_active_per_item_idx'::regclass
  ),
  'active reservation uniqueness is partial and preserves history'
);
select ok(
  not has_function_privilege('anon', 'public.reserve_order_inventory(bigint,text)', 'execute'),
  'anon still cannot execute reservation RPC'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('52c10000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'remediation-admin@invalid', '', now(), now(), now()),
  ('52c10000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'remediation-user@invalid', '', now(), now(), now());
insert into private.admin_users (user_id)
values ('52c10000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(private.is_commerce_executor(), false, 'authenticated non-admin is not a commerce executor');
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(private.is_commerce_executor(), true, 'signed service_role claim is a commerce executor');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(private.is_commerce_executor(), true, 'allowlisted Admin remains a commerce executor');
reset role;

insert into products (code, slug, name, brand, category, price, status)
values ('ENG-REM', 'eng-rem', 'Engine remediation', 'BELLMONT', 'streetwear', 80, 'active');
insert into product_variants (product_id, sku, size)
select p.id, x.sku, x.size
from products p
cross join (values ('ENG-REM-P', 'P'), ('ENG-REM-M', 'M')) x(sku, size)
where p.code = 'ENG-REM';
insert into inventory (variant_id, quantity_on_hand)
select id, 50 from product_variants where sku like 'ENG-REM-%';

create function pg_temp.make_remediation_order(
  p_name text,
  p_qty_p bigint,
  p_qty_m bigint default 0
) returns bigint language plpgsql as $$
declare
  v_order_id bigint;
begin
  insert into orders (
    order_number, source, buyer_name, buyer_phone,
    items_subtotal, grand_total, idempotency_key
  ) values (
    'REM-' || p_name, 'website', 'Teste', '1',
    80 * (p_qty_p + p_qty_m), 80 * (p_qty_p + p_qty_m),
    'rem-order-' || p_name
  ) returning id into v_order_id;

  if p_qty_p > 0 then
    insert into order_items (
      order_id, product_id, variant_id, variant_sku,
      product_name, category, quantity, unit_price, line_total
    )
    select v_order_id, p.id, v.id, v.sku,
      p.name, p.category, p_qty_p, 80, 80 * p_qty_p
    from products p
    join product_variants v on v.product_id = p.id
    where v.sku = 'ENG-REM-P';
  end if;

  if p_qty_m > 0 then
    insert into order_items (
      order_id, product_id, variant_id, variant_sku,
      product_name, category, quantity, unit_price, line_total
    )
    select v_order_id, p.id, v.id, v.sku,
      p.name, p.category, p_qty_m, 80, 80 * p_qty_m
    from products p
    join product_variants v on v.product_id = p.id
    where v.sku = 'ENG-REM-M';
  end if;

  return v_order_id;
end;
$$;

select pg_temp.make_remediation_order('SEQUENTIAL', 3) as order_sequential \gset
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  public.reserve_order_inventory(:order_sequential, 'rem-sequential-a') ->> 'status',
  'reserved',
  'first reservation succeeds'
);
select is(
  (public.reserve_order_inventory(:order_sequential, 'rem-sequential-a') ->> 'idempotent_replay')::boolean,
  true,
  'retry with original key replays'
);
select throws_ok(
  format('select public.reserve_order_inventory(%s, ''rem-sequential-b'')', :order_sequential),
  'P0001', 'ORDER_ALREADY_RESERVED',
  'different key cannot reserve an already reserved order'
);
select results_eq(
  format('select count(*)::bigint from inventory_reservations where order_id=%s and status=''active''', :order_sequential),
  array[1::bigint],
  'different key creates no duplicate reservation row'
);
select results_eq(
  format('select sum(quantity)::bigint from inventory_reservations where order_id=%s and status=''active''', :order_sequential),
  array[3::bigint],
  'active reservation quantity equals requested quantity'
);
select results_eq(
  $$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-REM-P'$$,
  array[3::bigint],
  'aggregate reserved balance is not duplicated'
);
reset role;
select results_eq(
  format('select count(*)::bigint from private.order_inventory_operations where order_id=%s and operation_type=''reserve''', :order_sequential),
  array[1::bigint],
  'failed new key creates no operation ledger entry'
);
select id as sequential_item_id from order_items where order_id = :order_sequential \gset
select throws_ok(
  format($sql$
    insert into inventory_reservations (
      order_id, order_item_id, variant_id, quantity,
      status, idempotency_key, expires_at
    )
    select order_id, id, variant_id, quantity,
      'active', 'rem-direct-duplicate', now() + interval '15 minutes'
    from order_items where id=%s
  $sql$, :sequential_item_id),
  '23505', null,
  'database invariant independently rejects a second active item reservation'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  public.release_order_inventory(:order_sequential, 'rem-sequential-release', 'test cleanup') ->> 'status',
  'released',
  'valid reservation can still be released'
);
select results_eq(
  $$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-REM-P'$$,
  array[0::bigint],
  'release restores aggregate reserved balance'
);
reset role;

select pg_temp.make_remediation_order('MULTI', 2, 4) as order_multi \gset
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.reserve_order_inventory(:order_multi, 'rem-multi-a') ->> 'status', 'reserved', 'multi-item order reserves atomically');
select results_eq(format('select count(*)::bigint from inventory_reservations where order_id=%s and status=''active''', :order_multi), array[2::bigint], 'one active reservation exists per order item');
select ok(
  not exists (
    select 1
    from order_items oi
    left join inventory_reservations ir
      on ir.order_item_id = oi.id and ir.status = 'active'
    where oi.order_id = :order_multi
      and (ir.id is null or ir.quantity <> oi.quantity or ir.variant_id <> oi.variant_id)
  ),
  'multi-item reservations exactly match item quantities and variants'
);
select results_eq($$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-REM-P'$$, array[2::bigint], 'P aggregate matches multi-item order');
select results_eq($$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-REM-M'$$, array[4::bigint], 'M aggregate matches multi-item order');
select throws_ok(format('select public.reserve_order_inventory(%s, ''rem-multi-b'')', :order_multi), 'P0001', 'ORDER_ALREADY_RESERVED', 'multi-item order also rejects a different key');
reset role;

insert into order_payments (
  order_id, provider, payment_method, amount_requested,
  amount_confirmed, status, idempotency_key, confirmed_at
)
select id, 'test', 'pix', grand_total, grand_total, 'paid', 'rem-payment-multi', now()
from orders where id = :order_multi
returning id as payment_multi \gset
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.confirm_order_sale(:order_multi, :payment_multi, 'rem-sale-multi') ->> 'status', 'sold', 'valid multi-item reservation can be confirmed');
select results_eq(format($sql$select count(*)::bigint from inventory_movements im join order_items oi on oi.id::text=im.reference_id where oi.order_id=%s and im.movement_type='sale'$sql$, :order_multi), array[2::bigint], 'confirmation writes one physical sale movement per item');
select ok((select bool_and(quantity_reserved = 0) from inventory i join product_variants v on v.id=i.variant_id where v.sku like 'ENG-REM-%'), 'confirmation clears all reserved aggregates');
reset role;
select id as multi_p_item from order_items where order_id=:order_multi and variant_sku='ENG-REM-P' \gset
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.return_order_item(:order_multi, :multi_p_item, 2, 'rem-return-p') ->> 'status', 'returned', 'return remains functional after remediation');
select results_eq(format($sql$select count(*)::bigint from inventory_movements where movement_type='return' and reference_type='order_item' and reference_id='%s'$sql$, :multi_p_item), array[1::bigint], 'return creates exactly one physical movement');
select results_eq($$select quantity_on_hand from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-REM-P'$$, array[50::bigint], 'return restores exact physical P balance');
reset role;

select pg_temp.make_remediation_order('CANCEL', 1) as order_cancel \gset
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.reserve_order_inventory(:order_cancel, 'rem-cancel-reserve') ->> 'status', 'reserved', 'cancellation fixture reserves');
select is(public.release_order_inventory(:order_cancel, 'rem-cancel-release', 'cancel test') ->> 'status', 'released', 'cancellation releases reservation');
select results_eq(format($sql$select count(*)::bigint from inventory_movements im join order_items oi on oi.id::text=im.reference_id where oi.order_id=%s$sql$, :order_cancel), array[0::bigint], 'cancellation creates no physical movement');
reset role;

select pg_temp.make_remediation_order('EXPIRE', 1) as order_expire \gset
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(public.reserve_order_inventory(:order_expire, 'rem-expire-reserve') ->> 'status', 'reserved', 'expiration fixture reserves');
reset role;
update inventory_reservations
set created_at = now() - interval '2 hours', expires_at = now() - interval '1 hour'
where order_id = :order_expire;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((public.expire_due_reservations('rem-expire-batch', 100) ->> 'expired_orders')::integer, 1, 'expiration processes due reservation');
select results_eq(format('select status from inventory_reservations where order_id=%s', :order_expire), array['expired'::text], 'due reservation becomes expired');
select results_eq(format($sql$select count(*)::bigint from inventory_movements im join order_items oi on oi.id::text=im.reference_id where oi.order_id=%s$sql$, :order_expire), array[0::bigint], 'expiration creates no physical movement');
reset role;

select pg_temp.make_remediation_order('PARTIAL', 1, 1) as order_partial \gset
insert into inventory_reservations (
  order_id, order_item_id, variant_id, quantity,
  status, idempotency_key, expires_at
)
select order_id, id, variant_id, quantity,
  'active', 'rem-partial-fixture', now() + interval '15 minutes'
from order_items where order_id=:order_partial and variant_sku='ENG-REM-P';
update inventory i
set quantity_reserved = quantity_reserved + 1
from product_variants v
where v.id=i.variant_id and v.sku='ENG-REM-P';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"52c10000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(format('select public.reserve_order_inventory(%s, ''rem-partial-attempt'')', :order_partial), 'P0001', 'RESERVATION_STATE_INCONSISTENT', 'partial reservation state is rejected instead of topped up');
select results_eq(format('select count(*)::bigint from inventory_reservations where order_id=%s and status=''active''', :order_partial), array[1::bigint], 'partial-state rejection creates no new reservation');
reset role;
select results_eq(format($sql$select count(*)::bigint from private.order_inventory_operations where operation_key='rem-partial-attempt'$sql$), array[0::bigint], 'partial-state rejection writes no operation record');
select results_eq($$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-REM-P'$$, array[1::bigint], 'partial-state rejection leaves aggregate unchanged');

select * from finish();
rollback;
