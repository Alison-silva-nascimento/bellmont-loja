import { getSupabaseClient } from '../lib/supabase/client'
import type { CheckoutAddress, CheckoutCustomer } from '../types/checkout'
import type { ResolvedCartItem } from '../types/cart'
import { digitsOnly } from '../utils/checkout'

export type CheckoutSession = {
  order: { publicId: string; number: string }
  checkoutUrl: string
}

export const buildCheckoutPayload = (
  customer: CheckoutCustomer,
  address: CheckoutAddress,
  items: ResolvedCartItem[],
) => ({
  buyer_name: customer.fullName.trim(),
  buyer_email: customer.email.trim().toLowerCase(),
  buyer_phone: digitsOnly(customer.phone),
  address: {
    postal_code: digitsOnly(address.postalCode),
    street: address.street.trim(),
    number: address.number.trim(),
    complement: address.complement.trim(),
    neighborhood: address.neighborhood.trim(),
    city: address.city.trim(),
    state: address.state.trim().toUpperCase(),
  },
  items: items.map(item => ({
    variant_id: Number(item.variant?.id),
    quantity: item.quantity,
  })),
})

const checkoutIdempotencyStorageKey = 'bellmont:v2:checkout-idempotency'

export const getOrCreateCheckoutIdempotencyKey = () => {
  const existing = window.sessionStorage.getItem(checkoutIdempotencyStorageKey)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.sessionStorage.setItem(checkoutIdempotencyStorageKey, created)
  return created
}

export const clearCheckoutIdempotencyKey = () => {
  window.sessionStorage.removeItem(checkoutIdempotencyStorageKey)
}

const assertCheckoutUrl = (value: unknown) => {
  if (typeof value !== 'string') throw new Error('INVALID_CHECKOUT_RESPONSE')
  const url = new URL(value)
  if (url.protocol !== 'https:' || !/(^|\.)mercadopago\.com\.br$/i.test(url.hostname)) {
    throw new Error('INVALID_CHECKOUT_REDIRECT')
  }
  return url.toString()
}

export async function createCheckoutSession(
  customer: CheckoutCustomer,
  address: CheckoutAddress,
  items: ResolvedCartItem[],
) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  const { data, error } = await supabase.functions.invoke('checkout-create-order', {
    body: buildCheckoutPayload(customer, address, items),
    headers: { 'x-idempotency-key': getOrCreateCheckoutIdempotencyKey() },
  })
  if (error || !data?.order?.publicId || !data?.order?.number) {
    throw new Error('CHECKOUT_SESSION_FAILED')
  }
  return {
    order: data.order,
    checkoutUrl: assertCheckoutUrl(data.checkoutUrl),
  } as CheckoutSession
}
