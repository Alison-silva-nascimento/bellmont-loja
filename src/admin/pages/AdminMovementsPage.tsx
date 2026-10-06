import { Activity, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAdminInventoryMovements, type AdminInventoryMovementItem } from '../../services/adminInventoryMovements'
import { formatSignedDelta, formatVariantAttributes } from '../domain/adminInventory'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: AdminInventoryMovementItem[] }
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const movementLabel: Record<string, string> = { initial: 'Inicial', adjustment: 'Ajuste' }

export function AdminMovementsPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await listAdminInventoryMovements()
    setState(result.ok ? { status: 'ready', items: result.data } : { status: 'error', message: result.userMessage })
  }, [])
  useEffect(() => { void load() }, [load])
  const visible = useMemo(() => {
    if (state.status !== 'ready') return []
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return state.items.filter(item => (type === 'all' || item.movement.movement_type === type) && (!term || [item.product.name, item.product.code, item.variant.sku].some(value => value?.toLocaleLowerCase('pt-BR').includes(term))))
  }, [query, state, type])
  return <>
    <div className="admin-page-heading"><div><span>Auditoria operacional</span><h1>Movimentações</h1><p>Histórico imutável das alterações de estoque processadas pelo backend.</p></div></div>
    {state.status === 'ready' && state.items.length > 0 && <div className="admin-list-tools"><label><Search aria-hidden="true" /><span className="sr-only">Buscar movimentação</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Produto, código ou SKU" /></label><label><span className="sr-only">Filtrar por tipo</span><select value={type} onChange={event => setType(event.target.value)}><option value="all">Todos os tipos</option><option value="initial">Inicial</option><option value="adjustment">Ajuste</option></select></label></div>}
    {state.status === 'loading' && <div className="admin-panel-state" aria-live="polite"><span className="admin-loader" />Consultando movimentações…</div>}
    {state.status === 'error' && <div className="admin-panel-state" role="alert"><strong>Não foi possível carregar as movimentações.</strong><p>{state.message}</p><button className="admin-secondary-button" onClick={() => void load()}><RefreshCw aria-hidden="true" />Tentar novamente</button></div>}
    {state.status === 'ready' && state.items.length === 0 && <div className="admin-empty-state"><Activity aria-hidden="true" /><span>Histórico vazio</span><h2>Nenhuma movimentação registrada.</h2><p>As movimentações aparecerão aqui após serem processadas.</p></div>}
    {state.status === 'ready' && state.items.length > 0 && visible.length === 0 && <div className="admin-empty-state"><Search aria-hidden="true" /><span>Sem resultados</span><h2>Nenhuma movimentação encontrada.</h2><p>Revise a busca ou o filtro selecionado.</p></div>}
    {state.status === 'ready' && visible.length > 0 && <div className="admin-products-table admin-movements-table" role="region" aria-label="Histórico de movimentações" tabIndex={0}><table><thead><tr><th>Data/hora</th><th>Produto</th><th>Código</th><th>SKU</th><th>Variante</th><th>Tipo</th><th>Delta</th><th>Saldo</th><th>Motivo</th></tr></thead><tbody>{visible.map(item => <tr key={item.movement.id}><td data-label="Data/hora">{dateTime.format(new Date(item.movement.created_at))}</td><td data-label="Produto"><strong>{item.product.name}</strong></td><td data-label="Código">{item.product.code ?? '—'}</td><td data-label="SKU">{item.variant.sku}</td><td data-label="Variante">{formatVariantAttributes(item.variant.color, item.variant.size, item.variant.volume)}</td><td data-label="Tipo">{movementLabel[item.movement.movement_type] ?? item.movement.movement_type}</td><td data-label="Delta"><strong className={item.movement.quantity_delta > 0 ? 'admin-delta-positive' : 'admin-delta-negative'}>{formatSignedDelta(item.movement.quantity_delta)}</strong></td><td data-label="Saldo">{item.movement.quantity_after}</td><td data-label="Motivo">{item.movement.note ?? '—'}</td></tr>)}</tbody></table></div>}
  </>
}
