import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { products } from './products'
import { normalizeLocalCatalogIdentities } from './catalogIdentity'
import { prepareLocalCatalogForAssistedCommerce } from './assistedCatalog'

const catalog = prepareLocalCatalogForAssistedCommerce(normalizeLocalCatalogIdentities(products))

test('adiciona somente variantes Streetwear confirmadas pelo cadastro comercial', () => {
  const streetwear = catalog.filter(product => product.category === 'streetwear')
  assert.equal(streetwear.length, 20)
  assert.ok(streetwear.every(product => product.variants?.length === 4))
  assert.ok(streetwear.every(product => product.sizes?.join(',') === 'P,M,G,GG'))
  assert.ok(streetwear.flatMap(product => product.variants ?? []).every(variant => variant.availabilityStatus === 'unconfirmed' && variant.stock === null))
  assert.ok(streetwear.every(product => product.salesMode === 'ASSISTED_PURCHASE'))
})

test('preserva volumes reais e não fabrica variantes para perfumes sem volume confirmado', () => {
  assert.equal(catalog.find(product => product.code === 'PF-01')?.salesMode, 'INQUIRY_ONLY')
  assert.equal(catalog.find(product => product.code === 'PF-01')?.variants, undefined)
  assert.equal(catalog.find(product => product.code === 'PF-06')?.variants, undefined)
  assert.equal(catalog.find(product => product.code === 'PF-05')?.variants, undefined)
  assert.equal(catalog.find(product => product.code === 'PF-07')?.variants, undefined)
})

test('não inventa variantes para os produtos locais de Fitness', () => {
  const fitness = catalog.filter(product => product.category === 'fitness')
  assert.deepEqual(fitness.map(product => product.code), ['IF-01', 'IF-02', 'IF-03', 'IF-04', 'IF-05'])
  assert.ok(fitness.every(product => product.salesMode === 'INQUIRY_ONLY' && !product.variants?.length))
})

test('catálogo local reúne 47 produtos únicos e preserva o Conjunto Jasmim como consulta', () => {
  assert.equal(catalog.length, 47)
  assert.equal(catalog.filter(product => product.category === 'streetwear').length, 20)
  assert.equal(catalog.filter(product => product.category === 'perfumes').length, 22)
  assert.equal(catalog.filter(product => product.category === 'fitness').length, 5)
  assert.equal(new Set(catalog.map(product => product.code)).size, 47)
  assert.equal(new Set(catalog.map(product => product.slug)).size, 47)

  const jasmim = catalog.find(product => product.code === 'IF-05')
  assert.equal(jasmim?.name, 'Conjunto Jasmim')
  assert.equal(jasmim?.price, 240)
  assert.equal(jasmim?.salesMode, 'INQUIRY_ONLY')
  assert.equal(jasmim?.variants, undefined)
  assert.ok(existsSync(resolve('public/assets/imperio-fit-jasmim-brown.png')))
})

