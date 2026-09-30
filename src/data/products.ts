import type { Product } from '../types/product'
import { asset } from '../utils/asset'

export const products: Product[] = [
  { id: 'street-01', code: 'ST-01', brand: 'bellmont', slug: 'camiseta-oversized-caveira-preta', name: 'Camiseta Oversized Caveira — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-goku-black.png')], featured: true, newArrival: true },
  { id: 'street-02', code: 'ST-02', brand: 'bellmont', slug: 'camiseta-oversized-goku-branca', name: 'Camiseta Oversized Goku — Branca', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-goku-white.png')], featured: true },
  { id: 'street-03', code: 'ST-03', brand: 'bellmont', slug: 'camiseta-oversized-estampada-preta', name: 'Camiseta Oversized Estampada — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-dragon-black.png')], newArrival: true },
  { id: 'street-04', code: 'ST-04', brand: 'bellmont', slug: 'camiseta-oversized-lobo-preta', name: 'Camiseta Oversized Lobo — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-wolf.png')], newArrival: true },
  { id: 'street-05', code: 'ST-05', brand: 'bellmont', slug: 'camiseta-oversized-toji-fushiguro-preta', name: 'Camiseta Oversized Toji Fushiguro — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-solo-leveling.png')], newArrival: true },
  { id: 'street-06', code: 'ST-06', brand: 'bellmont', slug: 'camiseta-oversized-gohan-branca', name: 'Camiseta Oversized Gohan — Branca', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-gohan.png')], newArrival: true },
  { id: 'street-07', code: 'ST-07', brand: 'bellmont', slug: 'camiseta-oversized-fe-preta-estampa-religiosa-costas', name: 'Camiseta Oversized Fé — Preta, estampa religiosa nas costas', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-faith-v2.png')], newArrival: true },
  { id: 'street-08', code: 'ST-08', brand: 'bellmont', slug: 'camiseta-oversized-branca-yeshua-leao', name: 'Camiseta Oversized — Branca, estampa Yeshua/Leão', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-model-01-v2.png'), asset('catalog-streetwear-model-01-front.jpg'), asset('catalog-streetwear-model-01-back.jpg')], newArrival: true },
  { id: 'street-09', code: 'ST-09', brand: 'bellmont', slug: 'camiseta-oversized-nike-branca-estampa-jornal', name: 'Camiseta Oversized Nike — Branca, estampa jornal', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-model-02-v2.png'), asset('catalog-streetwear-model-02-front.jpg'), asset('catalog-streetwear-model-02-back.jpg')], newArrival: true },
  { id: 'street-10', code: 'ST-10', brand: 'bellmont', slug: 'camiseta-oversized-sem-estampa-bege', name: 'Camiseta Oversized Sem Estampa — Bege', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-model-03-v2.png'), asset('catalog-streetwear-model-03.jpg')], newArrival: true },
  { id: 'street-11', code: 'ST-11', brand: 'bellmont', slug: 'camiseta-oversized-nike-branca-estampa-personagem', name: 'Camiseta Oversized Nike — Branca, estampa personagem', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-model-04-v2.png'), asset('catalog-streetwear-model-04-front.jpg'), asset('catalog-streetwear-model-04-back.jpg')], newArrival: true },
  { id: 'street-12', code: 'ST-12', brand: 'bellmont', slug: 'camiseta-oversized-fe-preta-frase-costas', name: 'Camiseta Oversized Fé — Preta, frase nas costas', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-model-05-v2.png'), asset('catalog-streetwear-model-05-front.jpg'), asset('catalog-streetwear-model-05-back.jpg')], newArrival: true },
  { id: 'street-13', code: 'ST-13', brand: 'bellmont', slug: 'camiseta-oversized-jesus-branca', name: 'Camiseta Oversized Jesus — Branca', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-model-06-v2.png'), asset('catalog-streetwear-model-06.jpg')], newArrival: true },
  { id: 'fitness-01', brand: 'imperio-fit', slug: 'macaquinho-fitness-vinho', name: 'Macaquinho Fitness — Vinho', category: 'fitness', price: 250, images: [asset('imperio-fit-burgundy.png')], featured: true, newArrival: true },
  { id: 'fitness-02', brand: 'imperio-fit', slug: 'macaquinho-fitness-preto', name: 'Macaquinho Fitness — Preto', category: 'fitness', price: 200, images: [asset('imperio-fit-black.png')], newArrival: true },
  { id: 'fitness-03', brand: 'imperio-fit', slug: 'conjunto-fitness-marinho', name: 'Conjunto Fitness — Marinho', category: 'fitness', price: 250, images: [asset('imperio-fit-navy.png')], newArrival: true },
  { id: 'fitness-04', brand: 'imperio-fit', slug: 'conjunto-fitness-preto-recortes', name: 'Conjunto Fitness — Preto', category: 'fitness', price: 210, images: [asset('imperio-fit-lines.png')], newArrival: true },
  { id: 'perfume-01', brand: 'bellmont', slug: 'athena-eau-de-parfum', name: 'Athena Eau de Parfum', category: 'perfumes', images: [asset('catalog-perfume-athena.png')], featured: true, newArrival: true },
  { id: 'perfume-02', brand: 'bellmont', slug: 'al-noble-wazeer', name: 'Al Noble Wazeer', category: 'perfumes', images: [asset('catalog-perfume-al-noble.png')], featured: true, newArrival: true },
  { id: 'perfume-03', brand: 'bellmont', slug: 'yara-lattafa', name: 'Yara Lattafa', category: 'perfumes', images: [asset('catalog-perfume-yara.png')], newArrival: true },
  { id: 'perfume-04', brand: 'bellmont', slug: 'asad-lattafa', name: 'Asad Lattafa', category: 'perfumes', images: [asset('catalog-perfume-asad.png')], newArrival: true },
  { id: 'perfume-05', brand: 'bellmont', slug: 'odyssey-mandarin-sky', name: 'Odyssey Mandarin Sky', category: 'perfumes', images: [asset('catalog-perfume-mandarin-sky.png')], newArrival: true },
  { id: 'perfume-06', brand: 'bellmont', slug: 'ameerat-al-arab', name: 'Ameerat Al Arab', category: 'perfumes', images: [asset('catalog-perfume-ameerat.png')], newArrival: true },
  { id: 'perfume-07', brand: 'bellmont', slug: 'hawas-for-him', name: 'Hawas For Him', category: 'perfumes', images: [asset('catalog-perfume-hawas.png')], newArrival: true },
  { id: 'perfume-08', brand: 'bellmont', slug: 'panther-pour-homme', name: 'Panther Pour Homme', category: 'perfumes', images: [asset('catalog-perfume-panther.png')], newArrival: true },
  { id: 'perfume-09', brand: 'bellmont', slug: 'fakhar-lattafa', name: 'Fakhar Lattafa', category: 'perfumes', images: [asset('catalog-perfume-fakhar.png')], newArrival: true },
  { id: 'perfume-10', brand: 'bellmont', slug: 'sabah-al-ward', name: 'Sabah Al Ward', category: 'perfumes', images: [asset('catalog-perfume-sabah.png')], newArrival: true },
  { id: 'perfume-11', brand: 'bellmont', slug: 'attar-al-wesal', name: 'Attar Al Wesal', category: 'perfumes', images: [asset('catalog-perfume-attar.png')], newArrival: true },
]

export const brandLabels = { bellmont: 'BELLMONT', 'imperio-fit': 'IMPÉRIO FIT' } as const
export const categoryLabels = { streetwear: 'Streetwear', fitness: 'Fitness', perfumes: 'Perfumaria' } as const

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export const getProductBySlug = (slug?: string) => products.find(product => product.slug === slug)
export const getProductsByCategory = (category: Product['category']) => products.filter(product => product.category === category)
export const getProductsByBrand = (brand: Product['brand']) => products.filter(product => product.brand === brand)
export const getRelatedProducts = (product: Product, limit = 4) => products.filter(item => item.id !== product.id && item.brand === product.brand && item.category === product.category).slice(0, limit)
export const searchProducts = (query: string) => {
  const term = normalize(query.trim())
  if (!term) return []
  return products.filter(product => normalize([product.name, brandLabels[product.brand], categoryLabels[product.category], product.subcategory].filter(Boolean).join(' ')).includes(term))
}
