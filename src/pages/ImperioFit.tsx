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
    <section className="fit-hero"><picture><source media="(max-width: 600px)" srcSet={asset('imperio-fit-black.png')} /><img src={asset('imperio-fit-hero-editorial.png')} alt="Editorial IMPÉRIO FIT com modelo vestindo macaquinho preto" /></picture><div className="fit-hero__shade" /><div className="fit-hero__copy"><p>IMPÉRIO FIT / PERFORMANCE</p><h1>FORÇA EM<br /><em>MOVIMENTO.</em></h1><a href="#colecao">Conhecer a coleção <ArrowDownRight /></a></div></section>
    <section className="fit-manifesto"><span>IMPÉRIO FIT</span><p>Moda fitness para acompanhar movimento, confiança e estilo — dentro e fora do treino.</p></section>
    <section id="colecao" className="fit-collection"><header><span>COLEÇÃO ATUAL</span><h2>FITNESS<br />&amp; PERFORMANCE</h2></header><div className="product-grid">{fitness.map(product => <ProductCard key={product.id} product={product} onQuickView={setSelected} />)}</div></section>
    <section className="fit-editorial"><img src={asset('imperio-fit-editorial-lines.png')} alt="Editorial do conjunto fitness preto IMPÉRIO FIT" loading="lazy" /><div><span>MOVIMENTO REAL</span><h2>FEITA PARA<br />ACOMPANHAR.</h2><p>Caimento, presença e liberdade em uma mesma linguagem.</p></div></section>
    <section className="fit-final"><p>IMPÉRIO FIT</p><h2>SEU RITMO.<br />SUA PRESENÇA.</h2><Link to="/produtos">Ver seleção completa <ArrowUpRight /></Link></section>
    <QuickView product={selected} onClose={() => setSelected(null)} />
  </div>
}
