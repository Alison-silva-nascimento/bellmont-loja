-- BELLMONT Phase 05.2C.1 - local-only reservation and backend authorization remediation.
-- Contains no commercial data and does not change public checkout availability.

-- Defense in depth: at most one active reservation may exist for an order item.
-- Historical released, expired and consumed reservations remain unrestricted.
create unique index inventory_reservations_one_active_per_item_idx
  on public.inventory_reservations (order_item_id)
  where status = 'active';

-- PostgREST exposes signed JWT claims through request.jwt.claims/auth.jwt().
-- Keep the existing Admin allowlist path and recognize only the signed role claim.
create or replace function private.is_commerce_executor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.is_admin()), false)
    or coalesce((select auth.jwt() ->> 'role'), '') = 'service_role';
$$;

revoke all on function private.is_commerce_executor()
  from public, anon, authenticated;
grant execute on function private.is_commerce_executor()
  to authenticated, service_role;

create or replace function private.reserve_order_inventory(
  p_order_id bigint,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_existing private.order_inventory_operations%rowtype;
  v_payload jsonb;
  v_result jsonb;
  v_expires timestamptz;
  v_expected_items bigint;
  v_active_items bigint;
  v_expected_quantity bigint;
  v_active_quantity bigint;
begin
  if not (select private.is_commerce_executor()) then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHORIZED';
  end if;
  if nullif(btrim(p_operation_key), '') is null then
    raise exception using errcode = 'P0001', message = 'INVALID_IDEMPOTENCY_KEY';
  end if;

  v_payload := jsonb_build_object('order_id', p_order_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'bellmont.order-operation:' || btrim(p_operation_key),
      0
    )
  );

  select *
  into v_existing
  from private.order_inventory_operations
  where operation_key = btrim(p_operation_key)
  for update;

  if found then
    if v_existing.operation_type <> 'reserve'
      or v_existing.payload <> v_payload then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.result || jsonb_build_object('idempotent_replay', true);
  end if;

  -- This row lock serializes every reservation attempt for the same order,
  -- including attempts carrying different idempotency keys.
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;
  if v_order.record_type <> 'commercial_order'
    or v_order.commercial_status not in ('draft', 'pending_payment') then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_ELIGIBLE';
  end if;

  select
    count(*),
    coalesce(sum(quantity), 0)
  into v_expected_items, v_expected_quantity
  from public.order_items
  where order_id = p_order_id;

  if v_expected_items = 0 then
    raise exception using errcode = 'P0001', message = 'ORDER_HAS_NO_ITEMS';
  end if;

  select
    count(*),
    coalesce(sum(quantity), 0)
  into v_active_items, v_active_quantity
  from public.inventory_reservations
  where order_id = p_order_id
    and status = 'active';

  if v_active_items > 0 then
    if v_active_items = v_expected_items
      and v_active_quantity = v_expected_quantity
      and not exists (
        select 1
        from public.order_items oi
        left join public.inventory_reservations ir
          on ir.order_id = oi.order_id
         and ir.order_item_id = oi.id
         and ir.variant_id = oi.variant_id
         and ir.status = 'active'
         and ir.quantity = oi.quantity
        where oi.order_id = p_order_id
          and ir.id is null
      ) then
      raise exception using errcode = 'P0001', message = 'ORDER_ALREADY_RESERVED';
    end if;
    raise exception using errcode = 'P0001', message = 'RESERVATION_STATE_INCONSISTENT';
  end if;

  if exists (
    select 1
    from public.order_items oi
    join public.product_variants v on v.id = oi.variant_id
    join public.products p on p.id = v.product_id
    where oi.order_id = p_order_id
      and (not v.is_active or p.status <> 'active')
  ) then
    raise exception using errcode = 'P0001', message = 'CATALOG_NOT_ELIGIBLE';
  end if;

  perform 1
  from public.inventory i
  join (
    select variant_id, sum(quantity) as qty
    from public.order_items
    where order_id = p_order_id
    group by variant_id
  ) x on x.variant_id = i.variant_id
  order by i.variant_id
  for update of i;

  if exists (
    select 1
    from (
      select variant_id, sum(quantity) as qty
      from public.order_items
      where order_id = p_order_id
      group by variant_id
    ) x
    left join public.inventory i on i.variant_id = x.variant_id
    where i.variant_id is null
       or i.quantity_on_hand - i.quantity_reserved < x.qty
  ) then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
  end if;

  v_expires := coalesce(v_order.expires_at, now() + interval '15 minutes');

  insert into public.inventory_reservations (
    order_id, order_item_id, variant_id, quantity,
    status, idempotency_key, expires_at
  )
  select
    oi.order_id, oi.id, oi.variant_id, oi.quantity,
    'active', btrim(p_operation_key) || ':' || oi.id, v_expires
  from public.order_items oi
  where oi.order_id = p_order_id;

  update public.inventory i
  set quantity_reserved = i.quantity_reserved + x.qty
  from (
    select variant_id, sum(quantity) as qty
    from public.order_items
    where order_id = p_order_id
    group by variant_id
  ) x
  where i.variant_id = x.variant_id;

  update public.orders
  set commercial_status = 'pending_payment', expires_at = v_expires
  where id = p_order_id;

  insert into public.order_status_history (
    order_id, previous_status, new_status, change_type,
    actor_type, actor_user_id, reason, technical_reference
  ) values (
    p_order_id,
    v_order.commercial_status,
    'pending_payment',
    'commercial',
    case when (select auth.uid()) is null then 'system' else 'admin' end,
    (select auth.uid()),
    'inventory reserved',
    btrim(p_operation_key)
  );

  v_result := jsonb_build_object(
    'status', 'reserved',
    'order_id', p_order_id,
    'expires_at', v_expires,
    'reserved_items', (
      select count(*)
      from public.inventory_reservations
      where order_id = p_order_id and status = 'active'
    )
  );

  insert into private.order_inventory_operations (
    operation_key, operation_type, order_id, payload, result, created_by
  ) values (
    btrim(p_operation_key), 'reserve', p_order_id,
    v_payload, v_result, (select auth.uid())
  );

  return v_result || jsonb_build_object('idempotent_replay', false);
end;
$$;

revoke all on function private.reserve_order_inventory(bigint, text)
  from public, anon, authenticated;
grant execute on function private.reserve_order_inventory(bigint, text)
  to authenticated, service_role;
