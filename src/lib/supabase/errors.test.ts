import assert from 'node:assert/strict'
import test from 'node:test'
import { classifySupabaseError, supabaseNotConfigured } from './errors'

test('classifica indisponibilidade sem expor detalhes técnicos', () => {
  const result = classifySupabaseError({ message: 'Failed to fetch https://secret.example', status: 503 })
  assert.equal(result.kind, 'unavailable')
  assert.equal(result.userMessage.includes('secret.example'), false)
})

test('classifica falhas de autorização e constraints', () => {
  assert.equal(classifySupabaseError({ code: '42501' }).kind, 'unauthorized')
  assert.equal(classifySupabaseError({ code: '23514' }).kind, 'invalid-request')
})

test('retorna estado explícito quando Supabase não está configurado', () => {
  assert.deepEqual(supabaseNotConfigured(), {
    ok: false,
    kind: 'not-configured',
    userMessage: 'A integração com o Supabase ainda não está configurada neste ambiente.',
  })
})
