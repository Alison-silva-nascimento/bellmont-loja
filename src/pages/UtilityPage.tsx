import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { useFavorites } from '../context/FavoritesContext'
import { products, searchProducts } from '../data/products'
import type { Product } from '../types/product'

const content = {
  favoritos: ['SEUS FAVORITOS', 'Sua seleção está vazia.', 'Explore a coleção e salve as peças que representam você.'],
  sacola: ['SUA SACOLA', 'Sua sacola está vazia.', 'Os produtos escolhidos aparecerão aqui.'],
  contato: ['FALE COM A BELLMONT', 'Contato', 'Os canais oficiais de atendimento serão adicionados assim que forem confirmados.'],
}

export function UtilityPage({ type }: { type: keyof typeof content }) {
  const [selected, setSelected] = useState<Product | null>(null)
  const { favoriteIds } = useFavorites()
  const [eyebrow, title, text] = content[type]
  if (type !== 'favoritos') return <div className="utility-page"><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span></div>
  const favorites = products.filter(product => favoriteIds.includes(product.id))
  return <div className="favorites-page"><header className="utility-page"><p>{eyebrow}</p><h1>{favorites.length ? 'Sua seleção' : title}</h1><span>{favorites.length ? `${favorites.length} ${favorites.length === 1 ? 'produto salvo' : 'produtos salvos'} neste dispositivo.` : text}</span></header>{favorites.length > 0 && <div className="product-grid catalog-grid">{favorites.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div>}<QuickView product={selected} onClose={() => setSelected(null)} /></div>
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const results = useMemo(() => searchProducts(query), [query])
  const searched = query.trim().length > 0
  return <div className={`search-page${searched ? ' search-page--results' : ''}`}><p>BUSCAR</p><h1>{searched ? <>Resultados para <span>“{query.trim()}”</span></> : 'O que você procura?'}</h1><div className="search-field"><label className="sr-only" htmlFor="catalog-search">Buscar produtos</label><input id="catalog-search" type="search" placeholder="Digite o nome, marca ou categoria" value={query} onChange={event => setQuery(event.target.value)} autoFocus /><Search className="search-field__icon" aria-hidden="true" />{searched && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca"><X /></button>}</div>
    <p className="search-page__hint" aria-live="polite">{searched ? `${results.length} ${results.length === 1 ? 'produto encontrado' : 'produtos encontrados'}.` : 'Busque pelos produtos reais do catálogo.'}</p>
    {searched && (results.length ? <div className="product-grid catalog-grid search-results">{results.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div> : <div className="search-empty"><h2>Nenhum produto encontrado</h2><p>Tente outro nome, marca ou categoria.</p></div>)}
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </div>
}
