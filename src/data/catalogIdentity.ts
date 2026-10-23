import { PRODUCT_SALES_MODES, type Product } from '../types/product'

const perfumeCodeBySlug: Record<string, string> = {
  'asad-lattafa': 'PF-01',
  'attar-al-wesal': 'PF-02',
  'al-noble-wazeer': 'PF-03',
  'bareeq-al-dhahab': 'PF-04',
  'odyssey-mandarin-sky': 'PF-05',
  'club-de-nuit-intense-man': 'PF-06',
  'ameer-al-arab': 'PF-07',
  'ishq-al-shuyukh-silver': 'PF-08',
  'fakhar-lattafa': 'PF-09',
  salvo: 'PF-10',
  'queen-of-arabia': 'PF-11',
  'panther-pour-homme': 'PF-12',
  mishlah: 'PF-13',
  'fakhar-lattafa-caixa-branca': 'PF-14',
  'shagaf-al-ward': 'PF-15',
  'yara-lattafa': 'PF-16',
  'durrat-al-aroos': 'PF-17',
  ghala: 'PF-18',
  'sabah-al-ward': 'PF-19',
  'ameerat-al-arab': 'PF-20',
  'ameerat-al-arab-sugar-crown': 'PF-21',
  'athena-eau-de-parfum': 'PF-22',
}

const fitnessCodeBySlug: Record<string, string> = {
  'macaquinho-fitness-vinho': 'IF-01',
  'macaquinho-fitness-preto': 'IF-02',
  'conjunto-fitness-marinho': 'IF-03',
  'conjunto-fitness-preto-recortes': 'IF-04',
  'conjunto-jasmim-marrom': 'IF-05',
}

const assistedPurchaseCodes = new Set(Array.from({ length: 20 }, (_, index) => `ST-${String(index + 1).padStart(2, '0')}`))

export const resolveProductSalesMode = (product: Pick<Product, 'code' | 'salesMode'>) =>
  product.salesMode ?? (product.code && assistedPurchaseCodes.has(product.code)
    ? PRODUCT_SALES_MODES.ASSISTED_PURCHASE
    : PRODUCT_SALES_MODES.INQUIRY_ONLY)

export const withStableCatalogIdentity = (product: Product): Product => {
  const code = product.code ?? (product.category === 'perfumes'
    ? perfumeCodeBySlug[product.slug]
    : product.category === 'fitness' ? fitnessCodeBySlug[product.slug] : undefined)
  const salesMode = resolveProductSalesMode({ code, salesMode: product.salesMode })
  if (!code || code === product.id) return { ...product, ...(code ? { code } : {}), salesMode }
  return { ...product, id: code, code, salesMode, legacyIds: [...new Set([...(product.legacyIds ?? []), product.id])] }
}

export const normalizeLocalCatalogIdentities = (products: Product[]) => products.map(withStableCatalogIdentity)

export const productMatchesIdentity = (product: Product, identity: string) =>
  product.id === identity || Boolean(product.legacyIds?.includes(identity))

export const variantMatchesIdentity = (variant: NonNullable<Product['variants']>[number], identity: string) =>
  variant.id === identity || Boolean(variant.legacyIds?.includes(identity))

export const findProductByIdentity = (catalog: Product[], identity: string) =>
  catalog.find(product => productMatchesIdentity(product, identity))

export const migrateFavoriteIds = (favoriteIds: string[], catalog: Product[]) => [...new Set(favoriteIds.map(identity =>
  findProductByIdentity(catalog, identity)?.id ?? identity))]
