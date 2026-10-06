import { RefreshCw } from 'lucide-react'
import { useAdminAuth } from '../context/AdminAuthContext'

export function AdminUnavailable() {
  const { state, retry } = useAdminAuth()
  const notConfigured = state.status === 'unavailable' && state.kind === 'not-configured'

  return <main className="admin-state">
    <span className="admin-state__eyebrow">BELLMONT ADMIN</span>
    <h1>{notConfigured ? 'Configuração necessária' : 'Serviço temporariamente indisponível'}</h1>
    <p>{state.status === 'unavailable' ? state.message : 'Não foi possível validar o acesso.'}</p>
    <button className="admin-secondary-button" onClick={() => void retry()}>
      <RefreshCw aria-hidden="true" /> Tentar novamente
    </button>
  </main>
}
