export type CheckoutCustomer = {
  fullName: string
  email: string
  phone: string
}

export type CheckoutAddress = {
  postalCode: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export type CheckoutFieldErrors = Partial<Record<keyof CheckoutCustomer | keyof CheckoutAddress, string>>

export type CheckoutPaymentMethod = 'pix' | 'credit_card'
