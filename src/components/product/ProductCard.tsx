import { Eye, Heart } from 'lucide-react'
import type { Product } from '../../types/product'
import { ImageStage } from '../ui/ImageStage'

export function ProductCard({ product, onQuickView }: { product: Product; onQuickView: (product: Product) => void }) {
  const isCleanCatalogImage = product.images[0]?.includes('/catalog-')
  return <article className="product-card">
    <div className={`product-card__media${isCleanCatalogImage ? ' product-card__media--square' : ''}`}>
      <ImageStage src={product.images[0]} alt={product.name} tone="stone" />
      {product.images[1] && <img className="product-card__alternate" src={product.images[1]} alt="" loading="lazy" />}
      <button className="product-card__favorite" aria-label={`Favoritar ${product.name}`}><Heart /></button>
      <button className="product-card__quick" onClick={() => onQuickView(product)}><Eye /> Visualização rápida</button>
    </div>
    <div className="product-card__info"><div><p>{product.brand === 'imperio-fit' ? 'IMPÉRIO FIT' : 'BELLMONT · ' + product.category}</p><h3>{product.name}</h3></div>{product.price != null && <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</strong>}</div>
  </article>
}
