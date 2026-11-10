export const jsonResponse = (body: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
})

export const corsHeadersFor = (request: Request) => {
  const allowed = (Deno.env.get('CHECKOUT_ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)
  const origin = request.headers.get('origin') ?? ''
  if (!origin || !allowed.includes(origin)) return null
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-idempotency-key',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'Origin',
  }
}

export const checkoutEnabled = () => Deno.env.get('CHECKOUT_V2_ENABLED') === 'true' && Deno.env.get('MERCADO_PAGO_ENVIRONMENT') === 'sandbox'

export const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export const getSecretKey = () => {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string,string>
  return keys.default ?? ''
}
