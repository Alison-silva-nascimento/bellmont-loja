import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { products } from '../src/data/products'

const PROJECT_ROOT = process.cwd()
const BUCKET = 'product-images'
const SIZES = ['P', 'M', 'G', 'GG'] as const

type CommercialProduct = {
  code: string
  slug: string
  name: string
  brand: string | null
  category: 'streetwear' | 'perfumes'
  description: string | null
  price: number
  featured: boolean
  newArrival: boolean
  color: string | null
  colorCode: string | null
  volume: string | null
  images: string[]
}

type Batch = { name: string; products: CommercialProduct[] }

const loadLocalEnv = async () => {
  const body = await readFile(path.join(PROJECT_ROOT, '.env.local'), 'utf8')
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || process.env[match[1]]) continue
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2')
    process.env[match[1]] = value
  }
}

await loadLocalEnv()

const url = process.env.VITE_SUPABASE_URL?.trim()
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const email = process.env.SUPABASE_TEST_ADMIN_EMAIL?.trim()
const password = process.env.SUPABASE_TEST_ADMIN_PASSWORD

if (!url || !key) throw new Error('Supabase público não configurado em .env.local.')
if (!email || !password) {
  throw new Error('Credenciais Admin temporárias ausentes. Configure-as somente durante esta execução.')
}

const client = createClient(url, key, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
})

const requiredStreetwear = products.filter(product => product.code?.startsWith('ST-'))
if (requiredStreetwear.length !== 20) throw new Error(`products.ts deveria conter 20 Streetwear; encontrou ${requiredStreetwear.length}.`)

const streetColors: Record<string, { color: string; code: string }> = {
  'ST-01': { color: 'Preto', code: 'PTO' }, 'ST-02': { color: 'Branco', code: 'BRA' },
  'ST-03': { color: 'Preto', code: 'PTO' }, 'ST-04': { color: 'Preto', code: 'PTO' },
  'ST-05': { color: 'Preto', code: 'PTO' }, 'ST-06': { color: 'Branco', code: 'BRA' },
  'ST-07': { color: 'Preto', code: 'PTO' }, 'ST-08': { color: 'Branco', code: 'BRA' },
  'ST-09': { color: 'Branco', code: 'BRA' }, 'ST-10': { color: 'Bege', code: 'BEG' },
  'ST-11': { color: 'Branco', code: 'BRA' }, 'ST-12': { color: 'Preto', code: 'PTO' },
  'ST-13': { color: 'Branco', code: 'BRA' }, 'ST-14': { color: 'Marinho', code: 'MAR' },
  'ST-15': { color: 'Preto', code: 'PTO' }, 'ST-16': { color: 'Preto', code: 'PTO' },
  'ST-17': { color: 'Preto', code: 'PTO' }, 'ST-18': { color: 'Preto', code: 'PTO' },
  'ST-19': { color: 'Preto', code: 'PTO' }, 'ST-20': { color: 'Preto', code: 'PTO' },
}

const perfumeIdentity = [
  ['PF-01', 'asad-lattafa', 'lattafa', '100 ml'],
  ['PF-02', 'attar-al-wesal', 'al-wataniah', '100 ml'],
  ['PF-03', 'al-noble-wazeer', 'lattafa', '100 ml'],
  ['PF-04', 'bareeq-al-dhahab', 'al-wataniah', '100 ml'],
  ['PF-05', 'odyssey-mandarin-sky', 'armaf', null],
  ['PF-06', 'club-de-nuit-intense-man', 'armaf', '105 ml'],
  ['PF-07', 'ameer-al-arab', null, null],
  ['PF-08', 'ishq-al-shuyukh-silver', 'lattafa-pride', '100 ml'],
  ['PF-09', 'fakhar-lattafa', 'lattafa', null],
  ['PF-10', 'salvo', null, '100 ml'],
  ['PF-11', 'queen-of-arabia', 'lattafa-pride', '100 ml'],
  ['PF-12', 'panther-pour-homme', 'maison-alhambra', '100 ml'],
  ['PF-13', 'mishlah', 'lattafa', '100 ml'],
  ['PF-14', 'fakhar-lattafa-caixa-branca', 'lattafa', null],
  ['PF-15', 'shagaf-al-ward', null, '100 ml'],
  ['PF-16', 'yara-lattafa', 'lattafa', '100 ml'],
  ['PF-17', 'durrat-al-aroos', null, null],
  ['PF-18', 'ghala', null, '100 ml'],
  ['PF-19', 'sabah-al-ward', null, null],
  ['PF-20', 'ameerat-al-arab', null, null],
  ['PF-21', 'ameerat-al-arab-sugar-crown', 'lattafa', '100 ml'],
  ['PF-22', 'athena-eau-de-parfum', 'maison-alhambra', null],
] as const

const expectedPerfumePrices: Record<string, number> = {
  'PF-01': 159, 'PF-02': 234, 'PF-03': 288, 'PF-04': 220, 'PF-05': 290, 'PF-06': 340,
  'PF-07': 250, 'PF-08': 480, 'PF-09': 410, 'PF-10': 250, 'PF-11': 810, 'PF-12': 230,
  'PF-13': 260, 'PF-14': 390, 'PF-15': 260, 'PF-16': 280, 'PF-17': 320, 'PF-18': 368,
  'PF-19': 220, 'PF-20': 230, 'PF-21': 330, 'PF-22': 280,
}

const streetwear: CommercialProduct[] = requiredStreetwear.map(source => {
  if (!source.code || !streetColors[source.code] || source.price !== 80) throw new Error(`Streetwear inválido: ${source.slug}.`)
  return {
    code: source.code, slug: source.slug, name: source.name, brand: 'bellmont', category: 'streetwear',
    description: source.description ?? null, price: source.price, featured: source.featured ?? false,
    newArrival: source.newArrival ?? false, color: streetColors[source.code].color,
    colorCode: streetColors[source.code].code, volume: null, images: source.images,
  }
})

const perfumeProducts = new Map(products.filter(product => product.category === 'perfumes').map(product => [product.slug, product]))
if (perfumeProducts.size !== 22) throw new Error(`products.ts deveria conter 22 perfumes; encontrou ${perfumeProducts.size}.`)

const perfumes: CommercialProduct[] = []
for (const [code, slug, brand, volume] of perfumeIdentity) {
  const source = perfumeProducts.get(slug)
  if (!source) throw new Error(`Perfume ${code}/${slug} ausente em products.ts.`)
  if (source.price !== expectedPerfumePrices[code]) throw new Error(`Preço divergente em ${code}/${slug}.`)
  perfumes.push({
    code, slug, name: source.name, brand, category: 'perfumes', description: source.description ?? null,
    price: source.price, featured: source.featured ?? false, newArrival: source.newArrival ?? false,
    color: null, colorCode: null, volume, images: source.images,
  })
}

const batches: Batch[] = [
  { name: 'LOTE A — ST-01 a ST-10', products: streetwear.filter(item => /^ST-(0[1-9]|10)$/.test(item.code)) },
  { name: 'LOTE B — ST-11 a ST-13 e ST-15 a ST-20', products: streetwear.filter(item => item.code !== 'ST-14' && !/^ST-(0[1-9]|10)$/.test(item.code)) },
  { name: 'LOTE C — PF-02 a PF-11', products: perfumes.filter(item => Number(item.code.slice(3)) >= 2 && Number(item.code.slice(3)) <= 11) },
  { name: 'LOTE D — PF-12 a PF-22', products: perfumes.filter(item => Number(item.code.slice(3)) >= 12) },
]

const fail = (context: string, error: unknown): never => {
  const detail = error instanceof Error ? error.message : JSON.stringify(error)
  throw new Error(`${context}: ${detail}`)
}

const expectNoError = <T>(context: string, result: { data: T; error: unknown }): T => {
  if (result.error) fail(context, result.error)
  return result.data
}

const assetPath = (assetUrl: string) => {
  const marker = '/assets/'
  const index = assetUrl.lastIndexOf(marker)
  if (index < 0) throw new Error(`Asset fora de public/assets: ${assetUrl}`)
  return path.join(PROJECT_ROOT, 'public', 'assets', assetUrl.slice(index + marker.length))
}

const imageMime = (filename: string) => {
  const extension = path.extname(filename).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  throw new Error(`Extensão de imagem não suportada: ${filename}`)
}

const assertPilot = async () => {
  const productRows = expectNoError('leitura do piloto', await client.from('products').select('*').in('code', ['TEST-FIXTURE-01', 'ST-14', 'PF-01']))
  if (productRows.length !== 3) throw new Error('Auditoria do piloto não retornou os três produtos esperados.')
  const byCode = new Map(productRows.map(row => [row.code, row]))
  const fixture = byCode.get('TEST-FIXTURE-01')
  const st14 = byCode.get('ST-14')
  const pf01 = byCode.get('PF-01')
  if (!fixture || fixture.id !== 1 || fixture.slug !== 'test-fixture-01' || fixture.status !== 'archived') throw new Error('Fixture divergente.')
  if (!st14 || st14.id !== 2 || st14.slug !== 'camiseta-oversized-dragao-fantastico-marinho' || st14.price !== 80 || st14.status !== 'draft') throw new Error('ST-14 divergente.')
  if (!pf01 || pf01.id !== 3 || pf01.slug !== 'asad-lattafa' || pf01.price !== 159 || pf01.status !== 'draft') throw new Error('PF-01 divergente.')

  const variantRows = expectNoError('variantes do piloto', await client.from('product_variants').select('*').in('product_id', [1, 2, 3]))
  const fixtureVariants = variantRows.filter(row => row.product_id === 1)
  const st14Variants = variantRows.filter(row => row.product_id === 2)
  const pf01Variants = variantRows.filter(row => row.product_id === 3)
  if (fixtureVariants.length !== 2 || st14Variants.length !== 4 || pf01Variants.length !== 1) throw new Error('Contagem de variantes do piloto divergente.')
  if (st14Variants.map(row => row.sku).sort().join('|') !== ['ST-14-MAR-G', 'ST-14-MAR-GG', 'ST-14-MAR-M', 'ST-14-MAR-P'].sort().join('|')) throw new Error('SKUs de ST-14 divergentes.')
  if (pf01Variants[0].sku !== 'PF-01-100ML' || pf01Variants[0].volume !== '100 ml') throw new Error('Variante de PF-01 divergente.')

  const inventory = expectNoError('estoque do piloto', await client.from('inventory').select('*').in('variant_id', variantRows.map(row => row.id)))
  const movements = expectNoError('movimentos do piloto', await client.from('inventory_movements').select('*').in('variant_id', variantRows.map(row => row.id)))
  if (inventory.length !== 2 || inventory.some(row => !fixtureVariants.some(variant => variant.id === row.variant_id))) throw new Error('Estoque comercial inesperado no piloto.')
  if (movements.length !== 4 || movements.some(row => !fixtureVariants.some(variant => variant.id === row.variant_id))) throw new Error('Movimento comercial inesperado no piloto.')
}

const ensureProduct = async (item: CommercialProduct) => {
  const existing = expectNoError(`consulta ${item.code}`, await client.from('products').select('*').or(`code.eq.${item.code},slug.eq.${item.slug}`))
  let product = existing[0]
  if (existing.length > 1 || (product && (product.code !== item.code || product.slug !== item.slug))) throw new Error(`Conflito de code/slug em ${item.code}.`)
  if (!product) {
    product = expectNoError(`cadastro ${item.code}`, await client.from('products').insert({
      code: item.code, slug: item.slug, name: item.name, brand: item.brand, category: item.category,
      description: item.description, price: item.price, status: 'draft', featured: item.featured,
      new_arrival: item.newArrival,
    }).select().single())
  } else {
    const exact = product.name === item.name && product.brand === item.brand && product.category === item.category
      && Number(product.price) === item.price && product.status === 'draft' && product.description === item.description
    if (!exact) throw new Error(`Produto existente ${item.code} diverge da fonte comercial.`)
  }
  return product
}

const ensureVariants = async (item: CommercialProduct, productId: number) => {
  const expected = item.category === 'streetwear'
    ? SIZES.map(size => ({ sku: `${item.code}-${item.colorCode}-${size}`, color: item.color, size, volume: null }))
    : item.volume
      ? [{ sku: `${item.code}-${item.volume.replace(/\s+/g, '').toUpperCase()}`, color: null, size: null, volume: item.volume }]
      : []

  for (const variant of expected) {
    const rows = expectNoError(`consulta SKU ${variant.sku}`, await client.from('product_variants').select('*').eq('sku', variant.sku))
    if (rows.length > 1) throw new Error(`SKU duplicado: ${variant.sku}.`)
    if (!rows.length) {
      expectNoError(`cadastro SKU ${variant.sku}`, await client.from('product_variants').insert({
        product_id: productId, sku: variant.sku, color: variant.color, size: variant.size,
        volume: variant.volume, options: {}, price_override: null, is_active: true,
      }).select().single())
      continue
    }
    const row = rows[0]
    if (row.product_id !== productId || row.color !== variant.color || row.size !== variant.size || row.volume !== variant.volume) {
      throw new Error(`SKU existente ${variant.sku} diverge da fonte comercial.`)
    }
  }
}

const ensureImages = async (item: CommercialProduct, productId: number) => {
  const existing = expectNoError(`imagens de ${item.code}`, await client.from('product_images').select('*').eq('product_id', productId).order('sort_order'))
  if (existing.length > item.images.length) throw new Error(`${item.code} possui mais imagens remotas que a fonte.`)

  for (let index = existing.length; index < item.images.length; index += 1) {
    const localPath = assetPath(item.images[index])
    const extension = path.extname(localPath).toLowerCase()
    const storagePath = `products/${productId}/${randomUUID()}${extension}`
    const bytes = await readFile(localPath)
    const upload = await client.storage.from(BUCKET).upload(storagePath, bytes, { contentType: imageMime(localPath), upsert: false })
    if (upload.error) fail(`upload ${item.code} imagem ${index + 1}`, upload.error)

    const metadata = await client.from('product_images').insert({
      product_id: productId, variant_id: null, storage_path: storagePath,
      alt_text: `${item.name} — imagem ${index + 1}`, sort_order: index, is_primary: index === 0,
    }).select().single()
    if (!metadata.error) continue

    const cleanup = await client.storage.from(BUCKET).remove([storagePath])
    if (cleanup.error) throw new Error(`Falha de metadata e compensação em ${item.code}/${storagePath}.`)
    fail(`metadata ${item.code} imagem ${index + 1}; upload compensado`, metadata.error)
  }
}

const validateBatch = async (batch: Batch) => {
  const codes = batch.products.map(item => item.code)
  if (!codes.length) return
  const productRows = expectNoError(`validação ${batch.name}`, await client.from('products').select('*').in('code', codes))
  if (productRows.length !== codes.length) throw new Error(`${batch.name}: contagem de produtos divergente.`)
  const ids = productRows.map(row => row.id)
  const variants = expectNoError(`variantes ${batch.name}`, await client.from('product_variants').select('*').in('product_id', ids))
  const images = expectNoError(`imagens ${batch.name}`, await client.from('product_images').select('*').in('product_id', ids))
  const inventory = variants.length ? expectNoError(`inventory ${batch.name}`, await client.from('inventory').select('variant_id').in('variant_id', variants.map(row => row.id))) : []
  const movements = variants.length ? expectNoError(`movements ${batch.name}`, await client.from('inventory_movements').select('variant_id').in('variant_id', variants.map(row => row.id))) : []
  if (inventory.length || movements.length) throw new Error(`${batch.name}: estoque ou movimento comercial inesperado.`)
  for (const item of batch.products) {
    const product = productRows.find(row => row.code === item.code)
    if (!product) throw new Error(`${batch.name}: ${item.code} ausente.`)
    const expectedVariants = item.category === 'streetwear' ? 4 : item.volume ? 1 : 0
    if (variants.filter(row => row.product_id === product.id).length !== expectedVariants) throw new Error(`${batch.name}: variantes divergentes em ${item.code}.`)
    const productImages = images.filter(row => row.product_id === product.id)
    if (productImages.length !== item.images.length || productImages.filter(row => row.is_primary).length !== 1) throw new Error(`${batch.name}: galeria divergente em ${item.code}.`)
  }
  console.log(`${batch.name}: validado (${codes.length} produtos).`)
}

const auth = await client.auth.signInWithPassword({ email, password })
if (auth.error || !auth.data.user) fail('autenticação Admin', auth.error)
const adminCheck = await client.rpc('is_current_user_admin')
if (adminCheck.error || adminCheck.data !== true) throw new Error('Usuário autenticado não está na allowlist Admin.')

await assertPilot()
console.log('Pré-auditoria: fixture, ST-14 e PF-01 íntegros.')

for (const batch of batches) {
  for (const item of batch.products) {
    const product = await ensureProduct(item)
    await ensureVariants(item, product.id)
    await ensureImages(item, product.id)
  }
  await validateBatch(batch)
}

console.log('Migração autenticada concluída sem fabricar dados comerciais ausentes.')
