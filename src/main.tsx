import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(<StrictMode><HashRouter><FavoritesProvider><CartProvider><App /></CartProvider></FavoritesProvider></HashRouter></StrictMode>)
