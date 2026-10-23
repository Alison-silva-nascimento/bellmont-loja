begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(28);

select has_table('private','order_inventory_operations','private idempotency ledger exists');
select has_function('public','reserve_order_inventory',array['bigint','text'],'reserve wrapper exists');
select has_function('public','release_order_inventory',array['bigint','text','text'],'release wrapper exists');
select has_function('public','confirm_order_sale',array['bigint','bigint','text'],'sale wrapper exists');
select has_function('public','return_order_item',array['bigint','bigint','bigint','text'],'return wrapper exists');
select ok(not has_function_privilege('anon','public.reserve_order_inventory(bigint,text)','execute'),'anon cannot reserve');
select ok(not has_table_privilege('authenticated','public.inventory_reservations','insert,update,delete'),'authenticated cannot mutate reservations directly');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('52000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','engine-admin@invalid','',now(),now(),now()),
('52000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','engine-user@invalid','',now(),now(),now());
insert into private.admin_users(user_id) values('52000000-0000-0000-0000-000000000001');
insert into products(code,slug,name,brand,category,price,status) values('ENG-1','eng-1','Engine','BELLMONT','streetwear',80,'active');
insert into product_variants(product_id,sku,size) select id,x.sku,x.sz from products cross join(values('ENG-P','P'),('ENG-M','M'))x(sku,sz) where code='ENG-1';
insert into inventory(variant_id,quantity_on_hand) select id,case when sku='ENG-P' then 15 else 5 end from product_variants where sku like 'ENG-%';

create function pg_temp.make_order(p_num text,p_qty_p bigint,p_qty_m bigint default 0) returns bigint language plpgsql as $$declare oid bigint;begin
 insert into orders(order_number,source,buyer_name,buyer_phone,items_subtotal,grand_total,idempotency_key) values(p_num,'website','Teste','1',80*(p_qty_p+p_qty_m),80*(p_qty_p+p_qty_m),'order-'||p_num) returning id into oid;
 if p_qty_p>0 then insert into order_items(order_id,product_id,variant_id,variant_sku,product_name,category,quantity,unit_price,line_total) select oid,p.id,v.id,v.sku,p.name,p.category,p_qty_p,80,80*p_qty_p from products p join product_variants v on v.product_id=p.id where v.sku='ENG-P'; end if;
 if p_qty_m>0 then insert into order_items(order_id,product_id,variant_id,variant_sku,product_name,category,quantity,unit_price,line_total) select oid,p.id,v.id,v.sku,p.name,p.category,p_qty_m,80,80*p_qty_m from products p join product_variants v on v.product_id=p.id where v.sku='ENG-M'; end if;
 return oid; end$$;

select pg_temp.make_order('A',10) as order_a \gset
select pg_temp.make_order('B',10) as order_b \gset
select pg_temp.make_order('MULTI',1,6) as order_multi \gset

set local role authenticated; select set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select throws_ok(format('select public.reserve_order_inventory(%s,''user-reserve'')',:order_a),'P0001','NOT_AUTHORIZED','non-admin cannot reserve');
reset role; set local role authenticated; select set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.reserve_order_inventory(:order_a,'reserve-a')->>'status'),'reserved','valid reservation succeeds');
select results_eq($$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-P'$$,array[10::bigint],'reserved aggregate becomes 10');
select is((public.reserve_order_inventory(:order_a,'reserve-a')->>'idempotent_replay')::boolean,true,'identical retry is idempotent');
select results_eq(format('select count(*)::bigint from inventory_reservations where order_id=%s',:order_a),array[1::bigint],'retry creates no duplicate reservation');
select throws_ok(format('select public.reserve_order_inventory(%s,''reserve-a'')',:order_b),'P0001','IDEMPOTENCY_CONFLICT','divergent idempotency key conflicts');
select throws_ok(format('select public.reserve_order_inventory(%s,''reserve-b'')',:order_b),'P0001','INSUFFICIENT_STOCK','insufficient stock is rejected');
select throws_ok(format('select public.reserve_order_inventory(%s,''reserve-multi'')',:order_multi),'P0001','INSUFFICIENT_STOCK','multi-item reservation fails atomically');
select results_eq(format('select count(*)::bigint from inventory_reservations where order_id=%s',:order_multi),array[0::bigint],'failed multi-item reservation leaves no partial rows');
select is((public.release_order_inventory(:order_a,'release-a','cancelled')->>'status'),'released','release succeeds');
select results_eq($$select quantity_reserved from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-P'$$,array[0::bigint],'release restores available balance');
select is((public.release_order_inventory(:order_a,'release-a','cancelled')->>'idempotent_replay')::boolean,true,'duplicate release is idempotent');

reset role;
select pg_temp.make_order('SALE',4) as order_sale \gset
set local role authenticated; select set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.reserve_order_inventory(:order_sale,'reserve-sale')->>'status'),'reserved','sale order reserves');
reset role;
insert into order_payments(order_id,provider,payment_method,amount_requested,amount_confirmed,status,idempotency_key,confirmed_at) select id,'test','pix',grand_total,grand_total,'paid','pay-sale',now() from orders where id=:order_sale returning id as payment_sale \gset
set local role authenticated; select set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.confirm_order_sale(:order_sale,:payment_sale,'sale-1')->>'status'),'sold','confirmed payment consumes reservation');
select ok((select quantity_on_hand=11 and quantity_reserved=0 from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-P'),'sale decreases physical and reserved together');
select results_eq($$select count(*)::bigint from inventory_movements where movement_type='sale'$$,array[1::bigint],'sale writes one physical ledger movement');
select is((public.confirm_order_sale(:order_sale,:payment_sale,'sale-1')->>'idempotent_replay')::boolean,true,'duplicate payment confirmation does not double sell');
reset role; select id as item_sale from order_items where order_id=:order_sale \gset
set local role authenticated; select set_config('request.jwt.claims','{"sub":"52000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select is((public.return_order_item(:order_sale,:item_sale,2,'return-1')->>'status'),'returned','partial physical return succeeds');
select results_eq($$select quantity_on_hand from inventory i join product_variants v on v.id=i.variant_id where v.sku='ENG-P'$$,array[13::bigint],'return restores physical stock only');
select throws_ok(format('select public.return_order_item(%s,%s,3,''return-too-much'')',:order_sale,:item_sale),'P0001','RETURN_EXCEEDS_SOLD','return cannot exceed remaining sold quantity');
select is((public.return_order_item(:order_sale,:item_sale,2,'return-1')->>'idempotent_replay')::boolean,true,'duplicate return creates no additional stock');

select * from finish(); rollback;
