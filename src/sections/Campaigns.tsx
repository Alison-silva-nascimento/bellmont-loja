import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/motion/Reveal'
import { CampaignLogo } from '../components/ui/CampaignLogo'
import { ImageStage } from '../components/ui/ImageStage'
import { asset } from '../utils/asset'

const campaigns = [
  { index: '01', brand: 'BELLMONT', signature: 'STREETWEAR', logo: 'streetwear' as const, category: 'Streetwear', line: 'Volume. Forma. Identidade.', href: '/streetwear', tone: 'ink' as const, src: asset('catalog-streetwear-goku-black.png') },
  { index: '02', brand: 'IMPÉRIO FIT', signature: 'FITNESS STYLE', logo: 'fitness' as const, category: 'Império Fit', line: 'Performance com identidade.', href: '/imperio-fit', tone: 'light' as const, src: asset('imperio-fit-burgundy-editorial-v2.png') },
  { index: '03', brand: 'BELLMONT', signature: 'FRAGRANCES', logo: 'fragrances' as const, category: 'Perfumaria', line: 'Uma presença que permanece.', href: '/perfumes', tone: 'amber' as const, src: asset('catalog-perfume-athena.png') },
]

export function Campaigns() {
  return <section className="campaigns"><div className="section-intro"><span>MODA &amp; LIFESTYLE</span><p>TRÊS UNIVERSOS. DUAS MARCAS.</p></div>{campaigns.map((item, index) => <Reveal key={item.signature} className={`campaign campaign--${index + 1}`}><ImageStage src={item.src} alt={`Campanha ${item.category}`} tone={item.tone} label={`${item.index} / ${item.category.toUpperCase()}`}><CampaignLogo variant={item.logo} onImage /></ImageStage><div className="campaign__copy"><span>{item.index}</span><h2>{item.category}</h2><p>{item.line}</p><Link className="text-link" to={item.href}>Explorar <ArrowUpRight /></Link></div></Reveal>)}</section>
}
