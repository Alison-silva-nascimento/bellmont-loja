import assert from 'node:assert/strict'
import test from 'node:test'
import { products } from '../data/products.ts'
import type { Product } from '../types/product.ts'
import { addCartSelection, calculateCartCount, calculateCartSubtotal, getCartItemKey, removeCartItem, sanitizeStoredCart, setCartItemQuantity } from './cart.ts'

const purchasable: Product = {
  id: 'fixture-shirt',
  code: 'TEST-01',
  slug: 'fixture-shirt',
  name: 'Produto de teste',
  brand: 'bellmont',
  category: 'streetwear',
  price: 80,
  images: ['/fixture.png'],
  availability: 'available',
  sizes: ['M', 'G'],
  colors: ['Preta'],
  variants: [
    { id: 'fixture-m-black', size: 'M', color: 'Preta', available: true },
    { id: 'fixture-g-black', size: 'G', color: 'Preta', available: true },
  ],
}

const catalog = [purchasable]
const selectionM = { productId: purchasable.id, selectedSize: 'M', selectedColor: 'Preta', variantId: 'fixture-m-black' }
const selectionG = { productId: purchasable.id, selectedSize: 'G', selectedColor: 'Preta', variantId: 'fixture-g-black' }

test('inventário oficial contém ST-01 a ST-13 por R$ 80 sem dados fictícios', () => {
  const streetwear = products.filter(product => product.category === 'streetwear')
  assert.equal(streetwear.length, 13)
  assert.deepEqual(streetwear.map(product => product.code), Array.from({ length: 13 }, (_, index) => `ST-${String(index + 1).padStart(2, '0')}`))
  assert.ok(streetwear.every(product => product.price === 80))
  assert.ok(streetwear.every(product => !product.sizes?.length && !product.colors?.length && !product.variants?.length))
  assert.ok(streetwear.every(product => product.availability !== 'available'))
  assert.ok(streetwear.every(product => !/Modelo 0[1-6]/i.test(product.name)))
})

test('adiciona produto apto com variante e soma a mesma variante', () => {
  const first = addCartSelection([], selectionM, catalog)
  assert.equal(first.ok, true)
  const second = addCartSelection(first.items, selectionM, catalog)
  assert.equal(second.items.length, 1)
  assert.equal(second.items[0]?.quantity, 2)
  assert.equal(calculateCartCount(second.items), 2)
})

test('mantém variantes diferentes em linhas diferentes', () => {
  const first = addCartSelection([], selectionM, catalog)
  const second = addCartSelection(first.items, selectionG, catalog)
  assert.equal(second.items.length, 2)
  assert.notEqual(getCartItemKey(second.items[0]!), getCartItemKey(second.items[1]!))
})

test('aumenta, diminui sem passar de um, remove e calcula subtotal pela fonte central', () => {
  const added = addCartSelection([], { ...selectionM, quantity: 2 }, catalog).items
  const key = getCartItemKey(added[0]!)
  const increased = setCartItemQuantity(added, key, 3)
  assert.equal(increased[0]?.quantity, 3)
  assert.equal(calculateCartSubtotal(increased, catalog), 240)
  const decreased = setCartItemQuantity(increased, key, 2)
  assert.equal(decreased[0]?.quantity, 2)
  assert.equal(setCartItemQuantity(decreased, key, 0)[0]?.quantity, 2)
  assert.deepEqual(removeCartItem(decreased, key), [])
})

test('persiste e reidrata apenas estrutura válida', () => {
  const stored = JSON.parse(JSON.stringify(addCartSelection([], selectionM, catalog).items))
  assert.deepEqual(sanitizeStoredCart(stored, catalog), stored)
  assert.deepEqual(sanitizeStoredCart('inválido', catalog), [])
  assert.deepEqual(sanitizeStoredCart([{ productId: 'inexistente', quantity: 1 }], catalog), [])
  assert.deepEqual(sanitizeStoredCart([{ ...selectionM, quantity: '2' }], catalog), [])
})

test('rejeita produto sem preço, indisponível e sem variante obrigatória', () => {
  const withoutPrice = { ...purchasable, id: 'no-price', price: undefined }
  const unavailable = { ...purchasable, id: 'unavailable', availability: 'unknown' as const }
  assert.equal(addCartSelection([], { productId: withoutPrice.id }, [withoutPrice]).ok, false)
  assert.equal(addCartSelection([], { productId: unavailable.id }, [unavailable]).ok, false)
  const missingVariant = addCartSelection([], { productId: purchasable.id, selectedSize: 'M', selectedColor: 'Preta' }, catalog)
  assert.equal(missingVariant.ok, false)
  if (!missingVariant.ok) assert.equal(missingVariant.reason, 'invalid-variant')
})
