import { MessageCircle, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { brandLabels, categoryLabels } from '../data/catalog'
import { CART_MAX_QUANTITY, getVariantQuantityLimit, hasExactVariantStock, isBellmontPerfumeEligibleForWhatsAppCart } from '../utils/cart'
import { COMMERCIAL_CONTACTS, COMMERCIAL_MODE, COMMERCIAL_MODES } from '../config/commercialMode'
import { groupCartItemsByCommerceOwner } from '../utils/whatsappOrder'

const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export function CartPage() {
  const { resolvedItems, subtotal, hasUnknownPrice, preservedItemCount, setQuantity, removeItem } = useCart()
  const whatsappGroups = groupCartItemsByCommerceOwner(resolvedItems)
  const mixedStores = whatsappGroups.length > 1

  if (!resolvedItems.length) return <section className="cart-page cart-page--empty" aria-labelledby="cart-title">
    <p>BELLMONT / SACOLA</p><h1 id="cart-title">Sua sacola está vazia</h1><span>Escolha suas peças e volte quando encontrar algo que represente você.</span>{preservedItemCount > 0 && <small role="status">{preservedItemCount} {preservedItemCount === 1 ? 'item foi preservado' : 'itens foram preservados'} neste dispositivo e será revalidado quando o catálogo correspondente estiver disponível.</small>}<Link className="button button--dark" to="/streetwear">Ver Streetwear</Link>
  </section>

  return <section className="cart-page" aria-labelledby="cart-title">
    <header className="cart-page__header"><p>BELLMONT / SACOLA</p><h1 id="cart-title">Sua sacola</h1><span>{resolvedItems.length} {resolvedItems.length === 1 ? 'modelo selecionado' : 'modelos selecionados'}</span></header>
    {preservedItemCount > 0 && <p className="cart-page__preserved" role="status">{preservedItemCount} {preservedItemCount === 1 ? 'item salvo aguarda' : 'itens salvos aguardam'} revalidação de catálogo ou disponibilidade.</p>}<div className="cart-layout">
      <div className="cart-items">
        {resolvedItems.map(item => <article className="cart-item" key={item.key}>
          <Link className="cart-item__image" to={item.product.id.startsWith('dev-') ? '/sacola' : `/produto/${item.product.slug}`}><img src={item.product.images[0]} alt="" /></Link>
          <div className="cart-item__info"><p>{item.product.code || brandLabels[item.product.brand]} · {categoryLabels[item.product.category]}</p><h2><Link to={item.product.id.startsWith('dev-') ? '/sacola' : `/produto/${item.product.slug}`}>{item.product.name}</Link></h2>
            {item.product.manufacturer && <span className="cart-item__manufacturer">{item.product.manufacturer}</span>}
            {(item.variant?.size || item.variant?.color || item.variant?.volume) && <dl>{item.variant?.size && <div><dt>Tamanho</dt><dd>{item.variant.size}</dd></div>}{item.variant?.color && <div><dt>Cor</dt><dd>{item.variant.color}</dd></div>}{item.variant?.volume && <div><dt>Volume</dt><dd>{item.variant.volume}</dd></div>}</dl>}
            <strong>{item.product.price == null ? 'Valor sob consulta' : formatPrice(item.product.price)}</strong>
            {(!item.variant || !hasExactVariantStock(item.variant)) && <small>Disponibilidade indicativa. A quantidade será confirmada no atendimento pelo WhatsApp.</small>}
          </div>
          <div className="cart-item__controls">
            <div className="quantity-control" aria-label={`Quantidade de ${item.product.name}`}><button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)} disabled={item.quantity === 1} aria-label={`Diminuir quantidade de ${item.product.name}`}><Minus /></button><output aria-live="polite" aria-label="Quantidade">{item.quantity}</output><button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= (isBellmontPerfumeEligibleForWhatsAppCart(item.product) ? CART_MAX_QUANTITY : getVariantQuantityLimit(item.variant, 'whatsapp'))} aria-label={`Aumentar quantidade de ${item.product.name}`}><Plus /></button></div>
            <button type="button" className="cart-item__remove" onClick={() => removeItem(item.key)}><Trash2 /> Remover</button>
          </div>
          <strong className="cart-item__total">{item.lineTotal == null ? 'Valor sob consulta' : formatPrice(item.lineTotal)}</strong>
        </article>)}
      </div>
      <aside className="cart-summary" aria-labelledby="summary-title"><p>RESUMO</p><h2 id="summary-title">{hasUnknownPrice ? 'Subtotal dos itens com preço conhecido' : 'Subtotal'}</h2><strong>{formatPrice(subtotal)}</strong>{hasUnknownPrice && <small>Valor final sujeito à confirmação pelo WhatsApp.</small>}<span>Disponibilidade, frete e pagamento serão confirmados no atendimento. Abrir o WhatsApp não confirma o envio nem cria um pedido.</span>
        {COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY && <div className="cart-summary__whatsapp" aria-label="Finalização por WhatsApp">
          {mixedStores && <p>Há itens de duas lojas. Envie cada seleção ao atendimento responsável; as condições serão confirmadas separadamente.</p>}
          {whatsappGroups.map(group => <a className="button button--whatsapp" href={group.url} target="_blank" rel="noopener noreferrer" key={group.owner}><MessageCircle aria-hidden="true" />{mixedStores ? `Enviar pedido à ${COMMERCIAL_CONTACTS[group.owner].label}` : `Finalizar com ${COMMERCIAL_CONTACTS[group.owner].label}`}</a>)}
        </div>}
        <p id="checkout-unavailable" className="cart-summary__notice">Compra online ainda indisponível. Nenhum pedido, reserva, movimentação de estoque ou pagamento será criado ao usar estes botões.</p><Link className="text-link" to="/streetwear">Continuar comprando</Link></aside>
    </div>
    {COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY && whatsappGroups.length > 0 && <aside className={`cart-mobile-checkout${mixedStores ? ' cart-mobile-checkout--mixed' : ''}`} aria-label="Acesso rápido à finalização por WhatsApp">
      <div><span>{hasUnknownPrice ? 'Subtotal conhecido' : 'Subtotal'}</span><strong>{formatPrice(subtotal)}</strong></div>
      <div className="cart-mobile-checkout__actions">{whatsappGroups.map(group => <a className="button button--whatsapp" href={group.url} target="_blank" rel="noopener noreferrer" key={group.owner}><MessageCircle aria-hidden="true" />{mixedStores ? COMMERCIAL_CONTACTS[group.owner].label : 'Finalizar via WhatsApp'}</a>)}</div>
    </aside>}
  </section>
}
