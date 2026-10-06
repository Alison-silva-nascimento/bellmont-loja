import { ArrowLeft, ArrowRight, Crown, Eye, GripVertical, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ProductImageRow } from '../../lib/supabase/database.types'

export function AdminProductImageCard({ image, url, position, total, busy, dragging, onPreview, onSetPrimary, onMove, onDelete, onSaveAlt, onDragStart, onDragEnd, onDrop }: {
  image: ProductImageRow
  url: string | null
  position: number
  total: number
  busy: boolean
  dragging: boolean
  onPreview: () => void
  onSetPrimary: () => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
  onSaveAlt: (value: string) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
}) {
  const [altText, setAltText] = useState(image.alt_text ?? '')
  useEffect(() => setAltText(image.alt_text ?? ''), [image.alt_text])
  return <article className={`admin-product-image-card ${dragging ? 'is-dragging' : ''}`} draggable={!busy} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onDrop() }}>
    <div className="admin-product-image-card__visual">
      {url ? <button type="button" onClick={onPreview} aria-label={`Ampliar imagem ${position + 1}`}><img src={url} alt={image.alt_text || `Imagem ${position + 1} do produto`} /></button> : <span>Imagem indisponível</span>}
      {image.is_primary && <span className="admin-image-cover"><Crown aria-hidden="true" />Capa</span>}
      <span className="admin-image-position">{position + 1}/{total}</span>
    </div>
    <div className="admin-product-image-card__body">
      <div className="admin-image-drag-hint"><GripVertical aria-hidden="true" />Arraste para ordenar no desktop</div>
      <label><span>Texto alternativo</span><input value={altText} maxLength={240} onChange={event => setAltText(event.target.value)} disabled={busy} /></label>
      <button type="button" className="admin-text-action" disabled={busy || altText.trim() === (image.alt_text ?? '').trim()} onClick={() => onSaveAlt(altText)}><Save aria-hidden="true" />Salvar texto</button>
      <div className="admin-image-order-actions" aria-label="Alterar posição da imagem">
        <button type="button" disabled={busy || position === 0} onClick={() => onMove(-1)} aria-label="Mover imagem para a esquerda"><ArrowLeft aria-hidden="true" />Mover antes</button>
        <button type="button" disabled={busy || position === total - 1} onClick={() => onMove(1)} aria-label="Mover imagem para a direita">Mover depois<ArrowRight aria-hidden="true" /></button>
      </div>
      <div className="admin-image-card-actions">
        <button type="button" onClick={onPreview} disabled={busy}><Eye aria-hidden="true" />Visualizar</button>
        {!image.is_primary && <button type="button" onClick={onSetPrimary} disabled={busy}><Crown aria-hidden="true" />Definir como capa</button>}
        <button type="button" className="is-danger" onClick={onDelete} disabled={busy}><Trash2 aria-hidden="true" />Excluir</button>
      </div>
    </div>
  </article>
}
