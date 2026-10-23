import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { ListingPage } from './pages/ListingPage'
import { ProductPage } from './pages/ProductPage'
import { SearchPage, UtilityPage } from './pages/UtilityPage'
import { ImperioFit } from './pages/ImperioFit'
import { CartPage } from './pages/CartPage'
import { COMMERCIAL_MODE, COMMERCIAL_MODES } from './config/commercialMode'
import { ContactPage } from './pages/ContactPage'
import { InstitutionalPage } from './pages/InstitutionalPage'
import { institutionalPages } from './data/institutionalPages'

const DevCartTestPage = import.meta.env.DEV ? lazy(() => import('./pages/DevCartTestPage')) : null
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() { return <Routes><Route path="/admin/*" element={<Suspense fallback={<main className="admin-route-loading" aria-live="polite">Carregando área administrativa…</main>}><AdminApp /></Suspense>} /><Route element={<Layout />}><Route path="/" element={<Home />} /><Route path="/streetwear" element={<ListingPage category="streetwear" />} /><Route path="/imperio-fit" element={<ImperioFit />} /><Route path="/fitness" element={<Navigate to="/imperio-fit" replace />} /><Route path="/perfumes" element={<ListingPage category="perfumes" />} /><Route path="/produtos" element={<ListingPage />} /><Route path="/produto/:slug" element={<ProductPage />} /><Route path="/favoritos" element={<UtilityPage type="favoritos" />} /><Route path="/buscar" element={<SearchPage />} /><Route path="/sacola" element={<CartPage />} /><Route path="/contato" element={<ContactPage />} /><Route path={institutionalPages.privacy.path} element={<InstitutionalPage content={institutionalPages.privacy} />} /><Route path={institutionalPages.terms.path} element={<InstitutionalPage content={institutionalPages.terms} />} /><Route path={institutionalPages.returns.path} element={<InstitutionalPage content={institutionalPages.returns} />} /><Route path={institutionalPages.delivery.path} element={<InstitutionalPage content={institutionalPages.delivery} />} /><Route path={institutionalPages.about.path} element={<InstitutionalPage content={institutionalPages.about} />} />{COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY && <Route path="/checkout/*" element={<Navigate to="/sacola" replace />} />}{DevCartTestPage && <Route path="/dev/cart-test" element={<Suspense fallback={<div className="utility-page"><p>DEV ONLY</p><h1>Carregando teste</h1></div>}><DevCartTestPage /></Suspense>} />}<Route path="*" element={<Navigate to="/" replace />} /></Route></Routes> }
