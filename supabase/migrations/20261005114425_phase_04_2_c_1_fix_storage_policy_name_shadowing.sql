-- Phase 04.2C.1 hotfix: prevent public.products.name from shadowing the
-- storage.objects.name path inside correlated product existence checks.

drop policy product_images_storage_admin_insert on storage.objects;
drop policy product_images_storage_admin_update on storage.objects;

create policy product_images_storage_admin_insert
on storage.objects for insert
to authenticated
with check (
  storage.objects.bucket_id = 'product-images'
  and (select private.is_admin())
  and storage.objects.name ~ '^products/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1
    from public.products as product
    where product.id::text = (storage.foldername(storage.objects.name))[2]
  )
);

create policy product_images_storage_admin_update
on storage.objects for update
to authenticated
using (
  storage.objects.bucket_id = 'product-images'
  and (select private.is_admin())
  and storage.objects.name ~ '^products/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1
    from public.products as product
    where product.id::text = (storage.foldername(storage.objects.name))[2]
  )
)
with check (
  storage.objects.bucket_id = 'product-images'
  and (select private.is_admin())
  and storage.objects.name ~ '^products/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  and exists (
    select 1
    from public.products as product
    where product.id::text = (storage.foldername(storage.objects.name))[2]
  )
);
