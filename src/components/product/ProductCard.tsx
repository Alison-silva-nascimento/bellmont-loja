import { Eye, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../../context/FavoritesContext'
import { brandLabels, categoryLabels } from '../../data/products'
import type { Product } from '../../types/product'
import { ImageStage } from '../ui/ImageStage'

export function ProductCard({ product, onQuickView }: { product: Product; onQuickView: (product: Product) => void }) {
  const isCleanCatalogImage = product.images[0]?.includes('/catalog-')
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(product.id)
  return <article className="product-card">
    <div className={`product-card__media${isCleanCatalogImage ? ' product-card__media--square' : ''}`}>
      <Link className="product-card__image-link" to={`/produto/${product.slug}`} aria-label={`Ver ${product.name}`}><ImageStage src={product.images[0]} alt={product.name} tone="stone" /></Link>
      {product.images[1] && <img className="product-card__alternate" src={product.images[1]} alt="" loading="lazy" />}
      <button type="button" className="product-card__favorite" aria-label={`${favorite ? 'Remover dos favoritos' : 'Favoritar'} ${product.name}`} aria-pressed={favorite} onClick={() => toggleFavorite(product.id)}><Heart fill={favorite ? 'currentColor' : 'none'} /></button>
      <button type="button" className="product-card__quick" onClick={() => onQuickView(product)} aria-label={`Visualização rápida de ${product.name}`}><Eye /> Visualização rápida</button>
    </div>
    <div className="product-card__info"><div><p>{brandLabels[product.brand]} · {categoryLabels[product.category]}</p><h3><Link to={`/produto/${product.slug}`}>{product.name}</Link></h3></div>{product.price != null ? <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</strong> : <span className="product-card__price-note">Consultar valor</span>}</div>
  </article>
}
