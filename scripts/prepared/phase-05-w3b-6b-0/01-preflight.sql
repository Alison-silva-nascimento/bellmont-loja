\set ON_ERROR_STOP on
\echo 'BELLMONT 05.W3B.6B.0 - PREFLIGHT READ-ONLY'
\echo 'NAO CONTINUE se o destino nao for qbedfcdarmgiytlqntpf.'

begin transaction read only;

do $preflight$
declare
  target_codes constant text[] := array[
    'ST-01','ST-02','ST-03','ST-04','ST-05','ST-06','ST-07','ST-08','ST-09','ST-10',
    'ST-11','ST-12','ST-13','ST-14','ST-15','ST-16','ST-17','ST-18','ST-19','ST-20',
    'PF-01','PF-02','PF-03','PF-04','PF-05','PF-06','PF-07','PF-08','PF-09','PF-10','PF-11',
    'PF-12','PF-13','PF-14','PF-15','PF-16','PF-17','PF-18','PF-19','PF-20','PF-21','PF-22',
    'IF-01','IF-02','IF-03','IF-04','IF-05'
  ];
  actual bigint;
begin
  if cardinality(target_codes) <> 47 then raise exception 'TARGET_CODE_LIST_INVALID'; end if;

  select count(*) into actual from public.products;
  if actual <> 48 then raise exception 'PRODUCT_TOTAL_MISMATCH: %', actual; end if;

  select count(*) into actual from public.products where code = any(target_codes);
  if actual <> 47 then raise exception 'TARGET_PRODUCTS_MISMATCH: %', actual; end if;

  select count(*) into actual from public.products where code = any(target_codes) and status = 'draft';
  if actual <> 47 then raise exception 'TARGETS_NOT_ALL_DRAFT: %', actual; end if;

  select count(*) into actual from public.products
   where code = any(target_codes)
     and sales_mode <> case when code like 'ST-%' then 'ASSISTED_PURCHASE' else 'INQUIRY_ONLY' end;
  if actual <> 0 then raise exception 'SALES_MODE_MISMATCH: %', actual; end if;

  select count(*) into actual from public.products
   where code <> 'TEST-FIXTURE-01' and not (code = any(target_codes));
  if actual <> 0 then raise exception 'UNEXPECTED_COMMERCIAL_PRODUCTS: %', actual; end if;

  select count(*) into actual from public.products
   where code = 'TEST-FIXTURE-01' and status = 'archived' and sales_mode = 'DISABLED';
  if actual <> 1 then raise exception 'FIXTURE_STATE_MISMATCH'; end if;

  select count(*) into actual from public.product_variants v join public.products p on p.id=v.product_id where p.code=any(target_codes);
  if actual <> 94 then raise exception 'COMMERCIAL_VARIANT_COUNT_MISMATCH: %', actual; end if;

  select count(*) into actual from public.product_images i join public.products p on p.id=i.product_id where p.code=any(target_codes);
  if actual <> 57 then raise exception 'COMMERCIAL_IMAGE_COUNT_MISMATCH: %', actual; end if;

  select coalesce(sum(i.quantity_on_hand),0) into actual
    from public.inventory i join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id
   where p.code=any(target_codes);
  if actual <> 1200 then raise exception 'COMMERCIAL_PHYSICAL_STOCK_MISMATCH: %', actual; end if;

  select coalesce(sum(i.quantity_reserved),0) into actual
    from public.inventory i join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id
   where p.code=any(target_codes);
  if actual <> 0 then raise exception 'COMMERCIAL_RESERVED_STOCK_MISMATCH: %', actual; end if;

  select count(*) into actual from public.orders;
  if actual <> 0 then raise exception 'ORDERS_EXIST: %', actual; end if;
  select count(*) into actual from public.inventory_reservations;
  if actual <> 0 then raise exception 'RESERVATIONS_EXIST: %', actual; end if;

  select count(*) into actual
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public'
     and c.relname=any(array['products','product_variants','product_images','inventory','inventory_movements','orders','inventory_reservations'])
     and c.relrowsecurity and c.relforcerowsecurity;
  if actual <> 7 then raise exception 'RLS_FORCE_BASELINE_MISMATCH: %', actual; end if;

  select count(*) into actual from information_schema.role_table_grants
   where table_schema='public' and grantee='anon'
     and not (table_name=any(array['products','product_variants','product_images']) and privilege_type='SELECT');
  if actual <> 0 then raise exception 'UNEXPECTED_ANON_TABLE_GRANT: %', actual; end if;
end
$preflight$;

select current_database() as database_name,
       inet_server_addr() as server_address,
       current_setting('server_version') as server_version,
       47 as authorized_product_count,
       1200 as expected_physical_stock,
       0 as expected_reserved_stock;

rollback;
\echo 'PREFLIGHT_OK - nenhuma escrita persistida.'

