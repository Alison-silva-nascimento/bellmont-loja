import { useState } from 'react'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { products } from '../data/products'
import type { Product } from '../types/product'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NewDrop() {
  const [selected, setSelected] = useState<Product | null>(null)
  const featuredIds = ['street-01', 'street-02', 'street-03']
  const featured = products.filter(product => featuredIds.includes(product.id))
  return <section className="new-drop" aria-labelledby="new-drop-title"><div className="section-heading"><div><span>BELLMONT / STREETWEAR</span><h2 id="new-drop-title">NEW DROP</h2></div><div className="section-heading__action"><p>Oversized em destaque. Três peças, uma presença impossível de ignorar.</p><Link className="text-link" to="/streetwear">Ver Streetwear <ArrowUpRight /></Link></div></div><div className="product-grid">{featured.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div><QuickView product={selected} onClose={() => setSelected(null)} /></section>
}
