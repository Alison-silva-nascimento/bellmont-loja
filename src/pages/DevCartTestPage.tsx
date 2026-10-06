import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { devCartProduct } from '../dev/cartFixture'
import { isPurchasable, resolveSelectedVariant } from '../utils/cart'

const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export default function DevCartTestPage() {
  const [selectedSize, setSelectedSize] = useState<string>()
  const selectedColor = 'Branca'
  const { addItem } = useCart()
  const variant = useMemo(() => resolveSelectedVariant(devCartProduct, { selectedSize, selectedColor }), [selectedSize])
  const canAdd = Boolean(variant && isPurchasable(devCartProduct, variant))

  return <section className="dev-cart-test" aria-labelledby="dev-cart-title">
    <div className="dev-cart-test__warning" role="note"><strong>DEV ONLY</strong><span>Dados fictícios para teste. Este produto não pertence ao catálogo comercial.</span></div>
    <div className="dev-cart-test__layout">
      <div className="dev-cart-test__image"><img src={devCartProduct.images[0]} alt={devCartProduct.name} /></div>
      <div className="dev-cart-test__copy"><p>{devCartProduct.code}</p><h1 id="dev-cart-title">{devCartProduct.name}</h1><strong>{formatPrice(devCartProduct.price!)}</strong>
        <fieldset><legend>Cor</legend><div className="options"><button type="button" className="is-selected" aria-pressed="true">Branca</button></div></fieldset>
        <fieldset><legend>Tamanho</legend><div className="options">{devCartProduct.sizes!.map(size => <button type="button" key={size} className={selectedSize === size ? 'is-selected' : ''} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)}>{size}</button>)}</div></fieldset>
        <button className="button button--dark" type="button" disabled={!canAdd} onClick={() => variant && addItem({ productId: devCartProduct.id, selectedSize, selectedColor, variantId: variant.id })}>Adicionar à sacola</button>
        {!selectedSize && <span className="dev-cart-test__hint">Selecione M ou G para habilitar o teste.</span>}
        <Link className="text-link" to="/sacola">Ver sacola</Link>
      </div>
    </div>
  </section>
}
