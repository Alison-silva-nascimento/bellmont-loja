import { createHmac, randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const container = 'supabase_db_BELLMONT_LOJA'
const runId = randomBytes(4).toString('hex').toUpperCase()
const prefix = `C521REST-${runId}`
const adminId = '52c10000-0000-0000-0000-000000000091'
const userId = '52c10000-0000-0000-0000-000000000092'
const cli = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function expect(condition, message, evidence) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(evidence)}`)
}

function command(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, {
    encoding: 'utf8',
    windowsHide: true,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(`${commandName} failed: ${result.stderr || result.stdout || result.error?.message || 'unknown error'}`)
  }
  return result.stdout.trim()
}

function psql(sql) {
  return command('docker', [
    'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres',
    '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
  ], { input: sql })
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function signJwt(secret, claims) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify(claims))
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

async function rpc(url, name, body, apiKey, bearer) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      authorization: `Bearer ${bearer}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = { raw: text } }
  return { status: response.status, ok: response.ok, payload }
}

const status = JSON.parse(command(cli, ['supabase', 'status', '-o', 'json'], {
  shell: process.platform === 'win32',
}))
const now = Math.floor(Date.now() / 1000)
const commonToken = signJwt(status.JWT_SECRET, {
  aud: 'authenticated', sub: userId, role: 'authenticated',
  iat: now, exp: now + 3600,
})
const adminToken = signJwt(status.JWT_SECRET, {
  aud: 'authenticated', sub: adminId, role: 'authenticated',
  iat: now, exp: now + 3600,
})

const fixture = JSON.parse(psql(`
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
  values
    ('${adminId}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','postgrest-admin@invalid','',now(),now(),now()),
    ('${userId}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','postgrest-user@invalid','',now(),now(),now())
  on conflict(id) do nothing;
  insert into private.admin_users(user_id) values('${adminId}') on conflict(user_id) do nothing;
  insert into public.products(code,slug,name,brand,category,price,status)
  values('${prefix}','${prefix.toLowerCase()}','PostgREST fixture','BELLMONT','streetwear',80,'active');
  insert into public.product_variants(product_id,sku,size)
  select id,'${prefix}-P','P' from public.products where code='${prefix}';
  insert into public.inventory(variant_id,quantity_on_hand)
  select id,20 from public.product_variants where sku='${prefix}-P';
  with first_order as (
    insert into public.orders(order_number,source,buyer_name,buyer_phone,items_subtotal,grand_total,idempotency_key)
    values('${prefix}-ADMIN','website','Teste','1',160,160,'${prefix}-ORDER-ADMIN') returning id
  ), first_item as (
    insert into public.order_items(order_id,product_id,variant_id,variant_sku,product_name,category,quantity,unit_price,line_total)
    select o.id,p.id,v.id,v.sku,p.name,p.category,2,80,160
    from first_order o cross join public.products p join public.product_variants v on v.product_id=p.id
    where p.code='${prefix}' returning order_id
  ), second_order as (
    insert into public.orders(order_number,source,buyer_name,buyer_phone,items_subtotal,grand_total,idempotency_key)
    values('${prefix}-SERVICE','website','Teste','1',160,160,'${prefix}-ORDER-SERVICE') returning id
  ), second_item as (
    insert into public.order_items(order_id,product_id,variant_id,variant_sku,product_name,category,quantity,unit_price,line_total)
    select o.id,p.id,v.id,v.sku,p.name,p.category,2,80,160
    from second_order o cross join public.products p join public.product_variants v on v.product_id=p.id
    where p.code='${prefix}' returning order_id
  )
  select json_build_object(
    'admin_order', (select order_id from first_item),
    'service_order', (select order_id from second_item)
  );
`).split(/\r?\n/).filter(Boolean).at(-1))

const anon = await rpc(status.API_URL, 'reserve_order_inventory', {
  p_order_id: fixture.admin_order,
  p_operation_key: `${prefix}-ANON`,
}, status.ANON_KEY, status.ANON_KEY)
expect(!anon.ok, 'anon unexpectedly executed reservation RPC', { status: anon.status, code: anon.payload?.code })

const common = await rpc(status.API_URL, 'reserve_order_inventory', {
  p_order_id: fixture.admin_order,
  p_operation_key: `${prefix}-COMMON`,
}, status.ANON_KEY, commonToken)
expect(!common.ok && common.payload?.message === 'NOT_AUTHORIZED', 'authenticated non-admin was not rejected by authorization guard', { status: common.status, payload: common.payload })

const admin = await rpc(status.API_URL, 'reserve_order_inventory', {
  p_order_id: fixture.admin_order,
  p_operation_key: `${prefix}-ADMIN`,
}, status.ANON_KEY, adminToken)
expect(admin.ok && admin.payload?.status === 'reserved', 'allowlisted Admin could not reserve through PostgREST', { status: admin.status, payload: admin.payload })

const service = await rpc(status.API_URL, 'reserve_order_inventory', {
  p_order_id: fixture.service_order,
  p_operation_key: `${prefix}-SERVICE`,
}, status.SERVICE_ROLE_KEY, status.SERVICE_ROLE_KEY)
expect(service.ok && service.payload?.status === 'reserved', 'service_role could not reserve through PostgREST', { status: service.status, payload: service.payload })

const state = JSON.parse(psql(`
  select json_build_object(
    'active_reservations', (select count(*) from public.inventory_reservations ir join public.orders o on o.id=ir.order_id where o.order_number like '${prefix}-%' and ir.status='active'),
    'reserved', (select quantity_reserved from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P'),
    'physical', (select quantity_on_hand from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P'),
    'operations', (select count(*) from private.order_inventory_operations where operation_key like '${prefix}-%')
  );
`).split(/\r?\n/).filter(Boolean).at(-1))
expect(Number(state.active_reservations) === 2 && Number(state.reserved) === 4 && Number(state.physical) === 20 && Number(state.operations) === 2, 'PostgREST role tests produced inconsistent inventory state', state)

const anonExpire = await rpc(status.API_URL, 'expire_due_reservations', {
  p_batch_key: `${prefix}-ANON-EXPIRE`, p_limit: 10,
}, status.ANON_KEY, status.ANON_KEY)
expect(!anonExpire.ok, 'anon unexpectedly executed expiration RPC', { status: anonExpire.status, code: anonExpire.payload?.code })

const commonExpire = await rpc(status.API_URL, 'expire_due_reservations', {
  p_batch_key: `${prefix}-COMMON-EXPIRE`, p_limit: 10,
}, status.ANON_KEY, commonToken)
expect(!commonExpire.ok && commonExpire.payload?.message === 'NOT_AUTHORIZED', 'authenticated non-admin unexpectedly executed expiration RPC', { status: commonExpire.status, payload: commonExpire.payload })

const serviceExpire = await rpc(status.API_URL, 'expire_due_reservations', {
  p_batch_key: `${prefix}-SERVICE-EXPIRE`, p_limit: 10,
}, status.SERVICE_ROLE_KEY, status.SERVICE_ROLE_KEY)
expect(serviceExpire.ok && serviceExpire.payload?.status === 'processed' && Number(serviceExpire.payload?.expired_orders) === 0, 'service_role expiration path failed through PostgREST', { status: serviceExpire.status, payload: serviceExpire.payload })

const adminRelease = await rpc(status.API_URL, 'release_order_inventory', {
  p_order_id: fixture.admin_order,
  p_operation_key: `${prefix}-ADMIN-RELEASE`,
  p_reason: 'local PostgREST test cleanup',
}, status.ANON_KEY, adminToken)
const serviceRelease = await rpc(status.API_URL, 'release_order_inventory', {
  p_order_id: fixture.service_order,
  p_operation_key: `${prefix}-SERVICE-RELEASE`,
  p_reason: 'local PostgREST test cleanup',
}, status.SERVICE_ROLE_KEY, status.SERVICE_ROLE_KEY)
expect(adminRelease.ok && adminRelease.payload?.status === 'released', 'Admin release failed through PostgREST', { status: adminRelease.status, payload: adminRelease.payload })
expect(serviceRelease.ok && serviceRelease.payload?.status === 'released', 'service_role release failed through PostgREST', { status: serviceRelease.status, payload: serviceRelease.payload })

const finalState = JSON.parse(psql(`
  select json_build_object(
    'reserved', (select quantity_reserved from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P'),
    'physical', (select quantity_on_hand from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P'),
    'physical_movements', (select count(*) from public.inventory_movements im join public.product_variants v on v.id=im.variant_id where v.sku='${prefix}-P' and im.movement_type in ('sale','return'))
  );
`).split(/\r?\n/).filter(Boolean).at(-1))
expect(Number(finalState.reserved) === 0 && Number(finalState.physical) === 20 && Number(finalState.physical_movements) === 0, 'PostgREST cleanup changed physical stock or left reservations', finalState)

console.log(JSON.stringify({
  run_id: prefix,
  roles: {
    anon: { reserve: 'blocked', expire: 'blocked' },
    authenticated_non_admin: { reserve: 'NOT_AUTHORIZED', expire: 'NOT_AUTHORIZED' },
    admin: { reserve: admin.payload.status, release: adminRelease.payload.status },
    service_role: { reserve: service.payload.status, expire: serviceExpire.payload.status, release: serviceRelease.payload.status },
  },
  state,
  final_state: finalState,
}, null, 2))
