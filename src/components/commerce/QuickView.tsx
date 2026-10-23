import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { brandLabels, categoryLabels } from '../../data/catalog'
import { useLockBody } from '../../hooks/useLockBody'
import type { Product } from '../../types/product'
import { ImageStage } from '../ui/ImageStage'
import { isBellmontPerfumeEligibleForWhatsAppCart, isProductReadyForCart } from '../../utils/cart'
import { COMMERCIAL_MODE, COMMERCIAL_MODES } from '../../config/commercialMode'
import { PRODUCT_SALES_MODES } from '../../types/product'

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
        {[...new Set(product.variants?.map(variant => variant.volume).filter((volume): volume is string => Boolean(volume)) ?? [])].length > 0 && <div><span>Volumes</span><div className="options">{[...new Set(product.variants?.map(variant => variant.volume).filter((volume): volume is string => Boolean(volume)) ?? [])].map(volume => <span key={volume}>{volume}</span>)}</div></div>}
        {!isProductReadyForCart(product) && <p className="product-availability-note">{COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY && isBellmontPerfumeEligibleForWhatsAppCart(product) ? 'Pode ser adicionado à sacola BELLMONT; disponibilidade e condições serão confirmadas pelo WhatsApp.' : product.salesMode === PRODUCT_SALES_MODES.INQUIRY_ONLY ? 'Produto disponível somente para consulta pelo WhatsApp.' : COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY ? 'Consulte as opções e solicite atendimento pelo WhatsApp na página do produto. A disponibilidade será confirmada pela loja.' : product.availability === 'unavailable' ? 'Produto sem disponibilidade no momento.' : 'Disponibilidade ainda não confirmada. Este produto poderá ser adicionado à sacola quando o estoque for atualizado.'}</p>}
        <Link className="button button--dark" to={`/produto/${product.slug}`} onClick={onClose}>{COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY && isBellmontPerfumeEligibleForWhatsAppCart(product) ? 'Ver e adicionar à sacola' : product.salesMode === PRODUCT_SALES_MODES.INQUIRY_ONLY ? 'Consultar pelo WhatsApp' : COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY ? 'Ver opções e WhatsApp' : isProductReadyForCart(product) ? 'Ver produto' : product.price == null ? 'Consultar valor' : 'Falar sobre disponibilidade'}</Link>
      </div>
    </motion.section>
  </motion.div>}</AnimatePresence>
}
