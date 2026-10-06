import { LogOut, ShieldX } from 'lucide-react'
import { useState } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'

export function AdminAccessDenied() {
  const { state, logout } = useAdminAuth()
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const email = state.status === 'unauthorized' ? state.user.email : ''

  const handleLogout = async () => {
    setSubmitting(true)
    const result = await logout()
    if (!result.ok) setMessage(result.userMessage)
    setSubmitting(false)
  }

  return <main className="admin-state">
    <ShieldX className="admin-state__icon" aria-hidden="true" />
    <span className="admin-state__eyebrow">BELLMONT ADMIN</span>
    <h1>Acesso não autorizado</h1>
    <p>Esta conta não possui permissão administrativa.</p>
    {email && <small>{email}</small>}
    <p className="admin-form-message" role="alert">{message}</p>
    <button className="admin-secondary-button" onClick={handleLogout} disabled={submitting}>
      <LogOut aria-hidden="true" /> {submitting ? 'Saindo…' : 'Sair'}
    </button>
  </main>
}
