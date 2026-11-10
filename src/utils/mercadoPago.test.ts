import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCheckoutOrderPayload,
  createCheckoutOrder,
  parseMercadoPagoOrder,
  resolveMercadoPagoApiBase,
  signMercadoPagoWebhook,
  verifyMercadoPagoSignature,
} from '../../supabase/functions/_shared/mercado_pago.ts'

const providerResponse = {
  id: 'ORDTST-001',
  status: 'created',
  status_detail: 'created',
  external_reference: '11111111-1111-4111-8111-111111111111',
  total_amount: '90.00',
  total_paid_amount: '0.00',
  checkout_url: 'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORDTST-001',
  created_date: '2026-10-28T12:00:00.000Z',
  last_updated_date: '2026-10-28T12:00:00.000Z',
  transactions: { payments: [] },
}

test('monta contrato exclusivo da Orders API com total, frete e URLs de retorno', () => {
  const payload = buildCheckoutOrderPayload({
    orderPublicId: providerResponse.external_reference,
    payerEmail: 'cliente@example.com',
    items: [{ id: 'ST-01-M', title: 'Camiseta', quantity: 1, unitPrice: 80 }],
    shippingTotal: 10,
    appUrl: 'http://127.0.0.1:5173/',
  })
  assert.equal(payload.type, 'online')
  assert.equal(payload.processing_mode, 'manual')
  assert.equal(payload.capture_mode, 'automatic_async')
  assert.equal(payload.total_amount, '90.00')
  assert.deepEqual(payload.items.map(item => item.external_code), ['ST-01-M', 'SHIPPING'])
  assert.equal(payload.config.online.success_url, `http://127.0.0.1:5173/pedido/${providerResponse.external_reference}?result=success`)
  assert.equal(payload.config.online.auto_return, 'approved')
  assert.ok(!('back_urls' in payload))
  assert.ok(!('notification_url' in payload))
})

test('usa POST /v1/orders e UUID idempotente sem contrato de Preferences', async () => {
  let capturedUrl = ''
  let capturedInit: RequestInit | undefined
  const result = await createCheckoutOrder({
    accessToken: 'test-token',
    providerIdempotencyKey: '11111111-1111-4111-8111-111111111111',
    payload: buildCheckoutOrderPayload({
      orderPublicId: providerResponse.external_reference,
      payerEmail: 'cliente@example.com',
      items: [{ id: 'ST-01-M', title: 'Camiseta', quantity: 1, unitPrice: 80 }],
      shippingTotal: 10,
      appUrl: 'http://127.0.0.1:5173',
    }),
    fetcher: (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedInit = init
      return new Response(JSON.stringify(providerResponse), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch,
  })
  assert.equal(capturedUrl, 'https://api.mercadopago.com/v1/orders')
  assert.equal(capturedInit?.method, 'POST')
  assert.equal(new Headers(capturedInit?.headers).get('x-idempotency-key'), '11111111-1111-4111-8111-111111111111')
  assert.equal(result.id, 'ORDTST-001')
  assert.equal(result.checkoutUrl, providerResponse.checkout_url)
})

test('propaga falha HTTP da Orders API sem fabricar checkout', async () => {
  await assert.rejects(() => createCheckoutOrder({
    accessToken: 'test-token',
    providerIdempotencyKey: '11111111-1111-4111-8111-111111111111',
    payload: buildCheckoutOrderPayload({
      orderPublicId: providerResponse.external_reference,
      payerEmail: 'cliente@example.com',
      items: [{ id: 'ST-01-M', title: 'Camiseta', quantity: 1, unitPrice: 80 }],
      shippingTotal: 0,
      appUrl: 'http://127.0.0.1:5173',
    }),
    fetcher: (async () => new Response('{"message":"provider unavailable"}', { status: 503 })) as typeof fetch,
  }), /MERCADO_PAGO_API_FAILED:503/)
})

test('timeout preserva a falha para retomada idempotente pelo chamador', async () => {
  await assert.rejects(() => createCheckoutOrder({
    accessToken: 'test-token',
    providerIdempotencyKey: '11111111-1111-4111-8111-111111111111',
    payload: buildCheckoutOrderPayload({
      orderPublicId: providerResponse.external_reference,
      payerEmail: 'cliente@example.com',
      items: [{ id: 'ST-01-M', title: 'Camiseta', quantity: 1, unitPrice: 80 }],
      shippingTotal: 0,
      appUrl: 'http://127.0.0.1:5173',
    }),
    fetcher: (async () => { throw new DOMException('timeout', 'AbortError') }) as typeof fetch,
  }), /timeout/)
})

test('normaliza a resposta Orders e o identificador do pagamento aninhado', () => {
  const parsed = parseMercadoPagoOrder({
    ...providerResponse,
    status: 'processed',
    status_detail: 'accredited',
    total_paid_amount: '90.00',
    transactions: { payments: [{ id: 'PAY-001' }] },
  })
  assert.equal(parsed.status, 'processed')
  assert.equal(parsed.totalPaidAmount, 90)
  assert.equal(parsed.externalPaymentId, 'PAY-001')
})

test('override de API aceita somente mock local explicitamente autorizado', () => {
  assert.equal(resolveMercadoPagoApiBase(), 'https://api.mercadopago.com')
  assert.equal(resolveMercadoPagoApiBase('http://host.docker.internal:8787', true), 'http://host.docker.internal:8787')
  assert.throws(() => resolveMercadoPagoApiBase('https://example.com', true), /INVALID_MERCADO_PAGO_API_BASE/)
  assert.throws(() => resolveMercadoPagoApiBase('http://localhost:8787', false), /INVALID_MERCADO_PAGO_API_BASE/)
})

test('valida HMAC, data.id em lowercase e tolerância contra replay', async () => {
  const now = Date.now()
  const ts = String(now)
  const secret = 'sandbox-webhook-secret'
  const dataId = 'ORDTST01ABC'
  const requestId = 'request-001'
  const signature = await signMercadoPagoWebhook(secret, dataId, requestId, ts)
  const request = new Request(`http://localhost/webhook?data.id=${dataId}`, {
    headers: { 'x-request-id': requestId, 'x-signature': `ts=${ts},v1=${signature}` },
  })
  assert.equal(await verifyMercadoPagoSignature(request, secret, dataId, 300, now), true)
  assert.equal(await verifyMercadoPagoSignature(request, 'wrong-secret', dataId, 300, now), false)
  assert.equal(await verifyMercadoPagoSignature(request, secret, dataId, 300, now + 301_000), false)
})
