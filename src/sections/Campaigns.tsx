import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/motion/Reveal'
import { ImageStage } from '../components/ui/ImageStage'
import { asset } from '../utils/asset'

const campaigns = [
  { index: '01', brand: 'BELLMONT', signature: 'STREETWEAR', category: 'Streetwear', line: 'Volume. Forma. Identidade.', href: '/streetwear', tone: 'ink' as const, src: asset('catalog-streetwear-goku-black.png') },
  { index: '02', brand: 'IMPÉRIO FIT', signature: 'FITNESS STYLE', category: 'Império Fit', line: 'Performance com identidade.', href: '/imperio-fit', tone: 'light' as const, src: asset('imperio-fit-burgundy-editorial-v2.png') },
  { index: '03', brand: 'BELLMONT', signature: 'FRAGRANCES', category: 'Perfumaria', line: 'Uma presença que permanece.', href: '/perfumes', tone: 'amber' as const, src: asset('catalog-perfume-athena.png') },
]

export function Campaigns() {
  return <section className="campaigns"><div className="section-intro"><span>MODA &amp; LIFESTYLE</span><p>TRÊS UNIVERSOS. DUAS MARCAS.</p></div>{campaigns.map((item, index) => <Reveal key={item.signature} className={`campaign campaign--${index + 1}`}><ImageStage src={item.src} alt={`Campanha ${item.category}`} tone={item.tone} label={`${item.index} / ${item.brand} ${item.signature}`} /><div className="campaign__copy"><span>{item.index}</span><div className="campaign__lockup"><h2>{item.brand}</h2><strong>{item.signature}</strong></div><p>{item.line}</p><Link className="text-link" to={item.href}>Explorar <ArrowUpRight /></Link></div></Reveal>)}</section>
}
