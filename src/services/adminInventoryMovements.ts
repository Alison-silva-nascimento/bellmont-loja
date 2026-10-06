import type { InventoryMovementRow, ProductRow, ProductVariantRow } from '../lib/supabase/database.types'
import { getSupabaseClient } from '../lib/supabase/client'
import { classifySupabaseError, supabaseNotConfigured, type SupabaseFailure } from '../lib/supabase/errors'

type Result<T> = { ok: true; data: T } | SupabaseFailure
export interface AdminInventoryMovementItem {
  movement: InventoryMovementRow
  variant: ProductVariantRow
  product: Pick<ProductRow, 'id' | 'name' | 'code'>
}

export async function listAdminInventoryMovements(): Promise<Result<AdminInventoryMovementItem[]>> {
  const client = getSupabaseClient()
  if (!client) return supabaseNotConfigured()
  const [movements, variants, products] = await Promise.all([
    client.from('inventory_movements').select('*').order('created_at', { ascending: false }),
    client.from('product_variants').select('*'),
    client.from('products').select('id,name,code'),
  ])
  const error = movements.error ?? variants.error ?? products.error
  if (error) return classifySupabaseError(error)
  const variantById = new Map((variants.data ?? []).map(variant => [variant.id, variant]))
  const productById = new Map((products.data ?? []).map(product => [product.id, product]))
  const data = (movements.data ?? []).flatMap(movement => {
    const variant = variantById.get(movement.variant_id)
    const product = variant ? productById.get(variant.product_id) : undefined
    return variant && product ? [{ movement, variant, product }] : []
  })
  return { ok: true, data }
}
