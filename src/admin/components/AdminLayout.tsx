import { Activity, LayoutDashboard, LogOut, Package, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

const navigation = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/admin/produtos', label: 'Produtos', icon: Package },
  { to: '/admin/estoque', label: 'Estoque', icon: Warehouse },
  { to: '/admin/movimentacoes', label: 'Movimentações', icon: Activity },
]

export function AdminLayout() {
  const { state, logout } = useAdminAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [message, setMessage] = useState('')
  const email = state.status === 'authorized' ? state.user.email : ''
  const handleLogout = async () => {
    setLoggingOut(true); setMessage('')
    const result = await logout()
    if (!result.ok) setMessage(result.userMessage)
    setLoggingOut(false)
  }
  return <div className="admin-dashboard">
    <header className="admin-header">
      <strong>BELLMONT <span>ADMIN</span></strong>
      <div><span className="admin-user-email">{email}</span><button onClick={handleLogout} disabled={loggingOut} aria-label="Sair do painel administrativo"><LogOut aria-hidden="true" /> {loggingOut ? 'Saindo…' : 'Sair'}</button></div>
    </header>
    <div className="admin-dashboard__body">
      <aside className="admin-sidebar">
        <nav aria-label="Navegação administrativa">
          {navigation.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'is-active' : ''}><item.icon aria-hidden="true" /><span>{item.label}</span></NavLink>)}
        </nav>
        <p>Produtos e estoque<br />Fase 04.2B.2</p>
      </aside>
      <main className="admin-content" id="admin-content">
        {message && <p className="admin-form-message" role="alert">{message}</p>}
        <Outlet />
      </main>
    </div>
  </div>
}
