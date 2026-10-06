import { Pencil, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProductVariantRow } from '../../lib/supabase/database.types'
import { createAdminVariant, updateAdminVariant } from '../../services/adminProducts'
import { emptyVariantForm, formatPriceInput, normalizeVariantForm, type FieldErrors, type VariantFormValues } from '../domain/adminProductForm'

interface Props { productId: number; variants: ProductVariantRow[]; onChanged: () => Promise<void> }
const toForm = (variant: ProductVariantRow): VariantFormValues => ({ sku: variant.sku, color: variant.color ?? '', size: variant.size ?? '', volume: variant.volume ?? '', priceOverride: formatPriceInput(variant.price_override), options: Object.keys(variant.options as object).length ? JSON.stringify(variant.options, null, 2) : '', isActive: variant.is_active })

export function AdminVariantSection({ productId, variants, onChanged }: Props) {
  const [editing, setEditing] = useState<ProductVariantRow | null | 'new'>(null)
  const [values, setValues] = useState<VariantFormValues>(emptyVariantForm())
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const start = (variant?: ProductVariantRow) => { setEditing(variant ?? 'new'); setValues(variant ? toForm(variant) : emptyVariantForm()); setErrors({}); setMessage('') }
  const set = <K extends keyof VariantFormValues>(key: K, value: VariantFormValues[K]) => setValues(current => ({ ...current, [key]: value }))
  const save = async () => {
    const normalized = normalizeVariantForm(values)
    if (!normalized.ok) { setErrors(normalized.errors); return }
    setSaving(true); setErrors({}); setMessage('')
    const result = editing === 'new'
      ? await createAdminVariant({ product_id: productId, ...normalized.data })
      : await updateAdminVariant(editing!.id, normalized.data)
    if (!result.ok) { setMessage(result.code === '23505' ? 'Este SKU já está em uso.' : result.userMessage); setSaving(false); return }
    await onChanged(); setEditing(null); setSaving(false)
  }
  return <section className="admin-form-section" aria-labelledby="variants-heading">
    <div className="admin-section-heading"><div><span>Variantes</span><h2 id="variants-heading">Configurações comerciais</h2></div>{editing === null && <button className="admin-secondary-button" onClick={() => start()}><Plus aria-hidden="true" />Adicionar variante</button>}</div>
    {variants.length === 0 && editing === null && <p className="admin-muted-copy">Nenhuma variante cadastrada. Tamanhos, cores e volumes só serão criados quando você os informar.</p>}
    {variants.length > 0 && <div className="admin-variant-list">{variants.map(variant => <article key={variant.id}><div><strong>{variant.sku}</strong><span>{[variant.size, variant.color, variant.volume].filter(Boolean).join(' · ') || 'Sem atributos opcionais'}</span></div><span className={`admin-status ${variant.is_active ? 'admin-status--active' : 'admin-status--archived'}`}>{variant.is_active ? 'Ativa' : 'Inativa'}</span><button aria-label={`Editar variante ${variant.sku}`} onClick={() => start(variant)}><Pencil aria-hidden="true" />Editar</button></article>)}</div>}
    {editing !== null && <div className="admin-variant-editor">
      <div className="admin-section-heading"><h3>{editing === 'new' ? 'Nova variante' : `Editar ${editing.sku}`}</h3><button className="admin-icon-button" onClick={() => setEditing(null)} aria-label="Fechar edição da variante"><X aria-hidden="true" /></button></div>
      <div className="admin-form-grid">
        <Field label="SKU" required error={errors.sku}><input value={values.sku} onChange={e => set('sku', e.target.value)} aria-invalid={!!errors.sku} /></Field>
        <Field label="Preço específico" hint="Opcional, em BRL" error={errors.priceOverride}><input inputMode="decimal" value={values.priceOverride} onChange={e => set('priceOverride', e.target.value)} /></Field>
        <Field label="Cor"><input value={values.color} onChange={e => set('color', e.target.value)} /></Field>
        <Field label="Tamanho"><input value={values.size} onChange={e => set('size', e.target.value)} /></Field>
        <Field label="Volume"><input value={values.volume} onChange={e => set('volume', e.target.value)} /></Field>
        <label className="admin-check"><input type="checkbox" checked={values.isActive} onChange={e => set('isActive', e.target.checked)} /><span>Variante ativa</span></label>
        <Field label="Opções adicionais" hint='Objeto JSON opcional, ex.: {"tecido":"algodão"}' error={errors.options} wide><textarea rows={4} value={values.options} onChange={e => set('options', e.target.value)} /></Field>
      </div>
      <p className="admin-form-message" role="alert">{message}</p><button className="admin-primary-button admin-save-button" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando…' : 'Salvar variante'}</button>
    </div>}
    <aside className="admin-coming-soon"><strong>Estoque</strong><span>As quantidades são gerenciadas separadamente, sempre por movimentações auditáveis.</span><Link to="/admin/estoque">Ir para estoque</Link></aside>
  </section>
}

function Field({ label, hint, error, required, wide, children }: { label: string; hint?: string; error?: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={`admin-field ${wide ? 'admin-field--wide' : ''}`}><span>{label}{required ? ' *' : ''}</span>{children}{hint && <small>{hint}</small>}{error && <small className="admin-field-error">{error}</small>}</label>
}
