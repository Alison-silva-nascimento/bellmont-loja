import type { Product } from '../types/product'
import { asset } from '../utils/asset'

export const devCartProduct: Product = {
  id: 'dev-streetwear-01',
  code: 'DEV-STREETWEAR-01',
  slug: 'dev-camiseta-teste-sacola',
  name: 'Camiseta DEV — Teste de Sacola',
  brand: 'bellmont',
  category: 'streetwear',
  price: 80,
  images: [asset('catalog-streetwear-goku-white.png')],
  colors: ['Branca'],
  sizes: ['M', 'G'],
  availability: 'available',
  variants: [
    { id: 'dev-streetwear-01-branca-m', color: 'Branca', size: 'M', stock: 10, available: true },
    { id: 'dev-streetwear-01-branca-g', color: 'Branca', size: 'G', stock: 10, available: true },
  ],
}
