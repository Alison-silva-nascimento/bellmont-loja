import assert from 'node:assert/strict'
import test from 'node:test'
import { adminAuthReducer, initialAdminAuthState } from './adminAuthState'

const user = { id: 'user-1', email: 'admin@example.test' }

test('guard sem sessão permanece fora do dashboard', () => {
  assert.deepEqual(adminAuthReducer(initialAdminAuthState, { type: 'SESSION_MISSING' }), { status: 'unauthenticated' })
})

test('usuário autenticado não-admin recebe acesso negado', () => {
  assert.deepEqual(adminAuthReducer(initialAdminAuthState, { type: 'ACCESS_DENIED', user }), { status: 'unauthorized', user })
})

test('usuário autorizado libera o dashboard', () => {
  assert.deepEqual(adminAuthReducer(initialAdminAuthState, { type: 'ACCESS_GRANTED', user }), { status: 'authorized', user })
})

test('logout remove autorização local imediatamente', () => {
  const authorized = adminAuthReducer(initialAdminAuthState, { type: 'ACCESS_GRANTED', user })
  assert.deepEqual(adminAuthReducer(authorized, { type: 'SIGNED_OUT' }), { status: 'unauthenticated' })
})

test('sessão expirada remove dashboard e retorna ao login', () => {
  const authorized = adminAuthReducer(initialAdminAuthState, { type: 'ACCESS_GRANTED', user })
  assert.deepEqual(adminAuthReducer(authorized, { type: 'SESSION_MISSING' }), { status: 'unauthenticated' })
})

test('falha de serviço nunca libera conteúdo administrativo', () => {
  const state = adminAuthReducer(initialAdminAuthState, {
    type: 'SERVICE_FAILURE',
    kind: 'unavailable',
    message: 'Serviço indisponível',
  })
  assert.equal(state.status, 'unavailable')
})
