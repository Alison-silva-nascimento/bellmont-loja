import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/product/ProductCard'
import { QuickView } from '../components/commerce/QuickView'
import { products } from '../data/products'
import type { Product } from '../types/product'
import { useEffect, useState } from 'react'
import { asset } from '../utils/asset'

export function ImperioFit() {
  const [selected, setSelected] = useState<Product | null>(null)
  const fitness = products.filter(product => product.brand === 'imperio-fit')
  useEffect(() => { const previous = document.title; document.title = 'IMPÉRIO FIT — Fitness & Performance'; return () => { document.title = previous } }, [])
  return <div className="imperio-fit-page">
    <section className="fit-hero"><picture><source media="(max-width: 767px)" srcSet={asset('imperio-fit-hero-performance-mobile.png')} /><img src={asset('imperio-fit-hero-performance-desktop.png')} alt="Atleta em editorial de performance IMPÉRIO FIT" fetchPriority="high" /></picture><div className="fit-hero__shade" /><div className="fit-hero__copy"><p>IMPÉRIO FIT / FITNESS PREMIUM</p><h1>FORÇA EM<br /><em>MOVIMENTO.</em></h1><a href="#colecao">Ver coleção <ArrowDownRight /></a></div></section>
    <section className="fit-manifesto"><span>FITNESS / PERFORMANCE / FASHION</span><p>Fitness premium para treinar, viver e vestir com confiança.</p></section>
    <section id="colecao" className="fit-collection"><header><span>COLEÇÃO ATUAL</span><h2>FITNESS<br />&amp; PERFORMANCE</h2></header><div className="product-grid">{fitness.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div></section>
    <section className="fit-editorial"><img src={asset('imperio-fit-editorial-lines.png')} alt="Editorial do conjunto fitness preto IMPÉRIO FIT" loading="lazy" /><div><span>FASHION EM MOVIMENTO</span><h2>FEITA PARA<br />ACOMPANHAR.</h2><p>Performance, caimento e estilo dentro e fora do treino.</p></div></section>
    <section className="fit-final"><p>IMPÉRIO FIT</p><h2>SEU RITMO.<br />SEU ESTILO.</h2><Link to="/produtos">Ver produtos <ArrowUpRight /></Link></section>
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </div>
}
