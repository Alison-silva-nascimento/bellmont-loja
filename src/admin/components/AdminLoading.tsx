export function AdminLoading() {
  return <main className="admin-state admin-state--loading" aria-live="polite" aria-busy="true">
    <span className="admin-state__eyebrow">BELLMONT ADMIN</span>
    <div className="admin-loader" aria-hidden="true" />
    <h1>Verificando acesso</h1>
    <p>Aguarde enquanto validamos sua sessão administrativa.</p>
  </main>
}
