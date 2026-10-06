import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import type { SupabaseFailure } from '../../lib/supabase/errors'
import { getAdminAccess, signInAdmin, signOutAdmin, type AdminAccessResult } from '../../services/adminAuth'
import { adminAuthReducer, initialAdminAuthState, type AdminAuthState } from '../auth/adminAuthState'

interface AdminAuthContextValue {
  state: AdminAuthState
  login: (email: string, password: string) => Promise<{ ok: true } | SupabaseFailure>
  logout: () => Promise<{ ok: true } | SupabaseFailure>
  retry: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

const eventFromAccess = (result: AdminAccessResult) => {
  if (!result.ok) return { type: 'SERVICE_FAILURE', kind: result.kind, message: result.userMessage } as const
  if (result.status === 'unauthenticated') return { type: 'SESSION_MISSING' } as const
  if (result.status === 'unauthorized') return { type: 'ACCESS_DENIED', user: result.user } as const
  return { type: 'ACCESS_GRANTED', user: result.user } as const
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(adminAuthReducer, initialAdminAuthState)
  const validationId = useRef(0)

  const refreshAccess = useCallback(async (showChecking = true) => {
    const currentValidation = ++validationId.current
    if (showChecking) dispatch({ type: 'CHECK_ACCESS' })
    const result = await getAdminAccess()
    if (currentValidation === validationId.current) dispatch(eventFromAccess(result))
  }, [])

  useEffect(() => {
    void refreshAccess()
    const client = getSupabaseClient()
    if (!client) return

    const { data: { subscription } } = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        validationId.current += 1
        dispatch({ type: 'SIGNED_OUT' })
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        queueMicrotask(() => void refreshAccess())
      }
    })

    return () => subscription.unsubscribe()
  }, [refreshAccess])

  const login = useCallback(async (email: string, password: string) => {
    const result = await signInAdmin(email, password)
    if (!result.ok) return result
    validationId.current += 1
    dispatch(eventFromAccess(result))
    return { ok: true } as const
  }, [])

  const logout = useCallback(async () => {
    const result = await signOutAdmin()
    if (result.ok) {
      validationId.current += 1
      dispatch({ type: 'SIGNED_OUT' })
    }
    return result
  }, [])

  const value = useMemo<AdminAuthContextValue>(() => ({
    state,
    login,
    logout,
    retry: () => refreshAccess(),
  }), [state, login, logout, refreshAccess])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return context
}
