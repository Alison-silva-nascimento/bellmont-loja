import assert from 'node:assert/strict'
import test from 'node:test'
import { institutionalFooterLinks, institutionalPages, institutionalRoutes, LEGAL_ENTITY, PUBLIC_FOOTER_IDENTITY } from './institutionalPages'

test('as cinco rotas institucionais são únicas e não provisórias', () => {
  assert.equal(institutionalRoutes.length, 5)
  assert.equal(new Set(institutionalRoutes).size, 5)
  assert.deepEqual(institutionalRoutes.sort(), ['/entregas', '/privacidade', '/sobre', '/termos', '/trocas-e-devolucoes'].sort())
  assert.ok(Object.values(institutionalPages).every(page => !JSON.stringify(page).includes('em breve')))
})

test('identificação pública usa somente razão social e CNPJ confirmados', () => {
  assert.equal(LEGAL_ENTITY.corporateName, '69.725.785 ANNA CAROLINA SANTOS NASCIMENTO')
  assert.equal(LEGAL_ENTITY.taxId, '69.725.785/0001-66')
  assert.equal(LEGAL_ENTITY.registrationStatus, 'ATIVA')
  assert.equal(LEGAL_ENTITY.publicAddress, 'Rua 20, nº 552, Bairro Paranaíba, Itumbiara/GO, CEP 75526-270')
  assert.equal(LEGAL_ENTITY.electronicContact, 'https://wa.me/556493026564')
  assert.match(JSON.stringify(institutionalPages.terms), new RegExp(LEGAL_ENTITY.corporateName))
})

test('rodapé prioriza BELLMONT e CNPJ sem expor o nome pessoal completo', () => {
  assert.deepEqual(PUBLIC_FOOTER_IDENTITY, {
    brand: 'BELLMONT',
    taxId: 'CNPJ: 69.725.785/0001-66',
  })
  assert.doesNotMatch(JSON.stringify(PUBLIC_FOOTER_IDENTITY), /ANNA CAROLINA SANTOS NASCIMENTO/i)
})

test('textos preservam operação WhatsApp sem checkout, pagamento ou reserva automática', () => {
  const terms = JSON.stringify(institutionalPages.terms)
  assert.match(terms, /não processa pagamentos online/i)
  assert.match(terms, /não representa pedido confirmado, pagamento, reserva/i)
  assert.match(JSON.stringify(institutionalPages.delivery), /WhatsApp/i)
})

test('privacidade e devoluções usam o WhatsApp BELLMONT confirmado', () => {
  const privacy = JSON.stringify(institutionalPages.privacy)
  const returns = JSON.stringify(institutionalPages.returns)
  assert.match(privacy, /https:\/\/wa\.me\/556493026564/)
  assert.match(privacy, /acesso, correção, exclusão quando cabível/i)
  assert.match(returns, /https:\/\/wa\.me\/556493026564/)
  assert.match(returns, /não envie produtos ao endereço cadastral/i)
})

test('entrega mantém frete sob consulta sem promessas fictícias', () => {
  const delivery = JSON.stringify(institutionalPages.delivery)
  assert.match(delivery, /valor do frete, o prazo e a modalidade de envio são apresentados e acordados/i)
  assert.match(delivery, /não promete frete fixo ou grátis, entrega nacional/i)
  assert.match(delivery, /não há promessa de rastreamento automático/i)
})

test('termos preservam sacola unificada BELLMONT e excluem Fitness', () => {
  const terms = JSON.stringify(institutionalPages.terms)
  assert.match(terms, /reúne Streetwear e perfumes/i)
  assert.match(terms, /IMPÉRIO FIT permanecem fora dessa sacola/i)
  assert.match(terms, /não cria pedidos automaticamente/i)
})

test('identificação comercial compartilhada não inventa vínculo societário ou endereço de devolução', () => {
  const allPages = JSON.stringify(institutionalPages)
  assert.match(JSON.stringify(institutionalPages.about), /vendas apresentadas sob a marca utilizam o CNPJ/i)
  assert.match(allPages, /Rua 20, nº 552, Bairro Paranaíba, Itumbiara\/GO, CEP 75526-270/i)
  assert.match(allPages, /não equivale à declaração de registro de nome fantasia ou de vínculo societário distinto/i)
  assert.doesNotMatch(allPages, /Rua Geraldo de Paiva Vieira|R Geraldo de Paiva Vieira/i)
  assert.match(JSON.stringify(institutionalPages.terms), /não é anunciado como loja aberta ao público, ponto de retirada ou endereço de devolução/i)
})

test('rodapé referencia as cinco rotas institucionais sem links quebrados', () => {
  assert.equal(institutionalFooterLinks.length, 5)
  assert.deepEqual(
    institutionalFooterLinks.map(link => link.href).sort(),
    [...institutionalRoutes].sort(),
  )
  assert.ok(institutionalFooterLinks.every(link => link.label.trim().length > 0))
})
