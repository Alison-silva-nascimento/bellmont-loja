-- BELLMONT V2.3 - Mercado Pago Checkout Pro via Orders API.
-- Local only. Adds provider-order persistence and atomic webhook reconciliation.
-- It creates no commercial rows, enables no checkout flag and performs no remote operation.

alter table public.order_payments
  add column external_order_id text null,
  add column provider_idempotency_key uuid null,
  add column checkout_url text null,
  add column provider_status text null,
  add column provider_status_detail text null,
  add column provider_updated_at timestamptz null,
  add constraint order_payments_external_order_not_blank
    check (external_order_id is null or btrim(external_order_id) <> ''),
  add constraint order_payments_checkout_url_https
    check (checkout_url is null or checkout_url ~ '^https://'),
  add constraint order_payments_provider_status_not_blank
    check (provider_status is null or btrim(provider_status) <> ''),
  add constraint order_payments_provider_status_detail_not_blank
    check (provider_status_detail is null or btrim(provider_status_detail) <> '');

create unique index order_payments_provider_order_unique_idx
  on public.order_payments(provider, external_order_id)
  where external_order_id is not null;

create unique index order_payments_provider_idempotency_unique_idx
  on public.order_payments(provider, provider_idempotency_key)
  where provider_idempotency_key is not null;

create table private.checkout_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null,
  updated_at timestamptz not null default now(),
  constraint checkout_rate_limits_key_hash_not_blank check (btrim(key_hash) <> ''),
  constraint checkout_rate_limits_request_count_positive check (request_count > 0)
);

revoke all on table private.checkout_rate_limits from public, anon, authenticated;
grant select, insert, update on table private.checkout_rate_limits to service_role;

create or replace function public.consume_checkout_rate_limit_v2(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row private.checkout_rate_limits%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'CHECKOUT_SERVER_ONLY' using errcode = '42501';
  end if;
  if nullif(btrim(p_key_hash), '') is null
     or p_limit is null or p_limit < 1 or p_limit > 100
     or p_window_seconds is null or p_window_seconds < 10 or p_window_seconds > 3600 then
    raise exception 'INVALID_RATE_LIMIT' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('bellmont.checkout-rate:' || btrim(p_key_hash), 0)
  );
  select * into v_row
  from private.checkout_rate_limits
  where key_hash = btrim(p_key_hash)
  for update;

  if not found or v_row.window_started_at <= now() - make_interval(secs => p_window_seconds) then
    insert into private.checkout_rate_limits(key_hash, window_started_at, request_count, updated_at)
    values(btrim(p_key_hash), now(), 1, now())
    on conflict(key_hash) do update
      set window_started_at = excluded.window_started_at,
          request_count = 1,
          updated_at = now();
    return true;
  end if;

  if v_row.request_count >= p_limit then
    return false;
  end if;
  update private.checkout_rate_limits
  set request_count = request_count + 1, updated_at = now()
  where key_hash = btrim(p_key_hash);
  return true;
end;
$$;

create or replace function public.prepare_checkout_payment_v2(
  p_order_id bigint,
  p_provider_idempotency_key uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.order_payments%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'CHECKOUT_SERVER_ONLY' using errcode = '42501';
  end if;
  if p_provider_idempotency_key is null then
    raise exception 'INVALID_PROVIDER_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_order.record_type <> 'commercial_order'
     or v_order.commercial_status <> 'pending_payment'
     or v_order.payment_status <> 'pending'
     or v_order.expires_at <= now() then
    raise exception 'ORDER_NOT_PAYMENT_ELIGIBLE' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.inventory_reservations
    where order_id = p_order_id and status = 'active' and expires_at > now()
  ) then
    raise exception 'ORDER_RESERVATION_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  select * into v_payment
  from public.order_payments
  where provider = 'mercado_pago'
    and idempotency_key = 'order:' || v_order.idempotency_key
  for update;

  if found then
    return jsonb_build_object(
      'status', 'already_prepared',
      'payment_id', v_payment.id,
      'provider_idempotency_key', v_payment.provider_idempotency_key,
      'external_order_id', v_payment.external_order_id,
      'checkout_url', v_payment.checkout_url
    );
  end if;

  insert into public.order_payments(
    order_id, provider, payment_method, amount_requested, amount_confirmed,
    status, idempotency_key, provider_idempotency_key
  ) values (
    v_order.id, 'mercado_pago', 'checkout_pro', v_order.grand_total, 0,
    'pending', 'order:' || v_order.idempotency_key, p_provider_idempotency_key
  )
  returning * into v_payment;

  return jsonb_build_object(
    'status', 'prepared',
    'payment_id', v_payment.id,
    'provider_idempotency_key', v_payment.provider_idempotency_key,
    'external_order_id', null,
    'checkout_url', null
  );
exception
  when unique_violation then
    select * into v_payment
    from public.order_payments
    where provider = 'mercado_pago'
      and idempotency_key = 'order:' || v_order.idempotency_key;
    if found then
      return jsonb_build_object(
        'status', 'already_prepared',
        'payment_id', v_payment.id,
        'provider_idempotency_key', v_payment.provider_idempotency_key,
        'external_order_id', v_payment.external_order_id,
        'checkout_url', v_payment.checkout_url
      );
    end if;
    raise;
end;
$$;

create or replace function public.attach_checkout_provider_order_v2(
  p_payment_id bigint,
  p_external_order_id text,
  p_checkout_url text,
  p_provider_status text,
  p_provider_status_detail text,
  p_provider_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment public.order_payments%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'CHECKOUT_SERVER_ONLY' using errcode = '42501';
  end if;
  if nullif(btrim(p_external_order_id), '') is null
     or nullif(btrim(p_checkout_url), '') is null
     or p_checkout_url !~ '^https://'
     or nullif(btrim(p_provider_status), '') is null then
    raise exception 'INVALID_PROVIDER_ORDER' using errcode = '22023';
  end if;

  select * into v_payment
  from public.order_payments
  where id = p_payment_id and provider = 'mercado_pago'
  for update;

  if not found then
    raise exception 'PAYMENT_ATTEMPT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_payment.external_order_id is not null
     and (v_payment.external_order_id <> btrim(p_external_order_id)
       or v_payment.checkout_url <> btrim(p_checkout_url)) then
    raise exception 'PROVIDER_ORDER_CONFLICT' using errcode = 'P0001';
  end if;

  update public.order_payments
  set external_order_id = btrim(p_external_order_id),
      checkout_url = btrim(p_checkout_url),
      provider_status = btrim(p_provider_status),
      provider_status_detail = nullif(btrim(p_provider_status_detail), ''),
      provider_updated_at = p_provider_updated_at
  where id = v_payment.id;

  return jsonb_build_object(
    'status', case when v_payment.external_order_id is null then 'attached' else 'already_attached' end,
    'payment_id', v_payment.id,
    'external_order_id', btrim(p_external_order_id),
    'checkout_url', btrim(p_checkout_url)
  );
end;
$$;

create or replace function public.reconcile_checkout_payment_v2(
  p_external_event_id text,
  p_external_order_id text,
  p_external_payment_id text,
  p_external_reference uuid,
  p_provider_status text,
  p_provider_status_detail text,
  p_total_amount numeric,
  p_total_paid_amount numeric,
  p_provider_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment public.order_payments%rowtype;
  v_order public.orders%rowtype;
  v_event public.payment_webhook_events%rowtype;
  v_target text;
  v_inventory_result jsonb;
  v_result jsonb;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role' then
    raise exception 'CHECKOUT_SERVER_ONLY' using errcode = '42501';
  end if;
  if nullif(btrim(p_external_event_id), '') is null
     or nullif(btrim(p_external_order_id), '') is null
     or nullif(btrim(p_provider_status), '') is null
     or p_external_reference is null
     or p_total_amount is null or p_total_amount < 0
     or p_total_paid_amount is null or p_total_paid_amount < 0
     or p_provider_updated_at is null then
    raise exception 'INVALID_PROVIDER_RECONCILIATION' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('bellmont.mp-order:' || btrim(p_external_order_id), 0)
  );

  select * into v_event
  from public.payment_webhook_events
  where provider = 'mercado_pago'
    and external_event_id = btrim(p_external_event_id)
  for update;

  if found then
    return jsonb_build_object(
      'status', 'duplicate_event',
      'processing_status', v_event.processing_status,
      'error', v_event.sanitized_error
    );
  end if;

  select op.* into v_payment
  from public.order_payments op
  where op.provider = 'mercado_pago'
    and op.external_order_id = btrim(p_external_order_id)
  for update;

  if not found then
    insert into public.payment_webhook_events(
      order_payment_id, provider, external_event_id, event_type,
      external_transaction_id, processing_status, processed_at, sanitized_error
    ) values (
      null, 'mercado_pago', btrim(p_external_event_id), 'order',
      btrim(p_external_order_id), 'ignored', now(), 'UNKNOWN_PROVIDER_ORDER'
    );
    return jsonb_build_object('status', 'unknown_provider_order');
  end if;

  select * into strict v_order
  from public.orders
  where id = v_payment.order_id
  for update;

  insert into public.payment_webhook_events(
    order_payment_id, provider, external_event_id, event_type,
    external_transaction_id, processing_status
  ) values (
    v_payment.id, 'mercado_pago', btrim(p_external_event_id), 'order',
    btrim(p_external_order_id), 'processing'
  ) returning * into v_event;

  if p_external_reference <> v_order.public_id
     or p_total_amount <> v_order.grand_total
     or p_total_paid_amount > p_total_amount then
    update public.payment_webhook_events
    set processing_status = 'failed', processed_at = now(),
        sanitized_error = 'PROVIDER_ORDER_MISMATCH'
    where id = v_event.id;
    return jsonb_build_object('status', 'provider_order_mismatch');
  end if;

  if v_payment.provider_updated_at is not null
     and p_provider_updated_at < v_payment.provider_updated_at then
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = now(),
        sanitized_error = 'STALE_PROVIDER_EVENT'
    where id = v_event.id;
    return jsonb_build_object('status', 'stale_event');
  end if;

  v_target := case
    when p_provider_status = 'processed' and p_provider_status_detail = 'accredited' then 'paid'
    when p_provider_status = 'processed' and p_provider_status_detail = 'partially_refunded' then 'partially_refunded'
    when p_provider_status = 'refunded' then 'refunded'
    when p_provider_status = 'action_required' and p_provider_status_detail = 'waiting_capture' then 'authorized'
    when p_provider_status = 'failed' then 'failed'
    when p_provider_status = 'canceled' then 'cancelled'
    when p_provider_status in ('created', 'processing') then 'pending'
    else 'unknown'
  end;

  if v_target = 'unknown' then
    update public.order_payments
    set provider_status = btrim(p_provider_status),
        provider_status_detail = nullif(btrim(p_provider_status_detail), ''),
        provider_updated_at = p_provider_updated_at
    where id = v_payment.id;
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = now(),
        sanitized_error = 'UNSUPPORTED_PROVIDER_STATUS'
    where id = v_event.id;
    return jsonb_build_object('status', 'unsupported_provider_status');
  end if;

  -- Never regress a financially final state because of a delayed provider event.
  if v_payment.status in ('paid', 'partially_refunded', 'refunded')
     and v_target in ('pending', 'authorized', 'failed', 'cancelled') then
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = now(),
        sanitized_error = 'NON_REGRESSIVE_STATUS_GUARD'
    where id = v_event.id;
    return jsonb_build_object('status', 'non_regressive_ignored');
  end if;
  if v_payment.status in ('failed', 'cancelled')
     and v_target in ('pending', 'authorized') then
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = now(),
        sanitized_error = 'NON_REGRESSIVE_STATUS_GUARD'
    where id = v_event.id;
    return jsonb_build_object('status', 'non_regressive_ignored');
  end if;

  update public.order_payments
  set external_transaction_id = coalesce(nullif(btrim(p_external_payment_id), ''), external_transaction_id),
      provider_status = btrim(p_provider_status),
      provider_status_detail = nullif(btrim(p_provider_status_detail), ''),
      provider_updated_at = p_provider_updated_at,
      status = v_target,
      amount_confirmed = case
        when v_target in ('paid', 'partially_refunded', 'refunded') then p_total_amount
        else 0
      end,
      confirmed_at = case
        when v_target in ('authorized', 'paid', 'partially_refunded', 'refunded')
          then coalesce(confirmed_at, now())
        else null
      end
  where id = v_payment.id;

  if v_target = 'paid' then
    v_inventory_result := private.confirm_order_sale(
      v_order.id,
      v_payment.id,
      'mp-sale:' || btrim(p_external_order_id)
    );
    if v_inventory_result ->> 'status' = 'reconciliation_required' then
      update public.orders
      set payment_status = 'paid', paid_total = grand_total
      where id = v_order.id;
      insert into public.order_status_history(
        order_id, previous_status, new_status, change_type,
        actor_type, reason, technical_reference
      ) values (
        v_order.id, v_order.commercial_status, v_order.commercial_status,
        'payment', 'payment_webhook',
        'Pagamento tardio confirmado sem reserva ativa; reconciliação manual obrigatória.',
        'mp:' || btrim(p_external_order_id)
      );
      update public.payment_webhook_events
      set processing_status = 'failed', processed_at = now(),
          sanitized_error = 'LATE_PAYMENT_RECONCILIATION_REQUIRED'
      where id = v_event.id;
      return jsonb_build_object(
        'status', 'reconciliation_required',
        'payment_status', 'paid',
        'stock_consumed', false
      );
    end if;
  elsif v_target in ('failed', 'cancelled') then
    v_inventory_result := private.release_order_inventory(
      v_order.id,
      'mp-terminal:' || btrim(p_external_order_id) || ':' || v_target,
      'Mercado Pago order ' || v_target,
      'released'
    );
    update public.orders
    set payment_status = v_target
    where id = v_order.id and payment_status <> 'paid';
  elsif v_target = 'authorized' then
    update public.orders
    set payment_status = 'authorized'
    where id = v_order.id and payment_status = 'pending';
  elsif v_target in ('partially_refunded', 'refunded') then
    update public.orders
    set payment_status = v_target
    where id = v_order.id;
    insert into public.order_status_history(
      order_id, previous_status, new_status, change_type,
      actor_type, reason, technical_reference
    ) values (
      v_order.id, v_order.payment_status, v_target, 'payment',
      'payment_webhook',
      'Estado financeiro atualizado; devolução física não é presumida.',
      'mp:' || btrim(p_external_order_id)
    );
  end if;

  update public.payment_webhook_events
  set processing_status = 'processed', processed_at = now(), sanitized_error = null
  where id = v_event.id;

  v_result := jsonb_build_object(
    'status', 'processed',
    'payment_status', v_target,
    'stock_consumed', coalesce(v_inventory_result ->> 'status', '') = 'sold'
  );
  return v_result;
end;
$$;

revoke all on function public.prepare_checkout_payment_v2(bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_checkout_payment_v2(bigint, uuid)
  to service_role;

revoke all on function public.consume_checkout_rate_limit_v2(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_checkout_rate_limit_v2(text, integer, integer)
  to service_role;

revoke all on function public.attach_checkout_provider_order_v2(bigint, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.attach_checkout_provider_order_v2(bigint, text, text, text, text, timestamptz)
  to service_role;

revoke all on function public.reconcile_checkout_payment_v2(text, text, text, uuid, text, text, numeric, numeric, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reconcile_checkout_payment_v2(text, text, text, uuid, text, text, numeric, numeric, timestamptz)
  to service_role;

comment on function public.reconcile_checkout_payment_v2(text, text, text, uuid, text, text, numeric, numeric, timestamptz) is
  'Server-only atomic Mercado Pago Orders API reconciliation. Prevents duplicate sale, status regression and negative stock.';
