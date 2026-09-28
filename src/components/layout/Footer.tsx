import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../ui/BrandMark'

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-top"><BrandMark light /><p>Moda, atitude e presença.</p></div>
    <div className="footer-grid">
      <div><h3>BELLMONT / Shop</h3><Link to="/streetwear">Streetwear</Link><Link to="/perfumes">Perfumaria</Link><Link to="/produtos">Novidades</Link></div>
      <div><h3>IMPÉRIO FIT</h3><Link to="/imperio-fit">Fitness</Link><Link to="/imperio-fit">Performance</Link></div>
      <div><h3>Atendimento</h3><Link to="/contato">Contato</Link><span>WhatsApp — em breve</span><span>Trocas — em breve</span></div>
      <div><h3>Conecte-se</h3><span>Instagram — em breve</span><Link to="/contato">Fale com a BELLMONT <ArrowUpRight /></Link></div>
      <div><h3>Institucional</h3><span>Privacidade — em breve</span><span>Informações legais — em breve</span></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} BELLMONT</span><a className="developer-credit" href="https://alison-silva-nascimento.github.io/Portifolio/" target="_blank" rel="noreferrer" aria-label="Portfólio de Alison Silva Nascimento">Desenvolvido por <strong>AS</strong></a><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Voltar ao topo ↑</button></div>
  </footer>
}
