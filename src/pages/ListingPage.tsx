import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QuickView } from '../components/commerce/QuickView'
import { ProductCard } from '../components/product/ProductCard'
import { products } from '../data/products'
import type { Product, ProductCategory } from '../types/product'

const titles: Record<string, { eyebrow: string; title: string; description: string }> = {
  streetwear: { eyebrow: 'BELLMONT / STREET', title: 'STREETWEAR', description: 'Silhuetas amplas. Presença sem esforço.' },
  fitness: { eyebrow: 'IMPÉRIO FIT / MOVEMENT', title: 'FITNESS', description: 'Performance que acompanha o seu ritmo.' },
  perfumes: { eyebrow: 'BELLMONT / FRAGRANCES', title: 'PERFUMARIA', description: 'Fragrâncias que chegam antes das palavras.' },
  produtos: { eyebrow: 'BELLMONT + IMPÉRIO FIT', title: 'TODOS OS PRODUTOS', description: 'Streetwear, fitness e fragrâncias em uma experiência.' },
}

export function ListingPage({ category }: { category?: ProductCategory }) {
  const [selected, setSelected] = useState<Product | null>(null)
  const key = category || 'produtos'; const copy = titles[key]
  const items = useMemo(() => category ? products.filter(p => p.category === category) : products, [category])
  return <div className="listing-page"><header className="page-hero"><p>{copy.eyebrow}</p><h1>{copy.title}</h1><span>{copy.description}</span></header>{items.length ? <div className="product-grid">{items.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div> : <div className="empty-state"><span>B</span><h2>Coleção em preparação</h2><p>Os produtos oficiais desta categoria serão apresentados em breve.</p></div>}<QuickView product={selected} onClose={() => setSelected(null)} /></div>
}

export function ProductPage() {
  const { slug } = useParams(); const product = products.find(item => item.slug === slug)
  if (!product) return <div className="empty-state page-spacer"><span>B</span><h1>Produto não encontrado</h1><p>Este item pode ter mudado ou ainda não está disponível.</p></div>
  return <div className="product-page"><div className="product-page__image"><img src={product.images[0]} alt={product.name} /></div><div className="product-page__copy"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><p>Informações comerciais e disponibilidade serão confirmadas em breve.</p><button className="button button--dark" disabled>Disponibilidade a confirmar</button></div></div>
}
