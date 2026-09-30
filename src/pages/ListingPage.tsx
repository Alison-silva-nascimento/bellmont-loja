import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { brandLabels, categoryLabels, products } from '../data/products'
import type { Product, ProductBrand, ProductCategory } from '../types/product'

const titles: Record<string, { eyebrow: string; title: string; description: string }> = {
  streetwear: { eyebrow: 'BELLMONT / STREET', title: 'STREETWEAR', description: 'Silhuetas amplas. Presença sem esforço.' },
  fitness: { eyebrow: 'IMPÉRIO FIT / MOVEMENT', title: 'FITNESS', description: 'Performance que acompanha o seu ritmo.' },
  perfumes: { eyebrow: 'BELLMONT / FRAGRANCES', title: 'PERFUMARIA', description: 'Fragrâncias que chegam antes das palavras.' },
  produtos: { eyebrow: 'BELLMONT + IMPÉRIO FIT', title: 'TODOS OS PRODUTOS', description: 'Streetwear, fitness e fragrâncias em uma experiência.' },
}

export function ListingPage({ category }: { category?: ProductCategory }) {
  const [selected, setSelected] = useState<Product | null>(null)
  const [params, setParams] = useSearchParams()
  const key = category || 'produtos'
  const copy = titles[key]
  const brand = params.get('marca') as ProductBrand | null
  const selectedCategory = category || params.get('categoria') as ProductCategory | null
  const sort = params.get('ordem') || 'featured'
  const items = useMemo(() => {
    const filtered = products.filter(product => (!brand || product.brand === brand) && (!selectedCategory || product.category === selectedCategory))
    return [...filtered].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'pt-BR') : sort === 'price' ? (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY) : Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
  }, [brand, selectedCategory, sort])
  const updateParam = (name: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(name, value); else next.delete(name); setParams(next, { replace: true }) }
  return <div className="listing-page">
    <header className="page-hero"><p>{copy.eyebrow}</p><h1>{copy.title}</h1><span>{copy.description}</span></header>
    <section className="catalog" aria-labelledby="catalog-count"><div className="catalog__toolbar"><p id="catalog-count" aria-live="polite">{items.length} {items.length === 1 ? 'produto' : 'produtos'}</p><div className="catalog__controls">
      {!category && <label>Marca<select value={brand || ''} onChange={event => updateParam('marca', event.target.value)}><option value="">Todas</option>{Object.entries(brandLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      {!category && <label>Categoria<select value={selectedCategory || ''} onChange={event => updateParam('categoria', event.target.value)}><option value="">Todas</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <label>Ordenar<select value={sort} onChange={event => updateParam('ordem', event.target.value)}><option value="featured">Destaques</option><option value="name">Nome</option><option value="price">Menor preço</option></select></label>
    </div></div>
    {items.length ? <div className="product-grid catalog-grid">{items.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div> : <div className="empty-state catalog__empty"><span>B</span><h2>Nenhum produto encontrado</h2><p>Ajuste os filtros para ver outros itens do catálogo.</p><button type="button" className="button button--dark" onClick={() => setParams({}, { replace: true })}>Limpar filtros</button></div>}</section>
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </div>
}
