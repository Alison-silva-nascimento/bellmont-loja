import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useAdminAuth } from '../context/AdminAuthContext'

export function AdminLoginPage() {
  const { login } = useAdminAuth()
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    const form = new FormData(event.currentTarget)
    const result = await login(String(form.get('email') ?? '').trim(), String(form.get('password') ?? ''))
    if (!result.ok) setMessage(result.userMessage)
    setSubmitting(false)
  }

  return <main className="admin-auth-shell">
    <section className="admin-auth-panel" aria-labelledby="admin-login-title">
      <div className="admin-auth-panel__brand">BELLMONT</div>
      <div className="admin-auth-panel__intro">
        <span><LockKeyhole aria-hidden="true" /> Acesso restrito</span>
        <h1 id="admin-login-title">Painel<br />administrativo</h1>
        <p>Entre com a conta autorizada para administrar a operação BELLMONT.</p>
      </div>
      <form className="admin-login-form" onSubmit={handleSubmit}>
        <div className="admin-field">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" name="email" type="email" autoComplete="email" inputMode="email" required disabled={submitting} />
        </div>
        <div className="admin-field">
          <label htmlFor="admin-password">Senha</label>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" required disabled={submitting} />
        </div>
        <p className="admin-form-message" role="alert" aria-live="assertive">{message}</p>
        <button className="admin-primary-button" type="submit" disabled={submitting}>
          <span>{submitting ? 'Entrando…' : 'Entrar'}</span><ArrowRight aria-hidden="true" />
        </button>
      </form>
      <small>Área exclusiva para administração autorizada.</small>
    </section>
    <aside className="admin-auth-art" aria-hidden="true"><span>OPERAÇÃO</span><strong>01</strong></aside>
  </main>
}
