import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark'

type MobileFooterGroup = {
  title: string
  links: Array<{ label: string; href: string; external?: boolean }>
  notes?: string[]
}

const mobileGroups: MobileFooterGroup[] = [
  {
    title: 'BELLMONT / SHOP',
    links: [
      { label: 'Streetwear', href: '/streetwear' },
      { label: 'Perfumaria', href: '/perfumes' },
      { label: 'Novidades', href: '/produtos' },
    ],
  },
  {
    title: 'IMPÉRIO FIT',
    links: [
      { label: 'Fitness', href: '/imperio-fit' },
      { label: 'Performance', href: '/imperio-fit' },
    ],
  },
  {
    title: 'AJUDA & INFORMAÇÕES',
    links: [
      { label: 'Contato', href: '/contato' },
      { label: 'Instagram BELLMONT', href: 'https://www.instagram.com/bellmontstoree?stkn=MWg5eG5uN3NncW52cw==', external: true },
      { label: 'Instagram IMPÉRIO FIT', href: 'https://www.instagram.com/imperio.fit.carolribeiro?stkn=ODZodzRjM3IzOTFm', external: true },
    ],
    notes: ['WhatsApp — em breve', 'Privacidade — em breve'],
  },
]

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-top"><BrandMark light /><p>Moda, atitude e presença.</p></div>
    <div className="footer-grid footer-grid--desktop">
      <div><h3>BELLMONT / Shop</h3><Link to="/streetwear">Streetwear</Link><Link to="/perfumes">Perfumaria</Link><Link to="/produtos">Novidades</Link></div>
      <div><h3>IMPÉRIO FIT</h3><Link to="/imperio-fit">Fitness</Link><Link to="/imperio-fit">Performance</Link></div>
      <div><h3>Atendimento</h3><Link to="/contato">Contato</Link><span>WhatsApp — em breve</span><span>Trocas — em breve</span></div>
      <div><h3>Conecte-se</h3><a href="https://www.instagram.com/bellmontstoree?stkn=MWg5eG5uN3NncW52cw==" target="_blank" rel="noreferrer">Instagram BELLMONT <ArrowUpRight /></a><a href="https://www.instagram.com/imperio.fit.carolribeiro?stkn=ODZodzRjM3IzOTFm" target="_blank" rel="noreferrer">Instagram IMPÉRIO FIT <ArrowUpRight /></a><Link to="/contato">Fale com a BELLMONT <ArrowUpRight /></Link></div>
      <div><h3>Institucional</h3><span>Privacidade — em breve</span><span>Informações legais — em breve</span></div>
    </div>
    <div className="footer-accordion">
      {mobileGroups.map((group) => <details key={group.title}>
        <summary>{group.title}</summary>
        <div>
          {group.links.map((link) => link.external
            ? <a href={link.href} target="_blank" rel="noreferrer" key={link.label}>{link.label}</a>
            : <Link to={link.href} key={link.label}>{link.label}</Link>)}
          {group.notes?.map((note) => <span key={note}>{note}</span>)}
        </div>
      </details>)}
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} BELLMONT</span><a className="developer-credit" href="https://alison-silva-nascimento.github.io/Portifolio/" target="_blank" rel="noreferrer" aria-label="Portfólio de Alison Silva Nascimento">Desenvolvido por <strong>AS</strong></a><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Voltar ao topo ↑</button></div>
  </footer>
}
