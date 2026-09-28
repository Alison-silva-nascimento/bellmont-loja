import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function FinalCta() {
  return <section className="final-cta"><div className="final-cta__noise" /><span>BELLMONT / 2026</span><h2>NÃO É SÓ O QUE<br />VOCÊ VESTE.</h2><p>É como você chega.</p><Link className="button button--light" to="/produtos">Descobrir BELLMONT <ArrowUpRight /></Link></section>
}
