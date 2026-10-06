import { ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PRODUCT_IMAGE_ACCEPT, PRODUCT_IMAGE_LIMIT, validateImageBatch } from '../domain/adminProductImages'

interface PreviewFile {
  file: File
  url: string
}

export function AdminProductImageUploader({ currentCount, busy, progress, onUpload }: {
  currentCount: number
  busy: boolean
  progress: string
  onUpload: (files: File[]) => Promise<boolean>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<PreviewFile[]>([])
  const [message, setMessage] = useState('')
  const selectedRef = useRef<PreviewFile[]>([])

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => () => selectedRef.current.forEach(item => URL.revokeObjectURL(item.url)), [])

  const replaceSelection = (files: File[]) => {
    const validation = validateImageBatch(files, currentCount)
    if (!validation.ok) { setMessage(validation.message); if (inputRef.current) inputRef.current.value = ''; return }
    selected.forEach(item => URL.revokeObjectURL(item.url))
    setSelected(files.map(file => ({ file, url: URL.createObjectURL(file) })))
    setMessage('')
  }
  const remove = (index: number) => {
    setSelected(current => {
      URL.revokeObjectURL(current[index].url)
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
    if (inputRef.current) inputRef.current.value = ''
  }
  const clear = () => {
    selected.forEach(item => URL.revokeObjectURL(item.url))
    setSelected([]); setMessage('')
    if (inputRef.current) inputRef.current.value = ''
  }
  const send = async () => {
    const validation = validateImageBatch(selected.map(item => item.file), currentCount)
    if (!validation.ok) { setMessage(validation.message); return }
    if (await onUpload(selected.map(item => item.file))) clear()
  }

  return <div className="admin-image-uploader">
    <div className="admin-image-uploader__top">
      <div><strong>Adicionar fotos</strong><span>{currentCount} de {PRODUCT_IMAGE_LIMIT} imagens cadastradas</span></div>
      <label className={`admin-action-link ${busy || currentCount >= PRODUCT_IMAGE_LIMIT ? 'is-disabled' : ''}`}>
        <ImagePlus aria-hidden="true" />+ Adicionar fotos
        <input ref={inputRef} className="sr-only" type="file" accept={PRODUCT_IMAGE_ACCEPT} multiple disabled={busy || currentCount >= PRODUCT_IMAGE_LIMIT} onChange={event => replaceSelection(Array.from(event.target.files ?? []))} />
      </label>
    </div>
    {message && <p className="admin-image-message is-error" role="alert">{message}</p>}
    {selected.length > 0 && <div className="admin-upload-preview" aria-label="Fotos selecionadas para envio">
      <div className="admin-upload-preview__grid">{selected.map((item, index) => <article key={`${item.file.name}-${index}`}>
        <img src={item.url} alt={`Prévia de ${item.file.name}`} />
        <div><strong>{item.file.name}</strong><span>{(item.file.size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB</span></div>
        <button type="button" onClick={() => remove(index)} disabled={busy} aria-label={`Remover ${item.file.name} da seleção`}><Trash2 aria-hidden="true" />Remover</button>
      </article>)}</div>
      <div className="admin-upload-preview__actions">
        <button type="button" className="admin-secondary-button" onClick={clear} disabled={busy}><X aria-hidden="true" />Cancelar</button>
        <button type="button" className="admin-primary-button" onClick={() => void send()} disabled={busy}><Upload aria-hidden="true" />{busy ? progress : 'Enviar fotos'}</button>
      </div>
    </div>}
  </div>
}
