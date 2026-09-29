import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/motion/Reveal'
import { asset } from '../utils/asset'

export function Campaigns() {
  return <section className="street-campaign" aria-labelledby="street-campaign-title">
    <Reveal className="street-campaign__visual"><img src={asset('catalog-streetwear-solo-leveling.png')} alt="Camiseta oversized preta BELLMONT, frente e costas" loading="lazy" /></Reveal>
    <Reveal className="street-campaign__copy" delay={.06}>
      <span>BELLMONT / OVERSIZED COLLECTION</span>
      <h2 id="street-campaign-title">PRESENÇA EM<br /><em>CADA VOLUME.</em></h2>
      <p>Modelagem ampla, visual direto e estampas que assumem o protagonismo.</p>
      <Link className="button button--light" to="/streetwear">Explorar Streetwear <ArrowUpRight /></Link>
    </Reveal>
  </section>
}
