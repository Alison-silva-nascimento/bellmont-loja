import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { InstitutionalPageContent } from '../data/institutionalPages'

export function InstitutionalPage({ content }: { content: InstitutionalPageContent }) {
  return <article className="institutional-page">
    <header className="institutional-page__header">
      <p>{content.eyebrow}</p>
      <h1>{content.title}</h1>
      <span>{content.intro}</span>
      <small>Última atualização: {content.updatedAt}</small>
    </header>
    <div className="institutional-page__body">
      {content.sections.map(section => <section key={section.title}>
        <h2>{section.title}</h2>
        {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        {section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
        {section.links && <div className="institutional-page__section-links">{section.links.map(link => <a className="text-link" href={link.href} target="_blank" rel="noopener noreferrer" key={link.href}>{link.label} <ArrowUpRight aria-hidden="true" /></a>)}</div>}
      </section>)}
      {content.notice && <aside className="institutional-page__notice" aria-label="Pendência antes da publicação"><strong>ATENÇÃO</strong><p>{content.notice}</p></aside>}
      <aside className="institutional-page__legal-note">Este conteúdo informativo não substitui a revisão jurídica nem a validação dos procedimentos comerciais pelo responsável da loja.</aside>
      <nav className="institutional-page__actions" aria-label="Navegação institucional">
        <Link className="text-link" to="/"><ArrowLeft aria-hidden="true" /> Voltar para a Home</Link>
        <Link className="text-link" to="/contato">Canais de atendimento <ArrowUpRight aria-hidden="true" /></Link>
      </nav>
    </div>
  </article>
}
