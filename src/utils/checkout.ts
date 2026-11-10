import type { CheckoutAddress, CheckoutCustomer, CheckoutFieldErrors } from '../types/checkout'
import type { ResolvedCartItem } from '../types/cart'
import { PRODUCT_SALES_MODES } from '../types/product'

export const digitsOnly = (value: string) => value.replace(/\D/g, '')

export function validateCheckoutCustomer(customer: CheckoutCustomer): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {}
  if (customer.fullName.trim().split(/\s+/).length < 2) errors.fullName = 'Informe nome e sobrenome.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) errors.email = 'Informe um e-mail válido.'
  const phone = digitsOnly(customer.phone)
  if (phone.length < 10 || phone.length > 11) errors.phone = 'Informe um telefone com DDD.'
  return errors
}

export function validateCheckoutAddress(address: CheckoutAddress): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {}
  if (digitsOnly(address.postalCode).length !== 8) errors.postalCode = 'Informe um CEP válido.'
  if (!address.street.trim()) errors.street = 'Informe a rua.'
  if (!address.number.trim()) errors.number = 'Informe o número.'
  if (!address.neighborhood.trim()) errors.neighborhood = 'Informe o bairro.'
  if (!address.city.trim()) errors.city = 'Informe a cidade.'
  if (!/^[A-Za-z]{2}$/.test(address.state.trim())) errors.state = 'Informe a UF.'
  return errors
}

export const checkoutBlockingReason = (items: ResolvedCartItem[]) => {
  if (!items.length) return 'Sua sacola está vazia.'
  if (items.some(item => item.product.salesMode !== PRODUCT_SALES_MODES.ASSISTED_PURCHASE)) {
    return 'A sacola contém item disponível somente para consulta. Remova-o antes de continuar no checkout online.'
  }
  if (items.some(item => !item.variant || item.lineTotal == null)) {
    return 'Um ou mais itens precisam de variante e preço confirmados.'
  }
  return null
}
