import assert from 'node:assert/strict'
import test from 'node:test'
import { products } from '../data/products'
import { canonicalUrl, legacyHashToPath, normalizePathname, resolveSeo, SITE_ORIGIN } from './seo'

test('gera canonical absoluto e remove barra final duplicada', () => {
  assert.equal(SITE_ORIGIN, 'https://bellmontloja.com.br')
  assert.equal(canonicalUrl('/streetwear/'), 'https://bellmontloja.com.br/streetwear')
  assert.equal(normalizePathname('/'), '/')
})

test('marca páginas utilitárias e administrativas como não indexáveis', () => {
  for (const path of ['/sacola', '/favoritos', '/buscar', '/admin', '/dev/cart-test', '/checkout']) {
    assert.equal(resolveSeo(path, products).indexable, false, path)
  }
})

test('gera metadados indexáveis para produtos existentes', () => {
  const product = products[0]
  const seo = resolveSeo(`/produto/${product.slug}`, products)
  assert.equal(seo.indexable, true)
  assert.match(seo.title, new RegExp(product.name, 'i'))
})

test('preserva links antigos do HashRouter em domínio raiz e subdiretório', () => {
  assert.equal(legacyHashToPath('#/produto/asad-lattafa', '/'), '/produto/asad-lattafa')
  assert.equal(legacyHashToPath('#/perfumes?ordem=price', '/bellmont-loja/'), '/bellmont-loja/perfumes?ordem=price')
  assert.equal(legacyHashToPath('', '/'), null)
})
