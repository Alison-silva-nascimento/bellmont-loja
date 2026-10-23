import type { Product, ProductVariant } from './product'

export interface CartItem {
  productId: string
  quantity: number
  selectedSize?: string
  selectedColor?: string
  selectedVolume?: string
  variantId?: string
}

export interface CartSelection {
  productId: string
  quantity?: number
  selectedSize?: string
  selectedColor?: string
  selectedVolume?: string
  variantId?: string
}

export interface ResolvedCartItem extends CartItem {
  key: string
  product: Product
  variant?: ProductVariant
  lineTotal: number | null
}

export type CartRejectionReason =
  | 'invalid-product'
  | 'missing-price'
  | 'unavailable-product'
  | 'missing-size'
  | 'missing-color'
  | 'invalid-variant'
  | 'invalid-quantity'

export type CartMutationResult =
  | { ok: true; items: CartItem[]; adjusted?: boolean }
  | { ok: false; items: CartItem[]; reason: CartRejectionReason }
