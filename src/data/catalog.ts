import type { Product, ProductBrand, ProductCategory } from '../types/product'

export const brandLabels: Record<ProductBrand, string> = {
  bellmont: 'BELLMONT',
  'imperio-fit': 'IMPÉRIO FIT',
}

export const categoryLabels: Record<ProductCategory, string> = {
  streetwear: 'Streetwear',
  fitness: 'Fitness',
  perfumes: 'Perfumaria',
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export const getProductBySlug = (catalog: Product[], slug?: string) => catalog.find(product => product.slug === slug)

export const getRelatedProducts = (catalog: Product[], product: Product, limit = 4) => catalog
  .filter(item => item.id !== product.id && item.brand === product.brand && item.category === product.category)
  .slice(0, limit)

export const searchProducts = (catalog: Product[], query: string) => {
  const term = normalize(query.trim())
  if (!term) return []

  return catalog.filter(product => normalize([
    product.name,
    product.manufacturer,
    brandLabels[product.brand],
    categoryLabels[product.category],
    product.subcategory,
  ].filter(Boolean).join(' ')).includes(term))
}

export type CatalogSort = 'featured' | 'name' | 'price'

export const selectCatalogProducts = (
  catalog: Product[],
  filters: { brand?: ProductBrand | null; category?: ProductCategory | null; sort?: CatalogSort },
) => {
  const filtered = catalog.filter(product =>
    (!filters.brand || product.brand === filters.brand) &&
    (!filters.category || product.category === filters.category))
  const sort = filters.sort ?? 'featured'

  return [...filtered].sort((a, b) => sort === 'name'
    ? a.name.localeCompare(b.name, 'pt-BR')
    : sort === 'price'
      ? (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY)
      : Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
}

export const getFavoriteProducts = (catalog: Product[], favoriteIds: string[]) =>
  catalog.filter(product => favoriteIds.includes(product.id))
