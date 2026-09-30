import type { Product } from './product'

export interface CartItem {
  productId: string
  quantity: number
  selectedSize?: string
  selectedColor?: string
  variantId?: string
}

export interface CartSelection {
  productId: string
  quantity?: number
  selectedSize?: string
  selectedColor?: string
  variantId?: string
}

export interface ResolvedCartItem extends CartItem {
  key: string
  product: Product
  lineTotal: number
}

export type CartRejectionReason =
  | 'invalid-product'
  | 'missing-price'
  | 'unavailable-product'
  | 'missing-size'
  | 'missing-color'
  | 'invalid-variant'

export type CartMutationResult =
  | { ok: true; items: CartItem[] }
  | { ok: false; items: CartItem[]; reason: CartRejectionReason }
