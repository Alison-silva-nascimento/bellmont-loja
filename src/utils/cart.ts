import type { CartItem, CartMutationResult, CartRejectionReason, CartSelection, ResolvedCartItem } from '../types/cart'
import type { Product, ProductVariant } from '../types/product'
import { findProductByIdentity, variantMatchesIdentity } from '../data/catalogIdentity'
import { PRODUCT_SALES_MODES } from '../types/product'

export const CART_STORAGE_KEY = 'bellmont:cart:v1'
export const CART_MAX_QUANTITY = 99
export type CartValidationMode = 'online' | 'whatsapp'

const cleanOption = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined
export const getCartItemKey = ({ productId, variantId, selectedSize, selectedColor, selectedVolume }: Pick<CartItem, 'productId' | 'variantId' | 'selectedSize' | 'selectedColor' | 'selectedVolume'>) =>
  [productId, variantId || '', selectedSize || '', selectedColor || '', selectedVolume || ''].join('::')

export const hasExactVariantStock = (variant: ProductVariant) =>
  Number.isInteger(variant.stock) && Number(variant.stock) > 0

export const isVariantAvailable = (variant: ProductVariant) => variant.available === true && (
  variant.availabilityStatus === 'available' ||
  (variant.availabilityStatus == null && hasExactVariantStock(variant))
)

export const getVariantQuantityLimit = (variant: ProductVariant | undefined, mode: CartValidationMode = 'online') => {
  if (!variant) return 0
  if (mode === 'whatsapp') {
    if (variant.availabilityStatus === 'out_of_stock' || variant.stock === 0) return 0
    return hasExactVariantStock(variant) ? Math.min(CART_MAX_QUANTITY, Number(variant.stock)) : CART_MAX_QUANTITY
  }
  return isVariantAvailable(variant)
    ? hasExactVariantStock(variant) ? Math.min(CART_MAX_QUANTITY, Number(variant.stock)) : CART_MAX_QUANTITY
    : 0
}

export function resolveSelectedVariant(product: Product, selection: Pick<CartSelection, 'variantId' | 'selectedSize' | 'selectedColor' | 'selectedVolume'>) {
  if (!product.variants?.length) return undefined
  const variantId = cleanOption(selection.variantId)
  if (variantId) return product.variants.find(variant => variantMatchesIdentity(variant, variantId))
  const size = cleanOption(selection.selectedSize)
  const color = cleanOption(selection.selectedColor)
  const volume = cleanOption(selection.selectedVolume)
  return product.variants.find(variant => (!variant.size || variant.size === size) && (!variant.color || variant.color === color) && (!variant.volume || variant.volume === volume))
}

export const isProductPurchasable = (product: Product) =>
  product.salesMode === PRODUCT_SALES_MODES.ASSISTED_PURCHASE &&
  typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0 && product.availability === 'available' &&
  Boolean(product.variants?.some(isVariantAvailable))

export const isPurchasable = (product: Product, variant?: ProductVariant) =>
  isProductPurchasable(product) && Boolean(variant && product.variants?.some(item => item.id === variant.id) && isVariantAvailable(variant))

export const isProductEligibleForAssistedCart = (product: Product) =>
  product.salesMode === PRODUCT_SALES_MODES.ASSISTED_PURCHASE &&
  typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0 && Boolean(product.variants?.length)

const isTechnicalProduct = (product: Product) =>
  product.id.startsWith('dev-') || product.code?.startsWith('TEST-') === true

export const isBellmontPerfumeEligibleForWhatsAppCart = (product: Product) =>
  product.category === 'perfumes' &&
  product.brand === 'bellmont' &&
  product.salesMode === PRODUCT_SALES_MODES.INQUIRY_ONLY &&
  product.availability !== 'unavailable' &&
  !isTechnicalProduct(product)

export const isProductEligibleForWhatsAppCart = (product: Product) =>
  isProductEligibleForAssistedCart(product) || isBellmontPerfumeEligibleForWhatsAppCart(product)

export const isAssistedVariantSelectable = (product: Product, variant?: ProductVariant) =>
  isProductEligibleForAssistedCart(product) && Boolean(variant && product.variants?.some(item => item.id === variant.id) && variant.availabilityStatus !== 'out_of_stock' && variant.stock !== 0)

export function validateCartSelection(product: Product | undefined, selection: CartSelection, mode: CartValidationMode = 'online'): CartRejectionReason | null {
  if (!product) return 'invalid-product'
  const perfumeInquiry = mode === 'whatsapp' && isBellmontPerfumeEligibleForWhatsAppCart(product)
  if (!perfumeInquiry && (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price < 0)) return 'missing-price'
  if (mode === 'online' ? !isProductPurchasable(product) : !isProductEligibleForWhatsAppCart(product)) return 'unavailable-product'
  if (perfumeInquiry) {
    if (cleanOption(selection.variantId) || cleanOption(selection.selectedSize) || cleanOption(selection.selectedColor) || cleanOption(selection.selectedVolume)) return 'invalid-variant'
    return null
  }

  const selectedSize = cleanOption(selection.selectedSize)
  const selectedColor = cleanOption(selection.selectedColor)
  const selectedVolume = cleanOption(selection.selectedVolume)
  if (product.sizes?.length && (!selectedSize || !product.sizes.includes(selectedSize))) return 'missing-size'
  if (product.colors?.length && (!selectedColor || !product.colors.includes(selectedColor))) return 'missing-color'
  if (!product.variants?.length || !cleanOption(selection.variantId)) return 'invalid-variant'
  const variant = resolveSelectedVariant(product, selection)
  if (!variant || (mode === 'online' ? !isPurchasable(product, variant) : !isAssistedVariantSelectable(product, variant))) return 'invalid-variant'
  if (variant.size && variant.size !== selectedSize) return 'invalid-variant'
  if (variant.color && variant.color !== selectedColor) return 'invalid-variant'
  if (variant.volume && selectedVolume && variant.volume !== selectedVolume) return 'invalid-variant'
  return null
}

export const isProductReadyForCart = isProductPurchasable

export function addCartSelection(items: CartItem[], selection: CartSelection, catalog: Product[], mode: CartValidationMode = 'online'): CartMutationResult {
  const product = findProductByIdentity(catalog, selection.productId)
  const reason = validateCartSelection(product, selection, mode)
  if (reason) return { ok: false, items, reason }

  if (selection.quantity !== undefined && (!Number.isInteger(selection.quantity) || Number(selection.quantity) < 1)) {
    return { ok: false, items, reason: 'invalid-quantity' }
  }
  const variant = resolveSelectedVariant(product!, selection)
  const perfumeInquiry = mode === 'whatsapp' && isBellmontPerfumeEligibleForWhatsAppCart(product!)
  const limit = perfumeInquiry ? CART_MAX_QUANTITY : getVariantQuantityLimit(variant, mode)
  if (!limit) return { ok: false, items, reason: 'invalid-variant' }
  const requestedQuantity = selection.quantity === undefined ? 1 : Number(selection.quantity)
  const quantity = Math.min(requestedQuantity, limit)
  const next: CartItem = {
    productId: product!.id,
    quantity,
    ...(cleanOption(selection.selectedSize) ? { selectedSize: cleanOption(selection.selectedSize) } : {}),
    ...(cleanOption(selection.selectedColor) ? { selectedColor: cleanOption(selection.selectedColor) } : {}),
    ...(cleanOption(selection.selectedVolume) || variant?.volume ? { selectedVolume: cleanOption(selection.selectedVolume) ?? variant?.volume ?? undefined } : {}),
    ...(variant ? { variantId: variant.id } : {}),
  }
  const key = getCartItemKey(next)
  const existing = items.findIndex(item => getCartItemKey(item) === key)
  if (existing < 0) return { ok: true, items: [...items, next], adjusted: quantity !== requestedQuantity }
  const currentQuantity = items[existing]?.quantity ?? 0
  const nextQuantity = Math.min(currentQuantity + quantity, limit)
  return {
    ok: true,
    items: items.map((item, index) => index === existing
      ? { ...item, quantity: nextQuantity }
      : item),
    adjusted: currentQuantity + quantity !== nextQuantity,
  }
}

export function setCartItemQuantity(items: CartItem[], key: string, quantity: number, catalog: Product[], mode: CartValidationMode = 'online'): CartMutationResult {
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, items, reason: 'invalid-quantity' }
  const target = items.find(item => getCartItemKey(item) === key)
  if (!target) return { ok: false, items, reason: 'invalid-product' }
  const product = findProductByIdentity(catalog, target.productId)
  const reason = validateCartSelection(product, target, mode)
  if (reason) return { ok: false, items, reason }
  const limit = mode === 'whatsapp' && isBellmontPerfumeEligibleForWhatsAppCart(product!)
    ? CART_MAX_QUANTITY
    : getVariantQuantityLimit(resolveSelectedVariant(product!, target), mode)
  if (!limit) return { ok: false, items, reason: 'invalid-variant' }
  const nextQuantity = Math.min(quantity, limit)
  return {
    ok: true,
    items: items.map(item => getCartItemKey(item) === key ? { ...item, quantity: nextQuantity } : item),
    adjusted: nextQuantity !== quantity,
  }
}

export const removeCartItem = (items: CartItem[], key: string) => items.filter(item => getCartItemKey(item) !== key)

const parseStoredCartItem = (candidate: unknown): CartItem | null => {
  if (!candidate || typeof candidate !== 'object') return null
  const raw = candidate as Record<string, unknown>
  if (typeof raw.productId !== 'string' || !raw.productId.trim() || !Number.isInteger(raw.quantity) || Number(raw.quantity) < 1) return null
  const selectedVolume = cleanOption(raw.selectedVolume)
  return {
    productId: raw.productId,
    quantity: Math.min(Number(raw.quantity), CART_MAX_QUANTITY),
    selectedSize: cleanOption(raw.selectedSize),
    selectedColor: cleanOption(raw.selectedColor),
    ...(selectedVolume ? { selectedVolume } : {}),
    variantId: cleanOption(raw.variantId),
  }
}

export function reconcileStoredCart(value: unknown, catalog: Product[], mode: CartValidationMode = 'online') {
  if (!Array.isArray(value)) return { items: [] as CartItem[], preservedItems: [] as CartItem[] }
  return value.reduce<{ items: CartItem[]; preservedItems: CartItem[] }>((state, candidate) => {
    const selection = parseStoredCartItem(candidate)
    if (!selection) return state
    const result = addCartSelection(state.items, selection, catalog, mode)
    if (result.ok) state.items = result.items
    else state.preservedItems.push(selection)
    return state
  }, { items: [], preservedItems: [] })
}

export function sanitizeStoredCart(value: unknown, catalog: Product[], mode: CartValidationMode = 'online'): CartItem[] {
  return reconcileStoredCart(value, catalog, mode).items
}

export function resolveCart(items: CartItem[], catalog: Product[], mode: CartValidationMode = 'online'): ResolvedCartItem[] {
  return items.flatMap(item => {
    const product = findProductByIdentity(catalog, item.productId)
    if (!product) return []
    const variant = resolveSelectedVariant(product, item)
    const perfumeInquiry = mode === 'whatsapp' && isBellmontPerfumeEligibleForWhatsAppCart(product)
    if (perfumeInquiry) {
      if (item.variantId || item.selectedSize || item.selectedColor || item.selectedVolume || item.quantity > CART_MAX_QUANTITY) return []
      const price = typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0 ? product.price : null
      return [{ ...item, key: getCartItemKey(item), product, lineTotal: price == null ? null : price * item.quantity }]
    }
    const selectable = mode === 'online' ? isPurchasable(product, variant) : isAssistedVariantSelectable(product, variant)
    if (!variant || !selectable || item.quantity > getVariantQuantityLimit(variant, mode)) return []
    return [{ ...item, key: getCartItemKey(item), product, variant, lineTotal: Number(product.price) * item.quantity }]
  })
}

export const calculateCartSubtotal = (items: CartItem[], catalog: Product[], mode: CartValidationMode = 'online') =>
  resolveCart(items, catalog, mode).reduce((total, item) => total + (item.lineTotal ?? 0), 0)

export const calculateCartCount = (items: CartItem[]) => items.reduce((total, item) => total + item.quantity, 0)
