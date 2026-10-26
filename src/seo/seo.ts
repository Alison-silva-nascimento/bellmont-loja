import type { Product } from '../types/product'

export const SITE_ORIGIN = 'https://bellmontloja.com.br'

type SeoDefinition = {
  title: string
  description: string
  indexable: boolean
}

const routeSeo: Record<string, SeoDefinition> = {
  '/': {
    title: 'BELLMONT + IMPÉRIO FIT — Moda, performance e lifestyle',
    description: 'Streetwear, perfumaria e moda fitness em uma experiência de compra assistida pelo WhatsApp.',
    indexable: true,
  },
  '/streetwear': {
    title: 'Streetwear — BELLMONT',
    description: 'Conheça a coleção Streetwear BELLMONT, com peças oversized, identidade urbana e compra assistida.',
    indexable: true,
  },
  '/imperio-fit': {
    title: 'IMPÉRIO FIT — Moda fitness e performance',
    description: 'Conheça a coleção IMPÉRIO FIT e consulte modelos, preços e disponibilidade pelo atendimento oficial.',
    indexable: true,
  },
  '/perfumes': {
    title: 'Perfumaria — BELLMONT',
    description: 'Descubra a seleção de perfumes BELLMONT com preços confirmados e atendimento comercial pelo WhatsApp.',
    indexable: true,
  },
  '/produtos': {
    title: 'Todos os produtos — BELLMONT + IMPÉRIO FIT',
    description: 'Explore o catálogo completo de Streetwear, perfumes e moda fitness da BELLMONT + IMPÉRIO FIT.',
    indexable: true,
  },
  '/contato': {
    title: 'Contato — BELLMONT + IMPÉRIO FIT',
    description: 'Acesse os canais oficiais de atendimento da BELLMONT e da IMPÉRIO FIT.',
    indexable: true,
  },
  '/privacidade': {
    title: 'Política de Privacidade — BELLMONT',
    description: 'Consulte a Política de Privacidade e as informações sobre tratamento de dados da BELLMONT.',
    indexable: true,
  },
  '/termos': {
    title: 'Termos de Uso — BELLMONT',
    description: 'Consulte os termos aplicáveis ao catálogo, à sacola e ao atendimento comercial da BELLMONT.',
    indexable: true,
  },
  '/trocas-e-devolucoes': {
    title: 'Trocas e Devoluções — BELLMONT',
    description: 'Veja as orientações da BELLMONT para trocas, devoluções, arrependimento e atendimento por defeito.',
    indexable: true,
  },
  '/entregas': {
    title: 'Política de Entrega — BELLMONT',
    description: 'Consulte como frete, prazo e modalidade de entrega são confirmados no atendimento BELLMONT.',
    indexable: true,
  },
  '/sobre': {
    title: 'Sobre a BELLMONT',
    description: 'Conheça a BELLMONT, sua seleção de Streetwear e Perfumaria e a experiência integrada da IMPÉRIO FIT.',
    indexable: true,
  },
  '/favoritos': {
    title: 'Favoritos — BELLMONT',
    description: 'Seus produtos favoritos na BELLMONT.',
    indexable: false,
  },
  '/buscar': {
    title: 'Busca — BELLMONT',
    description: 'Busca interna do catálogo BELLMONT.',
    indexable: false,
  },
  '/sacola': {
    title: 'Sacola — BELLMONT',
    description: 'Sua seleção de produtos BELLMONT.',
    indexable: false,
  },
}

export function normalizePathname(pathname: string) {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '') || '/'
}

export function canonicalUrl(pathname: string) {
  return `${SITE_ORIGIN}${normalizePathname(pathname)}`
}

export function legacyHashToPath(hash: string, baseUrl: string) {
  if (!hash.startsWith('#/')) return null
  const base = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '')
  return `${base}${hash.slice(1)}`
}

export function resolveSeo(pathname: string, products: Product[]): SeoDefinition {
  const normalized = normalizePathname(pathname)
  if (normalized.startsWith('/admin') || normalized.startsWith('/dev/') || normalized.startsWith('/checkout')) {
    return { title: 'Área restrita — BELLMONT', description: 'Área não pública da BELLMONT.', indexable: false }
  }

  if (normalized.startsWith('/produto/')) {
    let slug = normalized.slice('/produto/'.length)
    try { slug = decodeURIComponent(slug) } catch { return { title: 'Produto não encontrado — BELLMONT', description: 'Este produto não está disponível.', indexable: false } }
    const product = products.find(item => item.slug === slug)
    if (!product) return { title: 'Produto não encontrado — BELLMONT', description: 'Este produto não está disponível.', indexable: false }
    const category = product.category === 'fitness' ? 'IMPÉRIO FIT' : product.category === 'perfumes' ? 'Perfumaria BELLMONT' : 'Streetwear BELLMONT'
    return {
      title: `${product.name} — ${category}`,
      description: product.description || `Conheça ${product.name} no catálogo ${category}. Consulte detalhes e disponibilidade.`,
      indexable: true,
    }
  }

  return routeSeo[normalized] ?? {
    title: 'Página não encontrada — BELLMONT',
    description: 'A página solicitada não foi encontrada.',
    indexable: false,
  }
}
