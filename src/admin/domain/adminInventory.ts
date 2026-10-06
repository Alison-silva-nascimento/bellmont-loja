export type InventoryOperation = 'entry' | 'exit'

const knownRpcErrors: Record<string, string> = {
  INVALID_DELTA: 'Informe uma quantidade válida.',
  INSUFFICIENT_STOCK: 'Estoque insuficiente para esta saída.',
  BELOW_RESERVED: 'A saída deixaria o estoque abaixo da quantidade reservada.',
  VARIANT_NOT_FOUND: 'A variante não foi encontrada.',
  NOT_ADMIN: 'Você não possui permissão para realizar esta operação.',
}

export function parsePositiveInteger(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return null
  const quantity = Number(normalized)
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null
}

export function inventoryDelta(operation: InventoryOperation, value: string): number | null {
  const quantity = parsePositiveInteger(value)
  if (quantity === null) return null
  return operation === 'entry' ? quantity : -quantity
}

export function translateInventoryRpcError(error: unknown): string {
  const candidate = typeof error === 'object' && error !== null ? error as { message?: string; details?: string; hint?: string; code?: string } : {}
  const content = [candidate.message, candidate.details, candidate.hint, candidate.code].filter(Boolean).join(' ').toUpperCase()
  for (const [key, message] of Object.entries(knownRpcErrors)) if (content.includes(key)) return message
  return 'Não foi possível atualizar o estoque. Tente novamente.'
}

export const formatSignedDelta = (delta: number) => delta > 0 ? `+${delta}` : String(delta)

export function formatVariantAttributes(color: string | null, size: string | null, volume: string | null): string {
  return [color, size, volume].filter(Boolean).join(' · ') || 'Sem atributos opcionais'
}
