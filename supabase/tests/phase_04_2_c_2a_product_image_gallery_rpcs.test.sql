begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(40);

select has_function(
  'public', 'set_primary_product_image', array['bigint', 'bigint'],
  'set-primary RPC exists'
);
select has_function(
  'public', 'reorder_product_images', array['bigint', 'bigint[]'],
  'reorder RPC exists'
);
select function_privs_are(
  'public', 'set_primary_product_image', array['bigint', 'bigint'],
  'authenticated', array['EXECUTE'],
  'authenticated can execute set-primary RPC'
);
select function_privs_are(
  'public', 'reorder_product_images', array['bigint', 'bigint[]'],
  'authenticated', array['EXECUTE'],
  'authenticated can execute reorder RPC'
);
select ok(
  not has_function_privilege('anon', 'public.set_primary_product_image(bigint,bigint)', 'execute'),
  'anon cannot execute set-primary RPC'
);
select ok(
  not has_function_privilege('anon', 'public.reorder_product_images(bigint,bigint[])', 'execute'),
  'anon cannot execute reorder RPC'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.set_primary_product_image(bigint,bigint)'::regprocedure),
  'set-primary RPC is SECURITY INVOKER'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.reorder_product_images(bigint,bigint[])'::regprocedure),
  'reorder RPC is SECURITY INVOKER'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.set_primary_product_image(bigint,bigint)'::regprocedure),
  'set-primary RPC has an empty search_path'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.reorder_product_images(bigint,bigint[])'::regprocedure),
  'reorder RPC has an empty search_path'
);
select ok(
  position('private.is_admin()' in pg_get_functiondef('public.set_primary_product_image(bigint,bigint)'::regprocedure)) > 0
  and position('for update' in lower(pg_get_functiondef('public.set_primary_product_image(bigint,bigint)'::regprocedure))) > 0,
  'set-primary RPC explicitly authorizes and locks the product'
);
select ok(
  position('private.is_admin()' in pg_get_functiondef('public.reorder_product_images(bigint,bigint[])'::regprocedure)) > 0
  and position('for update' in lower(pg_get_functiondef('public.reorder_product_images(bigint,bigint[])'::regprocedure))) > 0,
  'reorder RPC explicitly authorizes and locks the product'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gallery-admin@bellmont.invalid', '', now(), now(), now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gallery-user@bellmont.invalid', '', now(), now(), now());

insert into private.admin_users (user_id)
values ('30000000-0000-0000-0000-000000000001');

insert into public.products (code, slug, name, brand, category, status)
values
  ('GALLERY-A', 'gallery-a', 'Gallery A', 'bellmont', 'streetwear', 'draft'),
  ('GALLERY-B', 'gallery-b', 'Gallery B', 'bellmont', 'streetwear', 'draft'),
  ('GALLERY-EMPTY', 'gallery-empty', 'Gallery Empty', 'bellmont', 'streetwear', 'draft');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$select * from public.set_primary_product_image(1, 1)$$,
  '42501', null, 'anon set-primary call is rejected by grants'
);
select throws_ok(
  $$select * from public.reorder_product_images(1, array[]::bigint[])$$,
  '42501', null, 'anon reorder call is rejected by grants'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.set_primary_product_image((select id from public.products where code='GALLERY-A'), 1)$$,
  'P0001', 'NOT_ADMIN', 'authenticated non-admin is rejected by set-primary RPC'
);
select throws_ok(
  $$select * from public.reorder_product_images((select id from public.products where code='GALLERY-A'), array[]::bigint[])$$,
  'P0001', 'NOT_ADMIN', 'authenticated non-admin is rejected by reorder RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into public.product_images (product_id, storage_path, sort_order, is_primary)
select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440201.webp', 0, true
from public.products where code='GALLERY-A';
insert into public.product_images (product_id, storage_path, sort_order, is_primary)
select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440202.webp', 1, false
from public.products where code='GALLERY-A';
insert into public.product_images (product_id, storage_path, sort_order, is_primary)
select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440203.webp', 2, false
from public.products where code='GALLERY-A';
insert into public.product_images (product_id, storage_path, sort_order, is_primary)
select id, 'products/' || id || '/550e8400-e29b-41d4-a716-446655440204.webp', 0, true
from public.products where code='GALLERY-B';

select results_eq(
  $$select product_id, image_id, storage_path, sort_order, is_primary
    from public.set_primary_product_image(
      (select id from public.products where code='GALLERY-A'),
      (select id from public.product_images where storage_path like '%440202.webp')
    )$$,
  $$select product_id, id, storage_path, sort_order, true
    from public.product_images where storage_path like '%440202.webp'$$,
  'admin can atomically select an image as primary'
);
select results_eq(
  $$select count(*)::bigint from public.product_images
    where product_id=(select id from public.products where code='GALLERY-A') and is_primary$$,
  array[1::bigint], 'set-primary leaves exactly one primary image'
);
select ok(
  (select is_primary from public.product_images where storage_path like '%440202.webp'),
  'requested image becomes primary'
);
select ok(
  not (select is_primary from public.product_images where storage_path like '%440201.webp'),
  'previous primary image is cleared first'
);
select lives_ok(
  $$select * from public.set_primary_product_image(
    (select id from public.products where code='GALLERY-A'),
    (select id from public.product_images where storage_path like '%440202.webp')
  )$$,
  'setting the current primary again is idempotent'
);
select results_eq(
  $$select count(*)::bigint from public.product_images
    where product_id=(select id from public.products where code='GALLERY-A') and is_primary$$,
  array[1::bigint], 'idempotent call preserves exactly one primary image'
);
select throws_ok(
  $$select * from public.set_primary_product_image(
    (select id from public.products where code='GALLERY-A'),
    (select id from public.product_images where storage_path like '%440204.webp')
  )$$,
  'P0001', 'PRODUCT_IMAGE_NOT_FOUND', 'image from another product is rejected'
);
select throws_ok(
  $$select * from public.set_primary_product_image(9223372036854775807, 1)$$,
  'P0001', 'PRODUCT_NOT_FOUND', 'missing product is rejected by set-primary RPC'
);
select throws_ok(
  $$select * from public.set_primary_product_image(
    (select id from public.products where code='GALLERY-A'), 9223372036854775807
  )$$,
  'P0001', 'PRODUCT_IMAGE_NOT_FOUND', 'missing image is rejected by set-primary RPC'
);

select results_eq(
  $$select image_id, sort_order from public.reorder_product_images(
    (select id from public.products where code='GALLERY-A'),
    array[
      (select id from public.product_images where storage_path like '%440203.webp'),
      (select id from public.product_images where storage_path like '%440201.webp'),
      (select id from public.product_images where storage_path like '%440202.webp')
    ]
  ) order by sort_order$$,
  $$select id, expected_order from (
      values
        ((select id from public.product_images where storage_path like '%440203.webp'), 0),
        ((select id from public.product_images where storage_path like '%440201.webp'), 1),
        ((select id from public.product_images where storage_path like '%440202.webp'), 2)
    ) expected(id, expected_order) order by expected_order$$,
  'admin can atomically reorder the complete gallery'
);
select results_eq(
  $$select sort_order from public.product_images
    where product_id=(select id from public.products where code='GALLERY-A') order by sort_order$$,
  $$values (0), (1), (2)$$,
  'reorder persists a contiguous zero-based order'
);
select ok(
  (select is_primary from public.product_images where storage_path like '%440202.webp'),
  'reorder does not change the primary image'
);
select results_eq(
  $$select storage_path from public.product_images
    where product_id=(select id from public.products where code='GALLERY-A') order by storage_path$$,
  $$values
    ((select 'products/' || id || '/550e8400-e29b-41d4-a716-446655440201.webp' from public.products where code='GALLERY-A')),
    ((select 'products/' || id || '/550e8400-e29b-41d4-a716-446655440202.webp' from public.products where code='GALLERY-A')),
    ((select 'products/' || id || '/550e8400-e29b-41d4-a716-446655440203.webp' from public.products where code='GALLERY-A'))$$,
  'reorder does not change storage paths'
);
select ok(
  (select count(*) = 3
   from public.product_images as image
   where image.product_id=(select id from public.products where code='GALLERY-A')
     and image.storage_path in (
       select 'products/' || product.id || '/550e8400-e29b-41d4-a716-44665544020' || suffix || '.webp'
       from public.products as product
       cross join generate_series(1, 3) as suffix
       where product.code='GALLERY-A'
     )),
  'reorder does not move images to another product'
);
select throws_ok(
  $$select * from public.reorder_product_images(
    (select id from public.products where code='GALLERY-A'),
    array[
      (select id from public.product_images where storage_path like '%440201.webp'),
      (select id from public.product_images where storage_path like '%440201.webp'),
      (select id from public.product_images where storage_path like '%440202.webp')
    ]
  )$$,
  'P0001', 'DUPLICATE_PRODUCT_IMAGE_ID', 'duplicate image IDs are rejected'
);
select throws_ok(
  $$select * from public.reorder_product_images(
    (select id from public.products where code='GALLERY-A'),
    array[
      (select id from public.product_images where storage_path like '%440201.webp'),
      (select id from public.product_images where storage_path like '%440202.webp'),
      (select id from public.product_images where storage_path like '%440204.webp')
    ]
  )$$,
  'P0001', 'PRODUCT_IMAGE_NOT_FOUND', 'image ID from another product is rejected'
);
select throws_ok(
  $$select * from public.reorder_product_images(
    (select id from public.products where code='GALLERY-A'),
    array[
      (select id from public.product_images where storage_path like '%440201.webp'),
      (select id from public.product_images where storage_path like '%440202.webp'),
      9223372036854775807
    ]
  )$$,
  'P0001', 'PRODUCT_IMAGE_NOT_FOUND', 'missing image ID is rejected'
);
select throws_ok(
  $$select * from public.reorder_product_images(
    (select id from public.products where code='GALLERY-A'),
    array[
      (select id from public.product_images where storage_path like '%440201.webp'),
      (select id from public.product_images where storage_path like '%440202.webp')
    ]
  )$$,
  'P0001', 'INCOMPLETE_PRODUCT_IMAGE_ORDER', 'incomplete image list is rejected'
);
select throws_ok(
  $$select * from public.reorder_product_images(
    (select id from public.products where code='GALLERY-A'),
    array[
      (select id from public.product_images where storage_path like '%440201.webp'),
      (select id from public.product_images where storage_path like '%440202.webp'),
      (select id from public.product_images where storage_path like '%440203.webp'),
      9223372036854775807
    ]
  )$$,
  'P0001', 'PRODUCT_IMAGE_NOT_FOUND', 'list with an extra image ID is rejected'
);
select throws_ok(
  $$select * from public.reorder_product_images(
    (select id from public.products where code='GALLERY-A'), array[]::bigint[]
  )$$,
  'P0001', 'INCOMPLETE_PRODUCT_IMAGE_ORDER', 'empty list is rejected when the product has images'
);
select lives_ok(
  $$select * from public.reorder_product_images(
    (select id from public.products where code='GALLERY-EMPTY'), array[]::bigint[]
  )$$,
  'empty list is accepted for a product with no images'
);
select throws_ok(
  $$select * from public.reorder_product_images(9223372036854775807, array[]::bigint[])$$,
  'P0001', 'PRODUCT_NOT_FOUND', 'missing product is rejected by reorder RPC'
);
select results_eq(
  $$select count(*)::bigint from public.product_images
    where product_id=(select id from public.products where code='GALLERY-A') and is_primary$$,
  array[1::bigint], 'failed reorder calls do not change the primary image'
);
select results_eq(
  $$select id from public.product_images
    where product_id=(select id from public.products where code='GALLERY-A') order by sort_order$$,
  $$select id from public.product_images
    where product_id=(select id from public.products where code='GALLERY-A')
    order by case
      when storage_path like '%440203.webp' then 0
      when storage_path like '%440201.webp' then 1
      else 2
    end$$,
  'failed reorder calls leave the last valid order unchanged'
);

select * from finish();
rollback;
