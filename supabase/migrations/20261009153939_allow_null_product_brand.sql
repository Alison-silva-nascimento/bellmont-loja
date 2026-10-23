-- Fabricante ausente e fabricante vazio são estados distintos.
-- A check constraint products_brand_not_blank continua rejeitando strings vazias.
alter table public.products
  alter column brand drop not null;

comment on column public.products.brand is
  'Confirmed manufacturer/brand. NULL means the manufacturer has not been informed.';
