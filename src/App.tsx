import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { ListingPage, ProductPage } from './pages/ListingPage'
import { SearchPage, UtilityPage } from './pages/UtilityPage'
import { ImperioFit } from './pages/ImperioFit'

export default function App() { return <Routes><Route element={<Layout />}><Route path="/" element={<Home />} /><Route path="/streetwear" element={<ListingPage category="streetwear" />} /><Route path="/imperio-fit" element={<ImperioFit />} /><Route path="/fitness" element={<Navigate to="/imperio-fit" replace />} /><Route path="/perfumes" element={<ListingPage category="perfumes" />} /><Route path="/produtos" element={<ListingPage />} /><Route path="/produto/:slug" element={<ProductPage />} /><Route path="/favoritos" element={<UtilityPage type="favoritos" />} /><Route path="/buscar" element={<SearchPage />} /><Route path="/sacola" element={<UtilityPage type="sacola" />} /><Route path="/contato" element={<UtilityPage type="contato" />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes> }
