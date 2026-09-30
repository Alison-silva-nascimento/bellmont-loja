import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'bellmont:favorites'

type FavoritesValue = {
  favoriteIds: string[]
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => void
}

const FavoritesContext = createContext<FavoritesValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      const parsed: unknown = stored ? JSON.parse(stored) : []
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
    } catch { return [] }
  })

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds)) } catch { /* local storage may be unavailable */ }
  }, [favoriteIds])

  const value = useMemo<FavoritesValue>(() => ({
    favoriteIds,
    isFavorite: productId => favoriteIds.includes(productId),
    toggleFavorite: productId => setFavoriteIds(current => current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId]),
  }), [favoriteIds])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
  return context
}
