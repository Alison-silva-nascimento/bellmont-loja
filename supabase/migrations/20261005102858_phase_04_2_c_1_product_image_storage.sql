-- Phase 04.2C.1: product image metadata and Storage authorization.
-- Prepared for review only. Do not apply remotely without explicit approval.

-- Store a stable Storage object path, never a mutable absolute public URL.
alter table public.product_images
  rename column url to storage_path;

alter table public.product_images
  rename constraint product_images_url_not_blank
  to product_images_storage_path_not_blank;

alter table public.product_images
  add constraint product_images_storage_path_format check (
    storage_path ~ (
      '^products/' || product_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
    )
  );

comment on column public.product_images.storage_path is
  'Object path inside the product-images bucket. Format: products/{product_id}/{uuid}.{ext}.';

-- A product has at most one primary image, including variant-specific images.
drop index public.product_images_one_primary_product_idx;
drop index public.product_images_one_primary_variant_idx;

create unique index product_images_one_primary_per_product_idx
  on public.product_images (product_id)
  where is_primary;

-- Phase 04.2C.2 must introduce one transactional operation/RPC that clears the
-- current primary and sets the new primary before enabling that action in the UI.

create index product_images_product_variant_idx
  on public.product_images (product_id, variant_id)
  where variant_id is not null;

-- Serialize inserts per product and enforce the initial gallery limit in the DB.
create or replace function private.enforce_product_image_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  image_count integer;
begin
  perform 1
  from public.products
  where id = new.product_id
  for update;

  select count(*)::integer
  into image_count
  from public.product_images
  where product_id = new.product_id;

  if image_count >= 8 then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_IMAGE_LIMIT_EXCEEDED';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_product_image_limit() from public, anon, authenticated;

create trigger product_images_enforce_limit_before_insert
before insert on public.product_images
for each row execute function private.enforce_product_image_limit();

-- Moving metadata between products would desynchronize its canonical Storage
-- path and could bypass the per-product gallery limit.
create or replace function private.prevent_product_image_product_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.product_id is distinct from old.product_id then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_IMAGE_PRODUCT_IMMUTABLE';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_product_image_product_change() from public, anon, authenticated;

create trigger product_images_prevent_product_change_before_update
before update of product_id on public.product_images
for each row execute function private.prevent_product_image_product_change();

-- When the primary image is deleted, promote the first remaining image by
-- deterministic gallery order. Product deletion cascades leave nothing to promote.
create or replace function private.promote_product_primary_image_after_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_primary and exists (
    select 1 from public.products where id = old.product_id
  ) then
    update public.product_images
    set is_primary = true
    where id = (
      select id
      from public.product_images
      where product_id = old.product_id
      order by sort_order, id
      limit 1
    );
  end if;

  return old;
end;
$$;

revoke all on function private.promote_product_primary_image_after_delete() from public, anon, authenticated;

create trigger product_images_promote_primary_after_delete
after delete on public.product_images
for each row execute function private.promote_product_primary_image_after_delete();

-- Public catalog media: public delivery, authenticated admin-only management.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
);

create policy product_images_storage_admin_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and name ~ '^products/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

create policy product_images_storage_admin_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and name ~ '^products/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1
    from public.products
    where id::text = (storage.foldername(name))[2]
  )
);

create policy product_images_storage_admin_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and (select private.is_admin())
)
with check (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and name ~ '^products/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1
    from public.products
    where id::text = (storage.foldername(name))[2]
  )
);

create policy product_images_storage_admin_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and name ~ '^products/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);
