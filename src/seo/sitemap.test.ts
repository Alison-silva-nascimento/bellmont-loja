import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { products } from '../data/products'
import { SITE_ORIGIN } from './seo'

const xml = readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8')
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])

test('sitemap contém somente URLs absolutas, canônicas e sem duplicações', () => {
  assert.ok(urls.length > 0)
  assert.ok(urls.every(url => url.startsWith(`${SITE_ORIGIN}/`)))
  assert.ok(urls.every(url => !url.includes('#')))
  assert.equal(new Set(urls).size, urls.length)
})

test('sitemap exclui páginas utilitárias e áreas restritas', () => {
  for (const path of ['/sacola', '/favoritos', '/buscar', '/admin', '/dev/cart-test', '/checkout']) {
    assert.ok(!urls.includes(`${SITE_ORIGIN}${path}`), path)
  }
})

test('sitemap inclui os 47 produtos comerciais conhecidos sem inventar slugs', () => {
  const productUrls = urls.filter(url => url.startsWith(`${SITE_ORIGIN}/produto/`))
  assert.equal(productUrls.length, products.length)
  assert.deepEqual(new Set(productUrls), new Set(products.map(product => `${SITE_ORIGIN}/produto/${product.slug}`)))
})
