import { ArrowLeft, Heart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { useFavorites } from '../context/FavoritesContext'
import { useCart } from '../context/CartContext'
import { brandLabels, categoryLabels, getProductBySlug, getRelatedProducts } from '../data/catalog'
import { useCatalog } from '../context/CatalogContext'
import type { Product } from '../types/product'
import { isAssistedVariantSelectable, isBellmontPerfumeEligibleForWhatsAppCart, isProductEligibleForAssistedCart, isProductReadyForCart, isPurchasable, isVariantAvailable, resolveSelectedVariant } from '../utils/cart'
import { WhatsAppContactLink } from '../components/commerce/WhatsAppContactLink'
import { COMMERCIAL_MODE, COMMERCIAL_MODES } from '../config/commercialMode'
import { buildWhatsAppProductInquiryUrl } from '../utils/whatsappOrder'
import { PRODUCT_SALES_MODES } from '../types/product'

const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export function ProductPage() {
  const { slug } = useParams()
  const { products, loading } = useCatalog()
  const product = getProductBySlug(products, slug)
  const [imageIndex, setImageIndex] = useState(0)
  const [selected, setSelected] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>()
  const [selectedColor, setSelectedColor] = useState<string>()
  const [selectedVolume, setSelectedVolume] = useState<string>()
  const touchStartRef = useRef<number | null>(null)
  const { isFavorite, toggleFavorite } = useFavorites()
  const { addItem } = useCart()
  useEffect(() => { setImageIndex(0); setSelectedSize(undefined); setSelectedColor(undefined); setSelectedVolume(undefined) }, [slug])
  if (loading) return <div className="empty-state page-spacer" aria-live="polite"><span>B</span><h1>Carregando produto</h1><p>Consultando o catálogo disponível.</p></div>
  if (!product) return <div className="empty-state page-spacer"><span>B</span><h1>Produto não encontrado</h1><p>Este item pode ter mudado ou ainda não está disponível.</p><Link className="button button--dark" to="/produtos">Ver catálogo</Link></div>
  const related = getRelatedProducts(products, product)
  const favorite = isFavorite(product.id)
  const sizeOptions = product.sizes?.length ? product.sizes : [...new Set(product.variants?.map(variant => variant.size).filter((size): size is string => Boolean(size)) ?? [])]
  const colorOptions = product.colors?.length ? product.colors : [...new Set(product.variants?.map(variant => variant.color).filter((color): color is string => Boolean(color)) ?? [])]
  const volumeOptions = [...new Set(product.variants?.map(variant => variant.volume).filter((volume): volume is string => Boolean(volume)) ?? [])]
  const matchingVariant = resolveSelectedVariant(product, { selectedSize, selectedColor, selectedVolume })
  const readyForCart = isProductReadyForCart(product)
  const whatsappOnly = COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY
  const assistedPurchase = product.salesMode === PRODUCT_SALES_MODES.ASSISTED_PURCHASE
  const inquiryOnly = product.salesMode === PRODUCT_SALES_MODES.INQUIRY_ONLY
  const perfumeCartEligible = whatsappOnly && isBellmontPerfumeEligibleForWhatsAppCart(product)
  const assistedCartEligible = whatsappOnly && assistedPurchase && isProductEligibleForAssistedCart(product)
  const selection = { productId: product.id, selectedSize, selectedColor, selectedVolume, variantId: matchingVariant?.id }
  const canAdd = whatsappOnly ? perfumeCartEligible || isAssistedVariantSelectable(product, matchingVariant) : readyForCart && isPurchasable(product, matchingVariant)
  const selectableVariant = (variant: NonNullable<Product['variants']>[number]) => whatsappOnly ? variant.availabilityStatus !== 'out_of_stock' && variant.stock !== 0 : isVariantAvailable(variant)
  const sizeAvailable = (size: string) => !product.variants?.length || product.variants.some(variant => variant.size === size && (!selectedColor || !variant.color || variant.color === selectedColor) && selectableVariant(variant))
  const colorAvailable = (color: string) => !product.variants?.length || product.variants.some(variant => variant.color === color && (!selectedSize || !variant.size || variant.size === selectedSize) && selectableVariant(variant))
  const volumeAvailable = (volume: string) => !product.variants?.length || product.variants.some(variant => variant.volume === volume && selectableVariant(variant))
  const showVariantOptions = readyForCart || assistedCartEligible
  const selectionLabel = sizeOptions.length ? 'Selecione o tamanho' : colorOptions.length ? 'Selecione a cor' : volumeOptions.length ? 'Selecione o volume' : 'Selecione uma opção'
  return <div className="product-detail">
    <div className="product-detail__breadcrumb"><Link to={`/${product.category === 'fitness' ? 'imperio-fit' : product.category}`}><ArrowLeft /> {categoryLabels[product.category]}</Link></div>
    <section className="product-detail__main">
      <div className="product-gallery"><div className="product-gallery__main" role={product.images.length > 1 ? 'group' : undefined} aria-roledescription={product.images.length > 1 ? 'carrossel' : undefined} aria-label={product.images.length > 1 ? `Galeria de ${product.name}` : undefined} tabIndex={product.images.length > 1 ? 0 : undefined} onKeyDown={event => { if (event.key === 'ArrowRight') setImageIndex(index => (index + 1) % product.images.length); if (event.key === 'ArrowLeft') setImageIndex(index => (index - 1 + product.images.length) % product.images.length) }} onTouchStart={event => { touchStartRef.current = event.touches[0]?.clientX ?? null }} onTouchEnd={event => { if (touchStartRef.current == null || product.images.length < 2) return; const distance = (event.changedTouches[0]?.clientX ?? touchStartRef.current) - touchStartRef.current; if (Math.abs(distance) > 35) setImageIndex(index => distance < 0 ? (index + 1) % product.images.length : (index - 1 + product.images.length) % product.images.length); touchStartRef.current = null }}><img src={product.images[imageIndex]} alt={`${product.name}${product.images.length > 1 ? ` — imagem ${imageIndex + 1}` : ''}`} />{product.images.length > 1 && <span className="product-gallery__counter" aria-live="polite">{imageIndex + 1} / {product.images.length}</span>}</div>{product.images.length > 1 && <div className="product-gallery__thumbs" aria-label="Imagens do produto">{product.images.map((image, index) => <button type="button" key={image} className={index === imageIndex ? 'is-active' : ''} onClick={() => setImageIndex(index)} aria-label={`Ver imagem ${index + 1} de ${product.name}`} aria-pressed={index === imageIndex}><img src={image} alt="" loading="lazy" /></button>)}</div>}</div>
      <div className="product-detail__copy"><p className="eyebrow">{brandLabels[product.brand]} / {categoryLabels[product.category]}</p><h1>{product.name}</h1>{product.price != null ? <strong className="product-detail__price">{formatPrice(product.price)}</strong> : <span className="product-detail__price-note">Consultar valor</span>}{product.description && <p className="product-detail__description">{product.description}</p>}
        {showVariantOptions && colorOptions.length > 0 ? <fieldset><legend>Cor</legend><div className="options">{colorOptions.map(color => { const available = colorAvailable(color); return <button type="button" className={selectedColor === color ? 'is-selected' : ''} aria-pressed={selectedColor === color} aria-disabled={!available} disabled={!available} onClick={() => setSelectedColor(color)} key={color}>{color}{!available && <span className="sr-only"> — indisponível</span>}</button> })}</div></fieldset> : null}
        {showVariantOptions && sizeOptions.length > 0 ? <fieldset><legend>Tamanho</legend><div className="options">{sizeOptions.map(size => { const available = sizeAvailable(size); return <button type="button" className={selectedSize === size ? 'is-selected' : ''} aria-pressed={selectedSize === size} aria-disabled={!available} disabled={!available} onClick={() => setSelectedSize(size)} key={size}>{size}{!available && <span className="sr-only"> — indisponível</span>}</button> })}</div></fieldset> : null}
        {showVariantOptions && volumeOptions.length > 0 ? <fieldset><legend>Volume</legend><div className="options">{volumeOptions.map(volume => { const available = volumeAvailable(volume); return <button type="button" className={selectedVolume === volume ? 'is-selected' : ''} aria-pressed={selectedVolume === volume} aria-disabled={!available} disabled={!available} onClick={() => setSelectedVolume(volume)} key={volume}>{volume}{!available && <span className="sr-only"> — indisponível</span>}</button> })}</div></fieldset> : null}
        {whatsappOnly ? <div className="product-detail__actions product-detail__actions--whatsapp">
          {inquiryOnly
            ? <a className="button button--whatsapp" href={buildWhatsAppProductInquiryUrl(product)} target="_blank" rel="noopener noreferrer">Consultar pelo WhatsApp</a>
            : assistedPurchase && product.variants?.length ? matchingVariant
            ? <a className="button button--whatsapp" href={buildWhatsAppProductInquiryUrl(product, matchingVariant)} target="_blank" rel="noopener noreferrer">Comprar via WhatsApp</a>
            : <button className="button button--dark" type="button" disabled>{selectionLabel}</button>
            : <button className="button button--dark" type="button" disabled>Produto indisponível</button>}
          {canAdd && <button className="button button--dark" type="button" onClick={() => addItem(perfumeCartEligible ? { productId: product.id } : selection)}>Adicionar à sacola</button>}
          <button type="button" className="button product-detail__favorite" onClick={() => toggleFavorite(product.id)} aria-pressed={favorite}><Heart fill={favorite ? 'currentColor' : 'none'} /> {favorite ? 'Salvo' : 'Favoritar'}</button>
        </div> : <div className="product-detail__actions">{readyForCart ? <button className="button button--dark" type="button" disabled={!canAdd} onClick={() => addItem(selection)}>Adicionar à sacola</button> : <WhatsAppContactLink category={product.category} />}<button type="button" className="button product-detail__favorite" onClick={() => toggleFavorite(product.id)} aria-pressed={favorite}><Heart fill={favorite ? 'currentColor' : 'none'} /> {favorite ? 'Salvo' : 'Favoritar'}</button></div>}
        {whatsappOnly ? <p className="product-detail__note">{perfumeCartEligible ? 'Adicione à sacola para enviar junto com outros itens BELLMONT. Disponibilidade, valor final, frete e pagamento serão confirmados pelo WhatsApp.' : inquiryOnly ? 'Este produto está disponível somente para consulta pelo WhatsApp e não pode ser adicionado à sacola.' : product.variants?.length ? 'A variante selecionada será enviada ao atendimento. A disponibilidade, o frete e o pagamento ainda serão confirmados pelo WhatsApp.' : 'Nenhuma opção comercial está disponível. Nenhum pedido ou reserva será criado automaticamente.'}</p> : !readyForCart && <p className="product-detail__note">{product.availability === 'unavailable' ? 'Produto sem disponibilidade no momento.' : 'Disponibilidade ainda não confirmada. Este produto poderá ser adicionado à sacola quando o estoque for atualizado.'}</p>}
      </div>
    </section>
    {related.length > 0 && <section className="related-products" aria-labelledby="related-title"><div><p className="eyebrow">MESMA CATEGORIA</p><h2 id="related-title">VOCÊ TAMBÉM PODE GOSTAR</h2></div><div className="product-grid">{related.map(item => <ProductCard key={item.id} product={item} onQuickView={setSelected} />)}</div></section>}
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </div>
}
