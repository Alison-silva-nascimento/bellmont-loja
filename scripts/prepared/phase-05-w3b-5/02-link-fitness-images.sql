-- BELLMONT Phase 05.W3B.5
-- PREPARADO — NÃO EXECUTADO — AGUARDANDO AUTORIZAÇÃO.
-- Stage 2/2: links images only after all five Storage objects exist.
-- This file does not upload files and is intentionally outside supabase/migrations.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

select pg_advisory_xact_lock(hashtextextended('bellmont:phase-05-w3b-5:fitness-images', 0));

create temporary table _fitness_image_plan (
  code text primary key,
  object_uuid uuid not null unique,
  alt_text text not null,
  expected_size bigint not null,
  expected_mime text not null
) on commit drop;

insert into _fitness_image_plan (code, object_uuid, alt_text, expected_size, expected_mime) values
  ('IF-01', '232b2c47-38fb-4228-85c1-c9c8babf9857', 'Macaquinho Ana — vinho', 346169, 'image/png'),
  ('IF-02', '1e2559d3-9abe-4a2d-ad14-716eed5dec7d', 'Macaquinho Fitness — preto', 335701, 'image/png'),
  ('IF-03', 'bed583d6-9619-4d30-b2e7-2a86d0daf44e', 'Conjunto Iza — marinho', 353396, 'image/png'),
  ('IF-04', 'a2f6a566-fbbb-4495-b4af-ab2b3eaa1ad8', 'Conjunto Fitness — preto', 347818, 'image/png'),
  ('IF-05', '56f19ac0-055b-4764-8a8e-7c3385f4910d', 'Conjunto Jasmim — marrom, top e short', 1771341, 'image/png');

create temporary table _resolved_fitness_images on commit drop as
select
  p.id as product_id,
  p.code,
  'products/' || p.id::text || '/' || plan.object_uuid::text || '.png' as storage_path,
  plan.alt_text,
  plan.expected_size,
  plan.expected_mime
from _fitness_image_plan plan
join public.products p on p.code = plan.code
where p.status = 'draft'
  and p.sales_mode = 'INQUIRY_ONLY';

do $$
begin
  if (select count(*) from _resolved_fitness_images) <> 5 then
    raise exception using errcode = 'P0001', message = 'FITNESS_IMAGE_PRODUCTS_NOT_READY';
  end if;

  if exists (
    select 1
    from public.product_images image
    join _resolved_fitness_images planned on planned.product_id = image.product_id
  ) then
    raise exception using errcode = 'P0001', message = 'FITNESS_IMAGE_METADATA_CONFLICT';
  end if;

  if exists (
    select 1
    from _resolved_fitness_images planned
    left join storage.objects object
      on object.bucket_id = 'product-images'
     and object.name = planned.storage_path
    where object.id is null
       or coalesce(object.metadata ->> 'mimetype', '') <> planned.expected_mime
       or coalesce((object.metadata ->> 'size')::bigint, -1) <> planned.expected_size
  ) then
    raise exception using errcode = 'P0001', message = 'FITNESS_STORAGE_OBJECT_MISSING_OR_MISMATCHED';
  end if;
end;
$$;

insert into public.product_images (
  product_id, variant_id, storage_path, alt_text, sort_order, is_primary
)
select
  product_id, null, storage_path, alt_text, 0, true
from _resolved_fitness_images
order by code;

do $$
begin
  if (
    select count(*)
    from public.product_images image
    join _resolved_fitness_images planned
      on planned.product_id = image.product_id
     and planned.storage_path = image.storage_path
    where image.variant_id is null
      and image.sort_order = 0
      and image.is_primary
  ) <> 5 then
    raise exception using errcode = 'P0001', message = 'FITNESS_IMAGE_POSTCONDITION_FAILED';
  end if;
end;
$$;

select code, product_id, storage_path, alt_text
from _resolved_fitness_images
order by code;

commit;

