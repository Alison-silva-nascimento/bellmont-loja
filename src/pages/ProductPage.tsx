import { ArrowLeft, Heart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { useFavorites } from '../context/FavoritesContext'
import { useCart } from '../context/CartContext'
import { brandLabels, categoryLabels, getProductBySlug, getRelatedProducts } from '../data/products'
import type { Product } from '../types/product'
import { isProductReadyForCart, validateCartSelection } from '../utils/cart'

const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export function ProductPage() {
  const { slug } = useParams()
  const product = getProductBySlug(slug)
  const [imageIndex, setImageIndex] = useState(0)
  const [selected, setSelected] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>()
  const [selectedColor, setSelectedColor] = useState<string>()
  const touchStartRef = useRef<number | null>(null)
  const { isFavorite, toggleFavorite } = useFavorites()
  const { addItem } = useCart()
  useEffect(() => { setImageIndex(0); setSelectedSize(undefined); setSelectedColor(undefined) }, [slug])
  if (!product) return <div className="empty-state page-spacer"><span>B</span><h1>Produto não encontrado</h1><p>Este item pode ter mudado ou ainda não está disponível.</p><Link className="button button--dark" to="/produtos">Ver catálogo</Link></div>
  const related = getRelatedProducts(product)
  const favorite = isFavorite(product.id)
  const sizeOptions = product.sizes?.length ? product.sizes : [...new Set(product.variants?.map(variant => variant.size).filter((size): size is string => Boolean(size)) ?? [])]
  const colorOptions = product.colors?.length ? product.colors : [...new Set(product.variants?.map(variant => variant.color).filter((color): color is string => Boolean(color)) ?? [])]
  const matchingVariant = product.variants?.find(variant => (!variant.size || variant.size === selectedSize) && (!variant.color || variant.color === selectedColor))
  const readyForCart = isProductReadyForCart(product)
  const selection = { productId: product.id, selectedSize, selectedColor, variantId: matchingVariant?.id }
  const canAdd = readyForCart && validateCartSelection(product, selection) === null
  return <div className="product-detail">
    <div className="product-detail__breadcrumb"><Link to={`/${product.category === 'fitness' ? 'imperio-fit' : product.category}`}><ArrowLeft /> {categoryLabels[product.category]}</Link></div>
    <section className="product-detail__main">
      <div className="product-gallery"><div className="product-gallery__main" role={product.images.length > 1 ? 'group' : undefined} aria-roledescription={product.images.length > 1 ? 'carrossel' : undefined} aria-label={product.images.length > 1 ? `Galeria de ${product.name}` : undefined} tabIndex={product.images.length > 1 ? 0 : undefined} onKeyDown={event => { if (event.key === 'ArrowRight') setImageIndex(index => (index + 1) % product.images.length); if (event.key === 'ArrowLeft') setImageIndex(index => (index - 1 + product.images.length) % product.images.length) }} onTouchStart={event => { touchStartRef.current = event.touches[0]?.clientX ?? null }} onTouchEnd={event => { if (touchStartRef.current == null || product.images.length < 2) return; const distance = (event.changedTouches[0]?.clientX ?? touchStartRef.current) - touchStartRef.current; if (Math.abs(distance) > 35) setImageIndex(index => distance < 0 ? (index + 1) % product.images.length : (index - 1 + product.images.length) % product.images.length); touchStartRef.current = null }}><img src={product.images[imageIndex]} alt={`${product.name}${product.images.length > 1 ? ` — imagem ${imageIndex + 1}` : ''}`} />{product.images.length > 1 && <span className="product-gallery__counter" aria-live="polite">{imageIndex + 1} / {product.images.length}</span>}</div>{product.images.length > 1 && <div className="product-gallery__thumbs" aria-label="Imagens do produto">{product.images.map((image, index) => <button type="button" key={image} className={index === imageIndex ? 'is-active' : ''} onClick={() => setImageIndex(index)} aria-label={`Ver imagem ${index + 1} de ${product.name}`} aria-pressed={index === imageIndex}><img src={image} alt="" loading="lazy" /></button>)}</div>}</div>
      <div className="product-detail__copy"><p className="eyebrow">{brandLabels[product.brand]} / {categoryLabels[product.category]}</p><h1>{product.name}</h1>{product.price != null ? <strong className="product-detail__price">{formatPrice(product.price)}</strong> : <span className="product-detail__price-note">Consultar valor</span>}{product.description && <p className="product-detail__description">{product.description}</p>}
        {readyForCart && colorOptions.length > 0 ? <fieldset><legend>Cor</legend><div className="options">{colorOptions.map(color => <button type="button" className={selectedColor === color ? 'is-selected' : ''} aria-pressed={selectedColor === color} onClick={() => setSelectedColor(color)} key={color}>{color}</button>)}</div></fieldset> : null}
        {readyForCart && sizeOptions.length > 0 ? <fieldset><legend>Tamanho</legend><div className="options">{sizeOptions.map(size => <button type="button" className={selectedSize === size ? 'is-selected' : ''} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)} key={size}>{size}</button>)}</div></fieldset> : null}
        <div className="product-detail__actions">{readyForCart ? <button className="button button--dark" type="button" disabled={!canAdd} onClick={() => addItem(selection)}>Adicionar à sacola</button> : <Link className="button button--dark" to="/contato">{product.price == null ? 'Consultar valor' : 'Consultar disponibilidade'}</Link>}<button type="button" className="button product-detail__favorite" onClick={() => toggleFavorite(product.id)} aria-pressed={favorite}><Heart fill={favorite ? 'currentColor' : 'none'} /> {favorite ? 'Salvo' : 'Favoritar'}</button></div>
        {!readyForCart && <p className="product-detail__note">Opções e disponibilidade serão confirmadas no atendimento.</p>}
      </div>
    </section>
    {related.length > 0 && <section className="related-products" aria-labelledby="related-title"><div><p className="eyebrow">MESMA CATEGORIA</p><h2 id="related-title">VOCÊ TAMBÉM PODE GOSTAR</h2></div><div className="product-grid">{related.map(item => <ProductCard key={item.id} product={item} onQuickView={setSelected} />)}</div></section>}
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </div>
}
