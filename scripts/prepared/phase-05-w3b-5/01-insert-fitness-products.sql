-- BELLMONT Phase 05.W3B.5
-- PREPARADO — NÃO EXECUTADO — AGUARDANDO AUTORIZAÇÃO.
-- Stage 1/2: inserts only the five IMPÉRIO FIT draft products.
-- This file is intentionally outside supabase/migrations.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

select pg_advisory_xact_lock(hashtextextended('bellmont:phase-05-w3b-5:fitness-products', 0));

do $$
declare
  commercial_on_hand bigint;
  commercial_reserved bigint;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'sales_mode'
  ) then
    raise exception using errcode = 'P0001', message = 'PRECONDITION_SALES_MODE_MISSING';
  end if;

  if exists (
    select 1
    from public.products
    where code in ('IF-01', 'IF-02', 'IF-03', 'IF-04', 'IF-05')
       or slug in (
         'macaquinho-fitness-vinho',
         'macaquinho-fitness-preto',
         'conjunto-fitness-marinho',
         'conjunto-fitness-preto-recortes',
         'conjunto-jasmim-marrom'
       )
  ) then
    raise exception using errcode = 'P0001', message = 'FITNESS_PRODUCT_IDENTITY_CONFLICT';
  end if;

  if exists (select 1 from public.product_variants where sku like 'IF-%') then
    raise exception using errcode = 'P0001', message = 'FITNESS_SKU_CONFLICT';
  end if;

  if (select count(*) from public.products) <> 43
     or (select count(*) from public.products where code <> 'TEST-FIXTURE-01') <> 42
     or (select count(*) from public.products where code <> 'TEST-FIXTURE-01' and status = 'draft') <> 42
     or (select count(*) from public.products where code <> 'TEST-FIXTURE-01' and status <> 'draft') <> 0 then
    raise exception using errcode = 'P0001', message = 'PRECONDITION_PRODUCT_BASELINE_MISMATCH';
  end if;

  select
    coalesce(sum(i.quantity_on_hand), 0),
    coalesce(sum(i.quantity_reserved), 0)
  into commercial_on_hand, commercial_reserved
  from public.inventory i
  join public.product_variants v on v.id = i.variant_id
  join public.products p on p.id = v.product_id
  where p.code <> 'TEST-FIXTURE-01';

  if commercial_on_hand <> 1200 or commercial_reserved <> 0
     or (select count(*) from public.orders) <> 0
     or (select count(*) from public.inventory_reservations) <> 0 then
    raise exception using errcode = 'P0001', message = 'PRECONDITION_TRANSACTIONAL_BASELINE_MISMATCH';
  end if;
end;
$$;

create temporary table _fitness_plan (
  code text primary key,
  slug text not null unique,
  name text not null,
  brand text not null,
  category text not null,
  subcategory text not null,
  description text,
  price numeric(12,2) not null,
  featured boolean not null,
  new_arrival boolean not null
) on commit drop;

insert into _fitness_plan (
  code, slug, name, brand, category, subcategory, description,
  price, featured, new_arrival
) values
  ('IF-01', 'macaquinho-fitness-vinho', 'Macaquinho Ana', 'IMPÉRIO FIT', 'fitness', 'Macaquinho Fitness', null, 250.00, true, true),
  ('IF-02', 'macaquinho-fitness-preto', 'Macaquinho Fitness — Preto', 'IMPÉRIO FIT', 'fitness', 'Macaquinho Fitness', null, 200.00, false, true),
  ('IF-03', 'conjunto-fitness-marinho', 'Conjunto Iza', 'IMPÉRIO FIT', 'fitness', 'Conjunto Fitness', null, 250.00, false, true),
  ('IF-04', 'conjunto-fitness-preto-recortes', 'Conjunto Fitness — Preto', 'IMPÉRIO FIT', 'fitness', 'Conjunto Fitness', null, 210.00, false, true),
  ('IF-05', 'conjunto-jasmim-marrom', 'Conjunto Jasmim', 'IMPÉRIO FIT', 'fitness', 'Conjunto Fitness', 'Top e short separados · Marrom', 240.00, false, true);

create temporary table _inserted_fitness on commit drop as
with inserted as (
  insert into public.products (
    code, slug, name, brand, category, subcategory, description,
    price, compare_at_price, sales_mode, status, featured, new_arrival,
    created_by
  )
  select
    code, slug, name, brand, category, subcategory, description,
    price, null, 'INQUIRY_ONLY', 'draft', featured, new_arrival,
    null
  from _fitness_plan
  order by code
  returning id, code, slug, name, sales_mode, status
)
select * from inserted;

do $$
begin
  if (select count(*) from _inserted_fitness) <> 5
     or (select count(*) from public.products where code like 'IF-%') <> 5
     or (select count(*) from public.products where code like 'IF-%' and status = 'draft' and sales_mode = 'INQUIRY_ONLY') <> 5
     or (select count(*) from public.products where code <> 'TEST-FIXTURE-01') <> 47
     or exists (
       select 1
       from public.product_variants v
       join public.products p on p.id = v.product_id
       where p.code like 'IF-%'
     )
     or exists (
       select 1
       from public.inventory i
       join public.product_variants v on v.id = i.variant_id
       join public.products p on p.id = v.product_id
       where p.code like 'IF-%'
     ) then
    raise exception using errcode = 'P0001', message = 'FITNESS_INSERT_POSTCONDITION_FAILED';
  end if;
end;
$$;

select id, code, slug, name, sales_mode, status
from _inserted_fitness
order by code;

commit;

-- STOP after this stage. Record the returned IDs, derive the exact Storage paths
-- from 02-link-fitness-images.sql, upload the five authorized files, verify the
-- objects, and only then run Stage 2 under a separate authorization.

