import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'

const container = 'supabase_db_BELLMONT_LOJA'
const runId = randomBytes(4).toString('hex').toUpperCase()
const prefix = `C521-${runId}`
const adminId = '52100000-0000-0000-0000-000000000099'
const claims = JSON.stringify({ sub: adminId, role: 'authenticated' })

function psql(sql) {
  return new Promise((resolve) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'])
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }))
    child.stdin.end(sql)
  })
}

async function okSql(sql, label) {
  const result = await psql(sql)
  if (result.code !== 0) throw new Error(`${label}: ${result.stderr || result.stdout}`)
  return result.stdout.split(/\r?\n/).filter(Boolean).at(-1) ?? ''
}

async function queryJson(sql, label) {
  const raw = await okSql(`select row_to_json(x) from (${sql}) x;`, label)
  return JSON.parse(raw)
}

function adminCall(statement, prelude = '') {
  return `begin;
${prelude}
set local role authenticated;
select set_config('request.jwt.claims','${claims}',true);
${statement}
commit;`
}

async function race(leftSql, rightSql, rightDelayMs = 0) {
  const left = psql(leftSql)
  if (rightDelayMs) await new Promise((resolve) => setTimeout(resolve, rightDelayMs))
  const right = psql(rightSql)
  return Promise.all([left, right])
}

function jsonOutput(result) {
  const lines = result.stdout.split(/\r?\n/).filter((line) => line.startsWith('{'))
  return lines.length ? JSON.parse(lines.at(-1)) : null
}

function expect(condition, message, evidence) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(evidence)}`)
}

async function makeOrder(name, quantity) {
  const raw = await okSql(`
    with o as (
      insert into public.orders(order_number,source,buyer_name,buyer_phone,items_subtotal,grand_total,idempotency_key)
      values('${prefix}-${name}','website','Concorrência','1',80*${quantity},80*${quantity},'${prefix}-ORDER-${name}') returning id
    ), i as (
      insert into public.order_items(order_id,product_id,variant_id,variant_sku,product_name,category,quantity,unit_price,line_total)
      select o.id,p.id,v.id,v.sku,p.name,p.category,${quantity},80,80*${quantity}
      from o cross join public.products p join public.product_variants v on v.product_id=p.id
      where p.code='${prefix}' returning id,order_id
    ) select json_build_object('order_id',o.id,'item_id',i.id) from o join i on i.order_id=o.id;`, `create order ${name}`)
  return JSON.parse(raw)
}

async function makePayment(orderId, name) {
  const raw = await okSql(`
    with p as (
      insert into public.order_payments(order_id,provider,payment_method,amount_requested,amount_confirmed,status,idempotency_key,confirmed_at)
      select id,'test','pix',grand_total,grand_total,'paid','${prefix}-PAY-${name}',now() from public.orders where id=${orderId}
      returning id
    ) select json_build_object('payment_id',id) from p;`, `create payment ${name}`)
  return JSON.parse(raw).payment_id
}

async function reserve(orderId, name) {
  const raw = await okSql(adminCall(`select public.reserve_order_inventory(${orderId},'${prefix}-RES-${name}');`), `reserve ${name}`)
  return JSON.parse(raw)
}

async function makeDue(orderId) {
  await okSql(`update public.inventory_reservations set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where order_id=${orderId};`, 'make reservation due')
}

const evidence = { run_id: prefix, scenarios: {} }

await okSql(`
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
  values('${adminId}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','concurrency-admin@invalid','',now(),now(),now())
  on conflict(id) do nothing;
  insert into private.admin_users(user_id) values('${adminId}') on conflict(user_id) do nothing;
  insert into public.products(code,slug,name,brand,category,price,status)
  values('${prefix}','${prefix.toLowerCase()}','Concurrency fixture','BELLMONT','streetwear',80,'active');
  insert into public.product_variants(product_id,sku,size)
  select id,'${prefix}-P','P' from public.products where code='${prefix}';
  insert into public.inventory(variant_id,quantity_on_hand)
  select id,100 from public.product_variants where sku='${prefix}-P';`, 'create concurrency fixture')

// 1. Two independent sessions retry exactly the same reservation operation.
{
  const order = await makeOrder('RETRY', 5)
  const sql = adminCall(`select public.reserve_order_inventory(${order.order_id},'${prefix}-RETRY-KEY');`)
  const results = await race(sql, sql)
  const payloads = results.map(jsonOutput)
  const state = await queryJson(`select
    (select count(*) from private.order_inventory_operations where operation_key='${prefix}-RETRY-KEY')::int as operations,
    (select count(*) from public.inventory_reservations where order_id=${order.order_id})::int as reservations,
    (select quantity_reserved from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P')::int as reserved`, 'retry state')
  expect(results.every((r) => r.code === 0), 'concurrent retry session failed', results)
  expect(payloads.filter((p) => p?.idempotent_replay === false).length === 1 && payloads.filter((p) => p?.idempotent_replay === true).length === 1, 'retry did not split original/replay', payloads)
  expect(state.operations === 1 && state.reservations === 1 && state.reserved === 5, 'retry duplicated state', state)
  evidence.scenarios.concurrent_same_key = { results: payloads, state }
}

// 1b. Different operation keys must still serialize on the order aggregate.
{
  const order = await makeOrder('DIFFERENT-KEYS', 7)
  const left = adminCall(`select public.reserve_order_inventory(${order.order_id},'${prefix}-DIFFERENT-KEY-A');`)
  const right = adminCall(`select public.reserve_order_inventory(${order.order_id},'${prefix}-DIFFERENT-KEY-B');`)
  const results = await race(left, right)
  const payloads = results.map(jsonOutput)
  const state = await queryJson(`select
    (select count(*) from private.order_inventory_operations where order_id=${order.order_id} and operation_type='reserve')::int as operations,
    (select count(*) from public.inventory_reservations where order_id=${order.order_id} and status='active')::int as reservations,
    (select coalesce(sum(quantity),0) from public.inventory_reservations where order_id=${order.order_id} and status='active')::int as order_reserved,
    (select quantity_on_hand from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P')::int as on_hand,
    (select quantity_reserved from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P')::int as aggregate_reserved,
    (select count(*) from public.inventory_movements im join public.order_items oi on oi.id::text=im.reference_id where oi.order_id=${order.order_id})::int as physical_movements`, 'different-key state')
  expect(results.filter((r) => r.code === 0).length === 1, 'different-key race success count invalid', results)
  expect(results.filter((r) => r.stderr.includes('ORDER_ALREADY_RESERVED')).length === 1, 'different-key race did not reject duplicate reservation', results)
  expect(payloads.filter((p) => p?.status === 'reserved').length === 1, 'different-key race returned an invalid success payload', payloads)
  expect(state.operations === 1 && state.reservations === 1 && state.order_reserved === 7, 'different-key race duplicated order state', state)
  expect(state.on_hand === 100 && state.aggregate_reserved === 12 && state.physical_movements === 0, 'different-key race corrupted physical or aggregate inventory', state)
  evidence.scenarios.concurrent_different_keys = {
    session_codes: results.map((r) => r.code),
    errors: results.map((r) => r.stderr.includes('ORDER_ALREADY_RESERVED') ? 'ORDER_ALREADY_RESERVED' : null),
    results: payloads,
    state,
  }
  await okSql(adminCall(`select public.release_order_inventory(${order.order_id},'${prefix}-DIFFERENT-KEY-RELEASE','concurrency cleanup');`), 'release different-key order')
}

// 2a. Confirmation owns the order lock first; expiration skips the locked order.
{
  const order = await makeOrder('SALE-FIRST', 3)
  await reserve(order.order_id, 'SALE-FIRST')
  await makeDue(order.order_id)
  const paymentId = await makePayment(order.order_id, 'SALE-FIRST')
  const sale = adminCall(`select public.confirm_order_sale(${order.order_id},${paymentId},'${prefix}-SALE-FIRST');`, `select 1 from public.orders where id=${order.order_id} for update; select pg_sleep(1);`)
  const expiry = adminCall(`select public.expire_due_reservations('${prefix}-EXP-SALE-FIRST',100);`)
  const results = await race(sale, expiry, 150)
  const payloads = results.map(jsonOutput)
  const state = await queryJson(`select ir.status,(select count(*) from public.inventory_movements where movement_type='sale' and reference_type='order_item' and reference_id='${order.item_id}')::int as sale_movements from public.inventory_reservations ir where ir.order_id=${order.order_id}`, 'sale-first state')
  expect(payloads[0]?.status === 'sold' && payloads[1]?.expired_orders === 0, 'sale-first outcome invalid', payloads)
  expect(state.status === 'consumed' && state.sale_movements === 1, 'sale-first state invalid', state)
  evidence.scenarios.confirmation_vs_expiration_sale_first = { results: payloads, state }
}

// 2b. Expiration owns the order lock first; late confirmation reconciles without a sale.
{
  const order = await makeOrder('EXPIRE-FIRST', 3)
  await reserve(order.order_id, 'EXPIRE-FIRST')
  await makeDue(order.order_id)
  const paymentId = await makePayment(order.order_id, 'EXPIRE-FIRST')
  const expiry = adminCall(`select public.expire_due_reservations('${prefix}-EXP-FIRST',100);`, `select 1 from public.orders where id=${order.order_id} for update; select pg_sleep(1);`)
  const sale = adminCall(`select public.confirm_order_sale(${order.order_id},${paymentId},'${prefix}-SALE-AFTER-EXP');`)
  const results = await race(expiry, sale, 150)
  const payloads = results.map(jsonOutput)
  const state = await queryJson(`select ir.status,(select count(*) from public.inventory_movements where movement_type='sale' and reference_type='order_item' and reference_id='${order.item_id}')::int as sale_movements from public.inventory_reservations ir where ir.order_id=${order.order_id}`, 'expire-first state')
  expect(payloads[0]?.expired_orders === 1 && payloads[1]?.status === 'reconciliation_required', 'expire-first outcome invalid', payloads)
  expect(state.status === 'expired' && state.sale_movements === 0, 'expire-first state invalid', state)
  evidence.scenarios.confirmation_vs_expiration_expire_first = { results: payloads, state }
}

// 3a. Release owns the order lock first; consumption becomes reconciliation-only.
{
  const order = await makeOrder('RELEASE-FIRST', 3)
  await reserve(order.order_id, 'RELEASE-FIRST')
  const paymentId = await makePayment(order.order_id, 'RELEASE-FIRST')
  const release = adminCall(`select public.release_order_inventory(${order.order_id},'${prefix}-RELEASE-FIRST','concurrency test');`, `select 1 from public.orders where id=${order.order_id} for update; select pg_sleep(1);`)
  const sale = adminCall(`select public.confirm_order_sale(${order.order_id},${paymentId},'${prefix}-SALE-AFTER-RELEASE');`)
  const results = await race(release, sale, 150)
  const payloads = results.map(jsonOutput)
  const state = await queryJson(`select ir.status,(select count(*) from public.inventory_movements where movement_type='sale' and reference_type='order_item' and reference_id='${order.item_id}')::int as sale_movements from public.inventory_reservations ir where ir.order_id=${order.order_id}`, 'release-first state')
  expect(payloads[0]?.status === 'released' && payloads[1]?.status === 'reconciliation_required', 'release-first outcome invalid', payloads)
  expect(state.status === 'released' && state.sale_movements === 0, 'release-first state invalid', state)
  evidence.scenarios.release_vs_consumption_release_first = { results: payloads, state }
}

// 3b. Consumption owns the order lock first; release observes an inactive reservation.
let returnedBaseOnHand
{
  const order = await makeOrder('CONSUME-FIRST', 3)
  await reserve(order.order_id, 'CONSUME-FIRST')
  const paymentId = await makePayment(order.order_id, 'CONSUME-FIRST')
  const sale = adminCall(`select public.confirm_order_sale(${order.order_id},${paymentId},'${prefix}-CONSUME-FIRST');`, `select 1 from public.orders where id=${order.order_id} for update; select pg_sleep(1);`)
  const release = adminCall(`select public.release_order_inventory(${order.order_id},'${prefix}-RELEASE-AFTER-SALE','concurrency test');`)
  const results = await race(sale, release, 150)
  const payloads = results.map(jsonOutput)
  const state = await queryJson(`select ir.status,(select count(*) from public.inventory_movements where movement_type='sale' and reference_type='order_item' and reference_id='${order.item_id}')::int as sale_movements,(select quantity_on_hand from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P')::int as on_hand from public.inventory_reservations ir where ir.order_id=${order.order_id}`, 'consume-first state')
  expect(payloads[0]?.status === 'sold' && payloads[1]?.status === 'already_inactive', 'consume-first outcome invalid', payloads)
  expect(state.status === 'consumed' && state.sale_movements === 1, 'consume-first state invalid', state)
  returnedBaseOnHand = state.on_hand
  evidence.scenarios.release_vs_consumption_consume_first = { results: payloads, state }
}

// 4a. Two full returns race: exactly one succeeds and one is rejected.
{
  const order = await makeOrder('RETURN-FULL', 4)
  await reserve(order.order_id, 'RETURN-FULL')
  const paymentId = await makePayment(order.order_id, 'RETURN-FULL')
  await okSql(adminCall(`select public.confirm_order_sale(${order.order_id},${paymentId},'${prefix}-SALE-RETURN-FULL');`), 'sell full-return order')
  const left = adminCall(`select public.return_order_item(${order.order_id},${order.item_id},4,'${prefix}-RETURN-FULL-A');`)
  const right = adminCall(`select public.return_order_item(${order.order_id},${order.item_id},4,'${prefix}-RETURN-FULL-B');`)
  const results = await race(left, right)
  const payloads = results.map(jsonOutput)
  const state = await queryJson(`select count(*)::int as movements,coalesce(sum(quantity_delta),0)::int as returned,(select quantity_on_hand from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P')::int as on_hand from public.inventory_movements where movement_type='return' and reference_type='order_item' and reference_id='${order.item_id}'`, 'concurrent full return state')
  expect(results.filter((r) => r.code === 0).length === 1 && results.filter((r) => r.stderr.includes('RETURN_EXCEEDS_SOLD')).length === 1, 'full return race did not serialize safely', results)
  expect(payloads.filter((p) => p?.status === 'returned').length === 1, 'full return race success count invalid', payloads)
  expect(state.movements === 1 && state.returned === 4 && state.on_hand === returnedBaseOnHand, 'full return race duplicated stock', state)
  evidence.scenarios.concurrent_full_returns = { session_codes: results.map((r) => r.code), errors: results.map((r) => r.stderr.includes('RETURN_EXCEEDS_SOLD') ? 'RETURN_EXCEEDS_SOLD' : null), state }
}

// 4b. Two complementary partial returns race: both serialize and total exactly the sold quantity.
{
  const order = await makeOrder('RETURN-PARTIAL', 4)
  await reserve(order.order_id, 'RETURN-PARTIAL')
  const paymentId = await makePayment(order.order_id, 'RETURN-PARTIAL')
  await okSql(adminCall(`select public.confirm_order_sale(${order.order_id},${paymentId},'${prefix}-SALE-RETURN-PARTIAL');`), 'sell partial-return order')
  const left = adminCall(`select public.return_order_item(${order.order_id},${order.item_id},2,'${prefix}-RETURN-PARTIAL-A');`)
  const right = adminCall(`select public.return_order_item(${order.order_id},${order.item_id},2,'${prefix}-RETURN-PARTIAL-B');`)
  const results = await race(left, right)
  const state = await queryJson(`select count(*)::int as movements,coalesce(sum(quantity_delta),0)::int as returned from public.inventory_movements where movement_type='return' and reference_type='order_item' and reference_id='${order.item_id}'`, 'concurrent partial return state')
  expect(results.every((r) => r.code === 0), 'partial return race session failed', results)
  expect(state.movements === 2 && state.returned === 4, 'partial return race ledger invalid', state)
  evidence.scenarios.concurrent_partial_returns = { results: results.map(jsonOutput), state }
}

const finalState = await queryJson(`select quantity_on_hand::int,quantity_reserved::int from public.inventory i join public.product_variants v on v.id=i.variant_id where v.sku='${prefix}-P'`, 'final inventory state')
expect(finalState.quantity_reserved === 5, 'unexpected final reserved balance', finalState)
evidence.final_inventory = finalState
console.log(JSON.stringify(evidence, null, 2))
