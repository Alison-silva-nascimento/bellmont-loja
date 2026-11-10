begin;
select plan(26);

select has_column('public','orders','checkout_access_token_hash','orders stores only the checkout token hash');
select has_column('public','order_payments','external_preference_id','payment attempt stores provider preference id');
select has_function('public','create_checkout_order_v2',array['jsonb','text','text','numeric'],'atomic checkout RPC exists');
select function_privs_are('public','create_checkout_order_v2',array['jsonb','text','text','numeric'],'service_role',array['EXECUTE'],'service role is the only intended executor');
select ok(not has_function_privilege('anon','public.create_checkout_order_v2(jsonb,text,text,numeric)','execute'),'anon cannot create checkout orders');
select ok(not has_function_privilege('authenticated','public.create_checkout_order_v2(jsonb,text,text,numeric)','execute'),'authenticated clients cannot create checkout orders directly');
select ok(has_function_privilege('service_role','public.create_checkout_order_v2(jsonb,text,text,numeric)','execute'),'backend service role can execute checkout orchestration');
select is((select prosecdef from pg_proc where oid='public.create_checkout_order_v2(jsonb,text,text,numeric)'::regprocedure),false,'checkout RPC is SECURITY INVOKER');
select is((select proconfig from pg_proc where oid='public.create_checkout_order_v2(jsonb,text,text,numeric)'::regprocedure),array['search_path=""']::text[],'checkout RPC has an empty search_path');
select throws_ok(
  $$select public.create_checkout_order_v2('{}'::jsonb,'0123456789abcdef','token-hash',0)$$,
  '42501','CHECKOUT_SERVER_ONLY','ordinary SQL session is rejected before payload processing'
);
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.orders'::regclass),'orders keeps forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.order_payments'::regclass),'payments keeps forced RLS');

insert into public.products(code,slug,name,brand,category,price,status,sales_mode)
values('V2-CHECKOUT-TEST','v2-checkout-test','Checkout V2 fixture','BELLMONT','streetwear',80,'active','ASSISTED_PURCHASE')
returning id as product_id \gset
insert into public.product_variants(product_id,sku,color,size,is_active)
values(:product_id,'V2-CHECKOUT-TEST-M','Preta','M',true)
returning id as variant_id \gset
insert into public.inventory(variant_id,quantity_on_hand,quantity_reserved)
values(:variant_id,2,0);

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.create_checkout_order_v2(
  jsonb_build_object(
    'buyer_name','Cliente Teste','buyer_phone','64999990000','buyer_email','cliente@example.com',
    'address',jsonb_build_object('postal_code','75526270','street','Rua Teste','number','10','complement','','neighborhood','Centro','city','Itumbiara','state','GO'),
    'items',jsonb_build_array(jsonb_build_object('variant_id',:variant_id,'quantity',1,'unit_price',1,'grand_total',1))
  ),
  'v2-checkout-create-0001','v2-token-hash-0001',10
) as created_result \gset
reset role;

select is((:'created_result'::jsonb->>'status'),'created','service backend creates a checkout order');
select is((select count(*)::integer from public.orders where idempotency_key='v2-checkout-create-0001'),1,'exactly one order is created');
select is((select items_subtotal from public.orders where idempotency_key='v2-checkout-create-0001'),80.00::numeric,'subtotal is recalculated from catalog price');
select is((select shipping_total from public.orders where idempotency_key='v2-checkout-create-0001'),10.00::numeric,'server shipping amount is preserved');
select is((select grand_total from public.orders where idempotency_key='v2-checkout-create-0001'),90.00::numeric,'grand total is calculated by the database');
select is((select unit_price from public.order_items oi join public.orders o on o.id=oi.order_id where o.idempotency_key='v2-checkout-create-0001'),80.00::numeric,'client price manipulation is ignored');
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),1::bigint,'successful checkout reserves inventory');
select is((select count(*)::integer from public.inventory_reservations ir join public.orders o on o.id=ir.order_id where o.idempotency_key='v2-checkout-create-0001' and ir.status='active'),1,'one active reservation is created');
select is((select checkout_access_token_hash from public.orders where idempotency_key='v2-checkout-create-0001'),'v2-token-hash-0001','only the supplied token hash is stored');

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select public.create_checkout_order_v2(
  jsonb_build_object(
    'buyer_name','Cliente Teste','buyer_phone','64999990000','buyer_email','cliente@example.com',
    'address',jsonb_build_object('postal_code','75526270','street','Rua Teste','number','10','complement','','neighborhood','Centro','city','Itumbiara','state','GO'),
    'items',jsonb_build_array(jsonb_build_object('variant_id',:variant_id,'quantity',1))
  ),
  'v2-checkout-create-0001','a-different-hash-is-ignored-on-replay',10
) as replay_result \gset
reset role;

select is((:'replay_result'::jsonb->>'status'),'already_created','identical idempotency key replays safely');
select is((select count(*)::integer from public.orders where idempotency_key='v2-checkout-create-0001'),1,'idempotent replay does not duplicate order');
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),1::bigint,'idempotent replay does not duplicate reservation');

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select throws_ok(
  format(
    $$select public.create_checkout_order_v2(
      '{"buyer_name":"Cliente Teste","buyer_phone":"64999990000","address":{"postal_code":"75526270","street":"Rua Teste","number":"10","neighborhood":"Centro","city":"Itumbiara","state":"GO"},"items":[{"variant_id":%s,"quantity":2}]}'::jsonb,
      'v2-checkout-insufficient-0002','v2-token-hash-0002',0
    )$$,
    :variant_id
  ),
  'P0001','INSUFFICIENT_STOCK','checkout cannot reserve more than available inventory'
);
reset role;
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),1::bigint,'failed checkout rolls back inventory changes');

select * from finish();
rollback;
