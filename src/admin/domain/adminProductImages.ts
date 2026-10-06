export const PRODUCT_IMAGE_LIMIT = 8
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

const extensionsByMime = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
} as const

export interface ImageFileLike {
  name: string
  size: number
  type: string
}

export interface ProductImagePlan {
  storagePath: string
  altText: string
  sortOrder: number
  isPrimary: boolean
}

export type ImageValidation =
  | { ok: true }
  | { ok: false; message: string }

const fileExtension = (name: string) => name.split('.').pop()?.toLocaleLowerCase('en-US') ?? ''

export function normalizedImageExtension(file: ImageFileLike): 'jpg' | 'png' | 'webp' | null {
  const allowed = extensionsByMime[file.type as keyof typeof extensionsByMime]
  if (!allowed || !allowed.includes(fileExtension(file.name) as never)) return null
  if (file.type === 'image/jpeg') return 'jpg'
  return file.type === 'image/png' ? 'png' : 'webp'
}

export function validateImageFile(file: ImageFileLike): ImageValidation {
  if (!normalizedImageExtension(file)) return { ok: false, message: 'Use imagens JPG, PNG ou WebP.' }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return { ok: false, message: 'A imagem deve ter no máximo 5 MB.' }
  if (file.size <= 0) return { ok: false, message: 'A imagem selecionada está vazia.' }
  return { ok: true }
}

export function validateImageBatch(files: readonly ImageFileLike[], currentCount: number): ImageValidation {
  if (files.length === 0) return { ok: false, message: 'Selecione pelo menos uma imagem.' }
  if (currentCount + files.length > PRODUCT_IMAGE_LIMIT) {
    return { ok: false, message: 'Este produto pode ter no máximo 8 imagens.' }
  }
  for (const file of files) {
    const validation = validateImageFile(file)
    if (!validation.ok) return validation
  }
  return { ok: true }
}

export function buildProductImagePath(productId: number, file: ImageFileLike, uuid: string = crypto.randomUUID()): string {
  const extension = normalizedImageExtension(file)
  if (!Number.isSafeInteger(productId) || productId <= 0 || !extension) throw new Error('INVALID_PRODUCT_IMAGE_PATH')
  return `products/${productId}/${uuid}.${extension}`
}

export function buildProductImagePlans(
  productId: number,
  productName: string,
  files: readonly ImageFileLike[],
  existingSortOrders: readonly number[],
  uuidFactory: () => string = () => crypto.randomUUID(),
): ProductImagePlan[] {
  const nextSortOrder = existingSortOrders.length ? Math.max(...existingSortOrders) + 1 : 0
  const hasExistingImages = existingSortOrders.length > 0
  return files.map((file, index) => ({
    storagePath: buildProductImagePath(productId, file, uuidFactory()),
    altText: `${productName.trim() || 'Produto'} - imagem ${existingSortOrders.length + index + 1}`,
    sortOrder: nextSortOrder + index,
    isPrimary: !hasExistingImages && index === 0,
  }))
}

export function moveImageId(ids: readonly number[], imageId: number, direction: -1 | 1): number[] {
  const index = ids.indexOf(imageId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ids.length) return [...ids]
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function reorderImageIds(ids: readonly number[], draggedId: number, targetId: number): number[] {
  const from = ids.indexOf(draggedId)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0 || from === to) return [...ids]
  const next = [...ids]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function productImageErrorMessage(code?: string, fallback?: string): string {
  if (code === 'PRODUCT_IMAGE_LIMIT_EXCEEDED') return 'Este produto já atingiu o limite de 8 imagens.'
  if (code === 'NOT_ADMIN' || code === '42501') return 'Sua sessão não possui permissão para esta ação.'
  if (code === 'PRODUCT_IMAGE_NOT_FOUND') return 'A imagem não foi encontrada. Atualize a galeria e tente novamente.'
  if (code === 'INCOMPLETE_PRODUCT_IMAGE_ORDER' || code === 'DUPLICATE_PRODUCT_IMAGE_ID') {
    return 'A galeria mudou durante a ordenação. Atualize e tente novamente.'
  }
  return fallback || 'Não foi possível concluir a operação com a imagem.'
}
