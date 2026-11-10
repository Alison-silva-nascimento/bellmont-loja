-- BELLMONT V2.1 - atomic server-side checkout order creation.
-- Local only. This migration creates no commercial rows and enables no payments.

alter table public.orders
  add column checkout_access_token_hash text null,
  add constraint orders_checkout_access_token_hash_not_blank
    check (checkout_access_token_hash is null or btrim(checkout_access_token_hash) <> '');

create unique index orders_checkout_access_token_hash_unique_idx
  on public.orders (checkout_access_token_hash)
  where checkout_access_token_hash is not null;

alter table public.order_payments
  drop constraint order_payments_method_valid,
  add constraint order_payments_method_valid
    check (payment_method in ('pix','credit_card','manual','checkout_pro')),
  add column external_preference_id text null,
  add constraint order_payments_external_preference_not_blank
    check (external_preference_id is null or btrim(external_preference_id) <> '');

create unique index order_payments_provider_preference_unique_idx
  on public.order_payments(provider,external_preference_id)
  where external_preference_id is not null;

create or replace function public.create_checkout_order_v2(
  p_payload jsonb,
  p_idempotency_key text,
  p_checkout_access_token_hash text,
  p_shipping_total numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_variant record;
  v_items_subtotal numeric(12,2) := 0;
  v_line_total numeric(12,2);
  v_order_number text;
  v_item_count integer;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'CHECKOUT_SERVER_ONLY' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'INVALID_CHECKOUT_PAYLOAD' using errcode = '22023';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;
  if p_checkout_access_token_hash is null or btrim(p_checkout_access_token_hash) = '' then
    raise exception 'INVALID_CHECKOUT_ACCESS_TOKEN' using errcode = '22023';
  end if;
  if p_shipping_total is null or p_shipping_total < 0 then
    raise exception 'SHIPPING_NOT_CONFIRMED' using errcode = '22023';
  end if;

  select * into v_order from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('status','already_created','public_id',v_order.public_id,'order_number',v_order.order_number,'grand_total',v_order.grand_total,'expires_at',v_order.expires_at);
  end if;

  if jsonb_typeof(p_payload -> 'items') <> 'array' then
    raise exception 'INVALID_CHECKOUT_ITEMS' using errcode = '22023';
  end if;
  v_item_count := jsonb_array_length(p_payload -> 'items');
  if v_item_count < 1 or v_item_count > 20 then
    raise exception 'INVALID_CHECKOUT_ITEM_COUNT' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_payload -> 'items') as x(variant_id bigint, quantity bigint)
    group by x.variant_id having count(*) > 1
  ) then
    raise exception 'DUPLICATE_CHECKOUT_VARIANT' using errcode = '22023';
  end if;

  -- Deterministic row-lock order prevents overselling and reduces deadlock risk.
  for v_item in
    select x.variant_id, x.quantity
    from jsonb_to_recordset(p_payload -> 'items') as x(variant_id bigint, quantity bigint)
    order by x.variant_id
  loop
    if v_item.variant_id is null or v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'INVALID_CHECKOUT_ITEM' using errcode = '22023';
    end if;
    select pv.id as variant_id,pv.product_id,pv.sku,pv.color,pv.size,pv.volume,
           coalesce(pv.price_override,p.price) as unit_price,p.code,p.name,p.brand,p.category,
           i.quantity_on_hand,i.quantity_reserved
      into v_variant
      from public.product_variants pv
      join public.products p on p.id=pv.product_id
      join public.inventory i on i.variant_id=pv.id
     where pv.id=v_item.variant_id and pv.is_active and p.status='active'
       and p.sales_mode='ASSISTED_PURCHASE' and p.code <> 'TEST-FIXTURE-01'
     for update of i;
    if not found then raise exception 'CHECKOUT_VARIANT_UNAVAILABLE' using errcode='P0001'; end if;
    if v_variant.unit_price is null then raise exception 'CHECKOUT_PRICE_UNAVAILABLE' using errcode='P0001'; end if;
    if v_variant.quantity_on_hand - v_variant.quantity_reserved < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK' using errcode='P0001';
    end if;
    v_items_subtotal := v_items_subtotal + (v_variant.unit_price * v_item.quantity);
  end loop;

  v_order_number := 'BLM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.orders(order_number,record_type,source,buyer_name,buyer_phone,buyer_email,
    items_subtotal,discount_total,shipping_total,grand_total,commercial_status,payment_status,
    fulfillment_status,idempotency_key,checkout_access_token_hash,expires_at)
  values(v_order_number,'commercial_order','website',btrim(p_payload->>'buyer_name'),btrim(p_payload->>'buyer_phone'),
    nullif(btrim(p_payload->>'buyer_email'),''),v_items_subtotal,0,p_shipping_total,v_items_subtotal+p_shipping_total,
    'pending_payment','pending','unfulfilled',p_idempotency_key,p_checkout_access_token_hash,now()+interval '30 minutes')
  returning * into v_order;

  if btrim(coalesce(v_order.buyer_name,''))='' or btrim(coalesce(v_order.buyer_phone,''))='' then
    raise exception 'INVALID_BUYER' using errcode='22023';
  end if;

  insert into public.order_addresses(order_id,recipient_name,recipient_phone,postal_code,street,street_number,
    complement,neighborhood,city,state_code)
  values(v_order.id,v_order.buyer_name,v_order.buyer_phone,p_payload#>>'{address,postal_code}',p_payload#>>'{address,street}',
    p_payload#>>'{address,number}',nullif(p_payload#>>'{address,complement}',''),p_payload#>>'{address,neighborhood}',
    p_payload#>>'{address,city}',upper(p_payload#>>'{address,state}'));

  for v_item in
    select x.variant_id, x.quantity
    from jsonb_to_recordset(p_payload -> 'items') as x(variant_id bigint, quantity bigint)
    order by x.variant_id
  loop
    select pv.id as variant_id,pv.product_id,pv.sku,pv.color,pv.size,pv.volume,
           coalesce(pv.price_override,p.price) as unit_price,p.code,p.name,p.brand,p.category
      into strict v_variant from public.product_variants pv join public.products p on p.id=pv.product_id
     where pv.id=v_item.variant_id;
    v_line_total := v_variant.unit_price * v_item.quantity;
    insert into public.order_items(order_id,product_id,variant_id,product_code,variant_sku,product_name,brand,category,
      color,size,volume,quantity,unit_price,discount_total,line_total)
    values(v_order.id,v_variant.product_id,v_variant.variant_id,v_variant.code,v_variant.sku,v_variant.name,v_variant.brand,
      v_variant.category,v_variant.color,v_variant.size,v_variant.volume,v_item.quantity,v_variant.unit_price,0,v_line_total);
  end loop;

  perform private.reserve_order_inventory(v_order.id,'checkout:'||p_idempotency_key);
  insert into public.order_status_history(order_id,previous_status,new_status,change_type,actor_type,reason)
  values(v_order.id,null,'pending_payment','commercial','system','Checkout V2 criado e estoque reservado.');

  return jsonb_build_object('status','created','public_id',v_order.public_id,'order_number',v_order.order_number,
    'grand_total',v_order.grand_total,'expires_at',v_order.expires_at);
exception when unique_violation then
  select * into v_order from public.orders where idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('status','already_created','public_id',v_order.public_id,'order_number',v_order.order_number,'grand_total',v_order.grand_total,'expires_at',v_order.expires_at); end if;
  raise;
end;
$$;

revoke all on function public.create_checkout_order_v2(jsonb,text,text,numeric) from public,anon,authenticated;
grant execute on function public.create_checkout_order_v2(jsonb,text,text,numeric) to service_role;

comment on function public.create_checkout_order_v2(jsonb,text,text,numeric) is
  'Server-only atomic checkout creation. Recalculates catalog prices, locks inventory, snapshots items and reserves stock.';
