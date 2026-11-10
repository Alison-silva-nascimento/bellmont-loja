import { Link, useParams, useSearchParams } from 'react-router-dom'

const copy = {
  success: ['Pagamento enviado para confirmação', 'O retorno do navegador não confirma o pagamento. Aguarde a validação segura do Mercado Pago.'],
  pending: ['Pagamento em processamento', 'O pedido permanece reservado enquanto o Mercado Pago processa o pagamento.'],
  failure: ['Pagamento não concluído', 'Nenhuma confirmação foi recebida. Você poderá tentar novamente enquanto a reserva estiver válida.'],
} as const

export function CheckoutReturnPage() {
  const { publicId } = useParams()
  const [params] = useSearchParams()
  const result = params.get('result')
  const content = result === 'success' || result === 'pending' || result === 'failure' ? copy[result] : copy.pending
  return <main className="checkout-page">
    <header className="checkout-page__header">
      <p>BELLMONT / CHECKOUT V2</p>
      <h1>{content[0]}</h1>
      <span>{content[1]}</span>
      {publicId && <small>Referência: {publicId}</small>}
      <Link className="button button--dark" to="/">Voltar à loja</Link>
    </header>
  </main>
}
