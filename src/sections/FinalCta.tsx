import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function FinalCta() {
  return <section className="final-cta"><div className="final-cta__noise" /><span>BELLMONT / STREETWEAR</span><h2>ESCOLHA A PEÇA.<br />VISTA A ATITUDE.</h2><p>O próximo drop começa por você.</p><Link className="button button--light" to="/streetwear">Ver Streetwear <ArrowUpRight /></Link></section>
}
