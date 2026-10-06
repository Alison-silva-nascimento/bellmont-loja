import type { SupabaseFailureKind } from '../../lib/supabase/errors'
import type { AdminUserSummary } from '../../services/adminAuth'

export type AdminAuthState =
  | { status: 'checking' }
  | { status: 'unauthenticated' }
  | { status: 'unauthorized'; user: AdminUserSummary }
  | { status: 'authorized'; user: AdminUserSummary }
  | { status: 'unavailable'; kind: SupabaseFailureKind; message: string }

export type AdminAuthEvent =
  | { type: 'CHECK_ACCESS' }
  | { type: 'SESSION_MISSING' | 'SIGNED_OUT' }
  | { type: 'ACCESS_DENIED'; user: AdminUserSummary }
  | { type: 'ACCESS_GRANTED'; user: AdminUserSummary }
  | { type: 'SERVICE_FAILURE'; kind: SupabaseFailureKind; message: string }

export const initialAdminAuthState: AdminAuthState = { status: 'checking' }

export const adminAuthReducer = (_state: AdminAuthState, event: AdminAuthEvent): AdminAuthState => {
  switch (event.type) {
    case 'CHECK_ACCESS':
      return { status: 'checking' }
    case 'SESSION_MISSING':
    case 'SIGNED_OUT':
      return { status: 'unauthenticated' }
    case 'ACCESS_DENIED':
      return { status: 'unauthorized', user: event.user }
    case 'ACCESS_GRANTED':
      return { status: 'authorized', user: event.user }
    case 'SERVICE_FAILURE':
      return { status: 'unavailable', kind: event.kind, message: event.message }
  }
}
