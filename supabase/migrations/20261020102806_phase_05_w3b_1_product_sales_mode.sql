-- BELLMONT Phase 05.W3B.1
-- PREPARED LOCALLY — NOT APPLIED REMOTELY.
-- Separates publication status from the action customers may take.

alter table public.products
  add column sales_mode text not null default 'INQUIRY_ONLY'
  constraint products_sales_mode_check
  check (sales_mode in ('ASSISTED_PURCHASE', 'INQUIRY_ONLY', 'DISABLED'));

-- Only the approved Streetwear codes can enter the assisted-purchase flow.
update public.products
set sales_mode = 'ASSISTED_PURCHASE'
where code ~ '^ST-(0[1-9]|1[0-9]|20)$';

-- Perfumes remain consultation-only even when they have confirmed variants.
update public.products
set sales_mode = 'INQUIRY_ONLY'
where code ~ '^PF-(0[1-9]|1[0-9]|2[0-2])$';

-- Technical records are never commercial products.
update public.products
set sales_mode = 'DISABLED'
where code = 'TEST-FIXTURE-01';

comment on column public.products.sales_mode is
  'Commercial action mode. Visibility remains controlled independently by products.status and RLS.';

-- Reversal plan before any dependent release:
-- alter table public.products drop column sales_mode;
