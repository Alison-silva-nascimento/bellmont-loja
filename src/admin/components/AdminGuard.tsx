import { useAdminAuth } from '../context/AdminAuthContext'
import { AdminAccessDenied } from '../pages/AdminAccessDenied'
import { AdminRoutes } from '../AdminRoutes'
import { AdminLoginPage } from '../pages/AdminLoginPage'
import { AdminUnavailable } from '../pages/AdminUnavailable'
import { AdminLoading } from './AdminLoading'

export function AdminGuard() {
  const { state } = useAdminAuth()

  if (state.status === 'checking') return <AdminLoading />
  if (state.status === 'unauthenticated') return <AdminLoginPage />
  if (state.status === 'unauthorized') return <AdminAccessDenied />
  if (state.status === 'unavailable') return <AdminUnavailable />
  return <AdminRoutes />
}
