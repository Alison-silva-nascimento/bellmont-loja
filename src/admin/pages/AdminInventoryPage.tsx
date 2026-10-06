import { RefreshCw, Search, Warehouse } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAdminInventory, type AdminInventoryItem } from '../../services/adminInventory'
import { AdminInventoryMovementDialog } from '../components/AdminInventoryMovementDialog'
import { formatVariantAttributes } from '../domain/adminInventory'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: AdminInventoryItem[] }
type Filter = 'all' | 'available' | 'empty' | 'uninitialized'

export function AdminInventoryPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [selected, setSelected] = useState<AdminInventoryItem | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [success, setSuccess] = useState('')
  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await listAdminInventory()
    setState(result.ok ? { status: 'ready', items: result.data } : { status: 'error', message: result.userMessage })
  }, [])
  useEffect(() => { void load() }, [load])
  const visible = useMemo(() => {
    if (state.status !== 'ready') return []
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return state.items.filter(item => {
      const available = item.inventory ? item.inventory.quantity_on_hand - item.inventory.quantity_reserved : null
      const matchesFilter = filter === 'all' || (filter === 'uninitialized' && !item.inventory) || (filter === 'available' && available !== null && available > 0) || (filter === 'empty' && available === 0)
      return matchesFilter && (!term || [item.product.name, item.product.code, item.variant.sku].some(value => value?.toLocaleLowerCase('pt-BR').includes(term)))
    })
  }, [filter, query, state])
  const updateItem = (updated: AdminInventoryItem) => {
    setState(current => current.status === 'ready' ? { ...current, items: current.items.map(item => item.variant.id === updated.variant.id ? updated : item) } : current)
    setSelected(null); setSuccess('Estoque atualizado com sucesso.')
  }

  return <>
    <div className="admin-page-heading"><div><span>Operação administrativa</span><h1>Estoque</h1><p>Posições reais por variante. Toda alteração é processada atomicamente pela RPC protegida.</p></div></div>
    {success && <p className="admin-success-banner" role="status">{success}</p>}
    {state.status === 'ready' && state.items.length > 0 && <div className="admin-list-tools"><label><Search aria-hidden="true" /><span className="sr-only">Buscar estoque</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Produto, código ou SKU" /></label><label><span className="sr-only">Filtrar estoque</span><select value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">Todas as posições</option><option value="available">Com disponibilidade</option><option value="empty">Sem disponibilidade</option><option value="uninitialized">Não iniciadas</option></select></label></div>}
    {state.status === 'loading' && <div className="admin-panel-state" aria-live="polite"><span className="admin-loader" />Consultando estoque…</div>}
    {state.status === 'error' && <div className="admin-panel-state" role="alert"><strong>Não foi possível carregar o estoque.</strong><p>{state.message}</p><button className="admin-secondary-button" onClick={() => void load()}><RefreshCw aria-hidden="true" />Tentar novamente</button></div>}
    {state.status === 'ready' && state.items.length === 0 && <div className="admin-empty-state"><Warehouse aria-hidden="true" /><span>Sem variantes</span><h2>Nenhuma posição de estoque.</h2><p>Cadastre variantes antes de iniciar o controle de estoque.</p></div>}
    {state.status === 'ready' && state.items.length > 0 && visible.length === 0 && <div className="admin-empty-state"><Search aria-hidden="true" /><span>Sem resultados</span><h2>Nenhuma variante encontrada.</h2><p>Revise a busca ou o filtro selecionado.</p></div>}
    {state.status === 'ready' && visible.length > 0 && <div className="admin-products-table admin-inventory-table" role="region" aria-label="Posições de estoque" tabIndex={0}><table><thead><tr><th>Produto</th><th>Código</th><th>SKU</th><th>Variante</th><th>Físico</th><th>Reservado</th><th>Disponível</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr></thead><tbody>{visible.map(item => {
      const available = item.inventory ? item.inventory.quantity_on_hand - item.inventory.quantity_reserved : null
      return <tr key={item.variant.id}><td data-label="Produto"><strong>{item.product.name}</strong></td><td data-label="Código">{item.product.code ?? '—'}</td><td data-label="SKU">{item.variant.sku}</td><td data-label="Variante">{formatVariantAttributes(item.variant.color, item.variant.size, item.variant.volume)}</td><td data-label="Físico">{item.inventory ? item.inventory.quantity_on_hand : <span className="admin-inventory-uninitialized">Estoque ainda não iniciado</span>}</td><td data-label="Reservado">{item.inventory?.quantity_reserved ?? '—'}</td><td data-label="Disponível">{available ?? '—'}</td><td data-label="Status"><span className={`admin-status ${item.variant.is_active ? 'admin-status--active' : 'admin-status--archived'}`}>{item.variant.is_active ? 'Ativa' : 'Inativa'}</span></td><td><button className="admin-table-action" onClick={() => { setSuccess(''); setSelected(item) }}>{item.inventory ? 'Movimentar estoque' : 'Iniciar estoque'}</button></td></tr>
    })}</tbody></table></div>}
    {selected && <AdminInventoryMovementDialog item={selected} onClose={() => setSelected(null)} onSuccess={updateItem} />}
  </>
}
