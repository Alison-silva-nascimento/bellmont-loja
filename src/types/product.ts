export type ProductCategory = 'streetwear' | 'fitness' | 'perfumes'
export type ProductBrand = 'bellmont' | 'imperio-fit'
export type PublicAvailabilityStatus = 'available' | 'out_of_stock' | 'unconfirmed'
export const PRODUCT_SALES_MODES = {
  ASSISTED_PURCHASE: 'ASSISTED_PURCHASE',
  INQUIRY_ONLY: 'INQUIRY_ONLY',
  DISABLED: 'DISABLED',
} as const
export type ProductSalesMode = typeof PRODUCT_SALES_MODES[keyof typeof PRODUCT_SALES_MODES]

export interface ProductVariant {
  id: string
  legacyIds?: string[]
  sku?: string
  color?: string | null
  size?: string | null
  volume?: string | null
  options?: Record<string, string | null>
  stock?: number | null
  available?: boolean | null
  availabilityStatus?: PublicAvailabilityStatus
}

export interface Product {
  id: string
  legacyIds?: string[]
  code?: string
  slug: string
  name: string
  nameStatus?: 'confirmed' | 'provisional'
  category: ProductCategory
  brand: ProductBrand
  salesMode?: ProductSalesMode
  manufacturer?: string | null
  subcategory?: string | null
  description?: string | null
  price?: number | null
  compareAtPrice?: number | null
  images: string[]
  colors?: string[] | null
  sizes?: string[] | null
  availability?: 'available' | 'unavailable' | 'unknown'
  variants?: ProductVariant[] | null
  featured?: boolean
  newArrival?: boolean
}
