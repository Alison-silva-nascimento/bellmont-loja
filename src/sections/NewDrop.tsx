import { useState } from 'react'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { useCatalog } from '../context/CatalogContext'
import type { Product } from '../types/product'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HOME_SHOWCASES, selectHomeShowcaseProducts } from '../data/homeShowcases'

export function NewDrop() {
  const [selected, setSelected] = useState<Product | null>(null)
  const { products } = useCatalog()
  const featured = selectHomeShowcaseProducts(products, 'streetwear')
  const config = HOME_SHOWCASES.streetwear
  return <section className="new-drop" aria-labelledby="new-drop-title"><div className="section-heading"><div><span>BELLMONT / DESTAQUES</span><h2 id="new-drop-title">STREETWEAR</h2></div><div className="section-heading__action"><p>Oversized em destaque. Peças reais, uma presença impossível de ignorar.</p></div></div>{featured.length > 0 ? <div className="product-grid home-showcase-grid" aria-label="Camisetas Streetwear em destaque">{featured.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div> : <div className="home-showcase-empty" role="status"><strong>Novidades em preparação</strong><span>As peças aparecerão aqui quando estiverem disponíveis no catálogo público.</span></div>}<footer className="home-showcase-footer"><Link className="text-link" to={config.href}>{config.cta} <ArrowUpRight /></Link></footer><QuickView product={selected} onClose={() => setSelected(null)} /></section>
}
