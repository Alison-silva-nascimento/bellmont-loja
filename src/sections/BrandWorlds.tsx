import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/motion/Reveal'
import { asset } from '../utils/asset'

export function BrandWorlds() {
  return <section className="brand-worlds"><header><span>O ECOSSISTEMA</span><h2>DUAS IDENTIDADES.<br /><em>UMA EXPERIÊNCIA.</em></h2></header><div className="brand-worlds__grid">
    <Reveal className="brand-world brand-world--bellmont"><img src={asset('hero-streetwear-clean.png')} alt="Editorial streetwear BELLMONT" loading="lazy" /><div><span>BELLMONT</span><h3>Streetwear.<br />Perfumaria.<br />Lifestyle.</h3><Link to="/streetwear">Explorar BELLMONT <ArrowUpRight /></Link></div></Reveal>
    <Reveal className="brand-world brand-world--fit" delay={.08}><img src={asset('imperio-fit-brand-editorial.png')} alt="Editorial fitness IMPÉRIO FIT com conjunto azul-marinho" loading="lazy" /><div><span>IMPÉRIO FIT</span><h3>Performance.<br />Movimento.<br />Fitness Style.</h3><Link to="/imperio-fit">Conhecer IMPÉRIO FIT <ArrowUpRight /></Link></div></Reveal>
  </div></section>
}

