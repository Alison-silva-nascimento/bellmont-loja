begin;

select plan(10);

select has_column('public', 'products', 'sales_mode', 'products has sales_mode');

select is(
  (select is_nullable from information_schema.columns where table_schema='public' and table_name='products' and column_name='sales_mode'),
  'NO',
  'sales_mode is required'
);

select col_has_default('public', 'products', 'sales_mode', 'sales_mode has a safe default');

select is(
  (select column_default::text = '''INQUIRY_ONLY''::text' from information_schema.columns where table_schema='public' and table_name='products' and column_name='sales_mode'),
  true,
  'new products default to inquiry only'
);

select lives_ok(
  $$insert into public.products(slug,name,brand,category,sales_mode) values ('assisted-mode-test','Assisted','bellmont','streetwear','ASSISTED_PURCHASE')$$,
  'assisted purchase is an accepted mode'
);

select lives_ok(
  $$insert into public.products(slug,name,brand,category) values ('inquiry-default-test','Inquiry','bellmont','perfumes')$$,
  'inquiry-only default accepts a product without variants or inventory'
);

select throws_ok(
  $$insert into public.products(slug,name,brand,category,sales_mode) values ('invalid-sales-mode-test','Invalid','bellmont','streetwear','DIRECT_CHECKOUT')$$,
  '23514',
  null,
  'invalid sales modes are rejected'
);

select is(
  (select relrowsecurity from pg_class where oid='public.products'::regclass),
  true,
  'products RLS remains enabled'
);

select is(
  (select relforcerowsecurity from pg_class where oid='public.products'::regclass),
  true,
  'products forced RLS remains enabled'
);

select results_eq(
  $$select count(*)::bigint from public.inventory where variant_id in (select id from public.product_variants where product_id in (select id from public.products where slug in ('assisted-mode-test','inquiry-default-test')))$$,
  $$values (0::bigint)$$,
  'sales mode never manufactures inventory'
);

select * from finish();
rollback;
