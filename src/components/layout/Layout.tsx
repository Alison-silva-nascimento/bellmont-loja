import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartFeedback } from '../commerce/CartFeedback'

export function Layout() {
  const location = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  return <><a className="skip-link" href="#conteudo">Ir para o conteúdo</a><Header /><main id="conteudo"><Outlet /></main><Footer /><CartFeedback /></>
}
