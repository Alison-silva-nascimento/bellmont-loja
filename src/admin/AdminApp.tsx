import { AdminGuard } from './components/AdminGuard'
import { AdminAuthProvider } from './context/AdminAuthContext'
import './admin.css'

export default function AdminApp() {
  return <AdminAuthProvider><AdminGuard /></AdminAuthProvider>
}
