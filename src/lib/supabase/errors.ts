export type SupabaseFailureKind = 'not-configured' | 'unavailable' | 'unauthorized' | 'credentials' | 'invalid-request' | 'unknown'

export interface SupabaseFailure {
  ok: false
  kind: SupabaseFailureKind
  userMessage: string
  code?: string
}

interface ErrorLike {
  code?: string
  message?: string
  status?: number
}

export const classifySupabaseError = (error: unknown): SupabaseFailure => {
  const candidate = typeof error === 'object' && error !== null ? (error as ErrorLike) : {}
  const code = candidate.code
  const message = candidate.message?.toLocaleLowerCase('en-US') ?? ''

  if (candidate.status === 401 || candidate.status === 403 || code === '42501') {
    return { ok: false, kind: 'unauthorized', userMessage: 'Você não tem permissão para realizar esta ação.', code }
  }

  if (candidate.status === 400 || code === '23514' || code === '23505') {
    return { ok: false, kind: 'invalid-request', userMessage: 'Os dados enviados não puderam ser validados.', code }
  }

  if (
    (candidate.status !== undefined && candidate.status >= 500)
    || message.includes('fetch')
    || message.includes('network')
    || message.includes('timeout')
  ) {
    return {
      ok: false,
      kind: 'unavailable',
      userMessage: 'O serviço está temporariamente indisponível. Tente novamente em instantes.',
      code,
    }
  }

  return { ok: false, kind: 'unknown', userMessage: 'Não foi possível concluir a operação.', code }
}

export const supabaseNotConfigured = (): SupabaseFailure => ({
  ok: false,
  kind: 'not-configured',
  userMessage: 'A integração com o Supabase ainda não está configurada neste ambiente.',
})
