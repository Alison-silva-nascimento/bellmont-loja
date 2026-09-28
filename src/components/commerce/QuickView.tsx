import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLockBody } from '../../hooks/useLockBody'
import type { Product } from '../../types/product'
import { ImageStage } from '../ui/ImageStage'

export function QuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  useLockBody(Boolean(product))
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (!product) return; closeRef.current?.focus(); const escape = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape) }, [product, onClose])
  return <AnimatePresence>{product && <motion.div className="quick-view__backdrop" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.section className="quick-view" role="dialog" aria-modal="true" aria-labelledby="quick-title" onMouseDown={e => e.stopPropagation()} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .45, ease: [.76, 0, .24, 1] }}>
      <button ref={closeRef} className="quick-view__close" onClick={onClose} aria-label="Fechar visualização"><X /></button>
      <ImageStage src={product.images[0]} alt={product.name} tone="stone" />
      <div className="quick-view__content"><p className="eyebrow">{product.brand === 'imperio-fit' ? 'IMPÉRIO FIT / FITNESS' : `BELLMONT / ${product.category}`}</p><h2 id="quick-title">{product.name}</h2>{product.description && <p>{product.description}</p>}
        {product.price != null && <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</strong>}
        {product.colors?.length ? <div><span>Cores</span><div className="options">{product.colors.map(color => <button key={color}>{color}</button>)}</div></div> : null}
        {product.sizes?.length ? <div><span>Tamanhos</span><div className="options">{product.sizes.map(size => <button key={size}>{size}</button>)}</div></div> : null}
        <button className="button button--dark" disabled={product.availability !== 'available'}>{product.availability === 'available' ? 'Adicionar à sacola' : 'Disponibilidade a confirmar'}</button>
      </div>
    </motion.section>
  </motion.div>}</AnimatePresence>
}
