import type { Product } from '../types/product'

export const COMMERCIAL_MODES = {
  WHATSAPP_ONLY: 'WHATSAPP_ONLY',
  ONLINE_CHECKOUT: 'ONLINE_CHECKOUT',
} as const

export type CommercialMode = typeof COMMERCIAL_MODES[keyof typeof COMMERCIAL_MODES]
export type CommerceOwner = 'bellmont' | 'imperio-fit'

// ONLINE_CHECKOUT remains deliberately unavailable until a future, explicit release.
export const COMMERCIAL_MODE: CommercialMode = COMMERCIAL_MODES.WHATSAPP_ONLY
export const ONLINE_CHECKOUT_AVAILABLE = false

export const COMMERCIAL_CONTACTS = {
  bellmont: {
    label: 'BELLMONT',
    phoneDisplay: '+55 64 9302-6564',
    phoneDigits: '556493026564',
    whatsappUrl: 'https://wa.me/556493026564',
  },
  'imperio-fit': {
    label: 'IMPÉRIO FIT',
    phoneDisplay: '+55 64 9265-9825',
    phoneDigits: '556492659825',
    whatsappUrl: 'https://wa.me/556492659825',
  },
} as const satisfies Record<CommerceOwner, {
  label: string
  phoneDisplay: string
  phoneDigits: string
  whatsappUrl: string
}>

export const OFFICIAL_WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/JfzL6Si7kEtBvKaEjTT4OM'

export const getCommerceOwner = (product: Pick<Product, 'category' | 'brand'>): CommerceOwner =>
  product.category === 'fitness' || product.brand === 'imperio-fit' ? 'imperio-fit' : 'bellmont'

export const getCommerceOwnerForCategory = (category: Product['category']): CommerceOwner =>
  category === 'fitness' ? 'imperio-fit' : 'bellmont'

