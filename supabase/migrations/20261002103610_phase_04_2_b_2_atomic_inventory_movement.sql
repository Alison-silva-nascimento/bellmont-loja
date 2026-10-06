-- BELLMONT Phase 04.2B.2: atomic administrative inventory movements.
-- This migration contains no seed data and does not expose exact inventory publicly.

create or replace function private.record_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta bigint;
  movement_note text;
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  delta := new.quantity_on_hand - coalesce(old.quantity_on_hand, 0);
  movement_note := nullif(current_setting('bellmont.inventory_movement_note', true), '');
  perform pg_catalog.set_config('bellmont.inventory_movement_note', '', true);

  if delta <> 0 then
    insert into public.inventory_movements (
      variant_id,
      movement_type,
      quantity_delta,
      quantity_after,
      note,
      created_by
    ) values (
      new.variant_id,
      case when tg_op = 'INSERT' then 'initial' else 'adjustment' end,
      delta,
      new.quantity_on_hand,
      movement_note,
      (select auth.uid())
    );
  end if;

  return new;
end;
$$;

revoke all on function private.record_inventory_movement() from public, anon, authenticated;

create or replace function public.apply_inventory_movement(
  p_variant_id bigint,
  p_delta bigint,
  p_note text default null
)
returns table (
  variant_id bigint,
  quantity_on_hand bigint,
  quantity_reserved bigint,
  available_quantity bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_quantity bigint;
  reserved_quantity bigint;
  next_quantity bigint;
  inventory_exists boolean;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_ADMIN';
  end if;

  if p_delta is null or p_delta = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_DELTA';
  end if;

  perform 1
  from public.product_variants
  where id = p_variant_id
  for key share;

  if not found then
    raise exception using errcode = 'P0001', message = 'VARIANT_NOT_FOUND';
  end if;

  -- Serializes both first initialization and later changes for this variant.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('bellmont.inventory:' || p_variant_id::text, 0)
  );

  select i.quantity_on_hand, i.quantity_reserved
  into current_quantity, reserved_quantity
  from public.inventory as i
  where i.variant_id = p_variant_id
  for update;

  inventory_exists := found;

  perform pg_catalog.set_config(
    'bellmont.inventory_movement_note',
    coalesce(nullif(pg_catalog.btrim(p_note), ''), ''),
    true
  );

  if not inventory_exists then
    if p_delta < 0 then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
    end if;

    insert into public.inventory (variant_id, quantity_on_hand, quantity_reserved)
    values (p_variant_id, p_delta, 0)
    returning inventory.quantity_on_hand, inventory.quantity_reserved
    into current_quantity, reserved_quantity;
  else
    begin
      next_quantity := current_quantity + p_delta;
    exception when numeric_value_out_of_range then
      raise exception using errcode = 'P0001', message = 'INVALID_DELTA';
    end;

    if next_quantity < 0 then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
    end if;

    if next_quantity < reserved_quantity then
      raise exception using errcode = 'P0001', message = 'BELOW_RESERVED';
    end if;

    update public.inventory as i
    set quantity_on_hand = next_quantity
    where i.variant_id = p_variant_id
    returning i.quantity_on_hand, i.quantity_reserved
    into current_quantity, reserved_quantity;
  end if;

  return query
  select p_variant_id, current_quantity, reserved_quantity,
    current_quantity - reserved_quantity;
end;
$$;

comment on function public.apply_inventory_movement(bigint, bigint, text) is
  'Atomically initializes or adjusts physical inventory for an admin, while the inventory trigger writes exactly one ledger movement.';

revoke all on function public.apply_inventory_movement(bigint, bigint, text)
  from public, anon, authenticated;
grant execute on function public.apply_inventory_movement(bigint, bigint, text)
  to authenticated;

-- Exact quantities are private. A future public API may expose only a boolean
-- or coarse availability label without granting SELECT on this table.
drop policy if exists inventory_public_read on public.inventory;
revoke select on table public.inventory from anon;
