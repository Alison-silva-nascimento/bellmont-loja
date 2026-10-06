import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ProductImageRow } from '../../lib/supabase/database.types'

export function AdminProductImagePreview({ image, imageUrl, productName, onClose }: {
  image: ProductImageRow | null
  imageUrl: string | null
  productName: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (image && dialog && !dialog.open) dialog.showModal()
    if (!image && dialog?.open) dialog.close()
  }, [image])
  if (!image) return null
  return <dialog ref={dialogRef} className="admin-image-preview-dialog" onCancel={event => { event.preventDefault(); onClose() }} onClose={onClose}>
    <header><div><span>Pré-visualização</span><strong>{image.is_primary ? 'Capa do produto' : `Imagem ${image.sort_order + 1}`}</strong></div><button type="button" className="admin-icon-button" onClick={onClose} autoFocus><X aria-hidden="true" />Fechar</button></header>
    {imageUrl && <img src={imageUrl} alt={image.alt_text || productName} />}
    <p>{image.alt_text || 'Sem texto alternativo.'}</p>
  </dialog>
}
