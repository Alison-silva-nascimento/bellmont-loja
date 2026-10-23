import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { OFFICIAL_WHATSAPP_GROUP_URL } from '../config/commercialMode'

export function WhatsAppGroup() {
  return <section className="whatsapp-group" aria-labelledby="whatsapp-group-title">
    <div className="whatsapp-group__mark" aria-hidden="true"><MessageCircle /></div>
    <div className="whatsapp-group__copy"><p>BELLMONT / COMUNIDADE</p><h2 id="whatsapp-group-title">ENTRE PARA O<br />GRUPO OFICIAL</h2><span>Fique por dentro das novidades, lançamentos e atualizações da BELLMONT.</span></div>
    <a className="button whatsapp-group__cta" href={OFFICIAL_WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo <ArrowUpRight aria-hidden="true" /></a>
  </section>
}
