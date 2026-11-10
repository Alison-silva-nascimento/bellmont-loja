import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { checkoutBlockingReason, validateCheckoutAddress, validateCheckoutCustomer } from '../utils/checkout'
import type { CheckoutAddress, CheckoutCustomer, CheckoutFieldErrors } from '../types/checkout'
import { createCheckoutSession } from '../services/checkoutV2'

const formatPrice = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const emptyCustomer: CheckoutCustomer = { fullName: '', email: '', phone: '' }
const emptyAddress: CheckoutAddress = { postalCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' }

export function CheckoutPage() {
  const { resolvedItems, subtotal } = useCart()
  const [customer, setCustomer] = useState(emptyCustomer)
  const [address, setAddress] = useState(emptyAddress)
  const [errors, setErrors] = useState<CheckoutFieldErrors>({})
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const cartBlock = useMemo(() => checkoutBlockingReason(resolvedItems), [resolvedItems])
  const shippingBlock = 'O frete é validado pelo backend antes da criação da ordem de teste.'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = { ...validateCheckoutCustomer(customer), ...validateCheckoutAddress(address) }
    setErrors(nextErrors)
    setAttempted(true)
    setSubmitError('')
    if (Object.keys(nextErrors).length || cartBlock || submitting) return
    setSubmitting(true)
    try {
      const session = await createCheckoutSession(customer, address, resolvedItems)
      window.location.assign(session.checkoutUrl)
    } catch {
      setSubmitError('Não foi possível iniciar o Checkout Pro Sandbox. Nenhuma cobrança foi confirmada. Tente novamente.')
      setSubmitting(false)
    }
  }

  const field = (name: keyof CheckoutCustomer | keyof CheckoutAddress, label: string, value: string, update: (value: string) => void, options?: { type?: string; autoComplete?: string; maxLength?: number }) => <label className="checkout-field">
    <span>{label}</span>
    <input value={value} onChange={event => update(event.target.value)} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} {...options} />
    {errors[name] && <small id={`${name}-error`} role="alert">{errors[name]}</small>}
  </label>

  return <main className="checkout-page">
    <header className="checkout-page__header"><p>BELLMONT / CHECKOUT V2</p><h1>Finalize com segurança.</h1><span>Ambiente de preparação. A V1 via WhatsApp continua sendo o fluxo oficial.</span></header>
    <form className="checkout-layout" onSubmit={submit} noValidate>
      <div className="checkout-form">
        <section aria-labelledby="checkout-customer"><p>01 / IDENTIFICAÇÃO</p><h2 id="checkout-customer">Seus dados</h2><div className="checkout-grid">
          {field('fullName', 'Nome completo', customer.fullName, value => setCustomer(current => ({ ...current, fullName: value })), { autoComplete: 'name' })}
          {field('email', 'E-mail', customer.email, value => setCustomer(current => ({ ...current, email: value })), { type: 'email', autoComplete: 'email' })}
          {field('phone', 'Telefone / WhatsApp', customer.phone, value => setCustomer(current => ({ ...current, phone: value })), { type: 'tel', autoComplete: 'tel' })}
        </div></section>
        <section aria-labelledby="checkout-address"><p>02 / ENDEREÇO</p><h2 id="checkout-address">Entrega</h2><div className="checkout-grid">
          {field('postalCode', 'CEP', address.postalCode, value => setAddress(current => ({ ...current, postalCode: value })), { autoComplete: 'postal-code', maxLength: 9 })}
          {field('street', 'Rua', address.street, value => setAddress(current => ({ ...current, street: value })), { autoComplete: 'address-line1' })}
          {field('number', 'Número', address.number, value => setAddress(current => ({ ...current, number: value })))}
          {field('complement', 'Complemento', address.complement, value => setAddress(current => ({ ...current, complement: value })), { autoComplete: 'address-line2' })}
          {field('neighborhood', 'Bairro', address.neighborhood, value => setAddress(current => ({ ...current, neighborhood: value })))}
          {field('city', 'Cidade', address.city, value => setAddress(current => ({ ...current, city: value })), { autoComplete: 'address-level2' })}
          {field('state', 'UF', address.state, value => setAddress(current => ({ ...current, state: value.toUpperCase().slice(0, 2) })), { autoComplete: 'address-level1', maxLength: 2 })}
        </div><div className="checkout-block" role="status"><strong>Frete pendente</strong><span>{shippingBlock}</span></div></section>
        <section aria-labelledby="checkout-payment"><p>03 / PAGAMENTO</p><h2 id="checkout-payment">Checkout Pro</h2><div className="checkout-block" role="status"><strong>Ambiente Mercado Pago</strong><span>Os meios de pagamento disponíveis serão apresentados e processados no ambiente seguro do Mercado Pago Sandbox. A BELLMONT não coleta dados do cartão.</span></div></section>
      </div>
      <aside className="checkout-summary"><p>RESUMO DO PEDIDO</p>{resolvedItems.map(item => <article key={item.key}><img src={item.product.images[0]} alt="" /><div><strong>{item.product.name}</strong><span>{[item.variant?.size, item.variant?.color, item.variant?.volume].filter(Boolean).join(' · ')}</span><small>{item.quantity} × {formatPrice(Number(item.product.price))}</small></div></article>)}
        <dl><div><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div><div><dt>Frete</dt><dd>A calcular</dd></div><div><dt>Total</dt><dd>Indisponível</dd></div></dl>
        {cartBlock && <div className="checkout-block"><strong>Sacola incompatível</strong><span>{cartBlock}</span></div>}
        {attempted && !Object.keys(errors).length && !cartBlock && !submitError && <div className="checkout-block"><strong>Dados validados</strong><span>{shippingBlock}</span></div>}
        {submitError && <div className="checkout-block" role="alert"><strong>Checkout indisponível</strong><span>{submitError}</span></div>}
        <button className="button button--dark" type="submit" disabled={Boolean(cartBlock) || submitting}><ShieldCheck aria-hidden="true" />{submitting ? 'Iniciando ambiente seguro…' : 'Continuar no Mercado Pago Sandbox'}</button>
        <small>Esta tela só existe com a flag V2 habilitada. O status definitivo será confirmado por webhook, nunca pelo retorno do navegador.</small><Link className="text-link" to="/sacola">Voltar à sacola</Link>
      </aside>
    </form>
  </main>
}
