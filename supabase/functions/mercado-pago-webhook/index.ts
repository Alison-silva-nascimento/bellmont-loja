import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { checkoutEnabled, getSecretKey, jsonResponse } from '../_shared/http.ts'
import {
  getCheckoutOrder,
  resolveMercadoPagoApiBase,
  verifyMercadoPagoSignature,
} from '../_shared/mercado_pago.ts'

Deno.serve(async request => {
  if (request.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  if (!checkoutEnabled()) return jsonResponse({ error: 'CHECKOUT_DISABLED' }, 503)
  const secret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET_TEST') ?? ''
  const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN_TEST') ?? ''
  if (!secret || !accessToken) return jsonResponse({ error: 'WEBHOOK_NOT_CONFIGURED' }, 503)

  const url = new URL(request.url)
  const dataId = url.searchParams.get('data.id')?.trim() ?? ''
  const body = await request.json().catch(() => null) as {
    action?: string
    data?: { id?: string }
    live_mode?: boolean
    type?: string
  } | null
  const tolerance = Number(Deno.env.get('MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS') ?? '300')
  if (!body || body.type !== 'order' || body.live_mode !== false || body.data?.id !== dataId) {
    return jsonResponse({ error: 'INVALID_WEBHOOK_BODY' }, 400)
  }
  if (!Number.isSafeInteger(tolerance) || tolerance < 30 || tolerance > 900) {
    return jsonResponse({ error: 'WEBHOOK_NOT_CONFIGURED' }, 503)
  }
  if (!(await verifyMercadoPagoSignature(request, secret, dataId, tolerance))) {
    return jsonResponse({ error: 'INVALID_SIGNATURE' }, 401)
  }

  let providerOrder
  try {
    providerOrder = await getCheckoutOrder({
      accessToken,
      externalOrderId: dataId,
      apiBase: resolveMercadoPagoApiBase(
        Deno.env.get('MERCADO_PAGO_API_BASE'),
        Deno.env.get('MERCADO_PAGO_ALLOW_LOCAL_MOCK') === 'true',
      ),
    })
  } catch {
    return jsonResponse({ error: 'PROVIDER_RECONCILIATION_FAILED' }, 502)
  }
  if (providerOrder.id !== dataId) return jsonResponse({ error: 'PROVIDER_ORDER_MISMATCH' }, 502)

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', getSecretKey(), { auth: { persistSession: false } })
  const requestId = request.headers.get('x-request-id') ?? ''
  const externalEventId = `${requestId}:${dataId}:${body.action ?? 'order.updated'}`
  const { data: result, error } = await supabase.rpc('reconcile_checkout_payment_v2', {
    p_external_event_id: externalEventId,
    p_external_order_id: providerOrder.id,
    p_external_payment_id: providerOrder.externalPaymentId,
    p_external_reference: providerOrder.externalReference,
    p_provider_status: providerOrder.status,
    p_provider_status_detail: providerOrder.statusDetail,
    p_total_amount: providerOrder.totalAmount,
    p_total_paid_amount: providerOrder.totalPaidAmount,
    p_provider_updated_at: providerOrder.lastUpdatedDate,
  })
  if (error) return jsonResponse({ error: 'EVENT_RECONCILIATION_FAILED' }, 500)
  return jsonResponse({
    received: true,
    processed: result?.status === 'processed' || result?.status === 'duplicate_event',
    status: result?.status ?? 'unknown',
  }, 200)
})
