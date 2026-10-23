-- BELLMONT Phase 05.2B - local transactional reservation and physical stock engine.
-- Contains no commercial data and does not schedule automatic jobs.

create table private.order_inventory_operations (
  id bigint generated always as identity primary key,
  operation_key text not null unique,
  operation_type text not null check (operation_type in ('reserve','release','expire','sale','return')),
  order_id bigint not null references public.orders(id) on delete restrict,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint order_inventory_operations_key_not_blank check (operation_key=btrim(operation_key) and operation_key<>'')
);

revoke all on table private.order_inventory_operations from public, anon, authenticated;
grant all on table private.order_inventory_operations to service_role;
grant usage, select on sequence private.order_inventory_operations_id_seq to service_role;
grant usage on schema private to service_role;

create index order_inventory_operations_order_created_idx
  on private.order_inventory_operations(order_id, created_at desc);

create or replace function private.is_commerce_executor()
returns boolean language sql stable security definer set search_path=''
as $$
  select coalesce((select private.is_admin()), false)
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;
revoke all on function private.is_commerce_executor() from public, anon, authenticated;
grant execute on function private.is_commerce_executor() to authenticated, service_role;

-- Preserve historical initial/adjustment semantics while allowing trusted physical
-- sale/return operations to supply explicit ledger metadata transaction-locally.
create or replace function private.record_inventory_movement()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  delta bigint;
  v_type text;
  v_note text;
  v_reference_type text;
  v_reference_id text;
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  delta := new.quantity_on_hand - coalesce(old.quantity_on_hand, 0);
  v_type := nullif(current_setting('bellmont.inventory_movement_type', true), '');
  v_note := nullif(current_setting('bellmont.inventory_movement_note', true), '');
  v_reference_type := nullif(current_setting('bellmont.inventory_reference_type', true), '');
  v_reference_id := nullif(current_setting('bellmont.inventory_reference_id', true), '');
  perform pg_catalog.set_config('bellmont.inventory_movement_type','',true);
  perform pg_catalog.set_config('bellmont.inventory_movement_note','',true);
  perform pg_catalog.set_config('bellmont.inventory_reference_type','',true);
  perform pg_catalog.set_config('bellmont.inventory_reference_id','',true);
  if delta <> 0 then
    insert into public.inventory_movements(
      variant_id,movement_type,quantity_delta,quantity_after,
      reference_type,reference_id,note,created_by
    ) values (
      new.variant_id,
      coalesce(v_type,case when tg_op='INSERT' then 'initial' else 'adjustment' end),
      delta,new.quantity_on_hand,v_reference_type,v_reference_id,v_note,(select auth.uid())
    );
  end if;
  return new;
end;
$$;
revoke all on function private.record_inventory_movement() from public, anon, authenticated;

create or replace function private.reserve_order_inventory(p_order_id bigint,p_operation_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_order public.orders%rowtype; v_existing private.order_inventory_operations%rowtype;
  v_payload jsonb; v_result jsonb; v_expires timestamptz;
begin
  if not (select private.is_commerce_executor()) then raise exception using errcode='P0001',message='NOT_AUTHORIZED'; end if;
  if nullif(btrim(p_operation_key),'') is null then raise exception using errcode='P0001',message='INVALID_IDEMPOTENCY_KEY'; end if;
  v_payload:=jsonb_build_object('order_id',p_order_id);
  perform pg_advisory_xact_lock(hashtextextended('bellmont.order-operation:'||btrim(p_operation_key),0));
  select * into v_existing from private.order_inventory_operations where operation_key=btrim(p_operation_key) for update;
  if found then
    if v_existing.operation_type<>'reserve' or v_existing.payload<>v_payload then raise exception using errcode='P0001',message='IDEMPOTENCY_CONFLICT'; end if;
    return v_existing.result||jsonb_build_object('idempotent_replay',true);
  end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0001',message='ORDER_NOT_FOUND'; end if;
  if v_order.record_type<>'commercial_order' or v_order.commercial_status not in ('draft','pending_payment') then raise exception using errcode='P0001',message='ORDER_NOT_ELIGIBLE'; end if;
  if not exists(select 1 from public.order_items where order_id=p_order_id) then raise exception using errcode='P0001',message='ORDER_HAS_NO_ITEMS'; end if;
  if exists(select 1 from public.order_items oi join public.product_variants v on v.id=oi.variant_id join public.products p on p.id=v.product_id where oi.order_id=p_order_id and (not v.is_active or p.status<>'active')) then raise exception using errcode='P0001',message='CATALOG_NOT_ELIGIBLE'; end if;
  perform 1 from public.inventory i join (select variant_id,sum(quantity) qty from public.order_items where order_id=p_order_id group by variant_id) x on x.variant_id=i.variant_id order by i.variant_id for update of i;
  if exists(select 1 from (select variant_id,sum(quantity) qty from public.order_items where order_id=p_order_id group by variant_id) x left join public.inventory i on i.variant_id=x.variant_id where i.variant_id is null or i.quantity_on_hand-i.quantity_reserved<x.qty) then raise exception using errcode='P0001',message='INSUFFICIENT_STOCK'; end if;
  v_expires:=coalesce(v_order.expires_at,now()+interval '15 minutes');
  insert into public.inventory_reservations(order_id,order_item_id,variant_id,quantity,status,idempotency_key,expires_at)
    select oi.order_id,oi.id,oi.variant_id,oi.quantity,'active',btrim(p_operation_key)||':'||oi.id,v_expires from public.order_items oi where oi.order_id=p_order_id;
  update public.inventory i set quantity_reserved=i.quantity_reserved+x.qty
    from (select variant_id,sum(quantity) qty from public.order_items where order_id=p_order_id group by variant_id) x where i.variant_id=x.variant_id;
  update public.orders set commercial_status='pending_payment',expires_at=v_expires where id=p_order_id;
  insert into public.order_status_history(order_id,previous_status,new_status,change_type,actor_type,actor_user_id,reason,technical_reference)
    values(p_order_id,v_order.commercial_status,'pending_payment','commercial',case when auth.uid() is null then 'system' else 'admin' end,auth.uid(),'inventory reserved',btrim(p_operation_key));
  v_result:=jsonb_build_object('status','reserved','order_id',p_order_id,'expires_at',v_expires,'reserved_items',(select count(*) from public.inventory_reservations where order_id=p_order_id and status='active'));
  insert into private.order_inventory_operations(operation_key,operation_type,order_id,payload,result,created_by) values(btrim(p_operation_key),'reserve',p_order_id,v_payload,v_result,auth.uid());
  return v_result||jsonb_build_object('idempotent_replay',false);
end; $$;

create or replace function private.release_order_inventory(p_order_id bigint,p_operation_key text,p_reason text,p_target text default 'released')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_existing private.order_inventory_operations%rowtype; v_payload jsonb; v_result jsonb; v_old text; v_count bigint;
begin
  if not (select private.is_commerce_executor()) then raise exception using errcode='P0001',message='NOT_AUTHORIZED'; end if;
  if p_target not in ('released','expired') or nullif(btrim(p_operation_key),'') is null then raise exception using errcode='P0001',message='INVALID_RELEASE'; end if;
  v_payload:=jsonb_build_object('order_id',p_order_id,'reason',coalesce(p_reason,''),'target',p_target);
  perform pg_advisory_xact_lock(hashtextextended('bellmont.order-operation:'||btrim(p_operation_key),0));
  select * into v_existing from private.order_inventory_operations where operation_key=btrim(p_operation_key) for update;
  if found then if v_existing.operation_type<>(case when p_target='expired' then 'expire' else 'release' end) or v_existing.payload<>v_payload then raise exception using errcode='P0001',message='IDEMPOTENCY_CONFLICT'; end if; return v_existing.result||jsonb_build_object('idempotent_replay',true); end if;
  select commercial_status into v_old from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0001',message='ORDER_NOT_FOUND'; end if;
  perform 1 from public.inventory i join (select variant_id,sum(quantity) qty from public.inventory_reservations where order_id=p_order_id and status='active' group by variant_id) x on x.variant_id=i.variant_id order by i.variant_id for update of i;
  perform 1 from public.inventory_reservations where order_id=p_order_id and status='active' order by id for update;
  select count(*) into v_count from public.inventory_reservations where order_id=p_order_id and status='active';
  if v_count>0 then
    update public.inventory i set quantity_reserved=i.quantity_reserved-x.qty from (select variant_id,sum(quantity) qty from public.inventory_reservations where order_id=p_order_id and status='active' group by variant_id) x where i.variant_id=x.variant_id and i.quantity_reserved>=x.qty;
    if not found then raise exception using errcode='P0001',message='RESERVATION_BALANCE_MISMATCH'; end if;
    update public.inventory_reservations set status=p_target,released_at=now() where order_id=p_order_id and status='active';
    update public.orders set commercial_status=case when p_target='expired' then 'expired' else 'cancelled' end,payment_status=case when payment_status='paid' then payment_status else 'cancelled' end where id=p_order_id;
    insert into public.order_status_history(order_id,previous_status,new_status,change_type,actor_type,actor_user_id,reason,technical_reference) values(p_order_id,v_old,case when p_target='expired' then 'expired' else 'cancelled' end,'commercial',case when auth.uid() is null then 'system' else 'admin' end,auth.uid(),nullif(btrim(p_reason),''),btrim(p_operation_key));
  end if;
  v_result:=jsonb_build_object('status',case when v_count>0 then p_target else 'already_inactive' end,'order_id',p_order_id,'released_reservations',v_count);
  insert into private.order_inventory_operations(operation_key,operation_type,order_id,payload,result,created_by) values(btrim(p_operation_key),case when p_target='expired' then 'expire' else 'release' end,p_order_id,v_payload,v_result,auth.uid());
  return v_result||jsonb_build_object('idempotent_replay',false);
end; $$;

create or replace function private.confirm_order_sale(p_order_id bigint,p_payment_id bigint,p_operation_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_existing private.order_inventory_operations%rowtype; v_payload jsonb; v_result jsonb; r record; v_old text;
begin
  if not (select private.is_commerce_executor()) then raise exception using errcode='P0001',message='NOT_AUTHORIZED'; end if;
  if nullif(btrim(p_operation_key),'') is null then raise exception using errcode='P0001',message='INVALID_IDEMPOTENCY_KEY'; end if;
  v_payload:=jsonb_build_object('order_id',p_order_id,'payment_id',p_payment_id);
  perform pg_advisory_xact_lock(hashtextextended('bellmont.order-operation:'||btrim(p_operation_key),0));
  select * into v_existing from private.order_inventory_operations where operation_key=btrim(p_operation_key) for update;
  if found then if v_existing.operation_type<>'sale' or v_existing.payload<>v_payload then raise exception using errcode='P0001',message='IDEMPOTENCY_CONFLICT'; end if; return v_existing.result||jsonb_build_object('idempotent_replay',true); end if;
  select commercial_status into v_old from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0001',message='ORDER_NOT_FOUND'; end if;
  if not exists(select 1 from public.order_payments op join public.orders o on o.id=op.order_id where op.id=p_payment_id and op.order_id=p_order_id and op.status='paid' and op.amount_confirmed>=o.grand_total) then raise exception using errcode='P0001',message='PAYMENT_NOT_CONFIRMED'; end if;
  if not exists(select 1 from public.inventory_reservations where order_id=p_order_id and status='active') then
    v_result:=jsonb_build_object('status','reconciliation_required','order_id',p_order_id);
    insert into private.order_inventory_operations(operation_key,operation_type,order_id,payload,result,created_by) values(btrim(p_operation_key),'sale',p_order_id,v_payload,v_result,auth.uid()); return v_result||jsonb_build_object('idempotent_replay',false);
  end if;
  perform 1 from public.inventory i join (select variant_id,sum(quantity) qty from public.inventory_reservations where order_id=p_order_id and status='active' group by variant_id) x on x.variant_id=i.variant_id order by i.variant_id for update of i;
  if exists(select 1 from (select variant_id,sum(quantity) qty from public.inventory_reservations where order_id=p_order_id and status='active' group by variant_id) x join public.inventory i on i.variant_id=x.variant_id where i.quantity_reserved<x.qty or i.quantity_on_hand<x.qty) then raise exception using errcode='P0001',message='RESERVATION_BALANCE_MISMATCH'; end if;
  for r in select * from public.inventory_reservations where order_id=p_order_id and status='active' order by variant_id,order_item_id for update loop
    perform set_config('bellmont.inventory_movement_type','sale',true); perform set_config('bellmont.inventory_reference_type','order_item',true); perform set_config('bellmont.inventory_reference_id',r.order_item_id::text,true); perform set_config('bellmont.inventory_movement_note','confirmed sale',true);
    update public.inventory set quantity_on_hand=quantity_on_hand-r.quantity,quantity_reserved=quantity_reserved-r.quantity where variant_id=r.variant_id;
    update public.inventory_reservations set status='consumed',consumed_at=now() where id=r.id;
  end loop;
  update public.orders set commercial_status='confirmed',payment_status='paid',paid_total=grand_total where id=p_order_id;
  insert into public.order_status_history(order_id,previous_status,new_status,change_type,actor_type,actor_user_id,reason,technical_reference) values(p_order_id,v_old,'confirmed','payment',case when auth.uid() is null then 'payment_webhook' else 'admin' end,auth.uid(),'confirmed payment consumed reservation',btrim(p_operation_key));
  v_result:=jsonb_build_object('status','sold','order_id',p_order_id,'consumed_reservations',(select count(*) from public.inventory_reservations where order_id=p_order_id and status='consumed'));
  insert into private.order_inventory_operations(operation_key,operation_type,order_id,payload,result,created_by) values(btrim(p_operation_key),'sale',p_order_id,v_payload,v_result,auth.uid()); return v_result||jsonb_build_object('idempotent_replay',false);
end; $$;

create or replace function private.return_order_item(p_order_id bigint,p_order_item_id bigint,p_quantity bigint,p_operation_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_existing private.order_inventory_operations%rowtype; v_payload jsonb; v_result jsonb; v_variant bigint; v_sold bigint; v_returned bigint;
begin
  if not (select private.is_commerce_executor()) then raise exception using errcode='P0001',message='NOT_AUTHORIZED'; end if;
  if nullif(btrim(p_operation_key),'') is null then raise exception using errcode='P0001',message='INVALID_IDEMPOTENCY_KEY'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception using errcode='P0001',message='INVALID_RETURN_QUANTITY'; end if;
  v_payload:=jsonb_build_object('order_id',p_order_id,'order_item_id',p_order_item_id,'quantity',p_quantity);
  perform pg_advisory_xact_lock(hashtextextended('bellmont.order-operation:'||btrim(p_operation_key),0));
  select * into v_existing from private.order_inventory_operations where operation_key=btrim(p_operation_key) for update;
  if found then if v_existing.operation_type<>'return' or v_existing.payload<>v_payload then raise exception using errcode='P0001',message='IDEMPOTENCY_CONFLICT'; end if; return v_existing.result||jsonb_build_object('idempotent_replay',true); end if;
  select variant_id into v_variant from public.order_items where id=p_order_item_id and order_id=p_order_id;
  if not found then raise exception using errcode='P0001',message='ORDER_ITEM_NOT_FOUND'; end if;
  perform pg_advisory_xact_lock(hashtextextended('bellmont.order-item-return:'||p_order_item_id::text,0));
  select coalesce(-sum(quantity_delta),0) into v_sold from public.inventory_movements where movement_type='sale' and reference_type='order_item' and reference_id=p_order_item_id::text;
  select coalesce(sum(quantity_delta),0) into v_returned from public.inventory_movements where movement_type='return' and reference_type='order_item' and reference_id=p_order_item_id::text;
  if p_quantity>v_sold-v_returned then raise exception using errcode='P0001',message='RETURN_EXCEEDS_SOLD'; end if;
  perform 1 from public.inventory where variant_id=v_variant for update;
  perform set_config('bellmont.inventory_movement_type','return',true); perform set_config('bellmont.inventory_reference_type','order_item',true); perform set_config('bellmont.inventory_reference_id',p_order_item_id::text,true); perform set_config('bellmont.inventory_movement_note','physical return',true);
  update public.inventory set quantity_on_hand=quantity_on_hand+p_quantity where variant_id=v_variant;
  insert into public.order_status_history(order_id,previous_status,new_status,change_type,actor_type,actor_user_id,reason,technical_reference) values(p_order_id,'sold','returned','fulfillment',case when auth.uid() is null then 'system' else 'admin' end,auth.uid(),'physical return; financial refund not implied',btrim(p_operation_key));
  v_result:=jsonb_build_object('status','returned','order_id',p_order_id,'order_item_id',p_order_item_id,'quantity',p_quantity);
  insert into private.order_inventory_operations(operation_key,operation_type,order_id,payload,result,created_by) values(btrim(p_operation_key),'return',p_order_id,v_payload,v_result,auth.uid()); return v_result||jsonb_build_object('idempotent_replay',false);
end; $$;

create or replace function private.expire_due_reservations(p_batch_key text,p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path=''
as $$ declare r record; v_count integer:=0; begin
  if not (select private.is_commerce_executor()) then raise exception using errcode='P0001',message='NOT_AUTHORIZED'; end if;
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception using errcode='P0001',message='INVALID_LIMIT'; end if;
  for r in select o.id as order_id from public.orders o where exists(select 1 from public.inventory_reservations ir where ir.order_id=o.id and ir.status='active' and ir.expires_at<=now()) order by o.id for update of o skip locked limit p_limit loop
    perform private.release_order_inventory(r.order_id,btrim(p_batch_key)||':'||r.order_id,'reservation expired','expired'); v_count:=v_count+1;
  end loop;
  return jsonb_build_object('status','processed','expired_orders',v_count);
end; $$;

-- Public invoker wrappers are an authenticated Admin/backend API boundary.
create or replace function public.reserve_order_inventory(p_order_id bigint,p_operation_key text) returns jsonb language sql security invoker set search_path='' as $$select private.reserve_order_inventory(p_order_id,p_operation_key)$$;
create or replace function public.release_order_inventory(p_order_id bigint,p_operation_key text,p_reason text) returns jsonb language sql security invoker set search_path='' as $$select private.release_order_inventory(p_order_id,p_operation_key,p_reason,'released')$$;
create or replace function public.confirm_order_sale(p_order_id bigint,p_payment_id bigint,p_operation_key text) returns jsonb language sql security invoker set search_path='' as $$select private.confirm_order_sale(p_order_id,p_payment_id,p_operation_key)$$;
create or replace function public.return_order_item(p_order_id bigint,p_order_item_id bigint,p_quantity bigint,p_operation_key text) returns jsonb language sql security invoker set search_path='' as $$select private.return_order_item(p_order_id,p_order_item_id,p_quantity,p_operation_key)$$;
create or replace function public.expire_due_reservations(p_batch_key text,p_limit integer default 100) returns jsonb language sql security invoker set search_path='' as $$select private.expire_due_reservations(p_batch_key,p_limit)$$;

revoke all on function private.reserve_order_inventory(bigint,text),private.release_order_inventory(bigint,text,text,text),private.confirm_order_sale(bigint,bigint,text),private.return_order_item(bigint,bigint,bigint,text),private.expire_due_reservations(text,integer) from public,anon,authenticated;
grant execute on function private.reserve_order_inventory(bigint,text),private.release_order_inventory(bigint,text,text,text),private.confirm_order_sale(bigint,bigint,text),private.return_order_item(bigint,bigint,bigint,text),private.expire_due_reservations(text,integer) to authenticated,service_role;
revoke all on function public.reserve_order_inventory(bigint,text),public.release_order_inventory(bigint,text,text),public.confirm_order_sale(bigint,bigint,text),public.return_order_item(bigint,bigint,bigint,text),public.expire_due_reservations(text,integer) from public,anon,authenticated;
grant execute on function public.reserve_order_inventory(bigint,text),public.release_order_inventory(bigint,text,text),public.confirm_order_sale(bigint,bigint,text),public.return_order_item(bigint,bigint,bigint,text),public.expire_due_reservations(text,integer) to authenticated,service_role;
