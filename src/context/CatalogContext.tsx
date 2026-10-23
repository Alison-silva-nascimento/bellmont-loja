import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { products as localProducts } from '../data/products'
import { normalizeLocalCatalogIdentities } from '../data/catalogIdentity'
import type { PublicCatalogFailure } from '../services/publicCatalog'
import { resolvePublicCatalogSource, type PublicCatalogSource } from '../services/publicCatalogConfig'
import type { Product } from '../types/product'
import { prepareLocalCatalogForAssistedCommerce } from '../data/assistedCatalog'

type CatalogValue = {
  products: Product[]
  source: PublicCatalogSource
  loading: boolean
  error: PublicCatalogFailure | null
}

const configuredSource = resolvePublicCatalogSource(import.meta.env.VITE_PUBLIC_CATALOG_SOURCE)
const normalizedLocalProducts = prepareLocalCatalogForAssistedCommerce(normalizeLocalCatalogIdentities(localProducts))
const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<CatalogValue, 'source'>>(() => configuredSource === 'local'
    ? { products: normalizedLocalProducts, loading: false, error: null }
    : { products: [], loading: true, error: null })

  useEffect(() => {
    if (configuredSource === 'local') return
    let active = true

    void import('../services/publicCatalog')
      .then(({ fetchPublicSupabaseCatalog }) => fetchPublicSupabaseCatalog())
      .then(result => {
        if (!active) return
        setState(result.ok
          ? { products: result.data, loading: false, error: null }
          : { products: [], loading: false, error: result.error })
      })
      .catch(() => {
        if (active) setState({ products: [], loading: false, error: { code: 'unavailable', message: 'Não foi possível carregar o catálogo agora.' } })
      })

    return () => { active = false }
  }, [])

  const value = useMemo<CatalogValue>(() => ({ ...state, source: configuredSource }), [state])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const context = useContext(CatalogContext)
  if (!context) throw new Error('useCatalog deve ser usado dentro de CatalogProvider')
  return context
}
