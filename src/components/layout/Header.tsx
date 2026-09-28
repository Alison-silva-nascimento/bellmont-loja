import { Heart, Menu, Search, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark'
import { MobileMenu } from '../navigation/MobileMenu'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isImperioFit = location.pathname === '/imperio-fit'
  const darkHeroRoutes = ['/', '/streetwear', '/imperio-fit', '/perfumes', '/produtos']
  const overlay = darkHeroRoutes.includes(location.pathname)
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 30); onScroll(); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll) }, [])
  return <>
    <header className={`site-header ${overlay && !scrolled ? 'site-header--overlay' : ''} ${scrolled ? 'site-header--solid' : ''}`}>
      <div className="header-desktop">
        <nav className="header-nav header-nav--left" aria-label="Categorias">
          <Link to="/streetwear">Streetwear</Link><Link to="/perfumes">Perfumaria</Link><Link className="header-brand-link" to="/imperio-fit">Império Fit</Link>
        </nav>
        <BrandMark brand={isImperioFit ? 'imperio-fit' : 'bellmont'} light={overlay && !scrolled} />
        <nav className="header-nav header-nav--right" aria-label="Ações">
          <Link to="/buscar"><Search />Buscar</Link><Link to="/favoritos" aria-label="Favoritos"><Heart /></Link><Link to="/sacola"><ShoppingBag />Sacola</Link>
        </nav>
      </div>
      <div className="header-mobile">
        <button onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu /></button><BrandMark brand={isImperioFit ? 'imperio-fit' : 'bellmont'} light={overlay && !scrolled} /><div><Link to="/buscar" aria-label="Buscar"><Search /></Link><Link to="/sacola" aria-label="Sacola"><ShoppingBag /></Link></div>
      </div>
    </header>
    <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
  </>
}
