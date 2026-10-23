import assert from 'node:assert/strict'
import test from 'node:test'
import type { ProductImageRow, ProductRow, ProductVariantRow } from '../lib/supabase/database.types.ts'
import { normalizePublicProduct, resolvePublicCatalogSource } from './publicCatalog.ts'

const productRow: ProductRow = {
  id: 7, code: 'PF-07', slug: 'ameer-al-arab', name: 'Ameer Al Arab', brand: null,
  category: 'perfumes', subcategory: null, description: null, price: 250,
  compare_at_price: null, sales_mode: 'INQUIRY_ONLY', status: 'active', featured: false, new_arrival: true,
  created_by: null, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
}

const variant: ProductVariantRow = {
  id: 70, product_id: 7, sku: 'PF-07-UN', color: null, size: null, volume: null,
  options: {}, price_override: null, compare_at_price: null, is_active: true,
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
}

const image: ProductImageRow = {
  id: 700, product_id: 7, variant_id: null, storage_path: '7/product.webp', alt_text: null,
  sort_order: 0, is_primary: true, created_at: '2026-10-01T00:00:00Z',
}

test('catálogo local permanece como padrão e Supabase exige opção explícita', () => {
  assert.equal(resolvePublicCatalogSource(undefined), 'local')
  assert.equal(resolvePublicCatalogSource('local'), 'local')
  assert.equal(resolvePublicCatalogSource('supabase'), 'supabase')
  assert.equal(resolvePublicCatalogSource('qualquer-outro-valor'), 'local')
})

test('normaliza produto público sem fabricante e mantém compra bloqueada sem inventário', () => {
  const product = normalizePublicProduct({ ...productRow, product_variants: [variant], product_images: [image] }, path => `https://cdn.test/${path}`)
  assert.ok(product)
  assert.equal(product.manufacturer, null)
  assert.equal(product.brand, 'bellmont')
  assert.equal(product.salesMode, 'INQUIRY_ONLY')
  assert.equal(product.availability, 'unknown')
  assert.equal(product.variants?.[0]?.available, false)
  assert.equal(product.variants?.[0]?.stock, null)
  assert.equal(product.variants?.[0]?.availabilityStatus, 'unconfirmed')
  assert.equal(product.id, 'PF-07')
  assert.equal(product.variants?.[0]?.id, 'PF-07-UN')
  assert.deepEqual(product.images, ['https://cdn.test/7/product.webp'])
})

test('aplica disponibilidade pública sem materializar quantidade exata', () => {
  const product = normalizePublicProduct(
    { ...productRow, product_variants: [variant], product_images: [image] },
    String,
    [{ product_code: 'PF-07', variant_sku: 'PF-07-UN', available: true, availability_status: 'available' }],
  )
  assert.equal(product?.availability, 'available')
  assert.equal(product?.variants?.[0]?.available, true)
  assert.equal(product?.variants?.[0]?.stock, null)
})

test('draft e archived são rejeitados mesmo se chegarem ao normalizador', () => {
  for (const status of ['draft', 'archived'] as const) {
    assert.equal(normalizePublicProduct({ ...productRow, status, product_variants: [], product_images: [] }, String), null)
  }
})

test('ordena capa e galeria e ignora variantes desativadas', () => {
  const secondary = { ...image, id: 701, storage_path: '7/secondary.webp', sort_order: 0, is_primary: false }
  const primary = { ...image, id: 702, storage_path: '7/primary.webp', sort_order: 5, is_primary: true }
  const inactive = { ...variant, id: 71, sku: 'PF-07-X', is_active: false, size: 'X' }
  const product = normalizePublicProduct({ ...productRow, product_variants: [inactive, variant], product_images: [secondary, primary] }, String)
  assert.deepEqual(product?.images, ['7/primary.webp', '7/secondary.webp'])
  assert.equal(product?.variants?.length, 1)
})
