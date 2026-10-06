import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AdminInventoryItem } from '../../services/adminInventory'
import { applyAdminInventoryMovement } from '../../services/adminInventory'
import { formatVariantAttributes, inventoryDelta, type InventoryOperation } from '../domain/adminInventory'

interface Props {
  item: AdminInventoryItem
  onClose: () => void
  onSuccess: (item: AdminInventoryItem) => void
}

export function AdminInventoryMovementDialog({ item, onClose, onSuccess }: Props) {
  const isInitialization = item.inventory === null
  const [operation, setOperation] = useState<InventoryOperation>('entry')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const quantityRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    quantityRef.current?.focus()
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]')]
      const first = focusable[0]; const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKeyboard)
    return () => { document.removeEventListener('keydown', handleKeyboard); previouslyFocused?.focus() }
  }, [onClose, submitting])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const delta = inventoryDelta(operation, quantity)
    if (delta === null) { setMessage('Informe uma quantidade válida.'); return }
    setSubmitting(true); setMessage('')
    const result = await applyAdminInventoryMovement(item.variant.id, delta, note.trim() || null)
    if (!result.ok) { setMessage(result.userMessage); setSubmitting(false); return }
    onSuccess({ ...item, inventory: { variant_id: result.data.variantId, quantity_on_hand: result.data.quantityOnHand, quantity_reserved: result.data.quantityReserved, updated_at: new Date().toISOString(), updated_by: null } })
  }

  return <div className="admin-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) onClose() }}>
    <section ref={dialogRef} className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title" aria-describedby="inventory-dialog-description">
      <header><div><span>{isInitialization ? 'Inicialização' : 'Movimentação'}</span><h2 id="inventory-dialog-title">{item.product.name}</h2></div><button className="admin-icon-button" type="button" onClick={onClose} disabled={submitting} aria-label="Fechar movimentação"><X aria-hidden="true" /></button></header>
      <p id="inventory-dialog-description">SKU <strong>{item.variant.sku}</strong> · {formatVariantAttributes(item.variant.color, item.variant.size, item.variant.volume)}</p>
      <dl className="admin-dialog-balances"><div><dt>Físico</dt><dd>{item.inventory?.quantity_on_hand ?? 'Não iniciado'}</dd></div><div><dt>Reservado</dt><dd>{item.inventory?.quantity_reserved ?? '—'}</dd></div><div><dt>Disponível</dt><dd>{item.inventory ? item.inventory.quantity_on_hand - item.inventory.quantity_reserved : '—'}</dd></div></dl>
      <form onSubmit={event => void submit(event)}>
        <fieldset className="admin-operation-choice"><legend>Tipo da operação</legend><label><input type="radio" name="operation" value="entry" checked={operation === 'entry'} onChange={() => setOperation('entry')} /><ArrowUp aria-hidden="true" />Entrada</label><label className={isInitialization ? 'is-disabled' : ''}><input type="radio" name="operation" value="exit" checked={operation === 'exit'} onChange={() => setOperation('exit')} disabled={isInitialization} /><ArrowDown aria-hidden="true" />Saída</label></fieldset>
        {isInitialization && <p className="admin-dialog-hint">A primeira movimentação deve ser uma entrada positiva.</p>}
        <label className="admin-field"><span>Quantidade</span><input ref={quantityRef} inputMode="numeric" pattern="[0-9]+" value={quantity} onChange={event => setQuantity(event.target.value)} aria-invalid={!!message} /></label>
        <label className="admin-field"><span>Motivo / observação</span><textarea rows={3} value={note} onChange={event => setNote(event.target.value)} maxLength={500} /></label>
        <p className="admin-form-message" role="alert" aria-live="assertive">{message}</p>
        <div className="admin-dialog-actions"><button type="button" className="admin-secondary-button" onClick={onClose} disabled={submitting}>Cancelar</button><button className="admin-primary-button" disabled={submitting}>{submitting ? 'Processando…' : 'Confirmar movimentação'}</button></div>
      </form>
    </section>
  </div>
}
