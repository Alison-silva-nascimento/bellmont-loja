import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { CatalogProvider } from './context/CatalogContext'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(<StrictMode><HashRouter><CatalogProvider><FavoritesProvider><CartProvider><App /></CartProvider></FavoritesProvider></CatalogProvider></HashRouter></StrictMode>)
