import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { findProductByIdentity, migrateFavoriteIds } from '../data/catalogIdentity'
import { useCatalog } from './CatalogContext'

const STORAGE_KEY = 'bellmont:favorites'

type FavoritesValue = {
  favoriteIds: string[]
  preservedFavoriteCount: number
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => void
}

const FavoritesContext = createContext<FavoritesValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { products, loading } = useCatalog()
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

  useEffect(() => {
    if (!loading) setFavoriteIds(current => migrateFavoriteIds(current, products))
  }, [loading, products])

  const preservedFavoriteCount = favoriteIds.filter(identity => !findProductByIdentity(products, identity)).length

  const value = useMemo<FavoritesValue>(() => ({
    favoriteIds,
    preservedFavoriteCount,
    isFavorite: productId => favoriteIds.includes(productId),
    toggleFavorite: productId => setFavoriteIds(current => current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId]),
  }), [favoriteIds, preservedFavoriteCount])

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
  return context
}
