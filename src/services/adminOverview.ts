import { getSupabaseClient } from '../lib/supabase/client'
import { classifySupabaseError, supabaseNotConfigured, type SupabaseFailure } from '../lib/supabase/errors'

export interface AdminOverviewCounts {
  products: number
  variants: number
  inventory: number
}

export type AdminOverviewResult = { ok: true; data: AdminOverviewCounts } | SupabaseFailure

export const fetchAdminOverview = async (): Promise<AdminOverviewResult> => {
  const client = getSupabaseClient()
  if (!client) return supabaseNotConfigured()

  try {
    const [products, variants, inventory] = await Promise.all([
      client.from('products').select('*', { count: 'exact', head: true }),
      client.from('product_variants').select('*', { count: 'exact', head: true }),
      client.from('inventory').select('*', { count: 'exact', head: true }),
    ])
    const error = products.error ?? variants.error ?? inventory.error
    if (error) return classifySupabaseError(error)

    return {
      ok: true,
      data: {
        products: products.count ?? 0,
        variants: variants.count ?? 0,
        inventory: inventory.count ?? 0,
      },
    }
  } catch (error) {
    return classifySupabaseError(error)
  }
}
