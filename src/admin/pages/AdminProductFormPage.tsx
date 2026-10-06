import { ArrowLeft, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ProductRow, ProductVariantRow } from '../../lib/supabase/database.types'
import { createAdminProduct, getAdminProduct, updateAdminProduct } from '../../services/adminProducts'
import { AdminVariantSection } from '../components/AdminVariantSection'
import { AdminProductImages } from '../components/AdminProductImages'
import { ADMIN_BRANDS, ADMIN_CATEGORIES, ADMIN_PRODUCT_STATUSES, emptyProductForm, formatPriceInput, normalizeProductForm, slugifyProductName, type FieldErrors, type ProductFormValues } from '../domain/adminProductForm'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }
const brandLabels = { bellmont: 'BELLMONT', 'imperio-fit': 'IMPÉRIO FIT' }
const categoryLabels = { streetwear: 'Streetwear', fitness: 'Fitness', perfumes: 'Perfumes' }
const statusLabels = { draft: 'Rascunho', active: 'Ativo', archived: 'Inativo' }

const toForm = (product: ProductRow): ProductFormValues => ({
  code: product.code ?? '', name: product.name, slug: product.slug, description: product.description ?? '',
  brand: product.brand as ProductFormValues['brand'], category: product.category as ProductFormValues['category'],
  subcategory: product.subcategory ?? '', price: formatPriceInput(product.price), status: product.status, featured: product.featured,
})

export function AdminProductFormPage() {
  const { id } = useParams()
  const productId = id ? Number(id) : null
  const navigate = useNavigate()
  const [loadState, setLoadState] = useState<LoadState>(productId ? { status: 'loading' } : { status: 'ready' })
  const [values, setValues] = useState<ProductFormValues>(emptyProductForm())
  const [variants, setVariants] = useState<ProductVariantRow[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const slugTouched = useRef(false)

  const load = useCallback(async () => {
    if (!productId || !Number.isSafeInteger(productId)) return
    const result = await getAdminProduct(productId)
    if (!result.ok) { setLoadState({ status: 'error', message: result.userMessage }); return }
    setValues(toForm(result.data.product)); setVariants(result.data.variants); setLoadState({ status: 'ready' })
  }, [productId])
  useEffect(() => { void load() }, [load])

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    if (key === 'slug') slugTouched.current = true
    setValues(current => {
      const next = { ...current, [key]: value }
      if (key === 'name' && !productId && !slugTouched.current) next.slug = slugifyProductName(String(value))
      return next
    })
  }
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(''); setSuccess('')
    const normalized = normalizeProductForm(values)
    if (!normalized.ok) { setErrors(normalized.errors); return }
    setErrors({}); setSaving(true)
    const result = productId ? await updateAdminProduct(productId, normalized.data) : await createAdminProduct(normalized.data)
    setSaving(false)
    if (!result.ok) {
      setMessage(result.code === '23505' ? 'Código ou slug já cadastrado. Revise os campos e tente novamente.' : result.userMessage)
      return
    }
    if (!productId) { navigate(`/admin/produtos/${result.data.id}`, { replace: true, state: { created: true } }); return }
    setValues(toForm(result.data)); setSuccess('Produto atualizado com sucesso.')
  }

  if (loadState.status === 'loading') return <div className="admin-panel-state" aria-live="polite"><span className="admin-loader" />Carregando produto…</div>
  if (loadState.status === 'error') return <div className="admin-panel-state" role="alert"><strong>Não foi possível abrir o produto.</strong><p>{loadState.message}</p><Link className="admin-action-link" to="/admin/produtos">Voltar aos produtos</Link></div>

  return <>
    <div className="admin-page-heading admin-page-heading--form">
      <div><Link className="admin-back-link" to="/admin/produtos"><ArrowLeft aria-hidden="true" />Produtos</Link><span>{productId ? `Produto #${productId}` : 'Novo cadastro'}</span><h1>{productId ? 'Editar produto' : 'Cadastrar produto'}</h1><p>Salve explicitamente. Nenhum dado é publicado enquanto o status for rascunho.</p></div>
    </div>
    <form className="admin-product-form" onSubmit={save} noValidate>
      <section className="admin-form-section" aria-labelledby="commercial-heading">
        <div className="admin-section-heading"><div><span>Produto</span><h2 id="commercial-heading">Informações comerciais</h2></div><span className={`admin-status admin-status--${values.status}`}>{statusLabels[values.status]}</span></div>
        <div className="admin-form-grid">
          <Field label="Código comercial" hint="Opcional e único"><input value={values.code} onChange={e => set('code', e.target.value)} /></Field>
          <Field label="Nome" required error={errors.name}><input value={values.name} onChange={e => set('name', e.target.value)} aria-invalid={!!errors.name} /></Field>
          <Field label="Slug" required hint="Não será alterado automaticamente após o cadastro." error={errors.slug}><input value={values.slug} onChange={e => set('slug', e.target.value)} aria-invalid={!!errors.slug} /></Field>
          <Field label="Preço" hint="Opcional, em BRL" error={errors.price}><input inputMode="decimal" placeholder="80,00" value={values.price} onChange={e => set('price', e.target.value)} aria-invalid={!!errors.price} /></Field>
          <Field label="Marca" required error={errors.brand}><select value={values.brand} onChange={e => set('brand', e.target.value as ProductFormValues['brand'])}>{ADMIN_BRANDS.map(brand => <option key={brand} value={brand}>{brandLabels[brand]}</option>)}</select></Field>
          <Field label="Categoria" required error={errors.category}><select value={values.category} onChange={e => set('category', e.target.value as ProductFormValues['category'])}>{ADMIN_CATEGORIES.map(category => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></Field>
          <Field label="Subcategoria"><input value={values.subcategory} onChange={e => set('subcategory', e.target.value)} /></Field>
          <Field label="Status" required error={errors.status}><select value={values.status} onChange={e => set('status', e.target.value as ProductFormValues['status'])}>{ADMIN_PRODUCT_STATUSES.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></Field>
          <Field label="Descrição" wide><textarea rows={6} value={values.description} onChange={e => set('description', e.target.value)} /></Field>
          <label className="admin-check admin-field--wide"><input type="checkbox" checked={values.featured} onChange={e => set('featured', e.target.checked)} /><span>Produto em destaque</span></label>
        </div>
        <div className="admin-form-actions"><p className={success ? 'admin-success-message' : 'admin-form-message'} role="status">{success || message}</p><button className="admin-primary-button admin-save-button" disabled={saving}><Save aria-hidden="true" />{saving ? 'Salvando…' : productId ? 'Salvar alterações' : 'Cadastrar produto'}</button></div>
      </section>
    </form>
    {productId && <AdminVariantSection productId={productId} variants={variants} onChanged={load} />}
    {productId && <AdminProductImages productId={productId} productName={values.name} />}
  </>
}

function Field({ label, hint, error, required, wide, children }: { label: string; hint?: string; error?: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={`admin-field ${wide ? 'admin-field--wide' : ''}`}><span>{label}{required ? ' *' : ''}</span>{children}{hint && <small>{hint}</small>}{error && <small className="admin-field-error">{error}</small>}</label>
}
