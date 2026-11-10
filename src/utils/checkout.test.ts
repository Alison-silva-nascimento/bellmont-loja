import assert from 'node:assert/strict'
import test from 'node:test'
import type { ResolvedCartItem } from '../types/cart.ts'
import { checkoutBlockingReason, validateCheckoutAddress, validateCheckoutCustomer } from './checkout.ts'

test('valida identificação do cliente sem aceitar dados incompletos', () => {
  assert.deepEqual(validateCheckoutCustomer({ fullName: 'Ana', email: 'invalido', phone: '123' }), {
    fullName: 'Informe nome e sobrenome.', email: 'Informe um e-mail válido.', phone: 'Informe um telefone com DDD.',
  })
  assert.deepEqual(validateCheckoutCustomer({ fullName: 'Ana Silva', email: 'ana@example.com', phone: '(64) 99999-0000' }), {})
})

test('valida endereço e CEP sem confundir consulta com frete', () => {
  assert.ok(Object.keys(validateCheckoutAddress({ postalCode: '75', street: '', number: '', complement: '', neighborhood: '', city: '', state: 'G' })).length >= 6)
  assert.deepEqual(validateCheckoutAddress({ postalCode: '75526270', street: 'Rua 20', number: '552', complement: '', neighborhood: 'Paranaíba', city: 'Itumbiara', state: 'GO' }), {})
})

test('bloqueia sacola vazia, consulta e item sem variante no checkout online', () => {
  assert.equal(checkoutBlockingReason([]), 'Sua sacola está vazia.')
  const base = { key: 'x', productId: '1', quantity: 1, product: { id: '1', slug: 'x', name: 'X', category: 'streetwear', brand: 'bellmont', images: [], salesMode: 'ASSISTED_PURCHASE' }, lineTotal: 80 } as ResolvedCartItem
  assert.match(checkoutBlockingReason([{ ...base, product: { ...base.product, salesMode: 'INQUIRY_ONLY' } }]) ?? '', /somente para consulta/)
  assert.match(checkoutBlockingReason([base]) ?? '', /variante e preço/)
  assert.equal(checkoutBlockingReason([{ ...base, variant: { id: 'v', available: true } }]), null)
})
