import { ArrowRight, PackagePlus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAdminProducts, type AdminProductListItem } from '../../services/adminProducts'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; products: AdminProductListItem[] }
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const statusLabel = { draft: 'Rascunho', active: 'Ativo', archived: 'Inativo' }
const brandLabel: Record<string, string> = { bellmont: 'BELLMONT', 'imperio-fit': 'IMPÉRIO FIT' }

export function AdminProductsPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await listAdminProducts()
    setState(result.ok ? { status: 'ready', products: result.data } : { status: 'error', message: result.userMessage })
  }, [])
  useEffect(() => { void load() }, [load])

  return <>
    <div className="admin-page-heading">
      <div><span>Catálogo administrativo</span><h1>Produtos</h1><p>Dados reais do Supabase. O catálogo público permanece independente nesta fase.</p></div>
      <Link className="admin-action-link" to="/admin/produtos/novo"><PackagePlus aria-hidden="true" />Cadastrar produto</Link>
    </div>
    {state.status === 'loading' && <div className="admin-panel-state" aria-live="polite"><span className="admin-loader" />Consultando produtos…</div>}
    {state.status === 'error' && <div className="admin-panel-state" role="alert"><strong>Não foi possível carregar os produtos.</strong><p>{state.message}</p><button className="admin-secondary-button" onClick={() => void load()}><RefreshCw aria-hidden="true" />Tentar novamente</button></div>}
    {state.status === 'ready' && state.products.length === 0 && <div className="admin-empty-state"><PackagePlus aria-hidden="true" /><span>Banco vazio</span><h2>Nenhum produto cadastrado.</h2><p>Cadastre manualmente um produto de teste para validar o fluxo administrativo.</p><Link className="admin-action-link" to="/admin/produtos/novo">Cadastrar produto<ArrowRight aria-hidden="true" /></Link></div>}
    {state.status === 'ready' && state.products.length > 0 && <div className="admin-products-table" role="region" aria-label="Produtos cadastrados" tabIndex={0}>
      <table><thead><tr><th>Código</th><th>Produto</th><th>Marca</th><th>Categoria</th><th>Preço</th><th>Status</th><th>Variantes</th><th><span className="sr-only">Ações</span></th></tr></thead>
      <tbody>{state.products.map(product => <tr key={product.id}>
        <td data-label="Código">{product.code ?? '—'}</td><td data-label="Produto"><strong>{product.name}</strong><small>/{product.slug}</small></td><td data-label="Marca">{brandLabel[product.brand] ?? product.brand}</td><td data-label="Categoria">{product.category}</td><td data-label="Preço">{product.price === null ? 'Não informado' : money.format(product.price)}</td><td data-label="Status"><span className={`admin-status admin-status--${product.status}`}>{statusLabel[product.status]}</span></td><td data-label="Variantes">{product.variantCount}</td><td><Link to={`/admin/produtos/${product.id}`} aria-label={`Editar ${product.name}`}>Editar<ArrowRight aria-hidden="true" /></Link></td>
      </tr>)}</tbody></table>
    </div>}
  </>
}

