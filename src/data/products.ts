import type { Product } from '../types/product'
import { asset } from '../utils/asset'

export const products: Product[] = [
  { id: 'street-01', brand: 'bellmont', slug: 'camiseta-oversized-goku-preta', name: 'Camiseta Oversized Caveira — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-goku-black.png')], availability: 'unknown', featured: true, newArrival: true },
  { id: 'street-02', brand: 'bellmont', slug: 'camiseta-oversized-goku-branca', name: 'Camiseta Oversized Goku — Branca', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-goku-white.png')], availability: 'unknown', featured: true },
  { id: 'street-03', brand: 'bellmont', slug: 'camiseta-oversized-estampada', name: 'Camiseta Oversized Estampada — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-dragon-black.png')], availability: 'unknown', newArrival: true },
  { id: 'street-04', brand: 'bellmont', slug: 'camiseta-lobo-preta', name: 'Camiseta Lobo — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-wolf.png')], availability: 'unknown', newArrival: true },
  { id: 'street-05', brand: 'bellmont', slug: 'camiseta-solo-leveling-preta', name: 'Camiseta Solo Leveling — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-solo-leveling.png')], availability: 'unknown', newArrival: true },
  { id: 'street-06', brand: 'bellmont', slug: 'camiseta-gohan-branca', name: 'Camiseta Gohan — Branca', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-gohan.png')], availability: 'unknown', newArrival: true },
  { id: 'street-07', brand: 'bellmont', slug: 'camiseta-faith-preta', name: 'Camiseta Fé — Preta', category: 'streetwear', price: 80, images: [asset('catalog-streetwear-faith.png')], availability: 'unknown', newArrival: true },
  { id: 'fitness-01', brand: 'imperio-fit', slug: 'macaquinho-fitness-vinho', name: 'Macaquinho Fitness — Vinho', category: 'fitness', images: [asset('imperio-fit-burgundy.png')], availability: 'unknown', featured: true, newArrival: true },
  { id: 'fitness-02', brand: 'imperio-fit', slug: 'macaquinho-fitness-preto', name: 'Macaquinho Fitness — Preto', category: 'fitness', images: [asset('imperio-fit-black.png')], availability: 'unknown', newArrival: true },
  { id: 'fitness-03', brand: 'imperio-fit', slug: 'conjunto-fitness-marinho', name: 'Conjunto Fitness — Marinho', category: 'fitness', images: [asset('imperio-fit-navy.png')], availability: 'unknown', newArrival: true },
  { id: 'fitness-04', brand: 'imperio-fit', slug: 'conjunto-fitness-preto-recortes', name: 'Conjunto Fitness — Preto', category: 'fitness', images: [asset('imperio-fit-lines.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-01', brand: 'bellmont', slug: 'athena-eau-de-parfum', name: 'Athena Eau de Parfum', category: 'perfumes', images: [asset('catalog-perfume-athena.png')], availability: 'unknown', featured: true, newArrival: true },
  { id: 'perfume-02', brand: 'bellmont', slug: 'al-noble-wazeer', name: 'Al Noble Wazeer', category: 'perfumes', images: [asset('catalog-perfume-al-noble.png')], availability: 'unknown', featured: true, newArrival: true },
  { id: 'perfume-03', brand: 'bellmont', slug: 'yara-lattafa', name: 'Yara Lattafa', category: 'perfumes', images: [asset('catalog-perfume-yara.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-04', brand: 'bellmont', slug: 'asad-lattafa', name: 'Asad Lattafa', category: 'perfumes', images: [asset('catalog-perfume-asad.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-05', brand: 'bellmont', slug: 'odyssey-mandarin-sky', name: 'Odyssey Mandarin Sky', category: 'perfumes', images: [asset('catalog-perfume-mandarin-sky.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-06', brand: 'bellmont', slug: 'ameerat-al-arab', name: 'Ameerat Al Arab', category: 'perfumes', images: [asset('catalog-perfume-ameerat.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-07', brand: 'bellmont', slug: 'hawas-for-him', name: 'Hawas For Him', category: 'perfumes', images: [asset('catalog-perfume-hawas.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-08', brand: 'bellmont', slug: 'panther-pour-homme', name: 'Panther Pour Homme', category: 'perfumes', images: [asset('catalog-perfume-panther.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-09', brand: 'bellmont', slug: 'fakhar-lattafa', name: 'Fakhar Lattafa', category: 'perfumes', images: [asset('catalog-perfume-fakhar.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-10', brand: 'bellmont', slug: 'sabah-al-ward', name: 'Sabah Al Ward', category: 'perfumes', images: [asset('catalog-perfume-sabah.png')], availability: 'unknown', newArrival: true },
  { id: 'perfume-11', brand: 'bellmont', slug: 'attar-al-wesal', name: 'Attar Al Wesal', category: 'perfumes', images: [asset('catalog-perfume-attar.png')], availability: 'unknown', newArrival: true },
]
