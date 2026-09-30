import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLockBody } from '../../hooks/useLockBody'

const links = [['STREETWEAR','/streetwear'], ['PERFUMARIA','/perfumes'], ['IMPÉRIO FIT','/imperio-fit'], ['NOVIDADES','/produtos'], ['FAVORITOS','/favoritos'], ['CONTATO','/contato']]

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useLockBody(open)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    const menu = closeRef.current?.closest<HTMLElement>('[role="dialog"]')
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab' || !menu) return
      const focusable = Array.from(menu.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
  return <AnimatePresence onExitComplete={() => previousFocusRef.current?.focus()}>{open && (
    <motion.div className="mobile-menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: .45, ease: [.76, 0, .24, 1] }} role="dialog" aria-modal="true" aria-label="Menu principal">
      <div className="mobile-menu__top"><span>MENU</span><button ref={closeRef} onClick={onClose} aria-label="Fechar menu"><X /></button></div>
      <nav>{links.map(([label, href], index) => <Link key={href} to={href} onClick={onClose}><span>0{index + 1}</span>{label}<ArrowUpRight /></Link>)}</nav>
      <p className="mobile-menu__foot">BELLMONT · MODA &amp; LIFESTYLE</p>
    </motion.div>
  )}</AnimatePresence>
}
