import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const manifestPath = resolve(
  'docs/inventory/manifests/bellmont-streetwear-initial-2026-10-14-v1.json',
)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const failures = []
const operations = Array.isArray(manifest.operations) ? manifest.operations : []
const expectedCodes = new Set(Array.from({ length: 20 }, (_, index) => 'ST-' + String(index + 1).padStart(2, '0')))
const expectedSizes = new Set(['P', 'M', 'G', 'GG'])

if (manifest.batch_key !== 'BELLMONT-STREETWEAR-INITIAL-2026-10-14-V1') failures.push('batch_key inesperado')
if (manifest.status !== 'PREVIEW_ONLY_NOT_APPLIED') failures.push('manifesto não está marcado como prévia')
if (operations.length !== 80) failures.push('esperadas 80 operações; encontradas ' + operations.length)

const operationKeys = new Set()
const variantIds = new Set()
const skus = new Set()
const productCodes = new Set()
const totalsBySize = new Map()
let total = 0

for (const operation of operations) {
  operationKeys.add(operation.operation_key)
  variantIds.add(operation.variant_id)
  skus.add(operation.sku)
  productCodes.add(operation.product_code)
  totalsBySize.set(operation.size, (totalsBySize.get(operation.size) ?? 0) + operation.target_quantity)
  total += operation.target_quantity

  if (!expectedCodes.has(operation.product_code)) failures.push('produto fora do escopo: ' + operation.product_code)
  if (!expectedSizes.has(operation.size)) failures.push('tamanho inválido: ' + operation.size)
  if (operation.quantity_current_verified !== null || operation.expected_quantity !== 0) {
    failures.push('saldo inicial não reconciliado como ausente/zero: ' + operation.sku)
  }
  if (operation.target_quantity !== 15 || operation.delta_required !== 15) {
    failures.push('alvo/delta diferente de 15: ' + operation.sku)
  }
}

if (operationKeys.size !== 80) failures.push('operation_key duplicado')
if (variantIds.size !== 80) failures.push('variant_id duplicado')
if (skus.size !== 80) failures.push('SKU duplicado')
if (productCodes.size !== 20) failures.push('esperados 20 produtos; encontrados ' + productCodes.size)
if (total !== 1200) failures.push('total esperado 1200; encontrado ' + total)
for (const size of expectedSizes) {
  if (totalsBySize.get(size) !== 300) failures.push('total do tamanho ' + size + ' diferente de 300')
}

if (failures.length > 0) {
  console.error('Manifesto inválido:')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('Manifesto válido: 20 produtos, 80 variantes, 15 por SKU, 1.200 unidades.')
  console.log('Prévia somente: nenhum estoque foi aplicado.')
}

