\set ON_ERROR_STOP on
\echo 'BELLMONT 05.W3B.6B.0 - VERIFICACAO POS-ATIVACAO READ-ONLY'

begin transaction read only;

do $verify$
declare actual bigint;
begin
  select count(*) into actual from public.products where code<>'TEST-FIXTURE-01' and status='active';
  if actual <> 47 then raise exception 'ACTIVE_COMMERCIAL_COUNT_MISMATCH: %', actual; end if;
  select count(*) into actual from public.products where code='TEST-FIXTURE-01' and status='archived' and sales_mode='DISABLED';
  if actual <> 1 then raise exception 'FIXTURE_NOT_HIDDEN'; end if;
  select count(*) into actual from public.products where code like 'ST-%' and sales_mode='ASSISTED_PURCHASE';
  if actual <> 20 then raise exception 'STREETWEAR_MODE_MISMATCH: %', actual; end if;
  select count(*) into actual from public.products where (code like 'PF-%' or code like 'IF-%') and sales_mode='INQUIRY_ONLY';
  if actual <> 27 then raise exception 'INQUIRY_MODE_MISMATCH: %', actual; end if;
  select coalesce(sum(i.quantity_on_hand),0) into actual from public.inventory i join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id where p.code<>'TEST-FIXTURE-01';
  if actual <> 1200 then raise exception 'PHYSICAL_STOCK_CHANGED: %', actual; end if;
  select coalesce(sum(i.quantity_reserved),0) into actual from public.inventory i join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id where p.code<>'TEST-FIXTURE-01';
  if actual <> 0 then raise exception 'RESERVED_STOCK_CHANGED: %', actual; end if;
  select count(*) into actual from public.orders;
  if actual <> 0 then raise exception 'ORDERS_CHANGED: %', actual; end if;
  select count(*) into actual from public.inventory_reservations;
  if actual <> 0 then raise exception 'RESERVATIONS_CHANGED: %', actual; end if;
end
$verify$;

select count(*) filter(where code like 'ST-%') as streetwear,
       count(*) filter(where code like 'PF-%') as perfumes,
       count(*) filter(where code like 'IF-%') as fitness,
       count(*) filter(where sales_mode='ASSISTED_PURCHASE') as assisted_purchase,
       count(*) filter(where sales_mode='INQUIRY_ONLY') as inquiry_only
  from public.products where code<>'TEST-FIXTURE-01' and status='active';

set local role anon;
select count(*) as anon_products from public.products;
select count(*) as anon_variants from public.product_variants;
select count(*) as anon_images from public.product_images;
select count(*) as anon_availability_rows from public.get_public_variant_availability();
reset role;

rollback;
\echo 'VERIFICATION_OK - nenhuma escrita persistida.'

