import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDownRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { asset } from '../utils/asset'

export function Hero() {
  const reduced = useReducedMotion()
  return <section className="hero">
    <motion.div className="hero__visual" initial={reduced ? false : { scale: 1.04 }} animate={{ scale: 1 }} transition={{ duration: 1.8, ease: 'easeOut' }}><img src={asset('hero-streetwear-clean.png')} alt="Dois modelos vestindo camisetas oversized pretas em editorial urbano" fetchPriority="high" /><div className="hero__grain" /></motion.div>
    <div className="hero__meta"><span>BELLMONT / STREETWEAR</span><span>DROP 01 · 2026</span></div>
    <div className="hero__content"><motion.p initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }}>NEW DROP / OVERSIZED</motion.p><motion.h1 initial={reduced ? false : { opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .26, duration: .72 }}>VISTA A SUA<br /><em>PRESENÇA.</em></motion.h1><motion.span className="hero__subtitle" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .42 }}>Streetwear premium. Volume, atitude e identidade.</motion.span><motion.div className="hero__actions" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .5 }}><Link className="button button--light" to="/streetwear">Explorar drop</Link><Link className="text-link text-link--light" to="/produtos">Ver todas as peças <ArrowDownRight /></Link></motion.div></div>
    <span className="hero__vertical">OVERSIZED · STREET CULTURE · ATTITUDE</span>
  </section>
}
