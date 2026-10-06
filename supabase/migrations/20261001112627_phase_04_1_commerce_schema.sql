-- BELLMONT + IMPERIO FIT - Phase 04.1 commerce foundation.
-- This migration intentionally contains no catalog seed data and no credentials.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users (id) on delete set null
);

comment on table private.admin_users is
  'Server-managed allowlist of Supabase Auth users authorized as catalog administrators.';

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from private.admin_users
      where user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (select private.is_admin());
$$;

revoke all on function public.is_current_user_admin() from public, anon, authenticated;
grant execute on function public.is_current_user_admin() to authenticated;

create table public.products (
  id bigint generated always as identity primary key,
  code text null,
  slug text not null,
  name text not null,
  brand text not null,
  category text not null,
  subcategory text null,
  description text null,
  price numeric(12, 2) null,
  compare_at_price numeric(12, 2) null,
  status text not null default 'draft',
  featured boolean not null default false,
  new_arrival boolean not null default false,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_code_unique unique (code),
  constraint products_slug_unique unique (slug),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_slug_not_blank check (btrim(slug) <> ''),
  constraint products_brand_not_blank check (btrim(brand) <> ''),
  constraint products_category_not_blank check (btrim(category) <> ''),
  constraint products_price_nonnegative check (price is null or price >= 0),
  constraint products_compare_at_price_nonnegative check (
    compare_at_price is null or compare_at_price >= 0
  ),
  constraint products_status_valid check (status in ('draft', 'active', 'archived'))
);

create table public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  sku text not null,
  color text null,
  size text null,
  volume text null,
  options jsonb not null default '{}'::jsonb,
  price_override numeric(12, 2) null,
  compare_at_price numeric(12, 2) null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_sku_unique unique (sku),
  constraint product_variants_product_id_id_unique unique (product_id, id),
  constraint product_variants_sku_not_blank check (btrim(sku) <> ''),
  constraint product_variants_options_object check (jsonb_typeof(options) = 'object'),
  constraint product_variants_price_override_nonnegative check (
    price_override is null or price_override >= 0
  ),
  constraint product_variants_compare_at_price_nonnegative check (
    compare_at_price is null or compare_at_price >= 0
  )
);

create table public.inventory (
  variant_id bigint primary key references public.product_variants (id) on delete cascade,
  quantity_on_hand bigint not null default 0,
  quantity_reserved bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null,
  constraint inventory_quantity_on_hand_nonnegative check (quantity_on_hand >= 0),
  constraint inventory_quantity_reserved_nonnegative check (quantity_reserved >= 0),
  constraint inventory_reserved_within_on_hand check (quantity_reserved <= quantity_on_hand)
);

create table public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  variant_id bigint null,
  url text not null,
  alt_text text null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_variant_product_fkey
    foreign key (product_id, variant_id)
    references public.product_variants (product_id, id)
    on delete cascade,
  constraint product_images_url_not_blank check (btrim(url) <> ''),
  constraint product_images_sort_order_nonnegative check (sort_order >= 0)
);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id bigint not null references public.product_variants (id) on delete restrict,
  movement_type text not null,
  quantity_delta bigint not null,
  quantity_after bigint not null,
  reference_type text null,
  reference_id text null,
  note text null,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_type_valid check (
    movement_type in ('initial', 'adjustment', 'reservation', 'release', 'sale', 'return')
  ),
  constraint inventory_movements_delta_nonzero check (quantity_delta <> 0),
  constraint inventory_movements_quantity_after_nonnegative check (quantity_after >= 0)
);

comment on table public.inventory_movements is
  'Append-only stock ledger. Phase 04.1 records quantity_on_hand changes through an inventory trigger.';

create index product_variants_product_id_idx
  on public.product_variants (product_id);
create index product_variants_active_product_idx
  on public.product_variants (product_id)
  where is_active;
create index product_images_product_id_sort_order_idx
  on public.product_images (product_id, sort_order, id);
create index product_images_variant_id_idx
  on public.product_images (variant_id)
  where variant_id is not null;
create unique index product_images_one_primary_product_idx
  on public.product_images (product_id)
  where is_primary and variant_id is null;
create unique index product_images_one_primary_variant_idx
  on public.product_images (variant_id)
  where is_primary and variant_id is not null;
create index inventory_movements_variant_created_at_idx
  on public.inventory_movements (variant_id, created_at desc);
create index products_public_listing_idx
  on public.products (category, brand, created_at desc)
  where status = 'active';

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function private.set_updated_at();

create or replace function private.record_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta bigint;
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  delta := new.quantity_on_hand - coalesce(old.quantity_on_hand, 0);

  if delta <> 0 then
    insert into public.inventory_movements (
      variant_id,
      movement_type,
      quantity_delta,
      quantity_after,
      created_by
    ) values (
      new.variant_id,
      case when tg_op = 'INSERT' then 'initial' else 'adjustment' end,
      delta,
      new.quantity_on_hand,
      (select auth.uid())
    );
  end if;

  return new;
end;
$$;

revoke all on function private.record_inventory_movement() from public, anon, authenticated;

create trigger inventory_record_movement
before insert or update of quantity_on_hand on public.inventory
for each row execute function private.record_inventory_movement();

create or replace function private.prevent_inventory_movement_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'inventory_movements is append-only';
end;
$$;

revoke all on function private.prevent_inventory_movement_mutation() from public, anon, authenticated;

create trigger inventory_movements_append_only
before update or delete on public.inventory_movements
for each row execute function private.prevent_inventory_movement_mutation();

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_movements enable row level security;

alter table public.products force row level security;
alter table public.product_variants force row level security;
alter table public.inventory force row level security;
alter table public.product_images force row level security;
alter table public.inventory_movements force row level security;

revoke all on table public.products from public, anon, authenticated;
revoke all on table public.product_variants from public, anon, authenticated;
revoke all on table public.inventory from public, anon, authenticated;
revoke all on table public.product_images from public, anon, authenticated;
revoke all on table public.inventory_movements from public, anon, authenticated;

grant select on table public.products to anon, authenticated;
grant select on table public.product_variants to anon, authenticated;
grant select on table public.inventory to anon, authenticated;
grant select on table public.product_images to anon, authenticated;

grant insert, update, delete on table public.products to authenticated;
grant insert, update, delete on table public.product_variants to authenticated;
grant insert, update, delete on table public.inventory to authenticated;
grant insert, update, delete on table public.product_images to authenticated;
grant select on table public.inventory_movements to authenticated;

grant all on table public.products to service_role;
grant all on table public.product_variants to service_role;
grant all on table public.inventory to service_role;
grant all on table public.product_images to service_role;
grant all on table public.inventory_movements to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

create policy products_public_read
on public.products for select
to anon, authenticated
using (status = 'active');

create policy products_admin_read
on public.products for select
to authenticated
using ((select private.is_admin()));

create policy products_admin_insert
on public.products for insert
to authenticated
with check ((select private.is_admin()));

create policy products_admin_update
on public.products for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy products_admin_delete
on public.products for delete
to authenticated
using ((select private.is_admin()));

create policy product_variants_public_read
on public.product_variants for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1 from public.products
    where products.id = product_variants.product_id
      and products.status = 'active'
  )
);

create policy product_variants_admin_all
on public.product_variants for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy inventory_public_read
on public.inventory for select
to anon, authenticated
using (
  exists (
    select 1
    from public.product_variants
    join public.products on products.id = product_variants.product_id
    where product_variants.id = inventory.variant_id
      and product_variants.is_active
      and products.status = 'active'
  )
);

create policy inventory_admin_all
on public.inventory for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy product_images_public_read
on public.product_images for select
to anon, authenticated
using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and products.status = 'active'
  )
);

create policy product_images_admin_all
on public.product_images for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy inventory_movements_admin_read
on public.inventory_movements for select
to authenticated
using ((select private.is_admin()));

-- New public objects remain inaccessible until explicitly granted.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
