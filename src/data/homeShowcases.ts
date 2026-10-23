import { productMatchesIdentity } from './catalogIdentity'
import { PRODUCT_SALES_MODES, type Product, type ProductCategory } from '../types/product'

export const HOME_SHOWCASES = {
  streetwear: {
    category: 'streetwear',
    limit: 6,
    identities: ['ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06'],
    href: '/streetwear',
    cta: 'VER STREETWEAR COMPLETA',
  },
  perfumes: {
    category: 'perfumes',
    limit: 6,
    identities: ['PF-01', 'PF-02', 'PF-03', 'PF-04', 'PF-05', 'PF-06'],
    href: '/perfumes',
    cta: 'VER COLEÇÃO DE FRAGRÂNCIAS',
  },
  fitness: {
    category: 'fitness',
    limit: 4,
    identities: ['IF-01', 'IF-02', 'IF-03', 'IF-04'],
    href: '/imperio-fit',
    cta: 'VER IMPÉRIO FIT COMPLETA',
  },
} as const satisfies Record<string, {
  category: ProductCategory
  limit: number
  identities: readonly string[]
  href: string
  cta: string
}>

export type HomeShowcaseKey = keyof typeof HOME_SHOWCASES

export function selectHomeShowcaseProducts(products: Product[], key: HomeShowcaseKey) {
  const config = HOME_SHOWCASES[key]
  const eligible = products.filter(product =>
    product.category === config.category
    && product.salesMode !== PRODUCT_SALES_MODES.DISABLED
    && Boolean(product.images[0]),
  )
  const editorial = config.identities
    .map(identity => eligible.find(product => productMatchesIdentity(product, identity)))
    .filter((product): product is Product => Boolean(product))
  const selectedIds = new Set(editorial.map(product => product.id))
  const deterministicFallback = eligible.filter(product => !selectedIds.has(product.id))

  return [...editorial, ...deterministicFallback]
    .filter((product, index, all) => all.findIndex(item => item.id === product.id) === index)
    .slice(0, config.limit)
}
