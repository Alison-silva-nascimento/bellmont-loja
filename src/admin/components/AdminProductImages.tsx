import { ImageOff, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProductImageRow } from '../../lib/supabase/database.types'
import { deleteAdminProductImage, getProductImagePublicUrl, listAdminProductImages, reorderAdminProductImages, retryProductImageObjectCleanup, setPrimaryAdminProductImage, updateAdminProductImageAltText, uploadAdminProductImages } from '../../services/adminProductImages'
import { moveImageId, reorderImageIds, validateImageBatch } from '../domain/adminProductImages'
import { AdminProductImageCard } from './AdminProductImageCard'
import { AdminProductImagePreview } from './AdminProductImagePreview'
import { AdminProductImageUploader } from './AdminProductImageUploader'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; images: ProductImageRow[] }

export function AdminProductImages({ productId, productName }: { productId: number; productName: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [operation, setOperation] = useState<'uploading' | 'saving' | 'deleting' | 'reordering' | null>(null)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [progress, setProgress] = useState('')
  const [preview, setPreview] = useState<ProductImageRow | null>(null)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [cleanupPath, setCleanupPath] = useState<string | null>(null)
  const images = state.status === 'ready' ? state.images : []
  const busy = operation !== null

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await listAdminProductImages(productId)
    setState(result.ok ? { status: 'ready', images: result.data } : { status: 'error', message: result.userMessage })
  }, [productId])
  useEffect(() => { void load() }, [load])

  const urls = useMemo(() => new Map(images.map(image => [image.id, getProductImagePublicUrl(image.storage_path)])), [images])
  const clearFeedback = () => { setMessage(''); setSuccess('') }

  const upload = async (files: File[]) => {
    clearFeedback()
    const validation = validateImageBatch(files, images.length)
    if (!validation.ok) { setMessage(validation.message); return false }
    setOperation('uploading')
    const result = await uploadAdminProductImages(productId, productName, files, images, (current, total) => setProgress(`Enviando ${current} de ${total}…`))
    setOperation(null); setProgress('')
    if (!result.ok) { setMessage(result.userMessage); await load(); return false }
    setSuccess(result.data.length === 1 ? 'Imagem adicionada com sucesso.' : `${result.data.length} imagens adicionadas com sucesso.`)
    await load(); return true
  }

  const setPrimary = async (image: ProductImageRow) => {
    clearFeedback(); setOperation('saving')
    const result = await setPrimaryAdminProductImage(productId, image.id)
    setOperation(null)
    if (!result.ok) { setMessage(result.userMessage); return }
    setSuccess('Capa atualizada com sucesso.'); await load()
  }

  const persistOrder = async (ids: number[]) => {
    clearFeedback(); setOperation('reordering')
    setState({ status: 'ready', images: ids.map((id, index) => ({ ...images.find(image => image.id === id)!, sort_order: index })) })
    const result = await reorderAdminProductImages(productId, ids)
    setOperation(null); setDraggedId(null)
    if (!result.ok) { setMessage(result.userMessage); await load(); return }
    setSuccess('Ordem da galeria atualizada.'); await load()
  }

  const move = (imageId: number, direction: -1 | 1) => void persistOrder(moveImageId(images.map(image => image.id), imageId, direction))
  const drop = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) { setDraggedId(null); return }
    void persistOrder(reorderImageIds(images.map(image => image.id), draggedId, targetId))
  }

  const remove = async (image: ProductImageRow) => {
    const warning = image.is_primary && images.length > 1 ? '\nA próxima imagem da galeria será definida automaticamente como capa.' : ''
    if (!window.confirm(`Excluir esta imagem?${warning}`)) return
    clearFeedback(); setOperation('deleting')
    const result = await deleteAdminProductImage(productId, image)
    setOperation(null)
    if (!result.ok) { setMessage(result.userMessage); return }
    setCleanupPath(result.data.cleanupPendingPath)
    setSuccess(result.data.cleanupPendingPath ? 'Imagem removida da galeria, mas o arquivo ainda precisa ser limpo.' : 'Imagem excluída com sucesso.')
    await load()
  }

  const retryCleanup = async () => {
    if (!cleanupPath) return
    setOperation('deleting'); const result = await retryProductImageObjectCleanup(cleanupPath); setOperation(null)
    if (!result.ok) { setMessage(result.userMessage); return }
    setCleanupPath(null); setSuccess('Arquivo pendente removido com sucesso.')
  }

  const saveAlt = async (image: ProductImageRow, altText: string) => {
    clearFeedback(); setOperation('saving')
    const result = await updateAdminProductImageAltText(productId, image.id, altText)
    setOperation(null)
    if (!result.ok) { setMessage(result.userMessage); return }
    setSuccess('Texto alternativo atualizado.'); await load()
  }

  return <section className="admin-form-section admin-product-images" aria-labelledby="product-images-heading" aria-busy={busy}>
    <div className="admin-section-heading"><div><span>Imagens</span><h2 id="product-images-heading">Galeria do produto</h2></div>{busy && <span className="admin-gallery-busy">{operation === 'uploading' ? progress : operation === 'reordering' ? 'Salvando ordem…' : operation === 'deleting' ? 'Excluindo…' : 'Salvando…'}</span>}</div>
    <AdminProductImageUploader currentCount={images.length} busy={busy} progress={progress} onUpload={upload} />
    {message && <p className="admin-image-message is-error" role="alert">{message}</p>}
    {success && <p className="admin-image-message is-success" role="status">{success}</p>}
    {cleanupPath && <div className="admin-cleanup-warning" role="alert"><span>O metadado foi removido, mas o arquivo precisa de nova tentativa de limpeza.</span><button type="button" onClick={() => void retryCleanup()} disabled={busy}>Tentar limpar arquivo</button></div>}
    {state.status === 'loading' && <div className="admin-gallery-state" aria-live="polite"><span className="admin-loader" />Carregando imagens…</div>}
    {state.status === 'error' && <div className="admin-gallery-state" role="alert"><strong>Não foi possível carregar a galeria.</strong><p>{state.message}</p><button type="button" className="admin-secondary-button" onClick={() => void load()}><RefreshCw aria-hidden="true" />Tentar novamente</button></div>}
    {state.status === 'ready' && images.length === 0 && <div className="admin-gallery-empty"><ImageOff aria-hidden="true" /><strong>Este produto ainda não possui imagens.</strong><span>Adicione fotos para criar a galeria e definir a capa.</span></div>}
    {state.status === 'ready' && images.length > 0 && <div className="admin-product-images-grid">{images.map((image, index) => <AdminProductImageCard key={image.id} image={image} url={urls.get(image.id) ?? null} position={index} total={images.length} busy={busy} dragging={draggedId === image.id} onPreview={() => setPreview(image)} onSetPrimary={() => void setPrimary(image)} onMove={direction => move(image.id, direction)} onDelete={() => void remove(image)} onSaveAlt={value => void saveAlt(image, value)} onDragStart={() => setDraggedId(image.id)} onDragEnd={() => setDraggedId(null)} onDrop={() => drop(image.id)} />)}</div>}
    <AdminProductImagePreview image={preview} imageUrl={preview ? urls.get(preview.id) ?? null : null} productName={productName} onClose={() => setPreview(null)} />
  </section>
}
