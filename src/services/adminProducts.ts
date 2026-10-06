import type { Database, ProductRow, ProductVariantRow } from '../lib/supabase/database.types'
import { getSupabaseClient } from '../lib/supabase/client'
import { classifySupabaseError, supabaseNotConfigured, type SupabaseFailure } from '../lib/supabase/errors'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type VariantInsert = Database['public']['Tables']['product_variants']['Insert']
type VariantUpdate = Database['public']['Tables']['product_variants']['Update']
type Result<T> = { ok: true; data: T } | SupabaseFailure
export type AdminProductListItem = ProductRow & { variantCount: number }

const clientOrFailure = () => getSupabaseClient() ?? supabaseNotConfigured()

export async function listAdminProducts(): Promise<Result<AdminProductListItem[]>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const [products, variants] = await Promise.all([
    client.from('products').select('*').order('created_at', { ascending: false }),
    client.from('product_variants').select('product_id'),
  ])
  if (products.error) return classifySupabaseError(products.error)
  if (variants.error) return classifySupabaseError(variants.error)
  const counts = new Map<number, number>()
  for (const variant of variants.data) counts.set(variant.product_id, (counts.get(variant.product_id) ?? 0) + 1)
  return { ok: true, data: products.data.map(product => ({ ...product, variantCount: counts.get(product.id) ?? 0 })) }
}

export async function getAdminProduct(id: number): Promise<Result<{ product: ProductRow; variants: ProductVariantRow[] }>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const [product, variants] = await Promise.all([
    client.from('products').select('*').eq('id', id).single(),
    client.from('product_variants').select('*').eq('product_id', id).order('created_at'),
  ])
  if (product.error) return classifySupabaseError(product.error)
  if (variants.error) return classifySupabaseError(variants.error)
  return { ok: true, data: { product: product.data, variants: variants.data } }
}

export async function createAdminProduct(payload: ProductInsert): Promise<Result<ProductRow>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { data, error } = await client.from('products').insert(payload).select().single()
  return error ? classifySupabaseError(error) : { ok: true, data }
}

export async function updateAdminProduct(id: number, payload: ProductUpdate): Promise<Result<ProductRow>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { data, error } = await client.from('products').update(payload).eq('id', id).select().single()
  return error ? classifySupabaseError(error) : { ok: true, data }
}

export async function createAdminVariant(payload: VariantInsert): Promise<Result<ProductVariantRow>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { data, error } = await client.from('product_variants').insert(payload).select().single()
  return error ? classifySupabaseError(error) : { ok: true, data }
}

export async function updateAdminVariant(id: number, payload: VariantUpdate): Promise<Result<ProductVariantRow>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { data, error } = await client.from('product_variants').update(payload).eq('id', id).select().single()
  return error ? classifySupabaseError(error) : { ok: true, data }
}
