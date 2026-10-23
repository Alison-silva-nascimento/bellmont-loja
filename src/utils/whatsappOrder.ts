import { COMMERCIAL_CONTACTS, getCommerceOwner, type CommerceOwner } from '../config/commercialMode'
import type { ResolvedCartItem } from '../types/cart'
import type { Product, ProductVariant } from '../types/product'
import { isBellmontPerfumeEligibleForWhatsAppCart } from './cart'
import { PRODUCT_SALES_MODES } from '../types/product'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export type WhatsAppOrderGroup = {
  owner: CommerceOwner
  items: ResolvedCartItem[]
  url: string
  message: string
}

export const isValidWhatsAppCartItem = (item: ResolvedCartItem) =>
  ((item.product.category === 'streetwear' && item.product.brand === 'bellmont' && item.product.salesMode === PRODUCT_SALES_MODES.ASSISTED_PURCHASE && Boolean(item.variant?.id)) ||
    isBellmontPerfumeEligibleForWhatsAppCart(item.product)) &&
  Boolean(item.product?.name.trim()) &&
  Number.isInteger(item.quantity) && item.quantity > 0

const optionLines = (item: ResolvedCartItem) => [
  item.variant?.size ? `Tamanho: ${item.variant.size}` : null,
  item.variant?.color ? `Cor: ${item.variant.color}` : null,
  item.variant?.volume ? `Volume: ${item.variant.volume}` : null,
].filter((value): value is string => Boolean(value))

const hasKnownPrice = (item: ResolvedCartItem) =>
  typeof item.product.price === 'number' && Number.isFinite(item.product.price) && item.product.price >= 0

export function buildWhatsAppOrderMessage(owner: CommerceOwner, items: ResolvedCartItem[]) {
  const contact = COMMERCIAL_CONTACTS[owner]
  const validItems = items.filter(isValidWhatsAppCartItem)
  if (!validItems.length) throw new Error('WHATSAPP_ORDER_EMPTY')

  const itemLines = validItems.flatMap((item, index) => {
    const knownPrice = hasKnownPrice(item)
    const unitPrice = knownPrice ? Number(item.product.price) : null
    const subtotal = unitPrice == null ? null : unitPrice * item.quantity
    return [
      `${index + 1}. ${item.product.name}`,
      ...optionLines(item).map(option => `   ${option}`),
      `   Quantidade: ${item.quantity}`,
      `   Preço unitário: ${unitPrice == null ? 'Valor sob consulta' : brl.format(unitPrice)}`,
      `   Subtotal: ${subtotal == null ? 'Valor sob consulta' : brl.format(subtotal)}`,
    ]
  })

  const pricedItems = validItems.filter(hasKnownPrice)
  const knownTotal = pricedItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)
  const allPricesKnown = pricedItems.length === validItems.length

  return [
    `Olá, ${contact.label}! Gostaria de solicitar atendimento para estes itens:`,
    '',
    ...itemLines,
    '',
    ...(pricedItems.length ? [`${allPricesKnown ? 'Subtotal' : 'Subtotal dos itens com preço conhecido'}: ${brl.format(knownTotal)}`] : []),
    ...(!allPricesKnown ? ['Valor final sujeito à confirmação pelo WhatsApp.'] : []),
    '',
    'A disponibilidade, o frete e a forma de pagamento serão confirmados separadamente no atendimento.',
    'Esta mensagem é uma solicitação de atendimento e não confirma pedido, reserva ou pagamento.',
  ].join('\n')
}

export const buildWhatsAppOrderUrl = (owner: CommerceOwner, items: ResolvedCartItem[]) => {
  const message = buildWhatsAppOrderMessage(owner, items)
  return `${COMMERCIAL_CONTACTS[owner].whatsappUrl}?text=${encodeURIComponent(message)}`
}

export function groupCartItemsByCommerceOwner(items: ResolvedCartItem[]): WhatsAppOrderGroup[] {
  const grouped = new Map<CommerceOwner, ResolvedCartItem[]>([
    ['bellmont', []],
    ['imperio-fit', []],
  ])
  items.filter(isValidWhatsAppCartItem).forEach(item => grouped.get(getCommerceOwner(item.product))!.push(item))
  return ([...grouped.entries()] as Array<[CommerceOwner, ResolvedCartItem[]]>)
    .filter(([, ownerItems]) => ownerItems.length > 0)
    .map(([owner, ownerItems]) => ({
      owner,
      items: ownerItems,
      message: buildWhatsAppOrderMessage(owner, ownerItems),
      url: buildWhatsAppOrderUrl(owner, ownerItems),
    }))
}

const categoryNames = { streetwear: 'Streetwear', fitness: 'Fitness', perfumes: 'Perfumaria' } as const

export function buildWhatsAppProductInquiryMessage(product: Product, variant?: ProductVariant, quantity = 1) {
  if (!product.name.trim() || !Number.isInteger(quantity) || quantity < 1) throw new Error('WHATSAPP_INQUIRY_INVALID')
  const owner = getCommerceOwner(product)
  const contact = COMMERCIAL_CONTACTS[owner]
  const unitPrice = typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0 ? product.price : null
  const options = [
    variant?.size ? `Tamanho: ${variant.size}` : null,
    variant?.color ? `Cor: ${variant.color}` : null,
    variant?.volume ? `Volume: ${variant.volume}` : null,
  ].filter((value): value is string => Boolean(value))
  return [
    `Olá, ${contact.label}! Gostaria de atendimento para este produto:`,
    '',
    product.name,
    `Categoria: ${categoryNames[product.category]}`,
    ...options,
    `Quantidade: ${quantity}`,
    `Preço informado: ${unitPrice == null ? 'a confirmar' : brl.format(unitPrice)}`,
    '',
    variant ? 'Por favor, confirme a disponibilidade desta variante, o frete e a forma de pagamento.' : 'As opções/variantes ainda precisam ser confirmadas. Por favor, informe a disponibilidade, o frete e a forma de pagamento.',
    'Esta mensagem é uma solicitação de atendimento e não confirma pedido, reserva ou pagamento.',
  ].join('\n')
}

export const buildWhatsAppProductInquiryUrl = (product: Product, variant?: ProductVariant, quantity = 1) => {
  const owner = getCommerceOwner(product)
  return `${COMMERCIAL_CONTACTS[owner].whatsappUrl}?text=${encodeURIComponent(buildWhatsAppProductInquiryMessage(product, variant, quantity))}`
}

