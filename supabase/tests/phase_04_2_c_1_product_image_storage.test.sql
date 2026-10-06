begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(58);

select has_column('public', 'product_images', 'storage_path', 'product_images stores a Storage path');
select col_not_null('public', 'product_images', 'storage_path', 'storage_path is required');
select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'product_images' and column_name = 'url'
), 'absolute URL column was replaced');
select has_index('public', 'product_images', 'product_images_one_primary_per_product_idx', 'one-primary index exists');
select ok((select indisunique from pg_index where indexrelid = 'public.product_images_one_primary_per_product_idx'::regclass), 'one-primary index is unique');
select trigger_is('public', 'product_images', 'product_images_enforce_limit_before_insert', 'private', 'enforce_product_image_limit', 'gallery limit trigger is installed');
select trigger_is('public', 'product_images', 'product_images_prevent_product_change_before_update', 'private', 'prevent_product_image_product_change', 'product immutability trigger is installed');
select trigger_is('public', 'product_images', 'product_images_promote_primary_after_delete', 'private', 'promote_product_primary_image_after_delete', 'primary promotion trigger is installed');

select results_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'product-images'$$,
  $$values (true, 5242880::bigint, array['image/jpeg','image/png','image/webp']::text[])$$,
  'product-images bucket is public with expected limits'
);

select policies_are(
  'storage', 'objects',
  array['product_images_storage_admin_delete', 'product_images_storage_admin_insert', 'product_images_storage_admin_select', 'product_images_storage_admin_update'],
  'Storage has only the four product-image policies'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'storage-admin@bellmont.invalid', '', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'storage-user@bellmont.invalid', '', now(), now(), now());

insert into private.admin_users (user_id)
values ('20000000-0000-0000-0000-000000000001');

insert into public.products (code, slug, name, brand, category, status)
values ('IMG-TEST', 'img-test', 'Image Test', 'bellmont', 'streetwear', 'active');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('product-images', 'products/1/550e8400-e29b-41d4-a716-446655440000.webp')$$,
  '42501', null, 'anon cannot upload'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path) select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440000.webp' from public.products where code='IMG-TEST'$$,
  '42501', null, 'anon cannot create image metadata'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) select 'product-images', 'products/' || id || '/550e8400-e29b-41d4-a716-446655440001.webp' from public.products where code='IMG-TEST'$$,
  '42501', null, 'authenticated non-admin cannot upload'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path) select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440001.webp' from public.products where code='IMG-TEST'$$,
  '42501', null, 'authenticated non-admin cannot create image metadata'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$insert into storage.objects (bucket_id, name) select 'product-images', 'products/' || id || '/550e8400-e29b-41d4-a716-446655440002.webp' from public.products where code='IMG-TEST'$$,
  'admin can upload to the product bucket'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('product-images', 'other/1/550e8400-e29b-41d4-a716-446655440003.webp')$$,
  '42501', null, 'admin cannot upload outside the product path'
);
select lives_ok(
  $$delete from storage.objects where name like 'products/%/550e8400-e29b-41d4-a716-446655440002.webp'$$,
  'admin can delete from the product bucket'
);
select lives_ok(
  $$insert into public.product_images (product_id, storage_path, sort_order, is_primary) select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440010.webp', 0, true from public.products where code='IMG-TEST'$$,
  'admin can create image metadata'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path, sort_order, is_primary) select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440011.webp', 1, true from public.products where code='IMG-TEST'$$,
  '23505', null, 'a product cannot have two primary images'
);
select lives_ok(
  $$insert into public.product_images (product_id, storage_path, sort_order) select id, 'products/' || id || '/550e8400-e29b-41d4-a716-44665544001' || n || '.webp', n from public.products cross join generate_series(1,7) n where code='IMG-TEST'$$,
  'gallery accepts up to eight images'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path, sort_order) select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440019.webp', 9 from public.products where code='IMG-TEST'$$,
  'P0001', 'PRODUCT_IMAGE_LIMIT_EXCEEDED', 'ninth image is rejected'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path) select id, '../escape.webp' from public.products where code='IMG-TEST'$$,
  '23514', null, 'invalid and traversing paths are rejected'
);
select lives_ok(
  $$delete from public.product_images where is_primary and product_id=(select id from public.products where code='IMG-TEST')$$,
  'primary image can be deleted'
);
select is(
  (select count(*) from public.product_images where product_id=(select id from public.products where code='IMG-TEST') and is_primary),
  1::bigint,
  'first remaining image is promoted'
);
select results_eq(
  $$select sort_order from public.product_images where product_id=(select id from public.products where code='IMG-TEST') order by sort_order, id limit 1$$,
  array[1],
  'gallery order is deterministic'
);
select ok(
  (select count(*) = 4 from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'product_images_storage_admin_%'),
  'Storage policies remain bucket-scoped and explicit'
);

-- Additional path, FK, immutability, deletion, and full CRUD/RLS coverage.
insert into public.products (code, slug, name, brand, category, status)
values
  ('IMG-OTHER', 'img-other', 'Image Other', 'bellmont', 'streetwear', 'active'),
  ('IMG-LAST', 'img-last', 'Image Last', 'bellmont', 'streetwear', 'active');

insert into public.product_variants (product_id, sku, size)
select id, 'IMG-OTHER-M', 'M' from public.products where code='IMG-OTHER';

select throws_ok(
  $$insert into public.product_images (product_id, storage_path) select a.id, 'products/' || b.id || '/550e8400-e29b-41d4-a716-446655440100.webp' from public.products a cross join public.products b where a.code='IMG-TEST' and b.code='IMG-OTHER'$$,
  '23514', null, 'product ID in path must match row product_id'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path) select id, 'products/' || id || '/foto.webp' from public.products where code='IMG-TEST'$$,
  '23514', null, 'non-UUID filename is rejected'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path) select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440101.exe' from public.products where code='IMG-TEST'$$,
  '23514', null, 'invalid extension is rejected'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path) select id, 'products//' || id || '/550e8400-e29b-41d4-a716-446655440102.webp' from public.products where code='IMG-TEST'$$,
  '23514', null, 'extra slash is rejected'
);
select throws_ok(
  $$insert into public.product_images (product_id, storage_path) select id, 'products/' || id || '/sub/550e8400-e29b-41d4-a716-446655440103.webp' from public.products where code='IMG-TEST'$$,
  '23514', null, 'unexpected subfolder is rejected'
);
select throws_ok(
  $$insert into public.product_images (product_id, variant_id, storage_path) select a.id, v.id, 'products/' || a.id || '/550e8400-e29b-41d4-a716-446655440104.webp' from public.products a join public.products b on b.code='IMG-OTHER' join public.product_variants v on v.product_id=b.id where a.code='IMG-TEST'$$,
  '23503', null, 'variant from another product is rejected'
);
select throws_ok(
  $$update public.product_images set product_id=(select id from public.products where code='IMG-OTHER'), storage_path='products/' || (select id from public.products where code='IMG-OTHER') || '/550e8400-e29b-41d4-a716-446655440105.webp' where id=(select id from public.product_images where product_id=(select id from public.products where code='IMG-TEST') order by id limit 1)$$,
  'P0001', 'PRODUCT_IMAGE_PRODUCT_IMMUTABLE', 'image metadata cannot move to another product'
);
select lives_ok(
  $$update public.product_images set alt_text='normal update' where product_id=(select id from public.products where code='IMG-TEST')$$,
  'normal metadata update remains allowed'
);
select is(
  (select count(*) from public.product_images where product_id=(select id from public.products where code='IMG-TEST')),
  7::bigint,
  'normal update does not create another image'
);
select lives_ok(
  $$delete from public.product_images where id=(select id from public.product_images where product_id=(select id from public.products where code='IMG-TEST') and not is_primary order by sort_order desc, id desc limit 1)$$,
  'deleting a non-primary image succeeds'
);
select is(
  (select count(*) from public.product_images where product_id=(select id from public.products where code='IMG-TEST') and is_primary),
  1::bigint,
  'deleting a non-primary image preserves the current primary'
);
select lives_ok(
  $$insert into public.product_images (product_id, storage_path, is_primary) select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440106.webp', true from public.products where code='IMG-LAST'$$,
  'single primary image fixture is accepted'
);
select lives_ok(
  $$delete from public.product_images where product_id=(select id from public.products where code='IMG-LAST')$$,
  'deleting the last image succeeds'
);
select is(
  (select count(*) from public.product_images where product_id=(select id from public.products where code='IMG-LAST') and is_primary),
  0::bigint,
  'product may remain without a primary image'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name) select 'product-images', 'products/' || id || '/550e8400-e29b-41d4-a716-446655440107.webp' from public.products where code='IMG-TEST'$$,
  'admin can insert a canonical object for CRUD tests'
);
select lives_ok(
  $$update storage.objects set user_metadata='{"reviewed":true}'::jsonb where bucket_id='product-images' and name like '%440107.webp'$$,
  'admin can update a canonical Storage object'
);
select results_eq(
  $$select count(*) from storage.objects where bucket_id='product-images' and name like '%440107.webp'$$,
  array[1::bigint],
  'admin can select a canonical Storage object'
);
select throws_ok(
  $$update storage.objects set name='other/550e8400-e29b-41d4-a716-446655440107.webp' where bucket_id='product-images' and name like '%440107.webp'$$,
  '42501', null, 'admin cannot move an object outside the canonical path'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$update public.product_images set alt_text='anon'$$,
  '42501', null, 'anon cannot update image metadata'
);
select throws_ok(
  $$delete from public.product_images$$,
  '42501', null, 'anon cannot delete image metadata'
);
select results_eq(
  $$update storage.objects set user_metadata='{"attempt":"anon"}'::jsonb where bucket_id='product-images' returning id$$,
  $$select id from storage.objects where false$$,
  'anon cannot update Storage objects'
);
select results_eq(
  $$delete from storage.objects where bucket_id='product-images' returning id$$,
  $$select id from storage.objects where false$$,
  'anon cannot delete Storage objects'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select results_eq(
  $$update public.product_images set alt_text='user' returning id$$,
  $$select id from public.product_images where false$$,
  'authenticated non-admin cannot update image metadata'
);
select results_eq(
  $$delete from public.product_images returning id$$,
  $$select id from public.product_images where false$$,
  'authenticated non-admin cannot delete image metadata'
);
select results_eq(
  $$update storage.objects set user_metadata='{"attempt":"user"}'::jsonb where bucket_id='product-images' returning id$$,
  $$select id from storage.objects where false$$,
  'authenticated non-admin cannot update Storage objects'
);
select results_eq(
  $$delete from storage.objects where bucket_id='product-images' returning id$$,
  $$select id from storage.objects where false$$,
  'authenticated non-admin cannot delete Storage objects'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$delete from storage.objects where bucket_id='product-images' and name like '%440107.webp'$$,
  'admin can delete a canonical Storage object'
);
select results_eq(
  $$select count(*) from public.product_images where product_id=(select id from public.products where code='IMG-TEST')$$,
  array[6::bigint],
  'admin can select remaining image metadata'
);
select lives_ok(
  $$update public.product_images set alt_text='admin final' where product_id=(select id from public.products where code='IMG-TEST')$$,
  'admin can update image metadata'
);
select lives_ok(
  $$delete from public.product_images where id=(select id from public.product_images where product_id=(select id from public.products where code='IMG-TEST') and not is_primary order by id limit 1)$$,
  'admin can delete image metadata'
);

insert into public.products (id, code, slug, name, brand, category, status)
overriding system value
values (123, 'IMG-SHADOW', 'img-shadow', 'Camiseta BELLMONT', 'bellmont', 'streetwear', 'active');

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('product-images', 'products/123/550e8400-e29b-41d4-a716-446655440120.webp')$$,
  'product existence is resolved from product ID 123 in the object path, not products.name'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('product-images', 'products/999/550e8400-e29b-41d4-a716-446655440121.webp')$$,
  '42501', null, 'canonical path is rejected when its product ID does not exist'
);

select * from finish();
rollback;
