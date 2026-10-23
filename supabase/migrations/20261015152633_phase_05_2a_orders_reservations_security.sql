-- BELLMONT E-commerce - Phase 05.2A orders, reservations and security foundation.
-- Local-only schema migration. It creates no orders, reservations or commercial data.

create table public.orders (
  id bigint generated always as identity primary key,
  public_id uuid not null default gen_random_uuid(),
  order_number text not null,
  record_type text not null default 'commercial_order',
  source text not null,
  customer_user_id uuid null references auth.users (id) on delete set null,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text null,
  currency text not null default 'BRL',
  items_subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  shipping_total numeric(12, 2) not null default 0,
  grand_total numeric(12, 2) not null default 0,
  paid_total numeric(12, 2) not null default 0,
  commercial_status text not null default 'draft',
  payment_status text not null default 'pending',
  fulfillment_status text not null default 'unfulfilled',
  idempotency_key text not null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_public_id_unique unique (public_id),
  constraint orders_order_number_unique unique (order_number),
  constraint orders_idempotency_key_unique unique (idempotency_key),
  constraint orders_order_number_not_blank check (
    order_number = btrim(order_number) and order_number <> ''
  ),
  constraint orders_record_type_valid check (
    record_type in ('commercial_order', 'assistance_request')
  ),
  constraint orders_source_valid check (
    source in ('website', 'whatsapp_assisted')
  ),
  constraint orders_buyer_name_not_blank check (
    buyer_name = btrim(buyer_name) and buyer_name <> ''
  ),
  constraint orders_buyer_phone_not_blank check (
    buyer_phone = btrim(buyer_phone) and buyer_phone <> ''
  ),
  constraint orders_buyer_email_not_blank check (
    buyer_email is null or (buyer_email = btrim(buyer_email) and buyer_email <> '')
  ),
  constraint orders_currency_brl check (currency = 'BRL'),
  constraint orders_items_subtotal_nonnegative check (items_subtotal >= 0),
  constraint orders_discount_total_valid check (
    discount_total >= 0 and discount_total <= items_subtotal
  ),
  constraint orders_shipping_total_nonnegative check (shipping_total >= 0),
  constraint orders_grand_total_consistent check (
    grand_total = items_subtotal - discount_total + shipping_total
  ),
  constraint orders_paid_total_valid check (
    paid_total >= 0 and paid_total <= grand_total
  ),
  constraint orders_commercial_status_valid check (
    commercial_status in (
      'draft', 'pending_payment', 'confirmed', 'processing',
      'completed', 'cancelled', 'expired'
    )
  ),
  constraint orders_payment_status_valid check (
    payment_status in (
      'pending', 'authorized', 'paid', 'failed', 'cancelled',
      'partially_refunded', 'refunded'
    )
  ),
  constraint orders_fulfillment_status_valid check (
    fulfillment_status in (
      'unfulfilled', 'processing', 'shipped', 'delivered',
      'cancelled', 'not_applicable'
    )
  ),
  constraint orders_idempotency_key_not_blank check (
    idempotency_key = btrim(idempotency_key) and idempotency_key <> ''
  ),
  constraint orders_expiration_after_creation check (
    expires_at is null or expires_at > created_at
  ),
  constraint orders_assistance_request_not_commercially_confirmed check (
    record_type = 'commercial_order'
    or (
      commercial_status in ('draft', 'cancelled', 'expired')
      and payment_status in ('pending', 'cancelled')
      and fulfillment_status in ('unfulfilled', 'cancelled', 'not_applicable')
      and paid_total = 0
    )
  )
);

comment on table public.orders is
  'Order aggregate or WhatsApp assistance request. All monetary values are server-validated BRL snapshots.';
comment on column public.orders.public_id is
  'Non-sequential identifier suitable for future customer-facing references.';
comment on column public.orders.idempotency_key is
  'Backend-issued key; direct browser writes are intentionally not granted.';

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete restrict,
  product_id bigint not null,
  variant_id bigint not null,
  product_code text null,
  variant_sku text not null,
  product_name text not null,
  brand text null,
  category text not null,
  color text null,
  size text null,
  volume text null,
  quantity bigint not null,
  unit_price numeric(12, 2) not null,
  discount_total numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint order_items_order_id_id_variant_unique unique (order_id, id, variant_id),
  constraint order_items_product_variant_fkey
    foreign key (product_id, variant_id)
    references public.product_variants (product_id, id)
    on delete restrict,
  constraint order_items_variant_sku_not_blank check (
    variant_sku = btrim(variant_sku) and variant_sku <> ''
  ),
  constraint order_items_product_name_not_blank check (
    product_name = btrim(product_name) and product_name <> ''
  ),
  constraint order_items_category_not_blank check (
    category = btrim(category) and category <> ''
  ),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_unit_price_nonnegative check (unit_price >= 0),
  constraint order_items_discount_total_valid check (
    discount_total >= 0 and discount_total <= unit_price * quantity
  ),
  constraint order_items_line_total_consistent check (
    line_total = unit_price * quantity - discount_total
  )
);

comment on table public.order_items is
  'Immutable-intent commercial snapshots. Catalog rows are RESTRICTed from deletion once referenced; archive them instead.';

create table public.order_addresses (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete restrict,
  address_type text not null default 'shipping',
  recipient_name text not null,
  recipient_phone text null,
  postal_code text not null,
  street text not null,
  street_number text not null,
  complement text null,
  neighborhood text not null,
  city text not null,
  state_code text not null,
  reference text null,
  created_at timestamptz not null default now(),
  constraint order_addresses_order_type_unique unique (order_id, address_type),
  constraint order_addresses_type_valid check (address_type in ('shipping', 'billing')),
  constraint order_addresses_recipient_name_not_blank check (
    recipient_name = btrim(recipient_name) and recipient_name <> ''
  ),
  constraint order_addresses_recipient_phone_not_blank check (
    recipient_phone is null
    or (recipient_phone = btrim(recipient_phone) and recipient_phone <> '')
  ),
  constraint order_addresses_postal_code_format check (postal_code ~ '^[0-9]{8}$'),
  constraint order_addresses_street_not_blank check (btrim(street) <> ''),
  constraint order_addresses_street_number_not_blank check (btrim(street_number) <> ''),
  constraint order_addresses_neighborhood_not_blank check (btrim(neighborhood) <> ''),
  constraint order_addresses_city_not_blank check (btrim(city) <> ''),
  constraint order_addresses_state_code_format check (state_code ~ '^[A-Z]{2}$')
);

comment on table public.order_addresses is
  'Historical address snapshot used by an order; it is not a mutable customer address book.';

create table public.order_payments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete restrict,
  provider text not null,
  external_transaction_id text null,
  payment_method text not null,
  amount_requested numeric(12, 2) not null,
  amount_confirmed numeric(12, 2) not null default 0,
  status text not null default 'pending',
  idempotency_key text not null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_payments_provider_idempotency_unique unique (provider, idempotency_key),
  constraint order_payments_provider_not_blank check (
    provider = btrim(provider) and provider <> ''
  ),
  constraint order_payments_external_transaction_not_blank check (
    external_transaction_id is null
    or (external_transaction_id = btrim(external_transaction_id) and external_transaction_id <> '')
  ),
  constraint order_payments_method_valid check (
    payment_method in ('pix', 'credit_card', 'manual')
  ),
  constraint order_payments_amount_requested_positive check (amount_requested > 0),
  constraint order_payments_amount_confirmed_valid check (
    amount_confirmed >= 0 and amount_confirmed <= amount_requested
  ),
  constraint order_payments_status_valid check (
    status in (
      'pending', 'authorized', 'paid', 'failed', 'cancelled',
      'partially_refunded', 'refunded'
    )
  ),
  constraint order_payments_idempotency_key_not_blank check (
    idempotency_key = btrim(idempotency_key) and idempotency_key <> ''
  ),
  constraint order_payments_confirmation_consistent check (
    (status in ('authorized', 'paid', 'partially_refunded', 'refunded') and confirmed_at is not null)
    or (status not in ('authorized', 'paid', 'partially_refunded', 'refunded'))
  )
);

comment on table public.order_payments is
  'Payment attempt metadata only. Full card numbers, CVV and reusable card credentials are prohibited.';

create unique index order_payments_provider_transaction_unique_idx
  on public.order_payments (provider, external_transaction_id)
  where external_transaction_id is not null;

create table public.order_shipments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete restrict,
  provider text null,
  carrier text null,
  service text null,
  external_quote_id text null,
  confirmed_shipping_amount numeric(12, 2) null,
  estimated_business_days integer null,
  tracking_code text null,
  status text not null default 'not_quoted',
  quoted_at timestamptz null,
  quote_expires_at timestamptz null,
  shipped_at timestamptz null,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_shipments_amount_nonnegative check (
    confirmed_shipping_amount is null or confirmed_shipping_amount >= 0
  ),
  constraint order_shipments_estimate_positive check (
    estimated_business_days is null or estimated_business_days > 0
  ),
  constraint order_shipments_status_valid check (
    status in (
      'not_quoted', 'quoted', 'label_pending', 'ready_to_ship',
      'shipped', 'delivered', 'cancelled', 'failed'
    )
  ),
  constraint order_shipments_quote_expiration_valid check (
    quote_expires_at is null
    or (quoted_at is not null and quote_expires_at > quoted_at)
  ),
  constraint order_shipments_delivery_timeline_valid check (
    delivered_at is null
    or (shipped_at is not null and delivered_at >= shipped_at)
  )
);

comment on table public.order_shipments is
  'Shipment and quote snapshots; an order may exist before any quote or shipment is created.';

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete restrict,
  previous_status text null,
  new_status text not null,
  change_type text not null,
  actor_type text not null,
  actor_user_id uuid null references auth.users (id) on delete set null,
  reason text null,
  technical_reference text null,
  created_at timestamptz not null default now(),
  constraint order_status_history_new_status_not_blank check (btrim(new_status) <> ''),
  constraint order_status_history_previous_status_not_blank check (
    previous_status is null or btrim(previous_status) <> ''
  ),
  constraint order_status_history_change_type_valid check (
    change_type in ('commercial', 'payment', 'fulfillment', 'shipment', 'system')
  ),
  constraint order_status_history_actor_type_valid check (
    actor_type in ('system', 'admin', 'payment_webhook', 'shipping_webhook')
  ),
  constraint order_status_history_reason_not_blank check (
    reason is null or btrim(reason) <> ''
  ),
  constraint order_status_history_reference_not_blank check (
    technical_reference is null or btrim(technical_reference) <> ''
  )
);

comment on table public.order_status_history is
  'Append-only order timeline without payment secrets or unnecessary personal data.';

create table public.inventory_reservations (
  id bigint generated always as identity primary key,
  order_id bigint not null,
  order_item_id bigint not null,
  variant_id bigint not null references public.product_variants (id) on delete restrict,
  quantity bigint not null,
  status text not null default 'active',
  idempotency_key text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  released_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint inventory_reservations_order_item_variant_fkey
    foreign key (order_id, order_item_id, variant_id)
    references public.order_items (order_id, id, variant_id)
    on delete restrict,
  constraint inventory_reservations_idempotency_key_unique unique (idempotency_key),
  constraint inventory_reservations_quantity_positive check (quantity > 0),
  constraint inventory_reservations_status_valid check (
    status in ('active', 'consumed', 'released', 'expired')
  ),
  constraint inventory_reservations_idempotency_key_not_blank check (
    idempotency_key = btrim(idempotency_key) and idempotency_key <> ''
  ),
  constraint inventory_reservations_expiration_after_creation check (
    expires_at > created_at
  ),
  constraint inventory_reservations_lifecycle_consistent check (
    (status = 'active' and consumed_at is null and released_at is null)
    or (status = 'consumed' and consumed_at is not null and released_at is null)
    or (status in ('released', 'expired') and consumed_at is null and released_at is not null)
  )
);

comment on table public.inventory_reservations is
  'Reservation ledger linked to order items. quantity_reserved remains the sole aggregate reserved balance in inventory.';

create table public.payment_webhook_events (
  id bigint generated always as identity primary key,
  order_payment_id bigint null references public.order_payments (id) on delete restrict,
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  external_transaction_id text null,
  processing_status text not null default 'received',
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  sanitized_error text null,
  constraint payment_webhook_events_provider_event_unique unique (provider, external_event_id),
  constraint payment_webhook_events_provider_not_blank check (
    provider = btrim(provider) and provider <> ''
  ),
  constraint payment_webhook_events_external_event_not_blank check (
    external_event_id = btrim(external_event_id) and external_event_id <> ''
  ),
  constraint payment_webhook_events_type_not_blank check (
    event_type = btrim(event_type) and event_type <> ''
  ),
  constraint payment_webhook_events_transaction_not_blank check (
    external_transaction_id is null
    or (external_transaction_id = btrim(external_transaction_id) and external_transaction_id <> '')
  ),
  constraint payment_webhook_events_status_valid check (
    processing_status in ('received', 'processing', 'processed', 'failed', 'ignored')
  ),
  constraint payment_webhook_events_processed_at_consistent check (
    (processing_status in ('processed', 'failed', 'ignored') and processed_at is not null)
    or (processing_status in ('received', 'processing'))
  ),
  constraint payment_webhook_events_error_sanitized check (
    sanitized_error is null or char_length(sanitized_error) <= 1000
  )
);

comment on table public.payment_webhook_events is
  'Idempotent webhook inbox metadata. No public endpoint or raw sensitive payload is created in Phase 05.2A.';

create index orders_customer_user_id_idx
  on public.orders (customer_user_id, created_at desc)
  where customer_user_id is not null;
create index orders_commercial_status_created_at_idx
  on public.orders (commercial_status, created_at desc);
create index orders_payment_status_created_at_idx
  on public.orders (payment_status, created_at desc);
create index orders_source_created_at_idx
  on public.orders (source, created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);
create index order_addresses_order_id_idx on public.order_addresses (order_id);
create index order_payments_order_id_created_at_idx
  on public.order_payments (order_id, created_at desc);
create index order_shipments_order_id_created_at_idx
  on public.order_shipments (order_id, created_at desc);
create index order_shipments_status_created_at_idx
  on public.order_shipments (status, created_at desc);
create index order_shipments_tracking_code_idx
  on public.order_shipments (tracking_code)
  where tracking_code is not null;
create index order_status_history_order_id_created_at_idx
  on public.order_status_history (order_id, created_at, id);
create index order_status_history_actor_user_id_idx
  on public.order_status_history (actor_user_id)
  where actor_user_id is not null;
create index inventory_reservations_order_id_idx
  on public.inventory_reservations (order_id);
create index inventory_reservations_order_item_id_idx
  on public.inventory_reservations (order_item_id);
create index inventory_reservations_variant_status_idx
  on public.inventory_reservations (variant_id, status);
create index inventory_reservations_active_expiration_idx
  on public.inventory_reservations (expires_at)
  where status = 'active';
create index payment_webhook_events_order_payment_id_idx
  on public.payment_webhook_events (order_payment_id)
  where order_payment_id is not null;
create index payment_webhook_events_processing_status_received_at_idx
  on public.payment_webhook_events (processing_status, received_at);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

create trigger order_payments_set_updated_at
before update on public.order_payments
for each row execute function private.set_updated_at();

create trigger order_shipments_set_updated_at
before update on public.order_shipments
for each row execute function private.set_updated_at();

create or replace function private.prevent_order_status_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'order_status_history is append-only';
end;
$$;

revoke all on function private.prevent_order_status_history_mutation()
  from public, anon, authenticated, service_role;

create trigger order_status_history_append_only
before update or delete on public.order_status_history
for each row execute function private.prevent_order_status_history_mutation();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_addresses enable row level security;
alter table public.order_payments enable row level security;
alter table public.order_shipments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.payment_webhook_events enable row level security;

alter table public.orders force row level security;
alter table public.order_items force row level security;
alter table public.order_addresses force row level security;
alter table public.order_payments force row level security;
alter table public.order_shipments force row level security;
alter table public.order_status_history force row level security;
alter table public.inventory_reservations force row level security;
alter table public.payment_webhook_events force row level security;

revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;
revoke all on table public.order_addresses from public, anon, authenticated;
revoke all on table public.order_payments from public, anon, authenticated;
revoke all on table public.order_shipments from public, anon, authenticated;
revoke all on table public.order_status_history from public, anon, authenticated;
revoke all on table public.inventory_reservations from public, anon, authenticated;
revoke all on table public.payment_webhook_events from public, anon, authenticated;

grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select on table public.order_addresses to authenticated;
grant select on table public.order_payments to authenticated;
grant select on table public.order_shipments to authenticated;
grant select on table public.order_status_history to authenticated;
grant select on table public.inventory_reservations to authenticated;

grant all on table public.orders to service_role;
grant all on table public.order_items to service_role;
grant all on table public.order_addresses to service_role;
grant all on table public.order_payments to service_role;
grant all on table public.order_shipments to service_role;
grant all on table public.order_status_history to service_role;
grant all on table public.inventory_reservations to service_role;
grant all on table public.payment_webhook_events to service_role;

grant usage, select on sequence public.orders_id_seq to service_role;
grant usage, select on sequence public.order_items_id_seq to service_role;
grant usage, select on sequence public.order_addresses_id_seq to service_role;
grant usage, select on sequence public.order_payments_id_seq to service_role;
grant usage, select on sequence public.order_shipments_id_seq to service_role;
grant usage, select on sequence public.order_status_history_id_seq to service_role;
grant usage, select on sequence public.inventory_reservations_id_seq to service_role;
grant usage, select on sequence public.payment_webhook_events_id_seq to service_role;

create policy orders_customer_or_admin_read
on public.orders for select
to authenticated
using (
  customer_user_id = (select auth.uid())
  or (select private.is_admin())
);

create policy order_items_customer_or_admin_read
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and (
        orders.customer_user_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

create policy order_addresses_customer_or_admin_read
on public.order_addresses for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_addresses.order_id
      and (
        orders.customer_user_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

create policy order_payments_customer_or_admin_read
on public.order_payments for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_payments.order_id
      and (
        orders.customer_user_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

create policy order_shipments_customer_or_admin_read
on public.order_shipments for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_shipments.order_id
      and (
        orders.customer_user_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

create policy order_status_history_customer_or_admin_read
on public.order_status_history for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_status_history.order_id
      and (
        orders.customer_user_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

create policy inventory_reservations_customer_or_admin_read
on public.inventory_reservations for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = inventory_reservations.order_id
      and (
        orders.customer_user_id = (select auth.uid())
        or (select private.is_admin())
      )
  )
);

-- payment_webhook_events intentionally has no anon/authenticated grants or policies.
-- Its future ingestion and processing must be mediated by a trusted backend.
