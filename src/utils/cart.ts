import type { CartItem, CartMutationResult, CartRejectionReason, CartSelection, ResolvedCartItem } from '../types/cart'
import type { Product, ProductVariant } from '../types/product'

export const CART_STORAGE_KEY = 'bellmont:cart:v1'
export const CART_MAX_QUANTITY = 99

const cleanOption = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined
const catalogMap = (catalog: Product[]) => new Map(catalog.map(product => [product.id, product]))

export const getCartItemKey = ({ productId, variantId, selectedSize, selectedColor }: Pick<CartItem, 'productId' | 'variantId' | 'selectedSize' | 'selectedColor'>) =>
  [productId, variantId || '', selectedSize || '', selectedColor || ''].join('::')

export const isVariantAvailable = (variant: ProductVariant) =>
  variant.available === true && (variant.stock == null || (Number.isInteger(variant.stock) && variant.stock > 0))

export function resolveSelectedVariant(product: Product, selection: Pick<CartSelection, 'variantId' | 'selectedSize' | 'selectedColor'>) {
  if (!product.variants?.length) return undefined
  const variantId = cleanOption(selection.variantId)
  if (variantId) return product.variants.find(variant => variant.id === variantId)
  const size = cleanOption(selection.selectedSize)
  const color = cleanOption(selection.selectedColor)
  return product.variants.find(variant => (!variant.size || variant.size === size) && (!variant.color || variant.color === color))
}

export const isProductPurchasable = (product: Product) =>
  typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0 && product.availability === 'available' &&
  (!product.variants?.length || product.variants.some(isVariantAvailable))

export const isPurchasable = (product: Product, variant?: ProductVariant) =>
  isProductPurchasable(product) && (!product.variants?.length || Boolean(variant && product.variants.some(item => item.id === variant.id) && isVariantAvailable(variant)))

export function validateCartSelection(product: Product | undefined, selection: CartSelection): CartRejectionReason | null {
  if (!product || product.id !== selection.productId) return 'invalid-product'
  if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0) return 'missing-price'
  if (!isProductPurchasable(product)) return 'unavailable-product'

  const selectedSize = cleanOption(selection.selectedSize)
  const selectedColor = cleanOption(selection.selectedColor)
  if (product.sizes?.length && (!selectedSize || !product.sizes.includes(selectedSize))) return 'missing-size'
  if (product.colors?.length && (!selectedColor || !product.colors.includes(selectedColor))) return 'missing-color'

  if (product.variants?.length) {
    if (!cleanOption(selection.variantId)) return 'invalid-variant'
    const variant = resolveSelectedVariant(product, selection)
    if (!variant || !isPurchasable(product, variant)) return 'invalid-variant'
    if (variant.size && variant.size !== selectedSize) return 'invalid-variant'
    if (variant.color && variant.color !== selectedColor) return 'invalid-variant'
  }
  return null
}

export const isProductReadyForCart = isProductPurchasable

export function addCartSelection(items: CartItem[], selection: CartSelection, catalog: Product[]): CartMutationResult {
  const product = catalogMap(catalog).get(selection.productId)
  const reason = validateCartSelection(product, selection)
  if (reason) return { ok: false, items, reason }

  const quantity = Number.isInteger(selection.quantity) && Number(selection.quantity) > 0
    ? Math.min(Number(selection.quantity), CART_MAX_QUANTITY)
    : 1
  const next: CartItem = {
    productId: selection.productId,
    quantity,
    selectedSize: cleanOption(selection.selectedSize),
    selectedColor: cleanOption(selection.selectedColor),
    variantId: cleanOption(selection.variantId),
  }
  const key = getCartItemKey(next)
  const existing = items.findIndex(item => getCartItemKey(item) === key)
  if (existing < 0) return { ok: true, items: [...items, next] }
  return {
    ok: true,
    items: items.map((item, index) => index === existing
      ? { ...item, quantity: Math.min(item.quantity + quantity, CART_MAX_QUANTITY) }
      : item),
  }
}

export function setCartItemQuantity(items: CartItem[], key: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) return items
  return items.map(item => getCartItemKey(item) === key ? { ...item, quantity: Math.min(quantity, CART_MAX_QUANTITY) } : item)
}

export const removeCartItem = (items: CartItem[], key: string) => items.filter(item => getCartItemKey(item) !== key)

export function sanitizeStoredCart(value: unknown, catalog: Product[]): CartItem[] {
  if (!Array.isArray(value)) return []
  return value.reduce<CartItem[]>((valid, candidate) => {
    if (!candidate || typeof candidate !== 'object') return valid
    const raw = candidate as Record<string, unknown>
    if (typeof raw.productId !== 'string' || !Number.isInteger(raw.quantity) || Number(raw.quantity) < 1) return valid
    const selection: CartSelection = {
      productId: raw.productId,
      quantity: Math.min(Number(raw.quantity), CART_MAX_QUANTITY),
      selectedSize: cleanOption(raw.selectedSize),
      selectedColor: cleanOption(raw.selectedColor),
      variantId: cleanOption(raw.variantId),
    }
    const result = addCartSelection(valid, selection, catalog)
    return result.ok ? result.items : valid
  }, [])
}

export function resolveCart(items: CartItem[], catalog: Product[]): ResolvedCartItem[] {
  const byId = catalogMap(catalog)
  return items.flatMap(item => {
    const product = byId.get(item.productId)
    if (!product || typeof product.price !== 'number') return []
    return [{ ...item, key: getCartItemKey(item), product, lineTotal: product.price * item.quantity }]
  })
}

export const calculateCartSubtotal = (items: CartItem[], catalog: Product[]) =>
  resolveCart(items, catalog).reduce((total, item) => total + item.lineTotal, 0)

export const calculateCartCount = (items: CartItem[]) => items.reduce((total, item) => total + item.quantity, 0)
