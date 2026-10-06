import { getSupabaseClient } from '../lib/supabase/client'
import { classifySupabaseError, supabaseNotConfigured, type SupabaseFailure } from '../lib/supabase/errors'

export interface AdminUserSummary {
  id: string
  email: string
}

export type AdminAccessResult =
  | { ok: true; status: 'unauthenticated'; user: null }
  | { ok: true; status: 'unauthorized' | 'authorized'; user: AdminUserSummary }
  | SupabaseFailure

type SignOutResult = { ok: true } | SupabaseFailure

interface AuthErrorLike {
  status?: number
  code?: string
  message?: string
}

const summarizeUser = (id: string, email?: string): AdminUserSummary => ({ id, email: email ?? 'Conta autenticada' })

export const classifyAdminLoginError = (error: unknown): SupabaseFailure => {
  const candidate = typeof error === 'object' && error !== null ? (error as AuthErrorLike) : {}
  const message = candidate.message?.toLocaleLowerCase('en-US') ?? ''

  if (candidate.status === 400 || candidate.status === 401 || message.includes('invalid login credentials')) {
    return {
      ok: false,
      kind: 'credentials',
      userMessage: 'Não foi possível entrar. Verifique suas credenciais.',
      code: candidate.code,
    }
  }

  return classifySupabaseError(error)
}

export const getAdminAccess = async (): Promise<AdminAccessResult> => {
  const client = getSupabaseClient()
  if (!client) return supabaseNotConfigured()

  try {
    const { data: sessionData, error: sessionError } = await client.auth.getSession()
    if (sessionError) return classifySupabaseError(sessionError)
    if (!sessionData.session) return { ok: true, status: 'unauthenticated', user: null }

    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) {
      if (userError && (userError.status === 401 || userError.status === 403)) {
        await client.auth.signOut({ scope: 'local' })
        return { ok: true, status: 'unauthenticated', user: null }
      }
      return classifySupabaseError(userError)
    }

    const { data: isAdmin, error: authorizationError } = await client.rpc('is_current_user_admin')
    if (authorizationError) return classifySupabaseError(authorizationError)

    return {
      ok: true,
      status: isAdmin ? 'authorized' : 'unauthorized',
      user: summarizeUser(userData.user.id, userData.user.email),
    }
  } catch (error) {
    return classifySupabaseError(error)
  }
}

export const signInAdmin = async (email: string, password: string): Promise<AdminAccessResult> => {
  const client = getSupabaseClient()
  if (!client) return supabaseNotConfigured()
  try {
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) return classifyAdminLoginError(error)
    return getAdminAccess()
  } catch (error) {
    return classifyAdminLoginError(error)
  }
}

export const signOutAdmin = async (): Promise<SignOutResult> => {
  const client = getSupabaseClient()
  if (!client) return supabaseNotConfigured()

  try {
    const { error } = await client.auth.signOut()
    return error ? classifySupabaseError(error) : { ok: true }
  } catch (error) {
    return classifySupabaseError(error)
  }
}
