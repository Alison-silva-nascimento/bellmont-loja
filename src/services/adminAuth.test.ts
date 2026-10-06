import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyAdminLoginError } from './adminAuth'

test('erro de credencial usa mensagem única sem revelar existência da conta', () => {
  const result = classifyAdminLoginError({ status: 400, message: 'Invalid login credentials' })
  assert.equal(result.kind, 'credentials')
  assert.equal(result.userMessage, 'Não foi possível entrar. Verifique suas credenciais.')
  assert.equal(result.userMessage.toLocaleLowerCase('pt-BR').includes('usuário'), false)
})

test('falha de rede é diferenciada de credenciais inválidas', () => {
  const result = classifyAdminLoginError({ status: 503, message: 'Failed to fetch' })
  assert.equal(result.kind, 'unavailable')
})
