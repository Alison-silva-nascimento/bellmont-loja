import assert from 'node:assert/strict'
import test from 'node:test'
import { products } from './products.ts'
import { getFavoriteProducts, searchProducts, selectCatalogProducts } from './catalog.ts'

test('busca preserva nome, categoria, marca pública e fabricante', () => {
  assert.ok(searchProducts(products, 'Toji').some(product => product.code === 'ST-05'))
  assert.ok(searchProducts(products, 'perfumaria').length > 0)
  const withManufacturer = [{ ...products[0], id: 'remote', manufacturer: 'Lattafa' }]
  assert.equal(searchProducts(withManufacturer, 'lattafa')[0]?.id, 'remote')
})

test('filtros e ordenação funcionam sobre qualquer fonte normalizada', () => {
  const perfumes = selectCatalogProducts(products, { category: 'perfumes', sort: 'price' })
  assert.ok(perfumes.length > 0)
  assert.ok(perfumes.every(product => product.category === 'perfumes'))
  assert.ok((perfumes[0]?.price ?? Infinity) <= (perfumes.at(-1)?.price ?? Infinity))
  assert.ok(selectCatalogProducts(products, { brand: 'imperio-fit' }).every(product => product.brand === 'imperio-fit'))
})

test('favoritos são resolvidos pelos mesmos ids da fonte ativa', () => {
  const selected = getFavoriteProducts(products, [products[0].id, products[3].id])
  assert.deepEqual(selected.map(product => product.id), [products[0].id, products[3].id])
})
