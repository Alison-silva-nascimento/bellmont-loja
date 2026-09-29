import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { products } from '../data/products'
import type { Product } from '../types/product'

type ShowcaseProps = {
  eyebrow: string
  title: string
  description: string
  productIds: string[]
  href: string
  linkLabel: string
  tone: 'fitness' | 'perfumes'
}

function ProductShowcase({ eyebrow, title, description, productIds, href, linkLabel, tone }: ShowcaseProps) {
  const [selected, setSelected] = useState<Product | null>(null)
  const showcaseProducts = products.filter(product => productIds.includes(product.id))

  return <section className={`category-showcase category-showcase--${tone}`} aria-labelledby={`${tone}-showcase-title`}>
    <header className="category-showcase__heading">
      <div><span>{eyebrow}</span><h2 id={`${tone}-showcase-title`}>{title}</h2></div>
      <div><p>{description}</p><Link className="text-link" to={href}>{linkLabel} <ArrowUpRight /></Link></div>
    </header>
    <div className="product-grid">{showcaseProducts.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div>
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </section>
}

export function FitnessHighlights() {
  return <ProductShowcase eyebrow="IMPÉRIO FIT / DESTAQUES" title="PERFORMANCE EM FOCO" description="Peças reais para acompanhar treino, movimento e rotina." productIds={['fitness-01', 'fitness-02', 'fitness-03', 'fitness-04']} href="/imperio-fit" linkLabel="Ver Império Fit" tone="fitness" />
}

export function PerfumeEssentials() {
  return <ProductShowcase eyebrow="BELLMONT / ESSENCIAIS" title="COMPLETE SUA PRESENÇA" description="Fragrâncias entram como complemento do lifestyle BELLMONT." productIds={['perfume-01', 'perfume-02', 'perfume-03', 'perfume-04']} href="/perfumes" linkLabel="Ver Perfumaria" tone="perfumes" />
}
