import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { CatalogProvider } from './context/CatalogContext'
import { legacyHashToPath } from './seo/seo'
import './styles/global.css'

const legacyHashRoute = legacyHashToPath(window.location.hash, import.meta.env.BASE_URL)
if (legacyHashRoute) {
  window.history.replaceState(null, '', legacyHashRoute)
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter basename={import.meta.env.BASE_URL}><CatalogProvider><FavoritesProvider><CartProvider><App /></CartProvider></FavoritesProvider></CatalogProvider></BrowserRouter></StrictMode>)
