import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyProductForm, emptyVariantForm, normalizeProductForm, normalizeVariantForm, parseOptionalBrl, slugifyProductName } from './adminProductForm'

test('gera slug revisável, estável e sem acentos', () => {
  assert.equal(slugifyProductName('  Produto DEV — Fé  '), 'produto-dev-fe')
})

test('normaliza preço BRL sem aceitar valor negativo ou precisão excessiva', () => {
  assert.equal(parseOptionalBrl('R$ 80,00'), undefined)
  assert.equal(parseOptionalBrl('1.250,50'), 1250.5)
  assert.equal(parseOptionalBrl(''), null)
  assert.equal(parseOptionalBrl('-1'), undefined)
  assert.equal(parseOptionalBrl('80,999'), undefined)
})

test('produto exige nome e slug e preserva preço ausente como null', () => {
  const invalid = normalizeProductForm(emptyProductForm())
  assert.equal(invalid.ok, false)
  const valid = normalizeProductForm({ ...emptyProductForm(), name: ' Teste ', slug: 'teste-dev' })
  assert.deepEqual(valid, { ok: true, data: { code: null, name: 'Teste', slug: 'teste-dev', description: null, brand: 'bellmont', category: 'streetwear', subcategory: null, price: null, status: 'draft', sales_mode: 'INQUIRY_ONLY', featured: false } })
})

test('modalidade comercial é explícita e o padrão seguro é somente consulta', () => {
  assert.equal(emptyProductForm().salesMode, 'INQUIRY_ONLY')
  const assisted = normalizeProductForm({ ...emptyProductForm(), name: 'Camiseta', slug: 'camiseta', salesMode: 'ASSISTED_PURCHASE' })
  assert.equal(assisted.ok && assisted.data.sales_mode, 'ASSISTED_PURCHASE')
})

test('permite fabricante ausente somente em Perfumaria', () => {
  const perfume = normalizeProductForm({ ...emptyProductForm(), name: 'Perfume', slug: 'perfume', category: 'perfumes', brand: '' })
  assert.equal(perfume.ok, true)
  if (perfume.ok) assert.equal(perfume.data.brand, null)

  const streetwear = normalizeProductForm({ ...emptyProductForm(), name: 'Camiseta', slug: 'camiseta', category: 'streetwear', brand: '' })
  assert.equal(streetwear.ok, false)
  if (!streetwear.ok) assert.equal(streetwear.errors.brand, 'Informe a marca deste produto.')
})

test('variante exige SKU e aceita opções genéricas sem inventar tamanhos', () => {
  assert.equal(normalizeVariantForm(emptyVariantForm()).ok, false)
  const result = normalizeVariantForm({ ...emptyVariantForm(), sku: ' TEST-M-BR ', size: 'M', color: 'Branca', options: '{"tecido":"algodão"}' })
  assert.deepEqual(result, { ok: true, data: { sku: 'TEST-M-BR', color: 'Branca', size: 'M', volume: null, price_override: null, options: { tecido: 'algodão' }, is_active: true } })
})
