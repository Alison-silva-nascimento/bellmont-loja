# BELLMONT V2.3 — Mercado Pago Sandbox

Data: 2026-10-28
Escopo: implementação e homologação local; nenhuma alteração remota, cobrança real, commit, push ou deploy.

## Parecer

**APTO PARA HOMOLOGAÇÃO REAL EM SANDBOX, COM CREDENCIAIS E ENDPOINT DE TESTE AINDA PENDENTES.**

A arquitetura, as migrations, o Edge Runtime, os fluxos simulados e a concorrência PostgreSQL foram validados localmente. Uma transação efetiva no Mercado Pago Sandbox não foi executada porque não existem credenciais de teste nem segredo de webhook configurados no ambiente local. O checkout V2 permanece desabilitado e a V1 via WhatsApp foi preservada.

## Modelo oficial adotado

A integração usa exclusivamente o **Checkout Pro via Orders API**, conforme a documentação atual para novas integrações:

- criação: `POST /v1/orders`;
- consulta/reconciliação: `GET /v1/orders/{id}`;
- idempotência: `X-Idempotency-Key` UUID persistido;
- retorno: `checkout_url` fornecida pelo Mercado Pago;
- notificação: evento `order`, assinatura HMAC e confirmação consultando a Orders API;
- o retorno do navegador nunca é considerado prova de pagamento.

Referências oficiais:

- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/create-order
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/notifications
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/payment-management/status/order-status
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/integration-test/test-purchase-with-card

O contrato antigo de Preferences não é usado. O endpoint local legado `checkout-create-preference` responde como tombstone e orienta o uso de `checkout-create-order`.

## Arquitetura implementada

### Edge Functions

1. `checkout-create-order`
   - CORS por allowlist;
   - feature flag backend e modo Sandbox;
   - rate limit persistente por hash do endereço do cliente;
   - preço e estoque recalculados no PostgreSQL;
   - cria/reserva o pedido interno antes da ordem externa;
   - reutiliza a mesma chave UUID do provedor em retries;
   - valida referência, valor e URL retornados pelo Mercado Pago;
   - em timeout não recria pedido nem libera uma reserva ainda incerta.

2. `mercado-pago-webhook`
   - aceita somente evento `order` de Sandbox;
   - valida `x-signature`, `x-request-id`, `data.id` e janela contra replay;
   - não confia no corpo para aprovar pagamento;
   - consulta `GET /v1/orders/{id}`;
   - delega a reconciliação atômica ao banco.

3. `checkout-create-preference`
   - endpoint legado desativado (`410` no código da função; gateway local ainda exige autenticação).

### Banco local

Migration criada pelo Supabase CLI:

`20261028144452_phase_v2_3_mercado_pago_order_reconciliation.sql`

Principais objetos:

- campos da Orders API em `order_payments`;
- unicidade de ordem externa e chave de idempotência;
- `private.checkout_rate_limits`;
- `consume_checkout_rate_limit_v2`;
- `prepare_checkout_payment_v2`;
- `attach_checkout_provider_order_v2`;
- `reconcile_checkout_payment_v2`.

As RPCs são restritas a `service_role`, usam `SECURITY INVOKER`, `search_path` vazio, referências qualificadas e locks transacionais. Nenhuma chave privilegiada é entregue ao navegador.

## Regras transacionais validadas

- pagamento aprovado consome uma única reserva e gera uma única baixa;
- webhook duplicado não duplica venda;
- eventos antigos ou fora de ordem não regridem um pagamento concluído;
- pagamento cancelado, recusado ou falho libera a reserva;
- pagamento pendente mantém a reserva;
- divergência de referência ou valor é rejeitada e auditada;
- pagamento tardio sem reserva não baixa estoque: é marcado para reconciliação manual;
- reembolso financeiro não inventa devolução física;
- concorrência de duas criações mantém um único `order_payment`;
- concorrência de dois webhooks aprovados gera uma baixa, um movimento e uma operação de venda.

## Testes executados

| Verificação | Resultado |
|---|---:|
| Migrations em banco local limpo | 14 aplicadas |
| pgTAP | **484/484**, 13 arquivos |
| Assertions V2.3 | **61/61** |
| Concorrência histórica de estoque/pedidos | **8/8 cenários** |
| Concorrência V2.3 | **aprovada**: 1 pagamento, 1 baixa, 1 movimento |
| Frontend/TypeScript | **129/129** |
| Build padrão | aprovado |
| Build Cloudflare | aprovado |
| Build explícito com checkout V2 | aprovado |
| `git diff --check` | aprovado |
| Edge Runtime local | aprovado (`supabase-edge-runtime 1.77.1`, compatível com Deno 2.1.4) |

O primeiro build Cloudflare executado paralelamente ao build padrão falhou porque ambos tentaram limpar `dist` ao mesmo tempo. A execução serial, que corresponde ao uso normal, passou. Não é defeito do código.

O `db lint` mantém um aviso preexistente em `private.prepare_inventory_batch`: a análise estática não encontra a tabela temporária criada em runtime. Essa função e seus testes já passam no PostgreSQL real; o aviso não foi introduzido pela V2.3.

Após os testes concorrentes, foi executado novo `supabase db reset --local` para remover as fixtures. Nenhum comando foi conectado ao projeto remoto.

## Cenários cobertos

- aprovado, pendente, autorizado, recusado/falho e cancelado/expirado;
- webhook válido, assinatura incorreta e replay fora da tolerância;
- duplicidade e eventos fora de ordem;
- falha HTTP e timeout na criação externa;
- repetição idempotente da criação;
- divergência de total/referência;
- pagamento tardio;
- concorrência de estoque e webhooks;
- reembolso parcial e total sem mutação física automática.

Todos os testes acima são locais/simulados, exceto a concorrência, que foi executada em duas sessões PostgreSQL reais do Supabase local. **Nenhuma transação efetiva foi homologada nos servidores Sandbox do Mercado Pago.**

## Configurações ainda necessárias

Configurar somente como secrets de Edge Functions no ambiente de homologação, nunca como variáveis `VITE_`:

- `CHECKOUT_V2_ENABLED=true` apenas no ambiente de teste;
- `CHECKOUT_ALLOWED_ORIGINS`;
- `CHECKOUT_APP_URL` HTTPS de homologação;
- `CHECKOUT_SHIPPING_CENTS` com regra comercial validada;
- `CHECKOUT_RATE_LIMIT_SECRET` aleatório;
- `MERCADO_PAGO_ENVIRONMENT=sandbox`;
- `MERCADO_PAGO_ACCESS_TOKEN_TEST`;
- `MERCADO_PAGO_WEBHOOK_SECRET_TEST`;
- `MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS`.

Nenhuma dessas variáveis sensíveis está configurada localmente neste momento. `VITE_ENABLE_V2_CHECKOUT=false` continua sendo o padrão e `ONLINE_CHECKOUT_AVAILABLE=false` mantém a V1 bloqueada para checkout online.

## Procedimento para uma compra de teste

1. Criar um ambiente remoto separado de homologação ou autorizar explicitamente a implantação de teste.
2. Aplicar as migrations pendentes nesse ambiente, nunca diretamente por engano no comercial.
3. Publicar as duas Edge Functions ativas.
4. Configurar os secrets acima e a URL HTTPS do webhook no painel Sandbox do Mercado Pago.
5. Usar usuário comprador de teste diferente da conta vendedora.
6. Habilitar as flags somente no ambiente de homologação.
7. Criar um pedido com produto/variante de teste e estoque isolado.
8. Redirecionar para o `checkout_url` oficial e usar os cartões/identidades de teste documentados pelo Mercado Pago.
9. Confirmar no banco que o navegador apenas retornou, enquanto o webhook consultado marcou o pagamento e consumiu a reserva uma única vez.
10. Repetir o webhook e a criação com a mesma chave para comprovar idempotência.

## Riscos e pendências

- faltam credenciais Sandbox e webhook HTTPS autorizado para homologação efetiva;
- a regra de frete precisa de definição comercial antes de habilitar a função;
- pagamento tardio após expiração exige fila/processo operacional de reconciliação;
- reembolso não deve repor estoque automaticamente sem confirmação da devolução física;
- ainda não houve deploy remoto das migrations ou funções;
- bundle principal continua acima de 500 kB (aviso de performance preexistente, não bloqueante para a validação funcional);
- Supabase CLI local informa atualização disponível; não foi atualizado durante esta fase para evitar mudança de ferramenta no meio da homologação.

## Critérios para produção

- transações Sandbox reais aprovadas, pendentes, recusadas, canceladas e expiradas;
- assinatura e reenvio real de webhook comprovados;
- política de frete e prazo de reserva aprovadas;
- operação definida para pagamento tardio e devolução/reembolso;
- secrets configurados somente no backend;
- observabilidade/alertas para eventos `failed` e reconciliação manual;
- revisão de segurança das Edge Functions publicadas;
- backup e aplicação controlada das migrations remotas;
- smoke test de checkout em homologação;
- autorização explícita para ligar `ONLINE_CHECKOUT_AVAILABLE` e `VITE_ENABLE_V2_CHECKOUT` em produção.

## Arquivos V2.3 principais

- `supabase/migrations/20261028144452_phase_v2_3_mercado_pago_order_reconciliation.sql`
- `supabase/tests/phase_v2_3_mercado_pago_order_reconciliation.test.sql`
- `supabase/functions/_shared/mercado_pago.ts`
- `supabase/functions/checkout-create-order/index.ts`
- `supabase/functions/mercado-pago-webhook/index.ts`
- `supabase/functions/checkout-create-preference/index.ts`
- `scripts/test-v2-3-payment-concurrency.mjs`
- `src/services/checkoutV2.ts`
- `src/utils/mercadoPago.test.ts`
- `src/pages/CheckoutPage.tsx`
- `src/pages/CheckoutReturnPage.tsx`

## Confirmações finais

- V1 WhatsApp preservada.
- Checkout V2 desabilitado por padrão.
- Nenhuma cobrança real executada.
- Nenhuma credencial inventada ou exposta no frontend.
- Nenhuma migration remota aplicada.
- Nenhum commit, push ou deploy realizado.
