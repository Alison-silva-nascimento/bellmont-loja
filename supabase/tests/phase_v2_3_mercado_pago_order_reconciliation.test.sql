begin;
select plan(61);

select has_column('public','order_payments','external_order_id','stores Mercado Pago Orders API id');
select has_column('public','order_payments','provider_idempotency_key','stores provider UUID idempotency key');
select has_column('public','order_payments','checkout_url','stores server-returned checkout URL');
select has_function('public','prepare_checkout_payment_v2',array['bigint','uuid'],'payment preparation RPC exists');
select has_function('public','attach_checkout_provider_order_v2',array['bigint','text','text','text','text','timestamp with time zone'],'provider attachment RPC exists');
select has_function('public','reconcile_checkout_payment_v2',array['text','text','text','uuid','text','text','numeric','numeric','timestamp with time zone'],'atomic reconciliation RPC exists');
select has_function('public','consume_checkout_rate_limit_v2',array['text','integer','integer'],'persistent rate limit RPC exists');
select ok(not has_function_privilege('anon','public.prepare_checkout_payment_v2(bigint,uuid)','execute'),'anon cannot prepare payments');
select ok(not has_function_privilege('authenticated','public.reconcile_checkout_payment_v2(text,text,text,uuid,text,text,numeric,numeric,timestamptz)','execute'),'authenticated cannot reconcile payments');
select ok(has_function_privilege('service_role','public.reconcile_checkout_payment_v2(text,text,text,uuid,text,text,numeric,numeric,timestamptz)','execute'),'service role can reconcile payments');
select has_table('private','checkout_rate_limits','rate limit storage is private');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.order_payments'::regclass),'payment RLS remains enabled and forced');

insert into public.products(code,slug,name,brand,category,price,status,sales_mode)
values('V2-MP-TEST','v2-mp-test','Mercado Pago fixture','BELLMONT','streetwear',80,'active','ASSISTED_PURCHASE')
returning id as product_id \gset
insert into public.product_variants(product_id,sku,color,size,is_active)
values(:product_id,'V2-MP-TEST-M','Preta','M',true)
returning id as variant_id \gset
insert into public.inventory(variant_id,quantity_on_hand,quantity_reserved)
values(:variant_id,30,0);

create function pg_temp.create_mp_checkout(
  p_key text,
  p_external_order text,
  p_provider_key uuid,
  p_variant_id bigint
) returns table(order_id bigint,payment_id bigint,public_id uuid)
language plpgsql
as $$
declare v_created jsonb; v_prepared jsonb; v_attached jsonb;
begin
  v_created := public.create_checkout_order_v2(
    jsonb_build_object(
      'buyer_name','Cliente Sandbox','buyer_phone','64999990000','buyer_email','sandbox@example.com',
      'address',jsonb_build_object('postal_code','75526270','street','Rua Teste','number','10','complement','','neighborhood','Centro','city','Itumbiara','state','GO'),
      'items',jsonb_build_array(jsonb_build_object('variant_id',p_variant_id,'quantity',1))
    ), p_key, 'hash-'||p_key, 0
  );
  select o.id,o.public_id into order_id,public_id from public.orders o where o.public_id=(v_created->>'public_id')::uuid;
  v_prepared := public.prepare_checkout_payment_v2(order_id,p_provider_key);
  payment_id := (v_prepared->>'payment_id')::bigint;
  v_attached := public.attach_checkout_provider_order_v2(
    payment_id,p_external_order,
    'https://www.mercadopago.com.br/checkout/v1/redirect?order_id='||p_external_order,
    'created','created','2026-10-28T12:00:00Z'
  );
  return next;
end;
$$;

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);

select * from pg_temp.create_mp_checkout('v2-mp-approved-0001','ORD-APPROVED','10000000-0000-4000-8000-000000000001',:variant_id) \gset approved_
select is((select status from public.order_payments where id=:approved_payment_id),'pending','payment preparation starts pending');
select is((select external_order_id from public.order_payments where id=:approved_payment_id),'ORD-APPROVED','provider order is attached');
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),1::bigint,'checkout creation reserves one unit');

select public.reconcile_checkout_payment_v2(
  'evt-approved','ORD-APPROVED','PAY-APPROVED',:'approved_public_id','processed','accredited',
  80,80,'2026-10-28T12:01:00Z'
) as approved_result \gset
select is((:'approved_result'::jsonb->>'status'),'processed','approved order is processed');
select is((select status from public.order_payments where id=:approved_payment_id),'paid','payment becomes paid');
select is((select commercial_status from public.orders where id=:approved_order_id),'confirmed','order becomes confirmed');
select is((select quantity_on_hand from public.inventory where variant_id=:variant_id),29::bigint,'approved payment consumes physical stock once');
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),0::bigint,'approved payment consumes reservation');
select is((select count(*)::integer from public.inventory_movements where movement_type='sale' and reference_type='order_item'),1,'approved payment writes one sale movement');
select is((select processing_status from public.payment_webhook_events where external_event_id='evt-approved'),'processed','approved webhook is marked processed');

select public.reconcile_checkout_payment_v2(
  'evt-approved','ORD-APPROVED','PAY-APPROVED',:'approved_public_id','processed','accredited',
  80,80,'2026-10-28T12:01:00Z'
) as duplicate_result \gset
select is((:'duplicate_result'::jsonb->>'status'),'duplicate_event','same event is idempotent');
select is((select count(*)::integer from public.inventory_movements where movement_type='sale' and reference_type='order_item'),1,'duplicate webhook does not duplicate sale');

select public.reconcile_checkout_payment_v2(
  'evt-stale','ORD-APPROVED',null,:'approved_public_id','created','created',
  80,0,'2026-10-28T11:59:00Z'
) as stale_result \gset
select is((:'stale_result'::jsonb->>'status'),'stale_event','older provider event is ignored');
select public.reconcile_checkout_payment_v2(
  'evt-regression','ORD-APPROVED',null,:'approved_public_id','failed','processing_error',
  80,0,'2026-10-28T12:02:00Z'
) as regression_result \gset
select is((:'regression_result'::jsonb->>'status'),'non_regressive_ignored','paid state does not regress to failed');
select is((select status from public.order_payments where id=:approved_payment_id),'paid','payment remains paid after delayed failure');

select * from pg_temp.create_mp_checkout('v2-mp-cancel-0002','ORD-CANCEL','10000000-0000-4000-8000-000000000002',:variant_id) \gset cancel_
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),1::bigint,'cancel scenario begins with reservation');
select public.reconcile_checkout_payment_v2(
  'evt-cancel','ORD-CANCEL',null,:'cancel_public_id','canceled','canceled',
  80,0,'2026-10-28T12:03:00Z'
) as cancel_result \gset
select is((:'cancel_result'::jsonb->>'status'),'processed','canceled provider order is processed');
select is((select status from public.order_payments where id=:cancel_payment_id),'cancelled','payment becomes cancelled');
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),0::bigint,'cancellation releases reservation');
select is((select quantity_on_hand from public.inventory where variant_id=:variant_id),29::bigint,'cancellation does not alter physical stock');

select * from pg_temp.create_mp_checkout('v2-mp-failed-0006','ORD-FAILED','10000000-0000-4000-8000-000000000006',:variant_id) \gset failed_
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),1::bigint,'failed scenario begins with reservation');
select public.reconcile_checkout_payment_v2(
  'evt-failed','ORD-FAILED',null,:'failed_public_id','failed','rejected',
  80,0,'2026-10-28T12:03:30Z'
) as failed_result \gset
select is((:'failed_result'::jsonb->>'status'),'processed','rejected provider order is processed');
select is((select status from public.order_payments where id=:failed_payment_id),'failed','rejected payment becomes failed');
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),0::bigint,'rejected payment releases reservation');
select is((select quantity_on_hand from public.inventory where variant_id=:variant_id),29::bigint,'rejected payment preserves physical stock');

select public.reconcile_checkout_payment_v2(
  'evt-late-paid','ORD-CANCEL','PAY-LATE',:'cancel_public_id','processed','accredited',
  80,80,'2026-10-28T12:04:00Z'
) as late_result \gset
select is((:'late_result'::jsonb->>'status'),'reconciliation_required','late payment without reservation requires reconciliation');
select is((select status from public.order_payments where id=:cancel_payment_id),'paid','late provider payment is recorded financially');
select is((select quantity_on_hand from public.inventory where variant_id=:variant_id),29::bigint,'late payment never creates negative or unreserved stock movement');
select is((select processing_status from public.payment_webhook_events where external_event_id='evt-late-paid'),'failed','late payment event is flagged for manual reconciliation');

select * from pg_temp.create_mp_checkout('v2-mp-pending-0003','ORD-PENDING','10000000-0000-4000-8000-000000000003',:variant_id) \gset pending_
select public.reconcile_checkout_payment_v2(
  'evt-pending','ORD-PENDING',null,:'pending_public_id','processing','in_process',
  80,0,'2026-10-28T12:05:00Z'
) as pending_result \gset
select is((:'pending_result'::jsonb->>'status'),'processed','pending provider state is processed');
select is((select status from public.order_payments where id=:pending_payment_id),'pending','pending provider state remains pending');
select is((select quantity_reserved from public.inventory where variant_id=:variant_id),1::bigint,'pending payment keeps reservation');

select public.reconcile_checkout_payment_v2(
  'evt-mismatch','ORD-PENDING',null,:'pending_public_id','processed','accredited',
  79,79,'2026-10-28T12:06:00Z'
) as mismatch_result \gset
select is((:'mismatch_result'::jsonb->>'status'),'provider_order_mismatch','amount mismatch is rejected');
select is((select processing_status from public.payment_webhook_events where external_event_id='evt-mismatch'),'failed','mismatched event is auditable as failed');

select * from pg_temp.create_mp_checkout('v2-mp-authorized-0004','ORD-AUTH','10000000-0000-4000-8000-000000000004',:variant_id) \gset auth_
select public.reconcile_checkout_payment_v2(
  'evt-auth','ORD-AUTH','PAY-AUTH',:'auth_public_id','action_required','waiting_capture',
  80,0,'2026-10-28T12:07:00Z'
) as auth_result \gset
select is((:'auth_result'::jsonb->>'status'),'processed','authorized state is processed');
select is((select status from public.order_payments where id=:auth_payment_id),'authorized','payment records authorization without sale');

select * from pg_temp.create_mp_checkout('v2-mp-refund-0005','ORD-REFUND','10000000-0000-4000-8000-000000000005',:variant_id) \gset refund_
select public.reconcile_checkout_payment_v2(
  'evt-refund-paid','ORD-REFUND','PAY-REFUND',:'refund_public_id','processed','accredited',
  80,80,'2026-10-28T12:08:00Z'
) as refund_paid_result \gset
select is((:'refund_paid_result'::jsonb->>'status'),'processed','refund scenario first confirms sale');
select is((select quantity_on_hand from public.inventory where variant_id=:variant_id),28::bigint,'second approved order consumes one additional unit');
select public.reconcile_checkout_payment_v2(
  'evt-partial-refund','ORD-REFUND','PAY-REFUND',:'refund_public_id','processed','partially_refunded',
  80,80,'2026-10-28T12:09:00Z'
) as partial_result \gset
select is((:'partial_result'::jsonb->>'status'),'processed','partial refund state is processed');
select is((select status from public.order_payments where id=:refund_payment_id),'partially_refunded','payment becomes partially refunded');
select is((select quantity_on_hand from public.inventory where variant_id=:variant_id),28::bigint,'financial partial refund does not invent physical return');
select public.reconcile_checkout_payment_v2(
  'evt-full-refund','ORD-REFUND','PAY-REFUND',:'refund_public_id','refunded','refunded',
  80,80,'2026-10-28T12:10:00Z'
) as refund_result \gset
select is((:'refund_result'::jsonb->>'status'),'processed','full refund state is processed');
select is((select status from public.order_payments where id=:refund_payment_id),'refunded','payment becomes refunded');
select is((select quantity_on_hand from public.inventory where variant_id=:variant_id),28::bigint,'financial refund still does not imply physical return');

select public.reconcile_checkout_payment_v2(
  'evt-unknown','ORD-UNKNOWN',null,'99999999-9999-4999-8999-999999999999','created','created',
  80,0,'2026-10-28T12:11:00Z'
) as unknown_result \gset
select is((:'unknown_result'::jsonb->>'status'),'unknown_provider_order','unknown external order is ignored safely');
select is((select processing_status from public.payment_webhook_events where external_event_id='evt-unknown'),'ignored','unknown order event is retained without commercial mutation');

select ok(public.consume_checkout_rate_limit_v2('client-hash',5,60),'first request passes persistent rate limit');
select ok(public.consume_checkout_rate_limit_v2('client-hash',5,60)
  and public.consume_checkout_rate_limit_v2('client-hash',5,60)
  and public.consume_checkout_rate_limit_v2('client-hash',5,60)
  and public.consume_checkout_rate_limit_v2('client-hash',5,60),'requests through configured limit pass');
select ok(not public.consume_checkout_rate_limit_v2('client-hash',5,60),'request above configured limit is rejected');

reset role;
select * from finish();
rollback;
