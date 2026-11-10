import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { checkoutEnabled, corsHeadersFor, getSecretKey, jsonResponse, sha256 } from '../_shared/http.ts'
import {
  buildCheckoutOrderPayload,
  createCheckoutOrder,
  resolveMercadoPagoApiBase,
} from '../_shared/mercado_pago.ts'

Deno.serve(async request => {
  const cors = corsHeadersFor(request)
  if (request.method === 'OPTIONS') return cors ? new Response('ok', { headers: cors }) : jsonResponse({ error: 'ORIGIN_NOT_ALLOWED' }, 403)
  if (request.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405, cors ?? {})
  if (!cors) return jsonResponse({ error: 'ORIGIN_NOT_ALLOWED' }, 403)
  if (!checkoutEnabled()) return jsonResponse({ error: 'CHECKOUT_DISABLED' }, 503, cors)

  const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST') ?? ''
  const appUrl = Deno.env.get('CHECKOUT_APP_URL') ?? ''
  const shippingCents = Number(Deno.env.get('CHECKOUT_SHIPPING_CENTS'))
  const rateLimitSecret = Deno.env.get('CHECKOUT_RATE_LIMIT_SECRET') ?? ''
  if (!accessToken || !appUrl || !rateLimitSecret) return jsonResponse({ error: 'PAYMENT_PROVIDER_NOT_CONFIGURED' }, 503, cors)
  if (!Number.isSafeInteger(shippingCents) || shippingCents < 0) return jsonResponse({ error: 'SHIPPING_NOT_CONFIGURED' }, 503, cors)

  const idempotencyKey = request.headers.get('x-idempotency-key')?.trim() ?? ''
  if (!/^[A-Za-z0-9:_-]{16,200}$/.test(idempotencyKey)) return jsonResponse({ error: 'INVALID_IDEMPOTENCY_KEY' }, 400, cors)
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return jsonResponse({ error: 'INVALID_BODY' }, 400, cors)

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', getSecretKey(), { auth: { persistSession: false } })
  const clientAddress = (request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim()
  const keyHash = await sha256(`${rateLimitSecret}:${clientAddress}`)
  const { data: allowed, error: rateError } = await supabase.rpc('consume_checkout_rate_limit_v2', {
    p_key_hash: keyHash, p_limit: 5, p_window_seconds: 60,
  })
  if (rateError) return jsonResponse({ error: 'RATE_LIMIT_UNAVAILABLE' }, 503, cors)
  if (!allowed) return jsonResponse({ error: 'RATE_LIMITED' }, 429, { ...cors, 'retry-after': '60' })

  const tokenHash = await sha256(crypto.randomUUID() + crypto.randomUUID())
  const { data: created, error: createError } = await supabase.rpc('create_checkout_order_v2', {
    p_payload: body,
    p_idempotency_key: idempotencyKey,
    p_checkout_access_token_hash: tokenHash,
    p_shipping_total: shippingCents / 100,
  })
  if (createError || !created?.public_id) return jsonResponse({ error: 'ORDER_CREATION_FAILED' }, 409, cors)

  const { data: order } = await supabase.from('orders').select('id,public_id,order_number,buyer_email,grand_total,shipping_total').eq('public_id', created.public_id).single()
  const { data: items } = order ? await supabase.from('order_items').select('variant_sku,product_name,quantity,unit_price').eq('order_id', order.id) : { data: null }
  if (!order || !order.buyer_email || !items?.length) return jsonResponse({ error: 'ORDER_RECONCILIATION_FAILED' }, 500, cors)

  const { data: prepared, error: prepareError } = await supabase.rpc('prepare_checkout_payment_v2', {
    p_order_id: order.id, p_provider_idempotency_key: crypto.randomUUID(),
  })
  if (prepareError || !prepared?.payment_id || !prepared?.provider_idempotency_key) {
    return jsonResponse({ error: 'PAYMENT_PREPARATION_FAILED' }, 500, cors)
  }
  if (prepared.external_order_id && prepared.checkout_url) {
    return jsonResponse({
      order: { publicId: order.public_id, number: order.order_number },
      checkoutUrl: prepared.checkout_url,
    }, 200, cors)
  }

  try {
    const apiBase = resolveMercadoPagoApiBase(
      Deno.env.get('MERCADO_PAGO_API_BASE'),
      Deno.env.get('MERCADO_PAGO_ALLOW_LOCAL_MOCK') === 'true',
    )
    const providerOrder = await createCheckoutOrder({
      accessToken,
      providerIdempotencyKey: prepared.provider_idempotency_key,
      apiBase,
      payload: buildCheckoutOrderPayload({
        orderPublicId: order.public_id,
        payerEmail: order.buyer_email,
        shippingTotal: Number(order.shipping_total),
        appUrl,
        items: items.map(item => ({
          id: item.variant_sku,
          title: item.product_name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
        })),
      }),
    })
    if (!providerOrder.checkoutUrl || providerOrder.externalReference !== order.public_id
      || providerOrder.totalAmount !== Number(order.grand_total)) throw new Error('PROVIDER_ORDER_MISMATCH')
    const { data: attached, error: attachError } = await supabase.rpc('attach_checkout_provider_order_v2', {
      p_payment_id: prepared.payment_id,
      p_external_order_id: providerOrder.id,
      p_checkout_url: providerOrder.checkoutUrl,
      p_provider_status: providerOrder.status,
      p_provider_status_detail: providerOrder.statusDetail,
      p_provider_updated_at: providerOrder.lastUpdatedDate,
    })
    if (attachError || !attached?.checkout_url) throw new Error('PROVIDER_ORDER_PERSISTENCE_FAILED')
    return jsonResponse({
      order: { publicId: order.public_id, number: order.order_number },
      checkoutUrl: attached.checkout_url,
    }, 201, cors)
  } catch {
    // A timeout can happen after Mercado Pago accepted the order. Preserve the
    // reservation and provider idempotency key so the request can be resumed.
    return jsonResponse({ error: 'PAYMENT_ORDER_RETRYABLE' }, 503, { ...cors, 'retry-after': '5' })
  }
})
