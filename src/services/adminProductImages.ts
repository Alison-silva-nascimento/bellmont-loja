import type { Database, ProductImageRow } from '../lib/supabase/database.types'
import { getSupabaseClient } from '../lib/supabase/client'
import { classifySupabaseError, supabaseNotConfigured, type SupabaseFailure } from '../lib/supabase/errors'
import { buildProductImagePlans, productImageErrorMessage } from '../admin/domain/adminProductImages'

const BUCKET = 'product-images'
type Result<T> = { ok: true; data: T } | SupabaseFailure
type ProductImageInsert = Database['public']['Tables']['product_images']['Insert']
type GalleryRpcRow = Database['public']['Functions']['set_primary_product_image']['Returns'][number]

const clientOrFailure = () => getSupabaseClient() ?? supabaseNotConfigured()
const imageFailure = (error: { code?: string; message?: string; status?: number }): SupabaseFailure => {
  const classified = classifySupabaseError(error)
  return { ...classified, userMessage: productImageErrorMessage(error.message || error.code, classified.userMessage) }
}

export async function listAdminProductImages(productId: number): Promise<Result<ProductImageRow[]>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { data, error } = await client.from('product_images').select('*').eq('product_id', productId)
    .order('sort_order').order('id')
  return error ? imageFailure(error) : { ok: true, data }
}

export function getProductImagePublicUrl(storagePath: string): string | null {
  const client = getSupabaseClient()
  return client?.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl ?? null
}

export interface CompensatedUploadDependencies<T> {
  upload: () => Promise<{ error: { code?: string; message?: string; status?: number } | null }>
  insertMetadata: () => Promise<{ data: T | null; error: { code?: string; message?: string; status?: number } | null }>
  removeObject: () => Promise<{ error: { code?: string; message?: string; status?: number } | null }>
}

export async function uploadWithCompensation<T>(dependencies: CompensatedUploadDependencies<T>) {
  const uploaded = await dependencies.upload()
  if (uploaded.error) return { ok: false as const, stage: 'upload' as const, error: uploaded.error, compensated: false }
  const inserted = await dependencies.insertMetadata()
  if (!inserted.error && inserted.data) return { ok: true as const, data: inserted.data }
  const cleanup = await dependencies.removeObject()
  return {
    ok: false as const,
    stage: 'metadata' as const,
    error: inserted.error ?? { message: 'Metadata sem retorno.' },
    compensated: !cleanup.error,
  }
}

export async function uploadAdminProductImages(
  productId: number,
  productName: string,
  files: readonly File[],
  existingImages: readonly ProductImageRow[],
  onProgress: (current: number, total: number) => void,
): Promise<Result<ProductImageRow[]>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const plans = buildProductImagePlans(productId, productName, files, existingImages.map(image => image.sort_order))
  const created: ProductImageRow[] = []

  for (let index = 0; index < files.length; index += 1) {
    onProgress(index + 1, files.length)
    const file = files[index]
    const plan = plans[index]
    const metadata: ProductImageInsert = {
      product_id: productId,
      variant_id: null,
      storage_path: plan.storagePath,
      alt_text: plan.altText,
      sort_order: plan.sortOrder,
      is_primary: plan.isPrimary,
    }
    const operation = await uploadWithCompensation<ProductImageRow>({
      upload: async () => {
        const { error } = await client.storage.from(BUCKET).upload(plan.storagePath, file, { contentType: file.type, upsert: false })
        return { error }
      },
      insertMetadata: async () => {
        const { data, error } = await client.from('product_images').insert(metadata).select().single()
        return { data, error }
      },
      removeObject: async () => {
        const { error } = await client.storage.from(BUCKET).remove([plan.storagePath])
        return { error }
      },
    })
    if (!operation.ok) {
      const failure = imageFailure(operation.error)
      return {
        ...failure,
        userMessage: operation.stage === 'metadata' && !operation.compensated
          ? `${failure.userMessage} O arquivo enviado também precisa de uma nova tentativa de limpeza.`
          : failure.userMessage,
      }
    }
    created.push(operation.data)
  }
  return { ok: true, data: created }
}

export async function setPrimaryAdminProductImage(productId: number, imageId: number): Promise<Result<GalleryRpcRow>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { data, error } = await client.rpc('set_primary_product_image', { p_product_id: productId, p_image_id: imageId })
  return error ? imageFailure(error) : { ok: true, data: data[0] }
}

export async function reorderAdminProductImages(productId: number, imageIds: number[]): Promise<Result<GalleryRpcRow[]>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { data, error } = await client.rpc('reorder_product_images', { p_product_id: productId, p_image_ids: imageIds })
  return error ? imageFailure(error) : { ok: true, data }
}

export async function updateAdminProductImageAltText(productId: number, imageId: number, altText: string): Promise<Result<ProductImageRow>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { data, error } = await client.from('product_images').update({ alt_text: altText.trim() || null })
    .eq('product_id', productId).eq('id', imageId).select().single()
  return error ? imageFailure(error) : { ok: true, data }
}

export type DeleteProductImageResult = Result<{ cleanupPendingPath: string | null }>

export async function deleteAdminProductImage(productId: number, image: ProductImageRow): Promise<DeleteProductImageResult> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const metadata = await client.from('product_images').delete().eq('product_id', productId).eq('id', image.id).select('id').maybeSingle()
  if (metadata.error) return imageFailure(metadata.error)
  if (!metadata.data) return imageFailure({ code: 'PRODUCT_IMAGE_NOT_FOUND', message: 'PRODUCT_IMAGE_NOT_FOUND' })
  const object = await client.storage.from(BUCKET).remove([image.storage_path])
  if (object.error) {
    return {
      ok: true,
      data: { cleanupPendingPath: image.storage_path },
    }
  }
  return { ok: true, data: { cleanupPendingPath: null } }
}

export async function retryProductImageObjectCleanup(storagePath: string): Promise<Result<null>> {
  const client = clientOrFailure()
  if ('ok' in client) return client
  const { error } = await client.storage.from(BUCKET).remove([storagePath])
  return error ? imageFailure(error) : { ok: true, data: null }
}
