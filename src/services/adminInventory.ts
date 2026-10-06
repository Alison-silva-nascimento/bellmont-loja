import type { InventoryRow, ProductRow, ProductVariantRow } from '../lib/supabase/database.types'
import { getSupabaseClient } from '../lib/supabase/client'
import { classifySupabaseError, supabaseNotConfigured, type SupabaseFailure } from '../lib/supabase/errors'
import { translateInventoryRpcError } from '../admin/domain/adminInventory'

type Result<T> = { ok: true; data: T } | SupabaseFailure

export interface AdminInventoryItem {
  product: Pick<ProductRow, 'id' | 'name' | 'code' | 'status'>
  variant: ProductVariantRow
  inventory: InventoryRow | null
}

export interface InventoryMovementResult {
  variantId: number
  quantityOnHand: number
  quantityReserved: number
  availableQuantity: number
}

export async function listAdminInventory(): Promise<Result<AdminInventoryItem[]>> {
  const client = getSupabaseClient()
  if (!client) return supabaseNotConfigured()
  const [products, variants, inventories] = await Promise.all([
    client.from('products').select('id,name,code,status'),
    client.from('product_variants').select('*'),
    client.from('inventory').select('*'),
  ])
  const error = products.error ?? variants.error ?? inventories.error
  if (error) return classifySupabaseError(error)
  const productById = new Map((products.data ?? []).map(product => [product.id, product]))
  const inventoryByVariant = new Map((inventories.data ?? []).map(inventory => [inventory.variant_id, inventory]))
  const data = (variants.data ?? []).flatMap(variant => {
    const product = productById.get(variant.product_id)
    return product ? [{ product, variant, inventory: inventoryByVariant.get(variant.id) ?? null }] : []
  }).sort((a, b) => a.product.name.localeCompare(b.product.name, 'pt-BR') || a.variant.sku.localeCompare(b.variant.sku, 'pt-BR'))
  return { ok: true, data }
}

export async function applyAdminInventoryMovement(variantId: number, delta: number, note: string | null): Promise<Result<InventoryMovementResult>> {
  const client = getSupabaseClient()
  if (!client) return supabaseNotConfigured()
  const { data, error } = await client.rpc('apply_inventory_movement', { p_variant_id: variantId, p_delta: delta, p_note: note })
  if (error) return { ok: false, kind: 'invalid-request', userMessage: translateInventoryRpcError(error), code: error.code }
  const row = data[0]
  if (!row) return { ok: false, kind: 'unknown', userMessage: 'A operação foi concluída sem retornar o novo saldo.' }
  return { ok: true, data: { variantId: row.variant_id, quantityOnHand: row.quantity_on_hand, quantityReserved: row.quantity_reserved, availableQuantity: row.available_quantity } }
}
