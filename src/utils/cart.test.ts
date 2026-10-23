import assert from 'node:assert/strict'
import test from 'node:test'
import { products } from '../data/products.ts'
import type { Product } from '../types/product.ts'
import { addCartSelection, calculateCartCount, calculateCartSubtotal, getCartItemKey, isProductPurchasable, isPurchasable, reconcileStoredCart, removeCartItem, resolveCart, resolveSelectedVariant, sanitizeStoredCart, setCartItemQuantity } from './cart.ts'

const purchasable: Product = {
  id: 'fixture-shirt',
  code: 'TEST-01',
  slug: 'fixture-shirt',
  name: 'Produto de teste',
  brand: 'bellmont',
  category: 'streetwear',
  salesMode: 'ASSISTED_PURCHASE',
  price: 80,
  images: ['/fixture.png'],
  availability: 'available',
  sizes: ['M', 'G'],
  colors: ['Preta'],
  variants: [
    { id: 'fixture-m-black', size: 'M', color: 'Preta', stock: 10, available: true },
    { id: 'fixture-g-black', size: 'G', color: 'Preta', stock: 10, available: true },
  ],
}

const catalog = [purchasable]
const selectionM = { productId: purchasable.id, selectedSize: 'M', selectedColor: 'Preta', variantId: 'fixture-m-black' }
const selectionG = { productId: purchasable.id, selectedSize: 'G', selectedColor: 'Preta', variantId: 'fixture-g-black' }

test('inventário oficial contém ST-01 a ST-20 por R$ 80 sem dados fictícios', () => {
  const streetwear = products.filter(product => product.category === 'streetwear')
  assert.equal(streetwear.length, 20)
  assert.deepEqual(streetwear.map(product => product.code), Array.from({ length: 20 }, (_, index) => `ST-${String(index + 1).padStart(2, '0')}`))
  assert.ok(streetwear.every(product => product.price === 80))
  assert.ok(streetwear.every(product => !product.sizes?.length && !product.colors?.length && !product.variants?.length))
  assert.ok(streetwear.every(product => product.availability !== 'available'))
  assert.ok(streetwear.every(product => !/Modelo 0[1-6]/i.test(product.name)))
})

test('adiciona produto apto com variante e soma a mesma variante', () => {
  const first = addCartSelection([], selectionM, catalog)
  assert.equal(first.ok, true)
  const second = addCartSelection(first.items, selectionM, catalog)
  assert.equal(second.items.length, 1)
  assert.equal(second.items[0]?.quantity, 2)
  assert.equal(calculateCartCount(second.items), 2)
})

test('mantém variantes diferentes em linhas diferentes', () => {
  const first = addCartSelection([], selectionM, catalog)
  const second = addCartSelection(first.items, selectionG, catalog)
  assert.equal(second.items.length, 2)
  assert.notEqual(getCartItemKey(second.items[0]!), getCartItemKey(second.items[1]!))
})

test('aumenta, diminui sem passar de um, remove e calcula subtotal pela fonte central', () => {
  const added = addCartSelection([], { ...selectionM, quantity: 2 }, catalog).items
  const key = getCartItemKey(added[0]!)
  const increased = setCartItemQuantity(added, key, 3, catalog)
  assert.equal(increased.items[0]?.quantity, 3)
  assert.equal(calculateCartSubtotal(increased.items, catalog), 240)
  const decreased = setCartItemQuantity(increased.items, key, 2, catalog)
  assert.equal(decreased.items[0]?.quantity, 2)
  assert.equal(setCartItemQuantity(decreased.items, key, 0, catalog).ok, false)
  assert.deepEqual(removeCartItem(decreased.items, key), [])
})

test('estoque 10 limita tentativa direta e adições repetidas de 11 unidades', () => {
  const direct = addCartSelection([], { ...selectionM, quantity: 11 }, catalog)
  assert.equal(direct.ok, true)
  assert.equal(direct.items[0]?.quantity, 10)
  assert.equal(direct.ok && direct.adjusted, true)

  let items = []
  for (let index = 0; index < 11; index += 1) items = addCartSelection(items, selectionM, catalog).items
  assert.equal(items[0]?.quantity, 10)
})

test('botão de aumentar permanece no limite efetivo da variante', () => {
  const items = addCartSelection([], { ...selectionM, quantity: 10 }, catalog).items
  const result = setCartItemQuantity(items, getCartItemKey(items[0]!), 11, catalog)
  assert.equal(result.ok, true)
  assert.equal(result.items[0]?.quantity, 10)
  assert.equal(result.ok && result.adjusted, true)
})

test('limite global de 99 prevalece quando o estoque confirmado é maior', () => {
  const highStock: Product = {
    ...purchasable,
    id: 'high-stock',
    variants: [{ ...purchasable.variants![0]!, id: 'high-stock-variant', stock: 150 }],
  }
  const result = addCartSelection([], {
    productId: highStock.id,
    selectedSize: 'M',
    selectedColor: 'Preta',
    variantId: 'high-stock-variant',
    quantity: 120,
  }, [highStock])
  assert.equal(result.items[0]?.quantity, 99)
  assert.equal(result.ok && result.adjusted, true)
})

test('redução de estoque após persistência ajusta a quantidade restaurada', () => {
  const stored = addCartSelection([], { ...selectionM, quantity: 10 }, catalog).items
  const reducedProduct: Product = {
    ...purchasable,
    variants: purchasable.variants!.map(variant => variant.id === selectionM.variantId ? { ...variant, stock: 3 } : variant),
  }
  const restored = sanitizeStoredCart(JSON.parse(JSON.stringify(stored)), [reducedProduct])
  assert.equal(restored[0]?.quantity, 3)
  const unavailableProduct = { ...reducedProduct, variants: reducedProduct.variants!.map(variant => ({ ...variant, available: false })) }
  assert.deepEqual(sanitizeStoredCart(stored, [unavailableProduct]), [])
})

test('persiste e reidrata apenas estrutura válida', () => {
  const stored = JSON.parse(JSON.stringify(addCartSelection([], selectionM, catalog).items))
  assert.deepEqual(sanitizeStoredCart(stored, catalog), stored)
  assert.deepEqual(sanitizeStoredCart('inválido', catalog), [])
  assert.deepEqual(sanitizeStoredCart([{ productId: 'inexistente', quantity: 1 }], catalog), [])
  assert.deepEqual(sanitizeStoredCart([{ ...selectionM, quantity: '2' }], catalog), [])
})

test('rejeita produto sem preço, indisponível e sem variante obrigatória', () => {
  const withoutPrice = { ...purchasable, id: 'no-price', price: undefined }
  const unavailable = { ...purchasable, id: 'unavailable', availability: 'unknown' as const }
  assert.equal(addCartSelection([], { productId: withoutPrice.id }, [withoutPrice]).ok, false)
  assert.equal(addCartSelection([], { productId: unavailable.id }, [unavailable]).ok, false)
  const missingVariant = addCartSelection([], { productId: purchasable.id, selectedSize: 'M', selectedColor: 'Preta' }, catalog)
  assert.equal(missingVariant.ok, false)
  if (!missingVariant.ok) assert.equal(missingVariant.reason, 'invalid-variant')
})

test('rejeita variante com estoque zero, ausente ou inválido', () => {
  for (const stock of [0, undefined, null, -1, 1.5, Number.NaN]) {
    const product: Product = {
      ...purchasable,
      id: `stock-${String(stock)}`,
      variants: [{ ...purchasable.variants![0]!, id: `variant-${String(stock)}`, stock }],
    }
    const variant = product.variants![0]!
    const result = addCartSelection([], {
      productId: product.id,
      selectedSize: variant.size ?? undefined,
      selectedColor: variant.color ?? undefined,
      variantId: variant.id,
    }, [product])
    assert.equal(result.ok, false)
  }
})

test('rejeita quantidades inválidas ao adicionar e alterar', () => {
  for (const quantity of [0, -1, 1.5, Number.NaN]) {
    assert.equal(addCartSelection([], { ...selectionM, quantity }, catalog).ok, false)
  }
  const items = addCartSelection([], selectionM, catalog).items
  const key = getCartItemKey(items[0]!)
  for (const quantity of [0, -1, 1.5, Number.NaN]) {
    assert.equal(setCartItemQuantity(items, key, quantity, catalog).ok, false)
  }
})

test('resolve a variante estável pela combinação de opções', () => {
  const variantM = resolveSelectedVariant(purchasable, selectionM)
  const variantG = resolveSelectedVariant(purchasable, selectionG)
  assert.equal(variantM?.id, 'fixture-m-black')
  assert.equal(variantG?.id, 'fixture-g-black')
  assert.equal(resolveSelectedVariant(purchasable, { selectedSize: 'P', selectedColor: 'Preta' }), undefined)
})

test('centraliza purchasability e rejeita variante sem estoque', () => {
  const availableVariant = resolveSelectedVariant(purchasable, selectionM)
  assert.equal(isProductPurchasable(purchasable), true)
  assert.equal(isPurchasable(purchasable, availableVariant), true)
  const soldOut: Product = {
    ...purchasable,
    id: 'fixture-sold-out',
    variants: [{ id: 'fixture-sold-out-m', size: 'M', color: 'Preta', stock: 0, available: true }],
  }
  assert.equal(isProductPurchasable(soldOut), false)
  assert.equal(isPurchasable(soldOut, soldOut.variants![0]), false)
  assert.equal(addCartSelection([], { productId: soldOut.id, selectedSize: 'M', selectedColor: 'Preta', variantId: 'fixture-sold-out-m' }, [soldOut]).ok, false)
})

test('preserva separação por tamanho, cor e volume e categorias reais', () => {
  const perfume: Product = {
    id: 'perfume-test', slug: 'perfume-test', name: 'Perfume teste', brand: 'bellmont', manufacturer: null,
    category: 'perfumes', salesMode: 'ASSISTED_PURCHASE', price: 200, images: ['/perfume.png'], availability: 'available',
    variants: [
      { id: 'perfume-50', volume: '50 ml', stock: 2, available: true },
      { id: 'perfume-100', volume: '100 ml', stock: 3, available: true },
    ],
  }
  const combinedCatalog = [purchasable, perfume]
  const first = addCartSelection([], { productId: perfume.id, variantId: 'perfume-50' }, combinedCatalog)
  const second = addCartSelection(first.items, { productId: perfume.id, variantId: 'perfume-100' }, combinedCatalog)
  const third = addCartSelection(second.items, selectionM, combinedCatalog)
  assert.equal(third.items.length, 3)
  assert.deepEqual(resolveCart(third.items, combinedCatalog).map(item => ({ category: item.product.category, volume: item.variant.volume })), [
    { category: 'perfumes', volume: '50 ml' },
    { category: 'perfumes', volume: '100 ml' },
    { category: 'streetwear', volume: undefined },
  ])
})

test('alternância para catálogo vazio remove itens incompatíveis sem fallback', () => {
  const stored = addCartSelection([], selectionM, catalog).items
  assert.deepEqual(sanitizeStoredCart(stored, []), [])
})

test('nenhum produto comercial sem estoque confirmado pode ser comprado', () => {
  const commercialProducts = products.filter(product => !product.id.startsWith('dev-'))
  assert.ok(commercialProducts.length > 0)
  assert.ok(commercialProducts.every(product => !isProductPurchasable(product)))
})

test('disponibilidade pública permite seleção sem inventar estoque exato', () => {
  const coarse: Product = {
    ...purchasable,
    id: 'ST-REMOTE',
    legacyIds: ['77'],
    variants: [{ id: 'ST-REMOTE-M', legacyIds: ['770'], sku: 'ST-REMOTE-M', size: 'M', color: 'Preta', stock: null, available: true, availabilityStatus: 'available' }],
  }
  const result = addCartSelection([], { productId: '77', variantId: '770', selectedSize: 'M', selectedColor: 'Preta' }, [coarse])
  assert.equal(result.ok, true)
  assert.equal(result.items[0]?.productId, 'ST-REMOTE')
  assert.equal(result.items[0]?.variantId, 'ST-REMOTE-M')
  assert.equal(coarse.variants?.[0]?.stock, null)
})

test('out_of_stock e unconfirmed permanecem bloqueados', () => {
  for (const availabilityStatus of ['out_of_stock', 'unconfirmed'] as const) {
    const product: Product = {
      ...purchasable,
      id: `coarse-${availabilityStatus}`,
      availability: availabilityStatus === 'unconfirmed' ? 'unknown' : 'unavailable',
      variants: [{ id: `variant-${availabilityStatus}`, size: 'M', color: 'Preta', stock: null, available: false, availabilityStatus }],
    }
    assert.equal(addCartSelection([], {
      productId: product.id, variantId: product.variants![0]!.id, selectedSize: 'M', selectedColor: 'Preta',
    }, [product]).ok, false)
  }
})

test('alternância de fonte preserva item incompatível e o restaura pelo alias estável', () => {
  const stored = [{ productId: 'legacy-product', variantId: 'legacy-variant', selectedSize: 'M', selectedColor: 'Preta', quantity: 2 }]
  const unavailableSource = reconcileStoredCart(stored, [])
  assert.deepEqual(unavailableSource.items, [])
  assert.deepEqual(unavailableSource.preservedItems, stored)

  const migrated: Product = {
    ...purchasable,
    id: 'ST-MIGRATED',
    legacyIds: ['legacy-product'],
    variants: [{ ...purchasable.variants![0]!, id: 'ST-MIGRATED-M', legacyIds: ['legacy-variant'] }],
  }
  const restored = reconcileStoredCart(unavailableSource.preservedItems, [migrated])
  assert.equal(restored.preservedItems.length, 0)
  assert.deepEqual(restored.items, [{
    productId: 'ST-MIGRATED', variantId: 'ST-MIGRATED-M', selectedSize: 'M', selectedColor: 'Preta', quantity: 2,
  }])
})

test('modo WhatsApp aceita variante real não confirmada sem liberar checkout online', () => {
  const assisted: Product = {
    ...purchasable,
    id: 'ST-ASSISTED',
    availability: 'unknown',
    variants: [{ id: 'ST-ASSISTED-PTO-M', sku: 'ST-ASSISTED-PTO-M', size: 'M', color: 'Preta', stock: null, available: null, availabilityStatus: 'unconfirmed' }],
  }
  const selection = { productId: assisted.id, variantId: 'ST-ASSISTED-PTO-M', selectedSize: 'M', selectedColor: 'Preta' }
  assert.equal(addCartSelection([], selection, [assisted]).ok, false)
  const assistedResult = addCartSelection([], selection, [assisted], 'whatsapp')
  assert.equal(assistedResult.ok, true)
  assert.equal(resolveCart(assistedResult.items, [assisted], 'whatsapp').length, 1)
})

test('modo WhatsApp continua bloqueando variante explicitamente esgotada', () => {
  const soldOut: Product = {
    ...purchasable,
    id: 'ST-ASSISTED-SOLD-OUT',
    availability: 'unavailable',
    variants: [{ id: 'ST-ASSISTED-SOLD-OUT-M', size: 'M', color: 'Preta', stock: 0, available: false, availabilityStatus: 'out_of_stock' }],
  }
  assert.equal(addCartSelection([], { productId: soldOut.id, variantId: soldOut.variants![0]!.id, selectedSize: 'M', selectedColor: 'Preta' }, [soldOut], 'whatsapp').ok, false)
})

test('INQUIRY_ONLY nunca entra na sacola mesmo com preço, variante e estoque', () => {
  const inquiry: Product = { ...purchasable, id: 'PF-INQUIRY', category: 'perfumes', salesMode: 'INQUIRY_ONLY' }
  const selection = { productId: inquiry.id, variantId: 'fixture-m-black', selectedSize: 'M', selectedColor: 'Preta' }
  assert.equal(addCartSelection([], selection, [inquiry], 'online').ok, false)
  assert.equal(addCartSelection([], selection, [inquiry], 'whatsapp').ok, false)
  assert.equal(isProductPurchasable(inquiry), false)
})

const perfumeInquiry = (overrides: Partial<Product> = {}): Product => ({
  id: 'PF-CART', code: 'PF-CART', slug: 'perfume-cart', name: 'Perfume para sacola',
  brand: 'bellmont', category: 'perfumes', salesMode: 'INQUIRY_ONLY', price: 250,
  images: ['/perfume-cart.png'], availability: 'unknown', ...overrides,
})

test('perfume BELLMONT INQUIRY_ONLY entra na sacola WhatsApp sem variante', () => {
  const perfume = perfumeInquiry()
  const result = addCartSelection([], { productId: perfume.id }, [perfume], 'whatsapp')
  assert.equal(result.ok, true)
  assert.deepEqual(result.items, [{ productId: perfume.id, quantity: 1 }])
  assert.equal(resolveCart(result.items, [perfume], 'whatsapp')[0]?.variant, undefined)
})

test('perfume sem preço entra na sacola e não inventa subtotal', () => {
  const perfume = perfumeInquiry({ price: null })
  const result = addCartSelection([], { productId: perfume.id }, [perfume], 'whatsapp')
  assert.equal(result.ok, true)
  assert.equal(resolveCart(result.items, [perfume], 'whatsapp')[0]?.lineTotal, null)
  assert.equal(calculateCartSubtotal(result.items, [perfume], 'whatsapp'), 0)
})

test('perfume sem volume entra sem criar opção ou variante fictícia', () => {
  const perfume = perfumeInquiry({ variants: null })
  const result = addCartSelection([], { productId: perfume.id, quantity: 2 }, [perfume], 'whatsapp')
  assert.equal(result.ok, true)
  assert.equal(result.items[0]?.variantId, undefined)
  assert.equal(result.items[0]?.selectedVolume, undefined)
})

test('perfume rejeita variante, tamanho, cor ou volume artificial', () => {
  const perfume = perfumeInquiry()
  for (const selection of [
    { productId: perfume.id, variantId: 'fake' },
    { productId: perfume.id, selectedSize: 'M' },
    { productId: perfume.id, selectedColor: 'Rosa' },
    { productId: perfume.id, selectedVolume: '100 ml' },
  ]) assert.equal(addCartSelection([], selection, [perfume], 'whatsapp').ok, false)
})

test('adições repetidas do perfume consolidam a mesma linha estável', () => {
  const perfume = perfumeInquiry()
  const first = addCartSelection([], { productId: perfume.id }, [perfume], 'whatsapp')
  const second = addCartSelection(first.items, { productId: perfume.id, quantity: 2 }, [perfume], 'whatsapp')
  assert.equal(second.items.length, 1)
  assert.equal(second.items[0]?.quantity, 3)
})

test('quantidade do perfume pode ser alterada e removida sem simular estoque', () => {
  const perfume = perfumeInquiry()
  const added = addCartSelection([], { productId: perfume.id }, [perfume], 'whatsapp').items
  const key = getCartItemKey(added[0]!)
  const changed = setCartItemQuantity(added, key, 4, [perfume], 'whatsapp')
  assert.equal(changed.items[0]?.quantity, 4)
  assert.deepEqual(removeCartItem(changed.items, key), [])
})

test('persistência restaura perfume sem variante no modo WhatsApp', () => {
  const perfume = perfumeInquiry()
  const stored = [{ productId: perfume.id, quantity: 3 }]
  assert.deepEqual(reconcileStoredCart(stored, [perfume], 'whatsapp').items, stored)
})

test('Streetwear e perfume coexistem e subtotal soma somente preços conhecidos', () => {
  const perfume = perfumeInquiry({ price: null })
  const streetwear = addCartSelection([], selectionM, catalog, 'whatsapp').items
  const mixed = addCartSelection(streetwear, { productId: perfume.id, quantity: 2 }, [purchasable, perfume], 'whatsapp')
  assert.equal(mixed.items.length, 2)
  assert.equal(calculateCartSubtotal(mixed.items, [purchasable, perfume], 'whatsapp'), 80)
})

test('Fitness INQUIRY_ONLY continua bloqueado em todas as modalidades', () => {
  const fitness = perfumeInquiry({ id: 'IF-CART', code: 'IF-CART', category: 'fitness', brand: 'imperio-fit' })
  assert.equal(addCartSelection([], { productId: fitness.id }, [fitness], 'whatsapp').ok, false)
  assert.equal(addCartSelection([], { productId: fitness.id }, [fitness], 'online').ok, false)
})

test('fixture técnica e produto explicitamente indisponível continuam bloqueados', () => {
  const fixture = perfumeInquiry({ id: 'TEST-FIXTURE-01', code: 'TEST-FIXTURE-01' })
  const unavailable = perfumeInquiry({ id: 'PF-OFF', availability: 'unavailable' })
  assert.equal(addCartSelection([], { productId: fixture.id }, [fixture], 'whatsapp').ok, false)
  assert.equal(addCartSelection([], { productId: unavailable.id }, [unavailable], 'whatsapp').ok, false)
})

test('exceção da Perfumaria não libera perfume para checkout online', () => {
  const perfume = perfumeInquiry()
  assert.equal(addCartSelection([], { productId: perfume.id }, [perfume], 'online').ok, false)
  assert.equal(isProductPurchasable(perfume), false)
})
