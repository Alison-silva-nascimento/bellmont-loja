import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDownRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { asset } from '../utils/asset'

export function Hero() {
  const reduced = useReducedMotion()
  return <section className="hero">
    <motion.div className="hero__visual" initial={reduced ? false : { scale: 1.04 }} animate={{ scale: 1 }} transition={{ duration: 1.8, ease: 'easeOut' }}><img src={asset('hero-streetwear-clean.png')} alt="Dois modelos vestindo camisetas oversized pretas em editorial urbano" fetchPriority="high" /><div className="hero__grain" /></motion.div>
    <div className="hero__meta"><span>MODA &amp; LIFESTYLE</span><span>BRASIL · 2026</span></div>
    <div className="hero__content"><motion.p initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35 }}>BELLMONT / ESSENTIALS</motion.p><motion.h1 initial={reduced ? false : { opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .45, duration: .9 }}>VISTA A SUA<br /><em>PRESENÇA.</em></motion.h1><motion.div className="hero__actions" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .8 }}><Link className="button button--light" to="/produtos">Explorar coleção</Link><Link className="text-link text-link--light" to="/streetwear">Conhecer a marca <ArrowDownRight /></Link></motion.div></div>
    <span className="hero__vertical">ATITUDE · PERFORMANCE · SOFISTICAÇÃO</span>
  </section>
}
