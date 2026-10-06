import { Boxes, Package, Warehouse } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminOverview, type AdminOverviewCounts } from '../../services/adminOverview'

type OverviewState =
  | { status: 'loading' }
  | { status: 'ready'; counts: AdminOverviewCounts }
  | { status: 'error' }

const countLabel = (count: number, singular: string, plural: string) => count === 0 ? `Nenhum ${singular} cadastrado` : `${count} ${count === 1 ? singular : plural}`

export function AdminDashboard() {
  const [overview, setOverview] = useState<OverviewState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    void fetchAdminOverview().then(result => {
      if (!active) return
      setOverview(result.ok ? { status: 'ready', counts: result.data } : { status: 'error' })
    })
    return () => { active = false }
  }, [])

  return <>
        <div className="admin-content__heading">
          <div><span>Visão geral</span><h1>Operação<br />BELLMONT</h1></div>
          <p>Acompanhe os dados reais da operação e acesse a gestão de produtos e variantes.</p>
        </div>
        <section className="admin-overview-grid" aria-label="Resumo da operação" aria-busy={overview.status === 'loading'}>
          <article><Package aria-hidden="true" /><span>Produtos</span><strong>{overview.status === 'loading' ? 'Consultando…' : overview.status === 'ready' ? countLabel(overview.counts.products, 'produto', 'produtos') : 'Não foi possível consultar'}</strong></article>
          <article><Boxes aria-hidden="true" /><span>Variantes</span><strong>{overview.status === 'loading' ? 'Consultando…' : overview.status === 'ready' ? countLabel(overview.counts.variants, 'variante', 'variantes') : 'Não foi possível consultar'}</strong></article>
          <article><Warehouse aria-hidden="true" /><span>Estoque</span><strong>{overview.status === 'loading' ? 'Consultando…' : overview.status === 'ready' ? overview.counts.inventory === 0 ? 'Aguardando cadastro' : `${overview.counts.inventory} ${overview.counts.inventory === 1 ? 'posição' : 'posições'}` : 'Não foi possível consultar'}</strong></article>
        </section>
        <section className="admin-next-step">
          <span>Gestão disponível</span><h2>Produtos e variantes</h2><p>Cadastre e mantenha produtos de teste antes da migração do catálogo comercial.</p><Link to="/admin/produtos" className="admin-inline-link">Gerenciar produtos</Link>
        </section>
  </>
}
