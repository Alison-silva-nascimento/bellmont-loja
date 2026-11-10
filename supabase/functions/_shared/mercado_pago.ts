const officialApiBase = 'https://api.mercadopago.com'

export type MercadoPagoOrder = {
  id: string
  status: string
  statusDetail: string
  externalReference: string
  totalAmount: number
  totalPaidAmount: number
  checkoutUrl: string | null
  lastUpdatedDate: string
  externalPaymentId: string | null
}

const asObject = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`INVALID_MERCADO_PAGO_${field}`)
  return value.trim()
}

const money = (value: unknown, field: string) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`INVALID_MERCADO_PAGO_${field}`)
  return parsed
}

export const resolveMercadoPagoApiBase = (candidate?: string, allowLocalMock = false) => {
  if (!candidate) return officialApiBase
  const url = new URL(candidate)
  const localHost = ['127.0.0.1', 'localhost', 'host.docker.internal'].includes(url.hostname)
  if (!allowLocalMock || !localHost || url.protocol !== 'http:') throw new Error('INVALID_MERCADO_PAGO_API_BASE')
  return url.origin
}

export const buildCheckoutOrderPayload = (input: {
  orderPublicId: string
  payerEmail: string
  items: Array<{ id: string; title: string; quantity: number; unitPrice: number }>
  shippingTotal: number
  appUrl: string
}) => {
  const baseUrl = input.appUrl.replace(/\/$/, '')
  const items = input.items.map(item => ({
    external_code: item.id,
    title: item.title,
    quantity: item.quantity,
    unit_price: item.unitPrice.toFixed(2),
  }))
  if (input.shippingTotal > 0) items.push({
    external_code: 'SHIPPING',
    title: 'Frete',
    quantity: 1,
    unit_price: input.shippingTotal.toFixed(2),
  })
  const totalAmount = input.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0) + input.shippingTotal
  const returnUrl = (result: 'success' | 'failure' | 'pending') =>
    `${baseUrl}/pedido/${encodeURIComponent(input.orderPublicId)}?result=${result}`
  return {
    type: 'online',
    processing_mode: 'manual',
    capture_mode: 'automatic_async',
    total_amount: totalAmount.toFixed(2),
    external_reference: input.orderPublicId,
    payer: { email: input.payerEmail },
    items,
    config: {
      online: {
        success_url: returnUrl('success'),
        failure_url: returnUrl('failure'),
        pending_url: returnUrl('pending'),
        auto_return: 'approved',
      },
    },
    description: 'Pedido BELLMONT',
    expiration_time: 'PT30M',
  }
}

export const parseMercadoPagoOrder = (value: unknown): MercadoPagoOrder => {
  const order = asObject(value)
  if (!order) throw new Error('INVALID_MERCADO_PAGO_ORDER')
  const transactions = asObject(order.transactions)
  const payments = Array.isArray(transactions?.payments) ? transactions.payments : []
  const firstPayment = asObject(payments[0])
  const checkoutUrl = order.checkout_url == null ? null : requiredString(order.checkout_url, 'CHECKOUT_URL')
  if (checkoutUrl && !checkoutUrl.startsWith('https://')) throw new Error('INVALID_MERCADO_PAGO_CHECKOUT_URL')
  return {
    id: requiredString(order.id, 'ORDER_ID'),
    status: requiredString(order.status, 'STATUS'),
    statusDetail: requiredString(order.status_detail, 'STATUS_DETAIL'),
    externalReference: requiredString(order.external_reference, 'EXTERNAL_REFERENCE'),
    totalAmount: money(order.total_amount, 'TOTAL_AMOUNT'),
    totalPaidAmount: money(order.total_paid_amount ?? 0, 'TOTAL_PAID_AMOUNT'),
    checkoutUrl,
    lastUpdatedDate: requiredString(order.last_updated_date ?? order.created_date, 'UPDATED_DATE'),
    externalPaymentId: typeof firstPayment?.id === 'string' ? firstPayment.id : null,
  }
}

const providerRequest = async (url: string, accessToken: string, init: RequestInit, fetcher: typeof fetch) => {
  const response = await fetcher(url, {
    ...init,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...init.headers,
    },
    signal: init.signal ?? AbortSignal.timeout(10_000),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(`MERCADO_PAGO_API_FAILED:${response.status}`)
  return parseMercadoPagoOrder(body)
}

export async function createCheckoutOrder(input: {
  accessToken: string
  providerIdempotencyKey: string
  payload: ReturnType<typeof buildCheckoutOrderPayload>
  apiBase?: string
  fetcher?: typeof fetch
}) {
  return providerRequest(`${input.apiBase ?? officialApiBase}/v1/orders`, input.accessToken, {
    method: 'POST',
    headers: { 'x-idempotency-key': input.providerIdempotencyKey },
    body: JSON.stringify(input.payload),
  }, input.fetcher ?? fetch)
}

export async function getCheckoutOrder(input: {
  accessToken: string
  externalOrderId: string
  apiBase?: string
  fetcher?: typeof fetch
}) {
  return providerRequest(
    `${input.apiBase ?? officialApiBase}/v1/orders/${encodeURIComponent(input.externalOrderId)}`,
    input.accessToken,
    { method: 'GET' },
    input.fetcher ?? fetch,
  )
}

const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')

export async function signMercadoPagoWebhook(secret: string, dataId: string, requestId: string, timestamp: string) {
  const manifestParts = []
  if (dataId) manifestParts.push(`id:${dataId.toLowerCase()}`)
  if (requestId) manifestParts.push(`request-id:${requestId}`)
  manifestParts.push(`ts:${timestamp}`)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${manifestParts.join(';')};`)))
}

export async function verifyMercadoPagoSignature(
  request: Request,
  secret: string,
  dataId: string,
  toleranceSeconds = 300,
  now = Date.now(),
) {
  const signature = request.headers.get('x-signature') ?? ''
  const requestId = request.headers.get('x-request-id') ?? ''
  const parts = Object.fromEntries(signature.split(',').map(part => part.trim().split('=', 2)))
  if (!parts.ts || !parts.v1 || !requestId || !dataId || !/^\d+$/.test(parts.ts)) return false
  const timestamp = Number(parts.ts)
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > toleranceSeconds * 1000) return false
  const computed = await signMercadoPagoWebhook(secret, dataId, requestId, parts.ts)
  if (computed.length !== parts.v1.length) return false
  let mismatch = 0
  for (let index = 0; index < computed.length; index += 1) {
    mismatch |= computed.charCodeAt(index) ^ parts.v1.charCodeAt(index)
  }
  return mismatch === 0
}
