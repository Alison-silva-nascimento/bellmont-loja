export type ProductCategory = 'streetwear' | 'fitness' | 'perfumes'
export type ProductBrand = 'bellmont' | 'imperio-fit'

export interface Product {
  id: string
  slug: string
  name: string
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
  featured?: boolean
  newArrival?: boolean
}
