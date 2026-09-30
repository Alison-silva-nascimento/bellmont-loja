import { Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export function CartFeedback() {
  const { feedback, dismissFeedback } = useCart()
  if (!feedback) return null
  return <aside className="cart-feedback" role="status" aria-live="polite" aria-atomic="true">
    <Check aria-hidden="true" />
    <div><strong>Adicionado à sacola</strong><span>{feedback.message}</span><div><button type="button" onClick={dismissFeedback}>Continuar comprando</button><Link to="/sacola" onClick={dismissFeedback}>Ver sacola</Link></div></div>
    <button type="button" className="cart-feedback__close" onClick={dismissFeedback} aria-label="Fechar confirmação"><X /></button>
  </aside>
}
