import { COMMERCIAL_MODE, COMMERCIAL_MODES } from '../config/commercialMode'
import { PRODUCT_SALES_MODES, type Product, type ProductVariant } from '../types/product'

const streetwearColorByCode: Record<string, { color: string; token: string }> = {
  'ST-01': { color: 'Preto', token: 'PTO' },
  'ST-02': { color: 'Branco', token: 'BRA' },
  'ST-03': { color: 'Preto', token: 'PTO' },
  'ST-04': { color: 'Preto', token: 'PTO' },
  'ST-05': { color: 'Preto', token: 'PTO' },
  'ST-06': { color: 'Branco', token: 'BRA' },
  'ST-07': { color: 'Preto', token: 'PTO' },
  'ST-08': { color: 'Branco', token: 'BRA' },
  'ST-09': { color: 'Branco', token: 'BRA' },
  'ST-10': { color: 'Bege', token: 'BEG' },
  'ST-11': { color: 'Branco', token: 'BRA' },
  'ST-12': { color: 'Preto', token: 'PTO' },
  'ST-13': { color: 'Branco', token: 'BRA' },
  'ST-14': { color: 'Marinho', token: 'MAR' },
  'ST-15': { color: 'Preto', token: 'PTO' },
  'ST-16': { color: 'Preto', token: 'PTO' },
  'ST-17': { color: 'Preto', token: 'PTO' },
  'ST-18': { color: 'Preto', token: 'PTO' },
  'ST-19': { color: 'Preto', token: 'PTO' },
  'ST-20': { color: 'Preto', token: 'PTO' },
}

const unconfirmedVariant = (variant: Omit<ProductVariant, 'stock' | 'available' | 'availabilityStatus'>): ProductVariant => ({
  ...variant,
  stock: null,
  available: null,
  availabilityStatus: 'unconfirmed',
})

export function addVerifiedAssistedCommerceOptions(product: Product): Product {
  if (COMMERCIAL_MODE !== COMMERCIAL_MODES.WHATSAPP_ONLY || product.salesMode !== PRODUCT_SALES_MODES.ASSISTED_PURCHASE || product.variants?.length || !product.code) return product

  const streetwear = streetwearColorByCode[product.code]
  if (streetwear) {
    const sizes = ['P', 'M', 'G', 'GG']
    return {
      ...product,
      availability: 'unknown',
      colors: [streetwear.color],
      sizes,
      variants: sizes.map(size => unconfirmedVariant({
        id: `${product.code}-${streetwear.token}-${size}`,
        sku: `${product.code}-${streetwear.token}-${size}`,
        color: streetwear.color,
        size,
      })),
    }
  }

  return product
}

export const prepareLocalCatalogForAssistedCommerce = (products: Product[]) => products.map(addVerifiedAssistedCommerceOptions)

