import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCatalog } from './CatalogContext'
import { devCartProduct } from '../dev/cartFixture'
import type { CartItem, CartSelection, ResolvedCartItem } from '../types/cart'
import { addCartSelection, calculateCartCount, calculateCartSubtotal, CART_STORAGE_KEY, getCartItemKey, reconcileStoredCart, removeCartItem, resolveCart, setCartItemQuantity } from '../utils/cart'
import { COMMERCIAL_MODE, COMMERCIAL_MODES } from '../config/commercialMode'

type CartFeedback = { id: number; title: string; message: string } | null

type CartValue = {
  items: CartItem[]
  resolvedItems: ResolvedCartItem[]
  count: number
  subtotal: number
  hasUnknownPrice: boolean
  preservedItemCount: number
  feedback: CartFeedback
  addItem: (selection: CartSelection) => void
  setQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  dismissFeedback: () => void
}

const CartContext = createContext<CartValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, source, loading } = useCatalog()
  const commerceCatalog = useMemo(() => import.meta.env.DEV && source === 'local' ? [...products, devCartProduct] : products, [products, source])
  const cartMode = COMMERCIAL_MODE === COMMERCIAL_MODES.WHATSAPP_ONLY ? 'whatsapp' : 'online'
  const readStoredCart = () => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY)
      return stored ? JSON.parse(stored) as unknown : []
    } catch { return [] }
  }
  const pendingStoredCart = useRef<{ value: unknown } | null>(loading ? { value: readStoredCart() } : null)
  const [cartHydrated, setCartHydrated] = useState(!loading)
  const initialReconciliation = useMemo(() => loading ? { items: [], preservedItems: [] } : reconcileStoredCart(readStoredCart(), commerceCatalog, cartMode), [])
  const [items, setItems] = useState<CartItem[]>(() => {
    return initialReconciliation.items
  })
  const [preservedItems, setPreservedItems] = useState<CartItem[]>(initialReconciliation.preservedItems)
  const [feedback, setFeedback] = useState<CartFeedback>(null)
  const reconcileMessage = 'A sacola foi atualizada porque o estoque ou a disponibilidade de um item mudou.'

  useEffect(() => {
    if (loading || !pendingStoredCart.current) return
    const restored = reconcileStoredCart(pendingStoredCart.current.value, commerceCatalog, cartMode)
    const raw = pendingStoredCart.current.value
    if (JSON.stringify(raw) !== JSON.stringify([...restored.items, ...restored.preservedItems])) {
      setFeedback({ id: Date.now(), title: 'Sacola atualizada', message: reconcileMessage })
    }
    setItems(restored.items)
    setPreservedItems(restored.preservedItems)
    pendingStoredCart.current = null
    setCartHydrated(true)
  }, [commerceCatalog, loading])

  useEffect(() => {
    if (loading || !cartHydrated) return
    const current = [...items, ...preservedItems]
    const reconciled = reconcileStoredCart(current, commerceCatalog, cartMode)
    if (JSON.stringify(current) !== JSON.stringify([...reconciled.items, ...reconciled.preservedItems])) {
        setFeedback({ id: Date.now(), title: 'Sacola atualizada', message: reconcileMessage })
    }
    setItems(reconciled.items)
    setPreservedItems(reconciled.preservedItems)
  }, [cartHydrated, commerceCatalog, loading])

  useEffect(() => {
    if (!cartHydrated) return
    try { window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([...items, ...preservedItems])) } catch { /* localStorage may be unavailable */ }
  }, [cartHydrated, items, preservedItems])

  const addItem = useCallback((selection: CartSelection) => {
    setItems(current => {
      const result = addCartSelection(current, selection, commerceCatalog, cartMode)
      if (result.ok) {
        const product = commerceCatalog.find(item => item.id === selection.productId)
        setFeedback(result.adjusted
          ? { id: Date.now(), title: 'Limite de estoque', message: `A quantidade de ${product?.name ?? 'produto'} foi limitada ao estoque confirmado.` }
          : { id: Date.now(), title: 'Adicionado à sacola', message: `${product?.name ?? 'Produto'} adicionado à sacola.` })
      } else {
        setFeedback({ id: Date.now(), title: 'Produto indisponível', message: 'Não foi possível adicionar o item com a variante e quantidade selecionadas.' })
      }
      return result.items
    })
  }, [commerceCatalog])

  const setQuantity = useCallback((key: string, quantity: number) => setItems(current => {
    const result = setCartItemQuantity(current, key, quantity, commerceCatalog, cartMode)
    if (result.ok && result.adjusted) setFeedback({ id: Date.now(), title: 'Limite de estoque', message: 'A quantidade foi limitada ao estoque confirmado para esta variante.' })
    else if (!result.ok) setFeedback({ id: Date.now(), title: 'Quantidade indisponível', message: 'Não foi possível alterar a quantidade deste item.' })
    return result.items
  }), [commerceCatalog])
  const removeItem = useCallback((key: string) => setItems(current => removeCartItem(current, key)), [])
  const dismissFeedback = useCallback(() => setFeedback(null), [])
  const resolvedItems = useMemo(() => resolveCart(items, commerceCatalog, cartMode), [commerceCatalog, items])

  const value = useMemo<CartValue>(() => ({
    items,
    resolvedItems,
    count: calculateCartCount(items),
    subtotal: calculateCartSubtotal(items, commerceCatalog, cartMode),
    hasUnknownPrice: resolvedItems.some(item => item.lineTotal == null),
    preservedItemCount: preservedItems.length,
    feedback,
    addItem,
    setQuantity,
    removeItem,
    dismissFeedback,
  }), [addItem, commerceCatalog, dismissFeedback, feedback, items, preservedItems.length, removeItem, resolvedItems, setQuantity])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de CartProvider')
  return context
}

export { getCartItemKey }
