import { useState } from 'react'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { products } from '../data/products'
import type { Product, ProductCategory } from '../types/product'

const filters: { label: string; value: ProductCategory }[] = [
  { label: 'Streetwear', value: 'streetwear' },
  { label: 'Império Fit', value: 'fitness' },
  { label: 'Perfumes', value: 'perfumes' },
]

export function NewDrop() {
  const [selected, setSelected] = useState<Product | null>(null)
  const [activeFilter, setActiveFilter] = useState<ProductCategory>('streetwear')
  const featured = products.filter(product => product.category === activeFilter && (product.newArrival || product.featured))
  return <section className="new-drop"><div className="section-heading"><div><span>SELEÇÃO ATUAL</span><h2>NEW DROP</h2></div><p>Novas escolhas em moda, movimento e presença.</p></div><div className="new-drop__filters" role="tablist" aria-label="Categorias do New Drop">{filters.map(filter => <button key={filter.value} type="button" role="tab" aria-selected={activeFilter === filter.value} className={activeFilter === filter.value ? 'is-active' : ''} onClick={() => setActiveFilter(filter.value)}>{filter.label}<span>{String(products.filter(product => product.category === filter.value).length).padStart(2, '0')}</span></button>)}</div>{featured.length ? <div className="product-grid" role="tabpanel">{featured.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div> : <div className="catalog-empty"><span aria-hidden="true">B</span><div><p>O próximo movimento está sendo preparado.</p><strong>CATÁLOGO EM BREVE</strong></div></div>}<QuickView product={selected} onClose={() => setSelected(null)} /></section>
}
