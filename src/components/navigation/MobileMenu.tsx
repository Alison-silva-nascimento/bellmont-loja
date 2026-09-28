import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLockBody } from '../../hooks/useLockBody'

const links = [['STREETWEAR','/streetwear'], ['PERFUMARIA','/perfumes'], ['IMPÉRIO FIT','/imperio-fit'], ['NOVIDADES','/produtos'], ['FAVORITOS','/favoritos'], ['CONTATO','/contato']]

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLockBody(open)
  return <AnimatePresence>{open && (
    <motion.div className="mobile-menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: .45, ease: [.76, 0, .24, 1] }} role="dialog" aria-modal="true" aria-label="Menu principal">
      <div className="mobile-menu__top"><span>MENU</span><button onClick={onClose} aria-label="Fechar menu"><X /></button></div>
      <nav>{links.map(([label, href], index) => <Link key={href} to={href} onClick={onClose}><span>0{index + 1}</span>{label}<ArrowUpRight /></Link>)}</nav>
      <p className="mobile-menu__foot">BELLMONT · MODA &amp; LIFESTYLE</p>
    </motion.div>
  )}</AnimatePresence>
}
