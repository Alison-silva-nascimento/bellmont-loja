import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabase/client'
import type { Database, Json, ProductImageRow, ProductRow, ProductVariantRow } from '../lib/supabase/database.types'
import type { Product, ProductBrand, ProductCategory, ProductVariant, PublicAvailabilityStatus } from '../types/product'
export { resolvePublicCatalogSource } from './publicCatalogConfig'

export type PublicCatalogFailure =
  | { code: 'not-configured'; message: string }
  | { code: 'unavailable'; message: string }

export type PublicCatalogResult =
  | { ok: true; data: Product[] }
  | { ok: false; error: PublicCatalogFailure }

type PublicProductRecord = ProductRow & {
  product_variants: ProductVariantRow[] | null
  product_images: ProductImageRow[] | null
}

export type PublicVariantAvailability = {
  product_code: string
  variant_sku: string
  available: boolean
  availability_status: PublicAvailabilityStatus
}

const PUBLIC_PRODUCT_SELECT = `
  id, code, slug, name, brand, category, subcategory, description,
  price, compare_at_price, sales_mode, featured, new_arrival, status, created_at,
  product_variants (
    id, product_id, sku, color, size, volume, options, price_override,
    compare_at_price, is_active, created_at, updated_at
  ),
  product_images (
    id, product_id, variant_id, storage_path, alt_text, sort_order,
    is_primary, created_at
  )
`

const isProductCategory = (value: string): value is ProductCategory =>
  value === 'streetwear' || value === 'fitness' || value === 'perfumes'

const publicBrandFor = (category: ProductCategory): ProductBrand =>
  category === 'fitness' ? 'imperio-fit' : 'bellmont'

const normalizeOptions = (value: Json): Record<string, string | null> | undefined => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string | null] => typeof entry[1] === 'string' || entry[1] === null)
  return entries.length ? Object.fromEntries(entries) : undefined
}

const normalizeVariant = (variant: ProductVariantRow, availability?: PublicVariantAvailability): ProductVariant => ({
  id: variant.sku,
  legacyIds: [String(variant.id)],
  sku: variant.sku,
  color: variant.color,
  size: variant.size,
  volume: variant.volume,
  options: normalizeOptions(variant.options),
  // Inventory is intentionally not public. Missing inventory never means available.
  stock: null,
  available: availability?.available ?? false,
  availabilityStatus: availability?.availability_status ?? 'unconfirmed',
})

const uniqueValues = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)))]

export const normalizePublicProduct = (
  row: PublicProductRecord,
  getPublicImageUrl: (storagePath: string) => string,
  availabilityRows: PublicVariantAvailability[] = [],
): Product | null => {
  if (row.status !== 'active' || !isProductCategory(row.category)) return null

  const availabilityBySku = new Map(availabilityRows
    .filter(item => item.product_code === row.code)
    .map(item => [item.variant_sku, item]))
  const variants = (row.product_variants ?? []).filter(variant => variant.is_active)
    .map(variant => normalizeVariant(variant, availabilityBySku.get(variant.sku)))
  const images = [...(row.product_images ?? [])]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order || a.id - b.id)
    .map(image => getPublicImageUrl(image.storage_path))

  return {
    id: row.code ?? `product:${row.id}`,
    legacyIds: [String(row.id)],
    code: row.code ?? undefined,
    slug: row.slug,
    name: row.name,
    category: row.category,
    brand: publicBrandFor(row.category),
    salesMode: row.sales_mode,
    manufacturer: row.brand,
    subcategory: row.subcategory,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    images,
    colors: uniqueValues(variants.map(variant => variant.color ?? null)),
    sizes: uniqueValues(variants.map(variant => variant.size ?? null)),
    availability: variants.some(variant => variant.availabilityStatus === 'available')
      ? 'available'
      : variants.some(variant => variant.availabilityStatus === 'unconfirmed')
        ? 'unknown'
        : 'unavailable',
    variants,
    featured: row.featured,
    newArrival: row.new_arrival,
  }
}

export const fetchPublicSupabaseCatalog = async (
  client: SupabaseClient<Database> | null = getSupabaseClient(),
): Promise<PublicCatalogResult> => {
  if (!client) return { ok: false, error: { code: 'not-configured', message: 'Catálogo público temporariamente indisponível.' } }

  try {
    const [{ data, error }, availabilityResult] = await Promise.all([client
      .from('products')
      .select(PUBLIC_PRODUCT_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false }), client.rpc('get_public_variant_availability')])

    if (error) return { ok: false, error: { code: 'unavailable', message: 'Não foi possível carregar o catálogo agora.' } }

    const getPublicImageUrl = (storagePath: string) => client.storage.from('product-images').getPublicUrl(storagePath).data.publicUrl
    // Missing/unavailable RPC data fails closed: variants remain unconfirmed and cannot be purchased.
    const availabilityRows = availabilityResult.error ? [] : (availabilityResult.data ?? []) as PublicVariantAvailability[]
    const products = ((data ?? []) as unknown as PublicProductRecord[])
      .map(row => normalizePublicProduct(row, getPublicImageUrl, availabilityRows))
      .filter((product): product is Product => product !== null)

    return { ok: true, data: products }
  } catch {
    return { ok: false, error: { code: 'unavailable', message: 'Não foi possível carregar o catálogo agora.' } }
  }
}
