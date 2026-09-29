import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/motion/Reveal'
import { ImageStage } from '../components/ui/ImageStage'
import { asset } from '../utils/asset'

const campaigns = [
  { index: '01', title: 'STREETWEAR', line: 'Volume. Forma. Identidade.', href: '/streetwear', tone: 'ink' as const, src: asset('catalog-streetwear-goku-black.png') },
  { index: '02', title: 'IMPÉRIO FIT', line: 'Performance com identidade.', href: '/imperio-fit', tone: 'light' as const, src: asset('imperio-fit-burgundy.png') },
  { index: '03', title: 'PERFUMARIA', line: 'Uma presença que permanece.', href: '/perfumes', tone: 'amber' as const, src: asset('catalog-perfume-athena.png') },
]

export function Campaigns() {
  return <section className="campaigns"><div className="section-intro"><span>MODA &amp; LIFESTYLE</span><p>BELLMONT + IMPÉRIO FIT.</p></div>{campaigns.map((item, index) => <Reveal key={item.title} className={`campaign campaign--${index + 1}`}><ImageStage src={item.src} alt={`Campanha ${item.title}`} tone={item.tone} label={`${item.index} / ${item.title}`} /><div className="campaign__copy"><span>{item.index}</span><h2>{item.title}</h2><p>{item.line}</p><Link className="text-link" to={item.href}>Explorar <ArrowUpRight /></Link></div></Reveal>)}</section>
}
