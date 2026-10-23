import { ArrowUpRight, AtSign, MessageCircle, Users } from 'lucide-react'
import { COMMERCIAL_CONTACTS, OFFICIAL_WHATSAPP_GROUP_URL } from '../config/commercialMode'

const channels = [
  {
    id: 'bellmont',
    eyebrow: 'STREETWEAR + PERFUMARIA',
    title: 'BELLMONT',
    description: 'Atendimento para peças BELLMONT, perfumes, disponibilidade, frete e pagamento.',
    whatsapp: COMMERCIAL_CONTACTS.bellmont,
    instagram: { label: '@bellmontstoree', url: 'https://www.instagram.com/bellmontstoree/' },
  },
  {
    id: 'imperio-fit',
    eyebrow: 'FITNESS + PERFORMANCE',
    title: 'IMPÉRIO FIT',
    description: 'Atendimento exclusivo para produtos fitness e informações da coleção IMPÉRIO FIT.',
    whatsapp: COMMERCIAL_CONTACTS['imperio-fit'],
    instagram: { label: '@imperio.fit.carolribeiro', url: 'https://www.instagram.com/imperio.fit.carolribeiro/' },
  },
] as const

export function ContactPage() {
  return <div className="contact-hub">
    <header className="contact-hub__hero"><p>BELLMONT / ATENDIMENTO</p><h1>FALE COM<br />A LOJA CERTA.</h1><span>Escolha o canal responsável pelo produto. Disponibilidade, entrega e pagamento são confirmados diretamente no WhatsApp.</span></header>
    <section className="contact-hub__grid" aria-label="Canais de atendimento">
      {channels.map(channel => <article className={`contact-card contact-card--${channel.id}`} key={channel.id}>
        <p>{channel.eyebrow}</p><h2>{channel.title}</h2><span>{channel.description}</span>
        <div className="contact-card__links">
          <a className="button button--whatsapp" href={channel.whatsapp.whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" /> WhatsApp <small>{channel.whatsapp.phoneDisplay}</small></a>
          <a className="contact-card__social" href={channel.instagram.url} target="_blank" rel="noopener noreferrer"><AtSign aria-hidden="true" /><span><small>Instagram</small>{channel.instagram.label}</span><ArrowUpRight aria-hidden="true" /></a>
        </div>
      </article>)}
    </section>
    <section className="contact-community" aria-labelledby="contact-community-title"><Users aria-hidden="true" /><div><p>COMUNIDADE BELLMONT</p><h2 id="contact-community-title">GRUPO DE NOVIDADES E PROMOÇÕES</h2><span>O grupo oficial é um canal de divulgação. Pedidos devem ser enviados aos atendimentos comerciais acima.</span></div><a className="button button--dark" href={OFFICIAL_WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">Entrar no grupo <ArrowUpRight aria-hidden="true" /></a></section>
  </div>
}
