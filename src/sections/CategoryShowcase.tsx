import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { useCatalog } from '../context/CatalogContext'
import type { Product } from '../types/product'
import { HOME_SHOWCASES, selectHomeShowcaseProducts, type HomeShowcaseKey } from '../data/homeShowcases'

type ShowcaseProps = {
  eyebrow: string
  title: string
  description: string
  showcaseKey: HomeShowcaseKey
  tone: 'fitness' | 'perfumes'
}

function ProductShowcase({ eyebrow, title, description, showcaseKey, tone }: ShowcaseProps) {
  const [selected, setSelected] = useState<Product | null>(null)
  const { products } = useCatalog()
  const showcaseProducts = selectHomeShowcaseProducts(products, showcaseKey)
  const config = HOME_SHOWCASES[showcaseKey]

  return <section className={`category-showcase category-showcase--${tone}`} aria-labelledby={`${tone}-showcase-title`}>
    <header className="category-showcase__heading">
      <div><span>{eyebrow}</span><h2 id={`${tone}-showcase-title`}>{title}</h2></div>
      <div><p>{description}</p></div>
    </header>
    {showcaseProducts.length > 0 ? <div className="product-grid home-showcase-grid" aria-label={`${title}: produtos em destaque`}>{showcaseProducts.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div> : <div className="home-showcase-empty" role="status"><strong>Seleção em preparação</strong><span>Os produtos aparecerão aqui quando estiverem disponíveis no catálogo público.</span></div>}
    <footer className="home-showcase-footer"><Link className="text-link" to={config.href}>{config.cta} <ArrowUpRight /></Link></footer>
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </section>
}

export function FitnessHighlights() {
  return <ProductShowcase eyebrow="IMPÉRIO FIT / DESTAQUES" title="FITNESS / IMPÉRIO FIT" description="Peças reais para acompanhar treino, movimento e rotina." showcaseKey="fitness" tone="fitness" />
}

export function PerfumeEssentials() {
  return <ProductShowcase eyebrow="BELLMONT / ESSENCIAIS" title="ESSENTIALS / FRAGRANCES" description="Fragrâncias entram como complemento do lifestyle BELLMONT." showcaseKey="perfumes" tone="perfumes" />
}
