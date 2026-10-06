import { getSupabaseClient } from '../lib/supabase/client'
import { classifySupabaseError, supabaseNotConfigured, type SupabaseFailure } from '../lib/supabase/errors'
import type { ProductRow } from '../lib/supabase/database.types'

export type CatalogResult = { ok: true; data: ProductRow[] } | SupabaseFailure

export const fetchSupabaseCatalog = async (): Promise<CatalogResult> => {
  const client = getSupabaseClient()
  if (!client) return supabaseNotConfigured()

  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) return classifySupabaseError(error)
    return { ok: true, data: data ?? [] }
  } catch (error) {
    return classifySupabaseError(error)
  }
}
