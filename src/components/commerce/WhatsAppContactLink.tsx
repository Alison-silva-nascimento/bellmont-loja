import { MessageCircle } from 'lucide-react'
import { COMMERCIAL_CONTACTS, getCommerceOwnerForCategory } from '../../config/commercialMode'
import type { ProductCategory } from '../../types/product'

export function WhatsAppContactLink({ category, className = 'button button--dark' }: { category: ProductCategory; className?: string }) {
  const contact = COMMERCIAL_CONTACTS[getCommerceOwnerForCategory(category)]
  return <a className={className} href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`Falar com ${contact.label} pelo WhatsApp`}><MessageCircle aria-hidden="true" /> Falar com {contact.label}</a>
}

