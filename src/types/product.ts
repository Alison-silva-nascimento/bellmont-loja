export type ProductCategory = 'streetwear' | 'fitness' | 'perfumes'
export type ProductBrand = 'bellmont' | 'imperio-fit'

export interface ProductVariant {
  id: string
  color?: string | null
  size?: string | null
  available?: boolean | null
}

export interface Product {
  id: string
  code?: string
  slug: string
  name: string
  nameStatus?: 'confirmed' | 'provisional'
  category: ProductCategory
  brand: ProductBrand
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
