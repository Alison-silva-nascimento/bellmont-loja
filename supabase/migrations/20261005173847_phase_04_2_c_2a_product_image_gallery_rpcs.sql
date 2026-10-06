create or replace function public.set_primary_product_image(
  p_product_id bigint,
  p_image_id bigint
)
returns table (
  product_id bigint,
  image_id bigint,
  storage_path text,
  sort_order integer,
  is_primary boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception using
      errcode = 'P0001',
      message = 'NOT_ADMIN';
  end if;

  perform 1
  from public.products as product
  where product.id = p_product_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_NOT_FOUND';
  end if;

  -- The product row serializes gallery mutations. Row locks also keep a
  -- concurrent direct delete/update from changing the validated image set.
  perform image.id
  from public.product_images as image
  where image.product_id = p_product_id
  order by image.id
  for update;

  if not exists (
    select 1
    from public.product_images as image
    where image.id = p_image_id
      and image.product_id = p_product_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_IMAGE_NOT_FOUND';
  end if;

  -- Clear the previous primary first so the partial unique index is never
  -- violated, then promote the requested image in the same transaction.
  update public.product_images as image
  set is_primary = false
  where image.product_id = p_product_id
    and image.is_primary
    and image.id <> p_image_id;

  update public.product_images as image
  set is_primary = true
  where image.id = p_image_id
    and image.product_id = p_product_id
    and not image.is_primary;

  return query
  select
    image.product_id,
    image.id,
    image.storage_path,
    image.sort_order,
    image.is_primary
  from public.product_images as image
  where image.id = p_image_id
    and image.product_id = p_product_id;
end;
$$;

revoke all on function public.set_primary_product_image(bigint, bigint)
from public, anon, authenticated, service_role;
grant execute on function public.set_primary_product_image(bigint, bigint)
to authenticated;

create or replace function public.reorder_product_images(
  p_product_id bigint,
  p_image_ids bigint[]
)
returns table (
  product_id bigint,
  image_id bigint,
  storage_path text,
  sort_order integer,
  is_primary boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
  requested_count integer;
  distinct_count integer;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception using
      errcode = 'P0001',
      message = 'NOT_ADMIN';
  end if;

  perform 1
  from public.products as product
  where product.id = p_product_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_NOT_FOUND';
  end if;

  if p_image_ids is null or array_position(p_image_ids, null) is not null then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_PRODUCT_IMAGE_ORDER';
  end if;

  requested_count := cardinality(p_image_ids);

  if requested_count > 8 then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_IMAGE_LIMIT_EXCEEDED';
  end if;

  select count(*)::integer
  into distinct_count
  from (
    select distinct requested.image_id
    from unnest(p_image_ids) as requested(image_id)
  ) as unique_requested;

  if distinct_count <> requested_count then
    raise exception using
      errcode = 'P0001',
      message = 'DUPLICATE_PRODUCT_IMAGE_ID';
  end if;

  -- Match the primary-image RPC's lock order to avoid cross-operation
  -- deadlocks and serialize all gallery changes for this product.
  perform image.id
  from public.product_images as image
  where image.product_id = p_product_id
  order by image.id
  for update;

  select count(*)::integer
  into current_count
  from public.product_images as image
  where image.product_id = p_product_id;

  if exists (
    select 1
    from unnest(p_image_ids) as requested(image_id)
    where not exists (
      select 1
      from public.product_images as image
      where image.id = requested.image_id
        and image.product_id = p_product_id
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PRODUCT_IMAGE_NOT_FOUND';
  end if;

  if requested_count <> current_count then
    raise exception using
      errcode = 'P0001',
      message = 'INCOMPLETE_PRODUCT_IMAGE_ORDER';
  end if;

  update public.product_images as image
  set sort_order = (requested.ordinality - 1)::integer
  from unnest(p_image_ids) with ordinality as requested(image_id, ordinality)
  where image.id = requested.image_id
    and image.product_id = p_product_id;

  return query
  select
    image.product_id,
    image.id,
    image.storage_path,
    image.sort_order,
    image.is_primary
  from public.product_images as image
  where image.product_id = p_product_id
  order by image.sort_order, image.id;
end;
$$;

revoke all on function public.reorder_product_images(bigint, bigint[])
from public, anon, authenticated, service_role;
grant execute on function public.reorder_product_images(bigint, bigint[])
to authenticated;
