import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { useFavorites } from '../context/FavoritesContext'
import { getFavoriteProducts, searchProducts } from '../data/catalog'
import { useCatalog } from '../context/CatalogContext'
import type { Product } from '../types/product'
import { WhatsAppContactLink } from '../components/commerce/WhatsAppContactLink'
import { OFFICIAL_WHATSAPP_GROUP_URL } from '../config/commercialMode'

const content = {
  favoritos: ['SEUS FAVORITOS', 'Sua seleção está vazia.', 'Explore a coleção e salve as peças que representam você.'],
  sacola: ['SUA SACOLA', 'Sua sacola está vazia.', 'Os produtos escolhidos aparecerão aqui.'],
  contato: ['ATENDIMENTO OFICIAL', 'Fale com a gente', 'Escolha o atendimento responsável pela categoria desejada. Disponibilidade, frete e pagamento serão confirmados pelo WhatsApp.'],
}

export function UtilityPage({ type }: { type: keyof typeof content }) {
  const [selected, setSelected] = useState<Product | null>(null)
  const { products } = useCatalog()
  const { favoriteIds, preservedFavoriteCount } = useFavorites()
  const [eyebrow, title, text] = content[type]
  if (type === 'contato') return <div className="utility-page contact-page"><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span><div className="contact-page__actions"><WhatsAppContactLink category="streetwear" /><WhatsAppContactLink category="fitness" /><a className="button" href={OFFICIAL_WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo oficial</a></div><small>O grupo oficial é exclusivo para novidades e divulgação; pedidos são atendidos nos contatos comerciais acima.</small></div>
  if (type !== 'favoritos') return <div className="utility-page"><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span></div>
  const favorites = getFavoriteProducts(products, favoriteIds)
  return <div className="favorites-page"><header className="utility-page"><p>{eyebrow}</p><h1>{favorites.length ? 'Sua seleção' : title}</h1><span>{favorites.length ? `${favorites.length} ${favorites.length === 1 ? 'produto salvo' : 'produtos salvos'} neste dispositivo.` : text}</span>{preservedFavoriteCount > 0 && <small role="status">{preservedFavoriteCount} {preservedFavoriteCount === 1 ? 'favorito foi preservado' : 'favoritos foram preservados'} neste dispositivo e voltará a aparecer quando o catálogo correspondente estiver disponível.</small>}</header>{favorites.length > 0 && <div className="product-grid catalog-grid">{favorites.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div>}<QuickView product={selected} onClose={() => setSelected(null)} /></div>
}

export function SearchPage() {
  const { products } = useCatalog()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const results = useMemo(() => searchProducts(products, query), [products, query])
  const searched = query.trim().length > 0
  return <div className={`search-page${searched ? ' search-page--results' : ''}`}><p>BUSCAR</p><h1>{searched ? <>Resultados para <span>“{query.trim()}”</span></> : 'O que você procura?'}</h1><div className="search-field"><label className="sr-only" htmlFor="catalog-search">Buscar produtos</label><input id="catalog-search" type="search" placeholder="Digite o nome, marca ou categoria" value={query} onChange={event => setQuery(event.target.value)} autoFocus /><Search className="search-field__icon" aria-hidden="true" />{searched && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca"><X /></button>}</div>
    <p className="search-page__hint" aria-live="polite">{searched ? `${results.length} ${results.length === 1 ? 'produto encontrado' : 'produtos encontrados'}.` : 'Busque pelos produtos reais do catálogo.'}</p>
    {searched && (results.length ? <div className="product-grid catalog-grid search-results">{results.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div> : <div className="search-empty"><h2>Nenhum produto encontrado</h2><p>Tente outro nome, marca ou categoria.</p></div>)}
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </div>
}
