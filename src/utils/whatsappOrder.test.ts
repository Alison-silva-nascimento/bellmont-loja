import assert from 'node:assert/strict'
import test from 'node:test'
import { COMMERCIAL_CONTACTS, COMMERCIAL_MODE, COMMERCIAL_MODES, getCommerceOwner } from '../config/commercialMode'
import type { ResolvedCartItem } from '../types/cart'
import type { ProductCategory } from '../types/product'
import { buildWhatsAppOrderMessage, buildWhatsAppOrderUrl, buildWhatsAppProductInquiryMessage, buildWhatsAppProductInquiryUrl, groupCartItemsByCommerceOwner, isValidWhatsAppCartItem } from './whatsappOrder'

const item = (category: ProductCategory, id: string, price: number | null = 80): ResolvedCartItem => ({
  key: `${id}::${id}-M`,
  productId: id,
  variantId: `${id}-M`,
  selectedSize: category === 'streetwear' || category === 'fitness' ? 'M' : undefined,
  selectedColor: category === 'fitness' ? 'Preto' : undefined,
  selectedVolume: category === 'perfumes' ? '100 ml' : undefined,
  quantity: 2,
  lineTotal: price == null ? null : price * 2,
  product: {
    id,
    slug: id,
    name: `Produto ${id}`,
    category,
    brand: category === 'fitness' ? 'imperio-fit' : 'bellmont',
    salesMode: category === 'streetwear' ? 'ASSISTED_PURCHASE' : 'INQUIRY_ONLY',
    price,
    images: ['/produto.png'],
  },
  variant: {
    id: `${id}-M`,
    size: category === 'streetwear' || category === 'fitness' ? 'M' : undefined,
    color: category === 'fitness' ? 'Preto' : undefined,
    volume: category === 'perfumes' ? '100 ml' : undefined,
    stock: 15,
    available: true,
  },
})

test('modo comercial inicial bloqueia checkout online', () => {
  assert.equal(COMMERCIAL_MODE, COMMERCIAL_MODES.WHATSAPP_ONLY)
})

test('mapeamento central envia Streetwear e Perfumaria à BELLMONT e Fitness à IMPÉRIO FIT', () => {
  assert.equal(getCommerceOwner(item('streetwear', 'street').product), 'bellmont')
  assert.equal(getCommerceOwner(item('perfumes', 'perfume').product), 'bellmont')
  assert.equal(getCommerceOwner(item('fitness', 'fitness').product), 'imperio-fit')
})

for (const scenario of [
  { name: 'somente Streetwear', categories: ['streetwear'] as ProductCategory[], owners: ['bellmont'] },
  { name: 'somente perfumes', categories: ['perfumes'] as ProductCategory[], owners: ['bellmont'] },
  { name: 'Streetwear + perfumes', categories: ['streetwear', 'perfumes'] as ProductCategory[], owners: ['bellmont'] },
  { name: 'Streetwear + Fitness exclui Fitness', categories: ['streetwear', 'fitness'] as ProductCategory[], owners: ['bellmont'] },
  { name: 'perfumes + Fitness exclui Fitness', categories: ['perfumes', 'fitness'] as ProductCategory[], owners: ['bellmont'] },
  { name: 'produtos das três categorias exclui Fitness', categories: ['streetwear', 'perfumes', 'fitness'] as ProductCategory[], owners: ['bellmont'] },
]) test(`roteia corretamente ${scenario.name}`, () => {
  const groups = groupCartItemsByCommerceOwner(scenario.categories.map((category, index) => item(category, `${category}-${index}`)))
  assert.deepEqual(groups.map(group => group.owner), scenario.owners)
  for (const group of groups) {
    assert.ok(group.url.startsWith(`${COMMERCIAL_CONTACTS[group.owner].whatsappUrl}?text=`))
    assert.ok(group.items.every(cartItem => getCommerceOwner(cartItem.product) === group.owner))
    for (const foreign of groups.filter(candidate => candidate.owner !== group.owner).flatMap(candidate => candidate.items)) {
      assert.equal(group.message.includes(foreign.product.name), false)
    }
  }
})

test('mensagem contém opções, quantidades, valores e ressalvas sem confirmar venda', () => {
  const cartItem = item('perfumes', 'perfume-yara', 280)
  const message = buildWhatsAppOrderMessage('bellmont', [cartItem])
  assert.match(message, /Produto perfume-yara/)
  assert.match(message, /Volume: 100 ml/)
  assert.match(message, /Quantidade: 2/)
  assert.match(message, /R\$\s?280,00/)
  assert.match(message, /R\$\s?560,00/)
  assert.match(message, /disponibilidade, o frete e a forma de pagamento/i)
  assert.match(message, /não confirma pedido, reserva ou pagamento/i)
})

test('URL usa encodeURIComponent e não aponta para o grupo oficial', () => {
  const cartItem = item('streetwear', 'camiseta-fé')
  const url = buildWhatsAppOrderUrl('bellmont', [cartItem])
  assert.equal(url.includes('chat.whatsapp.com'), false)
  assert.equal(decodeURIComponent(url.split('?text=')[1] ?? ''), buildWhatsAppOrderMessage('bellmont', [cartItem]))
})

test('item inválido não é enviado ao atendimento', () => {
  const invalid = { ...item('streetwear', 'invalid'), quantity: 0 }
  assert.equal(isValidWhatsAppCartItem(invalid), false)
  assert.deepEqual(groupCartItemsByCommerceOwner([invalid]), [])
})

test('perfume INQUIRY_ONLY da BELLMONT é aceito na sacola sem variante fictícia', () => {
  const inquiry = item('perfumes', 'perfume-consulta')
  inquiry.product.salesMode = 'INQUIRY_ONLY'
  inquiry.variant = undefined
  inquiry.variantId = undefined
  inquiry.selectedVolume = undefined
  assert.equal(isValidWhatsAppCartItem(inquiry), true)
  assert.deepEqual(groupCartItemsByCommerceOwner([inquiry]).map(group => group.owner), ['bellmont'])
  assert.match(buildWhatsAppProductInquiryMessage(inquiry.product), /opções\/variantes ainda precisam ser confirmadas/i)
})

test('Fitness INQUIRY_ONLY permanece fora da sacola e no atendimento próprio', () => {
  const fitness = item('fitness', 'fitness-consulta')
  assert.equal(isValidWhatsAppCartItem(fitness), false)
  assert.deepEqual(groupCartItemsByCommerceOwner([fitness]), [])
  assert.ok(buildWhatsAppProductInquiryUrl(fitness.product).startsWith(COMMERCIAL_CONTACTS['imperio-fit'].whatsappUrl))
})

test('mensagem unificada BELLMONT contém Streetwear e perfume no mesmo envio', () => {
  const streetwear = item('streetwear', 'camiseta-unificada')
  const perfume = item('perfumes', 'perfume-unificado')
  perfume.variant = undefined
  perfume.variantId = undefined
  const groups = groupCartItemsByCommerceOwner([streetwear, perfume])
  assert.equal(groups.length, 1)
  assert.equal(groups[0]?.owner, 'bellmont')
  assert.match(groups[0]!.message, /Produto camiseta-unificada/)
  assert.match(groups[0]!.message, /Produto perfume-unificado/)
})

test('subtotal parcial sinaliza item sem preço sem inventar total', () => {
  const streetwear = item('streetwear', 'camiseta-preco', 80)
  const perfume = item('perfumes', 'perfume-sem-preco', null)
  perfume.variant = undefined
  perfume.variantId = undefined
  const message = buildWhatsAppOrderMessage('bellmont', [streetwear, perfume])
  assert.match(message, /Subtotal dos itens com preço conhecido/)
  assert.match(message, /Valor sob consulta/)
  assert.match(message, /Valor final sujeito à confirmação pelo WhatsApp/)
  assert.doesNotMatch(message, /Volume:/)
})

test('consulta individual com variante inclui opção real sem confirmar pedido', () => {
  const cartItem = item('streetwear', 'street-whatsapp')
  const message = buildWhatsAppProductInquiryMessage(cartItem.product, cartItem.variant)
  assert.match(message, /Tamanho: M/)
  assert.match(message, /R\$\s?80,00/)
  assert.match(message, /confirme a disponibilidade/i)
  assert.match(message, /não confirma pedido, reserva ou pagamento/i)
  assert.ok(buildWhatsAppProductInquiryUrl(cartItem.product, cartItem.variant).startsWith(COMMERCIAL_CONTACTS.bellmont.whatsappUrl))
})

test('produto sem variante ou preço gera consulta sem inventar opção ou total', () => {
  const base = item('fitness', 'fitness-consulta').product
  const product = { ...base, price: null }
  const message = buildWhatsAppProductInquiryMessage(product)
  assert.match(message, /Preço informado: a confirmar/)
  assert.match(message, /opções\/variantes ainda precisam ser confirmadas/i)
  assert.equal(message.includes('Tamanho:'), false)
  assert.ok(buildWhatsAppProductInquiryUrl(product).startsWith(COMMERCIAL_CONTACTS['imperio-fit'].whatsappUrl))
})
