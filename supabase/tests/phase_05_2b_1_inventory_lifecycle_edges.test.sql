begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(32);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values('52100000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','engine-lifecycle-admin@invalid','',now(),now(),now());
insert into private.admin_users(user_id) values('52100000-0000-0000-0000-000000000001');
insert into products(code,slug,name,brand,category,price,status)
values('ENG-LIFE','eng-life','Engine lifecycle','BELLMONT','streetwear',80,'active');
insert into product_variants(product_id,sku,size)
select id,x.sku,x.sz from products cross join(values('ENG-LIFE-P','P'),('ENG-LIFE-M','M'))x(sku,sz) where code='ENG-LIFE';
insert into inventory(variant_id,quantity_on_hand)
select id,case when sku='ENG-LIFE-P' then 40 else 3 end from product_variants where sku like 'ENG-LIFE-%';

create function pg_temp.make_lifecycle_order(p_num text,p_qty_p bigint,p_qty_m bigint default 0)
returns bigint language plpgsql as $$
declare oid bigint;
begin
  insert into orders(order_number,source,buyer_name,buyer_phone,items_subtotal,grand_total,idempotency_key)
  values('LIFE-'||p_num,'website','Teste','1',80*(p_qty_p+p_qty_m),80*(p_qty_p+p_qty_m),'life-order-'||p_num)
  returning id into oid;
  if p_qty_p>0 then
    insert into order_items(order_id,product_id,variant_id,variant_sku,product_name,category,quantity,unit_price,line_total)
    select oid,p.id,v.id,v.sku,p.name,p.category,p_qty_p,80,80*p_qty_p from products p join product_variants v on v.product_id=p.id where v.sku='ENG-LIFE-P';
  end if;
  if p_qty_m>0 then
    insert into order_items(order_id,product_id,variant_id,variant_sku,product_name,category,quantity,unit_price,line_total)
    select oid,p.id,v.id,v.sku,p.name,p.category,p_qty_m,80,80*p_qty_m from products p join product_variants v on v.product_id=p.id where v.sku='ENG-LIFE-M';
  end if;
  return oid;
end$$;

create function pg_temp.make_paid_payment(p_order bigint,p_key text)
returns bigint language plpgsql as $$
declare pid bigint;
begin
  insert into order_payments(order_id,provider,payment_method,amount_requested,amount_confirmed,status,idempotency_key,confirmed_at)
  select id,'test','pix',grand_total,grand_total,'paid',p_key,now() from orders where id=p_order returning id into pid;
  return pid;
end$$;

select pg_temp.make_lifecycle_order('EXPIRE',2) as order_expire \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.reserve_order_inventory(:order_expire,'life-reserve-expire')->>'status'),'reserved','due order reserves');
reset role;
update inventory_reservations set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where order_id=:order_expire;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.expire_due_reservations('life-expire-batch',100)->>'expired_orders')::integer,1,'due reservation is expired');
select results_eq(format('select status from inventory_reservations where order_id=%s',:order_expire),array['expired'::text],'expiration marks reservation expired');
select results_eq($$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-LIFE-P'$$,array[0::bigint],'expiration releases aggregate quantity');
select is((public.expire_due_reservations('life-expire-batch',100)->>'expired_orders')::integer,0,'repeated expiration processes nothing');
reset role;
select results_eq(format($$select count(*)::bigint from private.order_inventory_operations where operation_key='life-expire-batch:%s'$$,:order_expire),array[1::bigint],'repeated expiration creates no duplicate operation');

select pg_temp.make_lifecycle_order('VALID',2) as order_valid \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.reserve_order_inventory(:order_valid,'life-reserve-valid')->>'status'),'reserved','valid order reserves');
select is((public.expire_due_reservations('life-valid-batch',100)->>'expired_orders')::integer,0,'not-yet-expired reservation is ignored');
select results_eq(format('select status from inventory_reservations where order_id=%s',:order_valid),array['active'::text],'valid reservation remains active');
select results_eq($$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-LIFE-P'$$,array[2::bigint],'valid reservation keeps aggregate quantity');
select is((public.release_order_inventory(:order_valid,'life-release-valid','test cleanup')->>'status'),'released','valid reservation cleanup releases normally');

reset role;
select pg_temp.make_lifecycle_order('LATE-EXPIRE',2) as order_late_expire \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select public.reserve_order_inventory(:order_late_expire,'life-reserve-late-expire');
reset role;
update inventory_reservations set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where order_id=:order_late_expire;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select public.expire_due_reservations('life-late-expire-batch',100);
reset role;
select pg_temp.make_paid_payment(:order_late_expire,'life-payment-late-expire') as payment_late_expire \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.confirm_order_sale(:order_late_expire,:payment_late_expire,'life-sale-after-expire')->>'status'),'reconciliation_required','confirmation after expiration requires reconciliation');
select results_eq(format($$select count(*)::bigint from inventory_movements im join order_items oi on oi.id::text=im.reference_id where oi.order_id=%s and im.movement_type='sale'$$,:order_late_expire),array[0::bigint],'late confirmation after expiration makes no sale movement');

reset role;
select pg_temp.make_lifecycle_order('LATE-RELEASE',2) as order_late_release \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select public.reserve_order_inventory(:order_late_release,'life-reserve-late-release');
select is((public.release_order_inventory(:order_late_release,'life-release-late','cancelled')->>'status'),'released','manual release succeeds');
reset role;
select pg_temp.make_paid_payment(:order_late_release,'life-payment-late-release') as payment_late_release \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.confirm_order_sale(:order_late_release,:payment_late_release,'life-sale-after-release')->>'status'),'reconciliation_required','confirmation after release requires reconciliation');

reset role;
select pg_temp.make_lifecycle_order('CONSUMED',3) as order_consumed \gset
select pg_temp.make_paid_payment(:order_consumed,'life-payment-consumed') as payment_consumed \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select public.reserve_order_inventory(:order_consumed,'life-reserve-consumed');
select is((public.confirm_order_sale(:order_consumed,:payment_consumed,'life-sale-consumed')->>'status'),'sold','first confirmation consumes reservation');
select is((public.confirm_order_sale(:order_consumed,:payment_consumed,'life-sale-consumed')->>'idempotent_replay')::boolean,true,'duplicate confirmation webhook operation replays');
select is((public.confirm_order_sale(:order_consumed,:payment_consumed,'life-sale-consumed-new')->>'status'),'reconciliation_required','new confirmation after consumption requires reconciliation');
select results_eq(format($$select count(*)::bigint from inventory_movements im join order_items oi on oi.id::text=im.reference_id where oi.order_id=%s and im.movement_type='sale'$$,:order_consumed),array[1::bigint],'consumed order has exactly one sale movement');

reset role;
insert into payment_webhook_events(provider,external_event_id,event_type) values('test','life-event-1','payment.confirmed');
select throws_ok($$insert into payment_webhook_events(provider,external_event_id,event_type) values('test','life-event-1','payment.confirmed')$$,'23505',null,'duplicate webhook event is rejected by unique constraint');

select pg_temp.make_lifecycle_order('KEY-A',1) as order_key_a \gset
select pg_temp.make_lifecycle_order('KEY-B',1) as order_key_b \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.reserve_order_inventory(:order_key_a,'life-shared-key')->>'status'),'reserved','first idempotency payload succeeds');
select throws_ok(format('select public.reserve_order_inventory(%s,''life-shared-key'')',:order_key_b),'P0001','IDEMPOTENCY_CONFLICT','same key with divergent payload is rejected');
select public.release_order_inventory(:order_key_a,'life-release-key-a','test cleanup');

reset role;
select pg_temp.make_lifecycle_order('MULTI',1,4) as order_multi \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select throws_ok(format('select public.reserve_order_inventory(%s,''life-reserve-multi'')',:order_multi),'P0001','INSUFFICIENT_STOCK','multi-item insufficient reservation fails atomically');
select results_eq(format('select count(*)::bigint from inventory_reservations where order_id=%s',:order_multi),array[0::bigint],'multi-item failure leaves no partial reservation');
select results_eq($$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-LIFE-M'$$,array[0::bigint],'multi-item failure leaves other variant aggregate unchanged');

reset role;
select pg_temp.make_lifecycle_order('RETURN',4) as order_return \gset
select pg_temp.make_paid_payment(:order_return,'life-payment-return') as payment_return \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select public.reserve_order_inventory(:order_return,'life-reserve-return');
select public.confirm_order_sale(:order_return,:payment_return,'life-sale-return');
reset role;
select id as item_return from order_items where order_id=:order_return \gset
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"52100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.return_order_item(:order_return,:item_return,1,'life-return-partial')->>'status'),'returned','partial return succeeds');
select is((public.return_order_item(:order_return,:item_return,3,'life-return-total')->>'status'),'returned','remaining total return succeeds');
select results_eq(format($$select coalesce(sum(quantity_delta),0)::bigint from inventory_movements where movement_type='return' and reference_type='order_item' and reference_id='%s'$$,:item_return),array[4::bigint],'partial plus final return restores total sold quantity');
select throws_ok(format('select public.return_order_item(%s,%s,1,''life-return-over'')',:order_return,:item_return),'P0001','RETURN_EXCEEDS_SOLD','over-return is rejected');
select results_eq(format($$select count(*)::bigint from inventory_movements where movement_type='return' and reference_type='order_item' and reference_id='%s'$$,:item_return),array[2::bigint],'two successful returns create exactly two movements');
select is((public.return_order_item(:order_return,:item_return,3,'life-return-total')->>'idempotent_replay')::boolean,true,'duplicate return operation replays');
select results_eq(format($$select count(*)::bigint from inventory_movements where movement_type='return' and reference_type='order_item' and reference_id='%s'$$,:item_return),array[2::bigint],'duplicate return creates no movement');

select * from finish();
rollback;
