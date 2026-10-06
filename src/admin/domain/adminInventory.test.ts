import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatSignedDelta, inventoryDelta, parsePositiveInteger, translateInventoryRpcError } from './adminInventory'

describe('admin inventory domain', () => {
  it('converts an entry to a positive delta', () => assert.equal(inventoryDelta('entry', '5'), 5))
  it('converts an exit to a negative delta', () => assert.equal(inventoryDelta('exit', '2'), -2))
  it('rejects empty, zero, negative, decimal and NaN quantities', () => {
    for (const value of ['', '0', '-1', '1.5', 'abc']) assert.equal(parsePositiveInteger(value), null)
  })
  it('translates every known RPC error', () => {
    assert.equal(translateInventoryRpcError({ message: 'INVALID_DELTA' }), 'Informe uma quantidade válida.')
    assert.equal(translateInventoryRpcError({ message: 'INSUFFICIENT_STOCK' }), 'Estoque insuficiente para esta saída.')
    assert.equal(translateInventoryRpcError({ message: 'BELOW_RESERVED' }), 'A saída deixaria o estoque abaixo da quantidade reservada.')
    assert.equal(translateInventoryRpcError({ message: 'VARIANT_NOT_FOUND' }), 'A variante não foi encontrada.')
    assert.equal(translateInventoryRpcError({ message: 'NOT_ADMIN' }), 'Você não possui permissão para realizar esta operação.')
  })
  it('does not expose unexpected backend details', () => assert.equal(translateInventoryRpcError({ message: 'internal stack details' }), 'Não foi possível atualizar o estoque. Tente novamente.'))
  it('formats signed deltas', () => { assert.equal(formatSignedDelta(10), '+10'); assert.equal(formatSignedDelta(-2), '-2'); assert.equal(formatSignedDelta(0), '0') })
  it('represents missing inventory without manufacturing quantities', () => {
    const inventory = undefined
    assert.equal(inventory?.quantity_on_hand ?? null, null)
  })
})
