import { Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export function CartPage() {
  const { resolvedItems, subtotal, setQuantity, removeItem } = useCart()
  const [checkoutNotice, setCheckoutNotice] = useState(false)

  if (!resolvedItems.length) return <section className="cart-page cart-page--empty" aria-labelledby="cart-title">
    <p>BELLMONT / SACOLA</p><h1 id="cart-title">Sua sacola está vazia</h1><span>Escolha suas peças e volte quando encontrar algo que represente você.</span><Link className="button button--dark" to="/streetwear">Ver Streetwear</Link>
  </section>

  return <section className="cart-page" aria-labelledby="cart-title">
    <header className="cart-page__header"><p>BELLMONT / SACOLA</p><h1 id="cart-title">Sua sacola</h1><span>{resolvedItems.length} {resolvedItems.length === 1 ? 'modelo selecionado' : 'modelos selecionados'}</span></header>
    <div className="cart-layout">
      <div className="cart-items">
        {resolvedItems.map(item => <article className="cart-item" key={item.key}>
          <Link className="cart-item__image" to={`/produto/${item.product.slug}`}><img src={item.product.images[0]} alt="" /></Link>
          <div className="cart-item__info"><p>{item.product.code || 'BELLMONT'} · STREETWEAR</p><h2><Link to={`/produto/${item.product.slug}`}>{item.product.name}</Link></h2>
            {(item.selectedSize || item.selectedColor) && <dl>{item.selectedSize && <div><dt>Tamanho</dt><dd>{item.selectedSize}</dd></div>}{item.selectedColor && <div><dt>Cor</dt><dd>{item.selectedColor}</dd></div>}</dl>}
            <strong>{formatPrice(item.product.price!)}</strong>
          </div>
          <div className="cart-item__controls">
            <div className="quantity-control" aria-label={`Quantidade de ${item.product.name}`}><button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)} disabled={item.quantity === 1} aria-label={`Diminuir quantidade de ${item.product.name}`}><Minus /></button><output aria-live="polite" aria-label="Quantidade">{item.quantity}</output><button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)} aria-label={`Aumentar quantidade de ${item.product.name}`}><Plus /></button></div>
            <button type="button" className="cart-item__remove" onClick={() => removeItem(item.key)}><Trash2 /> Remover</button>
          </div>
          <strong className="cart-item__total">{formatPrice(item.lineTotal)}</strong>
        </article>)}
      </div>
      <aside className="cart-summary" aria-labelledby="summary-title"><p>RESUMO</p><h2 id="summary-title">Subtotal</h2><strong>{formatPrice(subtotal)}</strong><span>Frete e disponibilidade serão definidos somente quando o atendimento e o checkout estiverem conectados.</span><button className="button button--dark" type="button" onClick={() => setCheckoutNotice(true)}>Finalizar pedido</button><Link className="text-link" to="/streetwear">Continuar comprando</Link>{checkoutNotice && <p className="cart-summary__notice" role="status">A finalização online ainda será conectada na próxima etapa operacional. Nenhum pedido foi criado e sua sacola permanece salva.</p>}</aside>
    </div>
  </section>
}
