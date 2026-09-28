import { Search } from 'lucide-react'

const content = {
  favoritos: ['SEUS FAVORITOS', 'Sua seleção está vazia.', 'Explore a coleção e salve as peças que representam você.'],
  sacola: ['SUA SACOLA', 'Sua sacola está vazia.', 'Os produtos escolhidos aparecerão aqui.'],
  contato: ['FALE COM A BELLMONT', 'Contato', 'Os canais oficiais de atendimento serão adicionados assim que forem confirmados.'],
}

export function UtilityPage({ type }: { type: keyof typeof content }) { const [eyebrow, title, text] = content[type]; return <div className="utility-page"><p>{eyebrow}</p><h1>{title}</h1><span>{text}</span></div> }
export function SearchPage() { return <div className="search-page"><p>BUSCAR</p><h1>O que você procura?</h1><label><span className="sr-only">Buscar produtos</span><input type="search" placeholder="Digite o nome do produto" autoFocus /><Search /></label><p className="search-page__hint">A busca estará disponível com o catálogo completo.</p></div> }
