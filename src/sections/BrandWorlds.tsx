import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/motion/Reveal'
import { asset } from '../utils/asset'

export function BrandWorlds() {
  return <section className="imperio-entry" aria-labelledby="imperio-entry-title">
    <picture><source media="(max-width: 600px)" srcSet={asset('imperio-fit-brand-editorial.png')} /><img src={asset('imperio-fit-hero-editorial.png')} alt="Modelo vestindo look fitness IMPÉRIO FIT" loading="lazy" /></picture>
    <div className="imperio-entry__shade" />
    <Reveal className="imperio-entry__copy">
      <span>IMPÉRIO FIT / FITNESS STYLE</span>
      <h2 id="imperio-entry-title">FORÇA EM<br /><em>MOVIMENTO.</em></h2>
      <p>Fitness / Performance / Style</p>
      <Link className="button button--light" to="/imperio-fit">Conhecer Império Fit <ArrowUpRight /></Link>
    </Reveal>
  </section>
}

