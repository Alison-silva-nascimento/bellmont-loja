import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Reveal } from '../components/motion/Reveal'

const feedbackTopics = [
  {
    index: '01',
    title: 'Sobre o produto',
    copy: 'Caimento, tecido e acabamento: detalhes que ajudam outras pessoas a escolher melhor.',
  },
  {
    index: '02',
    title: 'Sobre o atendimento',
    copy: 'Da primeira conversa até a finalização do pedido, cada etapa também faz parte da experiência.',
  },
  {
    index: '03',
    title: 'Sobre a experiência',
    copy: 'Relatos reais aproximam a comunidade e tornam cada nova escolha mais segura.',
  },
]

export function Editorial() {
  return (
    <section className="feedbacks" aria-labelledby="feedbacks-title">
      <Reveal className="feedbacks__heading">
        <div>
          <span>COMUNIDADE / FEEDBACKS</span>
          <h2 id="feedbacks-title">A experiência de<br />quem escolhe.</h2>
        </div>
        <div className="feedbacks__intro">
          <strong>DEPOIMENTOS VERIFICADOS</strong>
          <p>Este espaço receberá relatos reais, publicados com autorização dos clientes.</p>
          <Link className="text-link" to="/contato">Enviar feedback <ArrowUpRight /></Link>
        </div>
      </Reveal>

      <div className="feedbacks__track">
        {feedbackTopics.map((topic, index) => (
          <Reveal className="feedback-card" delay={index * .08} key={topic.index}>
            <span>{topic.index}</span>
            <div>
              <p>{topic.title}</p>
              <h3>{topic.copy}</h3>
            </div>
            <small>FEEDBACK REAL · EM BREVE</small>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
