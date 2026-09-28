import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Reveal } from '../components/motion/Reveal'
import { ImageStage } from '../components/ui/ImageStage'
import { asset } from '../utils/asset'

export function Editorial() {
  return <section className="editorial"><Reveal className="editorial__lead"><ImageStage src={asset('streetwear-goku-white.jpeg')} alt="Camiseta oversized branca BELLMONT" tone="stone" label="BELLMONT / EDITORIAL" /></Reveal><Reveal className="editorial__copy" delay={.1}><span>BEYOND THE ORDINARY</span><h2>A forma muda.<br />A atitude fica.</h2><p>Peças e escolhas que atravessam a rotina com identidade.</p><Link className="text-link" to="/streetwear">Ver streetwear <ArrowUpRight /></Link></Reveal><Reveal className="editorial__secondary"><ImageStage src={asset('perfume-al-noble.jpeg')} alt="Perfume Al Noble Wazeer" tone="ink" /></Reveal></section>
}
