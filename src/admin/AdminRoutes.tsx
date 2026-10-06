import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminProductFormPage } from './pages/AdminProductFormPage'
import { AdminProductsPage } from './pages/AdminProductsPage'
import { AdminInventoryPage } from './pages/AdminInventoryPage'
import { AdminMovementsPage } from './pages/AdminMovementsPage'

export function AdminRoutes() {
  return <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="produtos" element={<AdminProductsPage />} />
      <Route path="produtos/novo" element={<AdminProductFormPage />} />
      <Route path="produtos/:id" element={<AdminProductFormPage />} />
      <Route path="estoque" element={<AdminInventoryPage />} />
      <Route path="movimentacoes" element={<AdminMovementsPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Route>
  </Routes>
}
