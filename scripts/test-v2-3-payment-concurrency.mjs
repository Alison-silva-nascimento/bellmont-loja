import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'

const container = 'supabase_db_BELLMONT_LOJA'
const runId = randomBytes(4).toString('hex').toUpperCase()
const prefix = `V23-${runId}`
const claims = JSON.stringify({ role: 'service_role' })

function psql(sql) {
  return new Promise((resolve) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'])
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('close', code => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }))
    child.stdin.end(sql)
  })
}

const serviceCall = statement => `begin;
set local role service_role;
select set_config('request.jwt.claims','${claims}',true);
${statement}
commit;`

async function ok(sql, label) {
  const result = await psql(sql)
  if (result.code !== 0) throw new Error(`${label}: ${result.stderr || result.stdout}`)
  return result.stdout.split(/\r?\n/).filter(Boolean).at(-1) ?? ''
}

const parseLastJson = result => {
  const lines = result.stdout.split(/\r?\n/).filter(line => line.startsWith('{'))
  return lines.length ? JSON.parse(lines.at(-1)) : null
}

const expect = (condition, message, evidence) => {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(evidence)}`)
}

await ok(`
  insert into public.products(code,slug,name,brand,category,price,status,sales_mode)
  values('${prefix}','${prefix.toLowerCase()}','V2.3 concurrency','BELLMONT','streetwear',80,'active','ASSISTED_PURCHASE');
  insert into public.product_variants(product_id,sku,size,is_active)
  select id,'${prefix}-M','M',true from public.products where code='${prefix}';
  insert into public.inventory(variant_id,quantity_on_hand,quantity_reserved)
  select id,10,0 from public.product_variants where sku='${prefix}-M';`, 'create fixture')

const variantId = await ok(`select id from public.product_variants where sku='${prefix}-M';`, 'read variant')
const createdRaw = await ok(serviceCall(`
  select public.create_checkout_order_v2(
    jsonb_build_object(
      'buyer_name','Cliente Concorrência','buyer_phone','64999990000','buyer_email','sandbox@example.com',
      'address',jsonb_build_object('postal_code','75526270','street','Rua Teste','number','10','neighborhood','Centro','city','Itumbiara','state','GO'),
      'items',jsonb_build_array(jsonb_build_object('variant_id',${variantId},'quantity',1))
    ),'${prefix}-ORDER','${prefix}-TOKEN',0
  );`), 'create checkout')
const created = JSON.parse(createdRaw)
const orderRow = JSON.parse(await ok(`
  select json_build_object('id',id,'public_id',public_id) from public.orders where public_id='${created.public_id}';`, 'read order'))

const prepareA = serviceCall(`select public.prepare_checkout_payment_v2(${orderRow.id},'20000000-0000-4000-8000-000000000001');`)
const prepareB = serviceCall(`select public.prepare_checkout_payment_v2(${orderRow.id},'20000000-0000-4000-8000-000000000002');`)
const prepareResults = await Promise.all([psql(prepareA), psql(prepareB)])
expect(prepareResults.every(result => result.code === 0), 'concurrent payment preparation failed', prepareResults)

const payment = JSON.parse(await ok(`
  select json_build_object('id',id,'count',(select count(*) from public.order_payments where order_id=${orderRow.id}))
  from public.order_payments where order_id=${orderRow.id};`, 'read payment'))
expect(Number(payment.count) === 1, 'concurrent preparation duplicated payment attempt', payment)

await ok(serviceCall(`
  select public.attach_checkout_provider_order_v2(
    ${payment.id},'${prefix}-MP','https://www.mercadopago.com.br/checkout/v1/redirect?order_id=${prefix}-MP',
    'created','created','2026-10-28T12:00:00Z'
  );`), 'attach provider order')

const reconcile = event => serviceCall(`
  select public.reconcile_checkout_payment_v2(
    '${event}','${prefix}-MP','${prefix}-PAY','${orderRow.public_id}',
    'processed','accredited',80,80,'2026-10-28T12:01:00Z'
  );`)
const reconcileResults = await Promise.all([psql(reconcile(`${prefix}-EVENT-A`)), psql(reconcile(`${prefix}-EVENT-B`))])
expect(reconcileResults.every(result => result.code === 0), 'concurrent reconciliation failed', reconcileResults)

const state = JSON.parse(await ok(`
  select json_build_object(
    'quantity_on_hand',i.quantity_on_hand,
    'quantity_reserved',i.quantity_reserved,
    'sale_movements',(select count(*) from public.inventory_movements im join public.order_items oi on oi.id::text=im.reference_id where oi.order_id=${orderRow.id} and im.movement_type='sale'),
    'sale_operations',(select count(*) from private.order_inventory_operations where order_id=${orderRow.id} and operation_type='sale'),
    'payment_status',(select status from public.order_payments where id=${payment.id}),
    'webhook_events',(select count(*) from public.payment_webhook_events where order_payment_id=${payment.id})
  )
  from public.inventory i where i.variant_id=${variantId};`, 'read final state'))

expect(Number(state.quantity_on_hand) === 9, 'concurrent webhooks consumed stock more than once', state)
expect(Number(state.quantity_reserved) === 0, 'reservation was not consumed exactly once', state)
expect(Number(state.sale_movements) === 1 && Number(state.sale_operations) === 1, 'sale ledger/idempotency duplicated', state)
expect(state.payment_status === 'paid' && Number(state.webhook_events) === 2, 'financial/event state is inconsistent', state)

console.log(JSON.stringify({
  run_id: prefix,
  concurrent_prepare: prepareResults.map(parseLastJson),
  concurrent_reconcile: reconcileResults.map(parseLastJson),
  final_state: state,
}, null, 2))
