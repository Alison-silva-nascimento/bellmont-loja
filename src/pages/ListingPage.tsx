import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { brandLabels, categoryLabels, selectCatalogProducts, type CatalogSort } from '../data/catalog'
import { useCatalog } from '../context/CatalogContext'
import type { Product, ProductBrand, ProductCategory } from '../types/product'
import { WhatsAppContactLink } from '../components/commerce/WhatsAppContactLink'
import { useLockBody } from '../hooks/useLockBody'

const titles: Record<string, { eyebrow: string; title: string; description: string }> = {
  streetwear: { eyebrow: 'BELLMONT / STREET', title: 'STREETWEAR', description: 'Silhuetas amplas. Presença sem esforço.' },
  fitness: { eyebrow: 'IMPÉRIO FIT / MOVEMENT', title: 'FITNESS', description: 'Performance que acompanha o seu ritmo.' },
  perfumes: { eyebrow: 'BELLMONT / FRAGRANCES', title: 'PERFUMARIA', description: 'Fragrâncias que chegam antes das palavras.' },
  produtos: { eyebrow: 'BELLMONT + IMPÉRIO FIT', title: 'TODOS OS PRODUTOS', description: 'Streetwear, fitness e fragrâncias em uma experiência.' },
}

export function ListingPage({ category }: { category?: ProductCategory }) {
  const { products, loading, error } = useCatalog()
  const [selected, setSelected] = useState<Product | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useLockBody(filtersOpen)
  const [params, setParams] = useSearchParams()
  const key = category || 'produtos'
  const copy = titles[key]
  const brand = params.get('marca') as ProductBrand | null
  const selectedCategory = category || params.get('categoria') as ProductCategory | null
  const sort = params.get('ordem') || 'featured'
  const items = useMemo(() => selectCatalogProducts(products, { brand, category: selectedCategory, sort: sort as CatalogSort }), [brand, products, selectedCategory, sort])
  const updateParam = (name: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(name, value); else next.delete(name); setParams(next, { replace: true }) }
  return <div className="listing-page">
    <header className="page-hero"><p>{copy.eyebrow}</p><h1>{copy.title}</h1><span>{copy.description}</span>{category && <WhatsAppContactLink category={category} className="page-hero__whatsapp" />}</header>
    <section className="catalog" aria-labelledby="catalog-count"><div className="catalog__toolbar"><p id="catalog-count" aria-live="polite">{items.length} {items.length === 1 ? 'produto' : 'produtos'}</p><button className="catalog__filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal aria-hidden="true" /> Filtrar e ordenar</button><div id="catalog-filters" className={`catalog__controls${filtersOpen ? ' is-open' : ''}`}>
      <div className="catalog__controls-head"><strong>Filtrar e ordenar</strong><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros"><X /></button></div>
      {!category && <label>Marca<select value={brand || ''} onChange={event => updateParam('marca', event.target.value)}><option value="">Todas</option>{Object.entries(brandLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {!category && <label>Categoria<select value={selectedCategory || ''} onChange={event => updateParam('categoria', event.target.value)}><option value="">Todas</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <label>Ordenar<select value={sort} onChange={event => updateParam('ordem', event.target.value)}><option value="featured">Destaques</option><option value="name">Nome</option><option value="price">Menor preço</option></select></label>
      <div className="catalog__controls-actions"><button type="button" onClick={() => setParams({}, { replace: true })}>Limpar</button><button className="button button--dark" type="button" onClick={() => setFiltersOpen(false)}>Aplicar</button></div>
    </div></div>
    {loading ? <div className="empty-state catalog__empty" aria-live="polite"><span>B</span><h2>Carregando catálogo</h2><p>Buscando os produtos disponíveis.</p></div> : items.length ? <div className="product-grid catalog-grid">{items.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div> : <div className="empty-state catalog__empty"><span>B</span><h2>{error ? 'Catálogo indisponível' : 'Nenhum produto encontrado'}</h2><p>{error ? error.message : 'Ajuste os filtros para ver outros itens do catálogo.'}</p>{!error && <button type="button" className="button button--dark" onClick={() => setParams({}, { replace: true })}>Limpar filtros</button>}</div>}</section>
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </div>
}
