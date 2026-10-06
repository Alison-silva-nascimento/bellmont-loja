import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { commerceCatalog } from '../data/commerceCatalog'
import type { CartItem, CartSelection, ResolvedCartItem } from '../types/cart'
import { addCartSelection, calculateCartCount, calculateCartSubtotal, CART_STORAGE_KEY, getCartItemKey, removeCartItem, resolveCart, sanitizeStoredCart, setCartItemQuantity } from '../utils/cart'

type CartFeedback = { id: number; message: string } | null

type CartValue = {
  items: CartItem[]
  resolvedItems: ResolvedCartItem[]
  count: number
  subtotal: number
  feedback: CartFeedback
  addItem: (selection: CartSelection) => void
  setQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  dismissFeedback: () => void
}

const CartContext = createContext<CartValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY)
      return sanitizeStoredCart(stored ? JSON.parse(stored) : [], commerceCatalog)
    } catch { return [] }
  })
  const [feedback, setFeedback] = useState<CartFeedback>(null)

  useEffect(() => {
    try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)) } catch { /* localStorage may be unavailable */ }
  }, [items])

  const addItem = useCallback((selection: CartSelection) => {
    setItems(current => {
      const result = addCartSelection(current, selection, commerceCatalog)
      if (result.ok) {
        const product = commerceCatalog.find(item => item.id === selection.productId)
        setFeedback({ id: Date.now(), message: `${product?.name ?? 'Produto'} adicionado à sacola.` })
      }
      return result.items
    })
  }, [])

  const setQuantity = useCallback((key: string, quantity: number) => setItems(current => setCartItemQuantity(current, key, quantity)), [])
  const removeItem = useCallback((key: string) => setItems(current => removeCartItem(current, key)), [])
  const dismissFeedback = useCallback(() => setFeedback(null), [])
  const resolvedItems = useMemo(() => resolveCart(items, commerceCatalog), [items])

  const value = useMemo<CartValue>(() => ({
    items,
    resolvedItems,
    count: calculateCartCount(items),
    subtotal: calculateCartSubtotal(items, commerceCatalog),
    feedback,
    addItem,
    setQuantity,
    removeItem,
    dismissFeedback,
  }), [addItem, dismissFeedback, feedback, items, removeItem, resolvedItems, setQuantity])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de CartProvider')
  return context
}

export { getCartItemKey }
