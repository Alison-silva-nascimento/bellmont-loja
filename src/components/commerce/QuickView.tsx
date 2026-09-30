import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { brandLabels, categoryLabels } from '../../data/products'
import { useLockBody } from '../../hooks/useLockBody'
import type { Product } from '../../types/product'
import { ImageStage } from '../ui/ImageStage'
import { isProductReadyForCart } from '../../utils/cart'

export function QuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  useLockBody(Boolean(product))
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!product) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    const dialog = closeRef.current?.closest<HTMLElement>('[role="dialog"]')
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [product, onClose])
  return <AnimatePresence onExitComplete={() => previousFocusRef.current?.focus()}>{product && <motion.div className="quick-view__backdrop" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.section className="quick-view" role="dialog" aria-modal="true" aria-labelledby="quick-title" onMouseDown={e => e.stopPropagation()} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .45, ease: [.76, 0, .24, 1] }}>
      <button ref={closeRef} className="quick-view__close" onClick={onClose} aria-label="Fechar visualização"><X /></button>
      <ImageStage src={product.images[0]} alt={product.name} tone="stone" />
      <div className="quick-view__content"><p className="eyebrow">{brandLabels[product.brand]} / {categoryLabels[product.category]}</p><h2 id="quick-title">{product.name}</h2>{product.description && <p>{product.description}</p>}
        {product.price != null ? <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</strong> : <span className="quick-view__price-note">Consultar valor</span>}
        {product.colors?.length ? <div><span>Cores</span><div className="options">{product.colors.map(color => <button key={color}>{color}</button>)}</div></div> : null}
        {product.sizes?.length ? <div><span>Tamanhos</span><div className="options">{product.sizes.map(size => <button key={size}>{size}</button>)}</div></div> : null}
        <Link className="button button--dark" to={isProductReadyForCart(product) ? `/produto/${product.slug}` : '/contato'} onClick={onClose}>{isProductReadyForCart(product) ? 'Ver produto' : product.price == null ? 'Consultar valor' : 'Consultar disponibilidade'}</Link>
      </div>
    </motion.section>
  </motion.div>}</AnimatePresence>
}
