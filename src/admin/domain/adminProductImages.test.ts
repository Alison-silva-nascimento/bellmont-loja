import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProductImagePath, buildProductImagePlans, moveImageId, normalizedImageExtension, productImageErrorMessage, reorderImageIds, validateImageBatch, validateImageFile } from './adminProductImages'
import { uploadWithCompensation } from '../../services/adminProductImages'

const file = (name: string, type: string, size = 1024) => ({ name, type, size })

test('valida MIME, extensão correspondente e tamanho máximo', () => {
  assert.deepEqual(validateImageFile(file('foto.jpg', 'image/jpeg')), { ok: true })
  assert.deepEqual(validateImageFile(file('foto.jpeg', 'image/jpeg')), { ok: true })
  assert.deepEqual(validateImageFile(file('foto.png', 'image/png')), { ok: true })
  assert.deepEqual(validateImageFile(file('foto.webp', 'image/webp')), { ok: true })
  assert.equal(validateImageFile(file('foto.exe', 'image/png')).ok, false)
  assert.equal(validateImageFile(file('foto.png', 'image/gif')).ok, false)
  assert.equal(validateImageFile(file('foto.png', 'image/png', 5 * 1024 * 1024 + 1)).ok, false)
  assert.equal(normalizedImageExtension(file('foto.jpeg', 'image/jpeg')), 'jpg')
})

test('bloqueia lote inteiro quando ultrapassa oito imagens', () => {
  assert.deepEqual(validateImageBatch([file('a.png', 'image/png'), file('b.png', 'image/png')], 6), { ok: true })
  assert.deepEqual(validateImageBatch([file('a.png', 'image/png'), file('b.png', 'image/png'), file('c.png', 'image/png')], 6), {
    ok: false,
    message: 'Este produto pode ter no máximo 8 imagens.',
  })
})

test('gera path canônico com UUID e extensão normalizada', () => {
  assert.equal(
    buildProductImagePath(42, file('Minha Foto.JPEG', 'image/jpeg'), '550e8400-e29b-41d4-a716-446655440000'),
    'products/42/550e8400-e29b-41d4-a716-446655440000.jpg',
  )
})

test('primeiro upload vira principal e os seguintes preservam ordem', () => {
  const uuids = ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
  const plans = buildProductImagePlans(1, 'Camiseta Teste', [file('a.png', 'image/png'), file('b.webp', 'image/webp')], [], () => uuids.shift()!)
  assert.deepEqual(plans.map(plan => ({ primary: plan.isPrimary, order: plan.sortOrder, alt: plan.altText })), [
    { primary: true, order: 0, alt: 'Camiseta Teste - imagem 1' },
    { primary: false, order: 1, alt: 'Camiseta Teste - imagem 2' },
  ])
})

test('novos uploads entram depois da galeria e não substituem capa', () => {
  const plans = buildProductImagePlans(1, 'Produto', [file('c.png', 'image/png')], [0, 1, 4], () => '550e8400-e29b-41d4-a716-446655440003')
  assert.equal(plans[0].sortOrder, 5)
  assert.equal(plans[0].isPrimary, false)
  assert.equal(plans[0].altText, 'Produto - imagem 4')
})

test('monta nova ordem completa para botões e drag-and-drop', () => {
  assert.deepEqual(moveImageId([10, 11, 12], 11, -1), [11, 10, 12])
  assert.deepEqual(moveImageId([10, 11, 12], 12, 1), [10, 11, 12])
  assert.deepEqual(reorderImageIds([10, 11, 12], 12, 10), [12, 10, 11])
})

test('traduz erros conhecidos sem expor detalhes internos', () => {
  assert.equal(productImageErrorMessage('PRODUCT_IMAGE_LIMIT_EXCEEDED'), 'Este produto já atingiu o limite de 8 imagens.')
  assert.equal(productImageErrorMessage('NOT_ADMIN'), 'Sua sessão não possui permissão para esta ação.')
  assert.equal(productImageErrorMessage('DUPLICATE_PRODUCT_IMAGE_ID'), 'A galeria mudou durante a ordenação. Atualize e tente novamente.')
})

test('remove objeto quando upload funciona e metadata falha', async () => {
  let removed = false
  const result = await uploadWithCompensation({
    upload: async () => ({ error: null }),
    insertMetadata: async () => ({ data: null, error: { code: '42501', message: 'blocked' } }),
    removeObject: async () => { removed = true; return { error: null } },
  })
  assert.equal(result.ok, false)
  assert.equal(removed, true)
  if (!result.ok) assert.equal(result.compensated, true)
})

test('não tenta compensação quando upload falha antes do metadata', async () => {
  let inserted = false
  let removed = false
  const result = await uploadWithCompensation({
    upload: async () => ({ error: { message: 'upload failed' } }),
    insertMetadata: async () => { inserted = true; return { data: null, error: null } },
    removeObject: async () => { removed = true; return { error: null } },
  })
  assert.equal(result.ok, false)
  assert.equal(inserted, false)
  assert.equal(removed, false)
})
