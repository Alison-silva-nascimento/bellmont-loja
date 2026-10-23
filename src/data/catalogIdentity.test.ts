import assert from 'node:assert/strict'
import test from 'node:test'
import { products } from './products.ts'
import { findProductByIdentity, migrateFavoriteIds, normalizeLocalCatalogIdentities } from './catalogIdentity.ts'

test('normaliza Streetwear e Perfumaria para os códigos oficiais sem perder IDs legados', () => {
  const catalog = normalizeLocalCatalogIdentities(products)
  const street = catalog.find(product => product.code === 'ST-01')
  const asad = catalog.find(product => product.slug === 'asad-lattafa')
  const athena = catalog.find(product => product.slug === 'athena-eau-de-parfum')

  assert.equal(street?.id, 'ST-01')
  assert.deepEqual(street?.legacyIds, ['street-01'])
  assert.equal(asad?.id, 'PF-01')
  assert.deepEqual(asad?.legacyIds, ['perfume-04'])
  assert.equal(athena?.id, 'PF-22')
  assert.deepEqual(athena?.legacyIds, ['perfume-01'])
})

test('associa IF-01 a IF-05 sem perder os identificadores locais', () => {
  const normalized = normalizeLocalCatalogIdentities(products).filter(product => product.category === 'fitness')
  assert.deepEqual(normalized.map(product => product.id), ['IF-01', 'IF-02', 'IF-03', 'IF-04', 'IF-05'])
  assert.deepEqual(normalized.map(product => product.legacyIds?.[0]), ['fitness-01', 'fitness-02', 'fitness-03', 'fitness-04', 'fitness-05'])
  assert.ok(normalized.every(product => product.salesMode === 'INQUIRY_ONLY'))
  assert.equal(normalized.find(product => product.code === 'IF-05')?.price, 240)
  assert.equal(normalized.find(product => product.code === 'IF-05')?.variants, undefined)
})

test('migra favoritos conhecidos e preserva identificadores ainda não resolvidos', () => {
  const catalog = normalizeLocalCatalogIdentities(products)
  assert.deepEqual(migrateFavoriteIds(['street-01', 'perfume-04', 'origem-indisponivel'], catalog), [
    'ST-01', 'PF-01', 'origem-indisponivel',
  ])
  assert.equal(findProductByIdentity(catalog, 'street-01')?.id, 'ST-01')
})
