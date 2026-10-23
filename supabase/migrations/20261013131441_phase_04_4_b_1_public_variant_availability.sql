-- BELLMONT - Phase 04.4B.1 public, coarse-grained availability.
-- Exact inventory quantities remain private. This migration contains no data changes.
-- availability_private must not be added to the Supabase Data API exposed schemas.

create schema if not exists availability_private;

revoke all on schema availability_private from public, anon, authenticated, service_role;

create or replace function availability_private.public_variant_availability()
returns table (
  product_code text,
  variant_sku text,
  available boolean,
  availability_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    products.code as product_code,
    product_variants.sku as variant_sku,
    inventory.variant_id is not null
      and inventory.quantity_on_hand - inventory.quantity_reserved > 0 as available,
    case
      when inventory.variant_id is null then 'unconfirmed'
      when inventory.quantity_on_hand - inventory.quantity_reserved > 0 then 'available'
      else 'out_of_stock'
    end as availability_status
  from public.products
  join public.product_variants
    on product_variants.product_id = products.id
  left join public.inventory
    on inventory.variant_id = product_variants.id
  where products.status = 'active'
    and products.code is not null
    and products.code <> 'TEST-FIXTURE-01'
    and product_variants.is_active;
$$;

comment on function availability_private.public_variant_availability() is
  'Returns public saleability status for active variants without exposing exact inventory quantities.';

revoke all on function availability_private.public_variant_availability()
  from public, anon, authenticated, service_role;
grant usage on schema availability_private to anon, authenticated;
grant execute on function availability_private.public_variant_availability()
  to anon, authenticated;

create or replace function public.get_public_variant_availability()
returns table (
  product_code text,
  variant_sku text,
  available boolean,
  availability_status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from availability_private.public_variant_availability();
$$;

comment on function public.get_public_variant_availability() is
  'Public API projection of active variant availability. It never returns stock quantities or reservations.';

revoke all on function public.get_public_variant_availability()
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_variant_availability()
  to anon, authenticated;
