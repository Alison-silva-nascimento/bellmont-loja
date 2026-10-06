import type { Json } from '../../lib/supabase/database.types'

export const ADMIN_BRANDS = ['bellmont', 'imperio-fit'] as const
export const ADMIN_CATEGORIES = ['streetwear', 'fitness', 'perfumes'] as const
export const ADMIN_PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const

export type AdminBrand = typeof ADMIN_BRANDS[number]
export type AdminCategory = typeof ADMIN_CATEGORIES[number]
export type AdminProductStatus = typeof ADMIN_PRODUCT_STATUSES[number]

export interface ProductFormValues {
  code: string
  name: string
  slug: string
  description: string
  brand: AdminBrand
  category: AdminCategory
  subcategory: string
  price: string
  status: AdminProductStatus
  featured: boolean
}

export interface VariantFormValues {
  sku: string
  color: string
  size: string
  volume: string
  priceOverride: string
  options: string
  isActive: boolean
}

export const emptyProductForm = (): ProductFormValues => ({
  code: '', name: '', slug: '', description: '', brand: 'bellmont', category: 'streetwear',
  subcategory: '', price: '', status: 'draft', featured: false,
})

export const emptyVariantForm = (): VariantFormValues => ({
  sku: '', color: '', size: '', volume: '', priceOverride: '', options: '', isActive: true,
})

export const slugifyProductName = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const parseOptionalBrl = (value: string): number | null | undefined => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined
}

export const formatPriceInput = (value: number | null) => value === null ? '' : value.toFixed(2).replace('.', ',')
const optional = (value: string) => value.trim() || null

export type FieldErrors = Record<string, string>

export const normalizeProductForm = (values: ProductFormValues) => {
  const errors: FieldErrors = {}
  const name = values.name.trim()
  const slug = values.slug.trim().toLowerCase()
  const price = parseOptionalBrl(values.price)
  if (!name) errors.name = 'Informe o nome do produto.'
  if (!slug) errors.slug = 'Informe o slug.'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = 'Use letras minúsculas, números e hífens.'
  if (price === undefined) errors.price = 'Informe um valor válido, com até duas casas decimais.'
  if (!ADMIN_BRANDS.includes(values.brand)) errors.brand = 'Selecione uma marca válida.'
  if (!ADMIN_CATEGORIES.includes(values.category)) errors.category = 'Selecione uma categoria válida.'
  if (!ADMIN_PRODUCT_STATUSES.includes(values.status)) errors.status = 'Selecione um status válido.'
  if (Object.keys(errors).length) return { ok: false as const, errors }
  return { ok: true as const, data: {
    code: optional(values.code), name, slug, description: optional(values.description), brand: values.brand,
    category: values.category, subcategory: optional(values.subcategory), price: price ?? null,
    status: values.status, featured: values.featured,
  } }
}

export const normalizeVariantForm = (values: VariantFormValues) => {
  const errors: FieldErrors = {}
  const sku = values.sku.trim()
  const priceOverride = parseOptionalBrl(values.priceOverride)
  let options: Json = {}
  if (!sku) errors.sku = 'Informe o SKU da variante.'
  if (priceOverride === undefined) errors.priceOverride = 'Informe um valor válido, com até duas casas decimais.'
  if (values.options.trim()) {
    try {
      const parsed = JSON.parse(values.options) as unknown
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') errors.options = 'Use um objeto JSON válido.'
      else options = parsed as Json
    } catch { errors.options = 'Use um objeto JSON válido.' }
  }
  if (Object.keys(errors).length) return { ok: false as const, errors }
  return { ok: true as const, data: {
    sku, color: optional(values.color), size: optional(values.size), volume: optional(values.volume),
    price_override: priceOverride ?? null, options, is_active: values.isActive,
  } }
}

