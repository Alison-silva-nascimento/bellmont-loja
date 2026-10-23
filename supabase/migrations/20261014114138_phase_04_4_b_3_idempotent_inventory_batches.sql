-- BELLMONT Phase 04.4B.3: idempotent, resumable inventory batches.
-- This migration contains no commercial data and does not execute a stock batch.

create table private.inventory_batches (
  id bigint generated always as identity primary key,
  batch_key text not null unique,
  manifest_hash text not null,
  reference text not null,
  manifest jsonb not null,
  status text not null default 'prepared'
    check (status in ('prepared', 'in_progress', 'completed')),
  expected_operations integer not null check (expected_operations > 0),
  expected_total bigint not null check (expected_total >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint inventory_batches_key_not_blank check (batch_key = btrim(batch_key) and batch_key <> ''),
  constraint inventory_batches_hash_format check (manifest_hash ~ '^[0-9a-f]{64}$'),
  constraint inventory_batches_reference_not_blank check (reference = btrim(reference) and reference <> '')
);

create table private.inventory_batch_operations (
  id bigint generated always as identity primary key,
  batch_id bigint not null references private.inventory_batches(id) on delete restrict,
  operation_key text not null unique,
  variant_id bigint not null references public.product_variants(id) on delete restrict,
  product_id bigint not null references public.products(id) on delete restrict,
  product_code text not null,
  sku text not null,
  expected_quantity bigint not null check (expected_quantity >= 0),
  target_quantity bigint not null check (target_quantity >= 0),
  applied_delta bigint,
  movement_id bigint unique references public.inventory_movements(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'applied')),
  applied_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint inventory_batch_operations_key_not_blank
    check (operation_key = btrim(operation_key) and operation_key <> ''),
  constraint inventory_batch_operations_product_code_not_blank
    check (product_code = btrim(product_code) and product_code <> ''),
  constraint inventory_batch_operations_sku_not_blank
    check (sku = btrim(sku) and sku <> ''),
  constraint inventory_batch_operations_changes_quantity
    check (target_quantity <> expected_quantity),
  constraint inventory_batch_operations_batch_variant_unique unique (batch_id, variant_id),
  constraint inventory_batch_operations_batch_operation_unique unique (batch_id, operation_key),
  constraint inventory_batch_operations_applied_shape check (
    (status = 'pending' and applied_delta is null and movement_id is null and applied_by is null and applied_at is null)
    or
    (status = 'applied' and applied_delta is not null and movement_id is not null and applied_by is not null and applied_at is not null)
  )
);

alter table private.inventory_batches enable row level security;
alter table private.inventory_batches force row level security;
alter table private.inventory_batch_operations enable row level security;
alter table private.inventory_batch_operations force row level security;

revoke all on table private.inventory_batches from public, anon, authenticated;
revoke all on table private.inventory_batch_operations from public, anon, authenticated;
revoke all on sequence private.inventory_batches_id_seq from public, anon, authenticated;
revoke all on sequence private.inventory_batch_operations_id_seq from public, anon, authenticated;

create or replace function private.prepare_inventory_batch(
  p_batch_key text,
  p_reference text,
  p_operations jsonb
)
returns table (
  batch_id bigint,
  batch_status text,
  manifest_hash text,
  operation_count integer,
  target_total bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_batch_key text := nullif(pg_catalog.btrim(p_batch_key), '');
  normalized_reference text := nullif(pg_catalog.btrim(p_reference), '');
  computed_hash text;
  existing_batch private.inventory_batches%rowtype;
  parsed_count integer;
  parsed_total bigint;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_ADMIN';
  end if;

  if normalized_batch_key is null or normalized_reference is null
    or p_operations is null or jsonb_typeof(p_operations) <> 'array'
    or jsonb_array_length(p_operations) = 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_BATCH';
  end if;

  computed_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_operations::text, 'UTF8'), 'sha256'),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('bellmont.inventory-batch:' || normalized_batch_key, 0)
  );

  select * into existing_batch
  from private.inventory_batches as b
  where b.batch_key = normalized_batch_key
  for update;

  if found then
    if existing_batch.reference <> normalized_reference
      or existing_batch.manifest_hash <> computed_hash
      or existing_batch.manifest <> p_operations then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;

    return query select existing_batch.id, existing_batch.status,
      existing_batch.manifest_hash, existing_batch.expected_operations,
      existing_batch.expected_total;
    return;
  end if;

  create temporary table if not exists pg_temp.bellmont_inventory_batch_input (
    operation_key text,
    variant_id bigint,
    product_id bigint,
    product_code text,
    sku text,
    expected_quantity bigint,
    target_quantity bigint
  ) on commit drop;
  truncate pg_temp.bellmont_inventory_batch_input;

  insert into pg_temp.bellmont_inventory_batch_input
    (operation_key, variant_id, product_id, product_code, sku, expected_quantity, target_quantity)
  select
    nullif(pg_catalog.btrim(x.operation_key), ''),
    x.variant_id,
    x.product_id,
    nullif(pg_catalog.btrim(x.product_code), ''),
    nullif(pg_catalog.btrim(x.sku), ''),
    x.expected_quantity,
    x.target_quantity
  from jsonb_to_recordset(p_operations) as x(
    operation_key text,
    variant_id bigint,
    product_id bigint,
    product_code text,
    sku text,
    expected_quantity bigint,
    target_quantity bigint
  );

  select count(*)::integer, sum(target_quantity)
    into parsed_count, parsed_total
  from pg_temp.bellmont_inventory_batch_input;

  if parsed_count <> jsonb_array_length(p_operations)
    or exists (
      select 1 from pg_temp.bellmont_inventory_batch_input x
      where x.operation_key is null or x.variant_id is null or x.product_id is null
        or x.product_code is null or x.sku is null or x.expected_quantity is null
        or x.target_quantity is null or x.expected_quantity < 0
        or x.target_quantity < 0 or x.target_quantity = x.expected_quantity
    )
    or exists (
      select 1 from pg_temp.bellmont_inventory_batch_input
      group by operation_key having count(*) > 1
    )
    or exists (
      select 1 from pg_temp.bellmont_inventory_batch_input
      group by variant_id having count(*) > 1
    ) then
    raise exception using errcode = 'P0001', message = 'INVALID_BATCH_OPERATIONS';
  end if;

  if exists (
    select 1
    from pg_temp.bellmont_inventory_batch_input x
    left join public.product_variants v on v.id = x.variant_id
    left join public.products p on p.id = v.product_id
    where v.id is null or p.id is null or not v.is_active
      or p.id <> x.product_id or p.code is distinct from x.product_code
      or v.sku <> x.sku
  ) then
    raise exception using errcode = 'P0001', message = 'BATCH_CATALOG_MISMATCH';
  end if;

  if exists (
    select 1
    from pg_temp.bellmont_inventory_batch_input x
    left join public.inventory i on i.variant_id = x.variant_id
    where coalesce(i.quantity_on_hand, 0) <> x.expected_quantity
  ) then
    raise exception using errcode = 'P0001', message = 'BATCH_INVENTORY_DIVERGENCE';
  end if;

  insert into private.inventory_batches (
    batch_key, manifest_hash, reference, manifest, expected_operations,
    expected_total, created_by
  ) values (
    normalized_batch_key, computed_hash, normalized_reference, p_operations,
    parsed_count, parsed_total, (select auth.uid())
  ) returning * into existing_batch;

  insert into private.inventory_batch_operations (
    batch_id, operation_key, variant_id, product_id, product_code, sku,
    expected_quantity, target_quantity
  )
  select existing_batch.id, x.operation_key, x.variant_id, x.product_id,
    x.product_code, x.sku, x.expected_quantity, x.target_quantity
  from pg_temp.bellmont_inventory_batch_input x;

  return query select existing_batch.id, existing_batch.status,
    existing_batch.manifest_hash, existing_batch.expected_operations,
    existing_batch.expected_total;
end;
$$;

create or replace function private.apply_inventory_batch_operation(
  p_batch_key text,
  p_operation_key text
)
returns table (
  batch_id bigint,
  operation_id bigint,
  operation_status text,
  variant_id bigint,
  sku text,
  quantity_on_hand bigint,
  quantity_reserved bigint,
  available_quantity bigint,
  applied_delta bigint,
  movement_id bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_row private.inventory_batches%rowtype;
  operation_row private.inventory_batch_operations%rowtype;
  current_quantity bigint;
  reserved_quantity bigint;
  movement_result record;
  recorded_movement_id bigint;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception using errcode = 'P0001', message = 'NOT_ADMIN';
  end if;

  if nullif(pg_catalog.btrim(p_batch_key), '') is null
    or nullif(pg_catalog.btrim(p_operation_key), '') is null then
    raise exception using errcode = 'P0001', message = 'INVALID_OPERATION';
  end if;

  select * into batch_row
  from private.inventory_batches b
  where b.batch_key = pg_catalog.btrim(p_batch_key)
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'BATCH_NOT_FOUND';
  end if;

  select * into operation_row
  from private.inventory_batch_operations o
  where o.batch_id = batch_row.id
    and o.operation_key = pg_catalog.btrim(p_operation_key)
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'OPERATION_NOT_FOUND';
  end if;

  if operation_row.status = 'applied' then
    select i.quantity_on_hand, i.quantity_reserved
      into current_quantity, reserved_quantity
    from public.inventory i
    where i.variant_id = operation_row.variant_id;

    return query select batch_row.id, operation_row.id, 'already_applied'::text,
      operation_row.variant_id, operation_row.sku, current_quantity,
      reserved_quantity, current_quantity - reserved_quantity,
      operation_row.applied_delta, operation_row.movement_id;
    return;
  end if;

  perform 1
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = operation_row.variant_id and v.product_id = operation_row.product_id
    and v.sku = operation_row.sku and v.is_active
    and p.code is not distinct from operation_row.product_code
  for key share of v;

  if not found then
    raise exception using errcode = 'P0001', message = 'BATCH_CATALOG_MISMATCH';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('bellmont.inventory:' || operation_row.variant_id::text, 0)
  );

  select i.quantity_on_hand, i.quantity_reserved
    into current_quantity, reserved_quantity
  from public.inventory i
  where i.variant_id = operation_row.variant_id
  for update;

  if not found then
    current_quantity := 0;
    reserved_quantity := 0;
  end if;

  if current_quantity <> operation_row.expected_quantity then
    raise exception using errcode = 'P0001', message = 'BATCH_INVENTORY_DIVERGENCE';
  end if;

  if operation_row.target_quantity < reserved_quantity then
    raise exception using errcode = 'P0001', message = 'BELOW_RESERVED';
  end if;

  select * into movement_result
  from public.apply_inventory_movement(
    operation_row.variant_id,
    operation_row.target_quantity - current_quantity,
    batch_row.reference || ' [' || batch_row.batch_key || '/' || operation_row.operation_key || ']'
  );

  select m.id into recorded_movement_id
  from public.inventory_movements m
  where m.variant_id = operation_row.variant_id
    and m.quantity_after = movement_result.quantity_on_hand
    and m.created_by = (select auth.uid())
  order by m.id desc
  limit 1;

  if recorded_movement_id is null then
    raise exception using errcode = 'P0001', message = 'MOVEMENT_AUDIT_MISSING';
  end if;

  update private.inventory_batch_operations o
  set status = 'applied',
      applied_delta = operation_row.target_quantity - current_quantity,
      movement_id = recorded_movement_id,
      applied_by = (select auth.uid()),
      applied_at = now()
  where o.id = operation_row.id
  returning * into operation_row;

  update private.inventory_batches b
  set status = case
        when not exists (
          select 1 from private.inventory_batch_operations pending
          where pending.batch_id = b.id and pending.status = 'pending'
        ) then 'completed'
        else 'in_progress'
      end,
      started_at = coalesce(b.started_at, now()),
      completed_at = case
        when not exists (
          select 1 from private.inventory_batch_operations pending
          where pending.batch_id = b.id and pending.status = 'pending'
        ) then now()
        else null
      end
  where b.id = batch_row.id;

  return query select batch_row.id, operation_row.id, operation_row.status,
    operation_row.variant_id, operation_row.sku,
    movement_result.quantity_on_hand, movement_result.quantity_reserved,
    movement_result.available_quantity, operation_row.applied_delta,
    operation_row.movement_id;
end;
$$;

revoke all on function private.prepare_inventory_batch(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function private.prepare_inventory_batch(text, text, jsonb)
  to authenticated;

revoke all on function private.apply_inventory_batch_operation(text, text)
  from public, anon, authenticated;
grant execute on function private.apply_inventory_batch_operation(text, text)
  to authenticated;

create or replace function public.prepare_inventory_batch(
  p_batch_key text,
  p_reference text,
  p_operations jsonb
)
returns table (
  batch_id bigint,
  batch_status text,
  manifest_hash text,
  operation_count integer,
  target_total bigint
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.prepare_inventory_batch(p_batch_key, p_reference, p_operations);
$$;

create or replace function public.apply_inventory_batch_operation(
  p_batch_key text,
  p_operation_key text
)
returns table (
  batch_id bigint,
  operation_id bigint,
  operation_status text,
  variant_id bigint,
  sku text,
  quantity_on_hand bigint,
  quantity_reserved bigint,
  available_quantity bigint,
  applied_delta bigint,
  movement_id bigint
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.apply_inventory_batch_operation(p_batch_key, p_operation_key);
$$;

revoke all on function public.prepare_inventory_batch(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.prepare_inventory_batch(text, text, jsonb)
  to authenticated;

revoke all on function public.apply_inventory_batch_operation(text, text)
  from public, anon, authenticated;
grant execute on function public.apply_inventory_batch_operation(text, text)
  to authenticated;

comment on table private.inventory_batches is
  'Immutable inventory batch manifests used for idempotent and resumable administrative launches.';
comment on table private.inventory_batch_operations is
  'One immutable target-based inventory operation per variant and batch.';
comment on function public.prepare_inventory_batch(text, text, jsonb) is
  'Admin-only preparation of an immutable, catalog-validated inventory batch.';
comment on function public.apply_inventory_batch_operation(text, text) is
  'Admin-only idempotent application of one previously prepared inventory operation.';
