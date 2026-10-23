import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeLocalCatalogIdentities } from './catalogIdentity'
import { HOME_SHOWCASES, selectHomeShowcaseProducts } from './homeShowcases'
import { products } from './products'

const catalog = normalizeLocalCatalogIdentities(products)

test('Home exibe exatamente 6 Streetwear, 6 perfumes e 4 Fitness', () => {
  assert.equal(selectHomeShowcaseProducts(catalog, 'streetwear').length, 6)
  assert.equal(selectHomeShowcaseProducts(catalog, 'perfumes').length, 6)
  assert.equal(selectHomeShowcaseProducts(catalog, 'fitness').length, 4)
})

test('seleções editoriais são determinísticas, únicas e da categoria correta', () => {
  for (const key of Object.keys(HOME_SHOWCASES) as Array<keyof typeof HOME_SHOWCASES>) {
    const first = selectHomeShowcaseProducts(catalog, key)
    const second = selectHomeShowcaseProducts(catalog, key)
    assert.deepEqual(first.map(product => product.id), second.map(product => product.id))
    assert.equal(new Set(first.map(product => product.id)).size, first.length)
    assert.ok(first.every(product => product.category === HOME_SHOWCASES[key].category))
  }
})

test('CTAs apontam para as coleções completas sem alterar seus totais', () => {
  assert.deepEqual(
    Object.values(HOME_SHOWCASES).map(showcase => showcase.href),
    ['/streetwear', '/perfumes', '/imperio-fit'],
  )
  assert.equal(catalog.filter(product => product.category === 'streetwear').length, 20)
  assert.equal(catalog.filter(product => product.category === 'perfumes').length, 22)
  assert.equal(catalog.filter(product => product.category === 'fitness').length, 5)
})

test('catálogo vazio permanece vazio e não recebe conteúdo artificial', () => {
  assert.deepEqual(selectHomeShowcaseProducts([], 'streetwear'), [])
  assert.deepEqual(selectHomeShowcaseProducts([], 'perfumes'), [])
  assert.deepEqual(selectHomeShowcaseProducts([], 'fitness'), [])
})
