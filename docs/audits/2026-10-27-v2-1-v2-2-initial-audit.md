# BELLMONT V2.1 + V2.2 — auditoria inicial e implementação local

Data: 2026-10-27
Projeto remoto auditado: `qbedfcdarmgiytlqntpf`
Escopo remoto: somente leitura

## Diagnóstico inicial

- Branch local: `main`; referência inicial: `626b182`.
- Alterações preexistentes preservadas: arquivo ZIP não rastreado e `docs/catalog/` não rastreado.
- Frontend: React, TypeScript, Vite e BrowserRouter; V1 conclui atendimento pelo WhatsApp.
- A sacola centraliza catálogo/variantes no `CatalogProvider` e `CartContext`, reconcilia persistência e limita quantidades.
- Não existiam Edge Functions nem tela V2 de checkout.
- Já existiam e estão registradas no remoto as 12 migrations até `20261020102806`.
- O banco já possui `orders`, `order_items`, endereços, pagamentos, remessas, histórico, reservas e eventos de webhook. Não foram criadas tabelas duplicadas.
- O motor transacional já reserva, libera, confirma venda, devolve e expira reservas com locks e idempotência.

## Baseline remoto verificado

| Evidência | Resultado |
|---|---:|
| Produtos totais | 48 |
| Produtos comerciais ativos | 47 |
| Fixture arquivada | 1 |
| Streetwear / Perfumes / Fitness | 20 / 22 / 5 |
| Variantes / imagens | 96 / 58 |
| Linhas de inventário | 82 |
| Quantidade física comercial | 1.200 |
| Quantidade reservada | 0 |
| Movimentações | 84 |
| Pedidos / itens / reservas | 0 / 0 / 0 |
| Eventos de webhook | 0 |

RLS está habilitada e forçada nas tabelas comerciais, de inventário e de pedidos auditadas. `anon` não executa RPCs administrativas. As RPCs transacionais são acessíveis a `authenticated`, mas a helper `private.is_commerce_executor()` exige service role ou Admin allowlisted.

## Achados de segurança

1. **Médio:** `public.is_current_user_admin()` é `SECURITY DEFINER` executável por `authenticated`. O desenho é intencional para a UI Admin, mas o Advisor mantém o alerta; revisar antes da V2 pública.
2. **Médio:** proteção contra senhas vazadas do Auth continua desabilitada.
3. **Baixo/esperado:** `payment_webhook_events` tem RLS sem policy e sem grant para clientes; acesso é exclusivo de backend/service role.
4. **Performance:** 11 FKs sem índice e políticas permissivas duplicadas no catálogo. Não são bloqueadores imediatos com zero pedidos, mas devem ser avaliados antes de escala.
5. Nenhuma Edge Function está implantada no remoto.

## Implementação local desta fase

- Flag `VITE_ENABLE_V2_CHECKOUT=false`; com o padrão, `/checkout` redireciona para `/sacola` e a V1 permanece igual.
- Tela V2 mobile-first para identificação, endereço, entrega, resumo e seleção Pix/cartão.
- Validação local de cliente/endereço. Consulta de CEP e frete não foram simulados.
- Migration local `20261027190000_phase_v2_1_checkout_order_orchestrator.sql`:
  - RPC somente para `service_role`;
  - recalcula preços no servidor;
  - exige produto ativo e `ASSISTED_PURCHASE`;
  - bloqueia inventário em ordem determinística;
  - cria pedido/itens/endereço atomicamente;
  - reserva estoque pelo motor existente;
  - idempotência de criação e token opaco de acompanhamento.
- Edge Function local `checkout-create-preference`:
  - CORS por allowlist;
  - flags de backend independentes;
  - exige frete configurado pelo servidor;
  - usa somente token de teste;
  - cria Checkout Pro no backend e persiste a preferência;
  - libera a reserva se a preferência falhar.
- Edge Function local `mercado-pago-webhook`:
  - valida `x-signature` por HMAC SHA-256;
  - reconcilia o evento com a API do Mercado Pago;
  - registra o evento idempotentemente;
  - deliberadamente não confirma pagamento/estoque até existir uma RPC atômica revisada para a transição financeira.

## Decisões baseadas na documentação atual

- Edge Functions são adequadas para integração curta com terceiros e webhooks; segredos ficam no ambiente server-side.
- Checkout Pro hospedado evita coleta de cartão pela BELLMONT.
- A API de Preferências continua disponível, embora a documentação atual recomende Orders API para integrações novas. Antes da homologação, decidir entre concluir Preferences ou migrar para Orders API.
- Retorno do navegador nunca será prova de pagamento; a fonte confiável será webhook assinado + consulta ao provedor.

## Bloqueios antes de sandbox

1. Definir provedor/regra real de frete; nenhum valor ou prazo foi inventado.
2. Fornecer credenciais de teste e segredo de webhook fora do Git.
3. Revisar e testar a migration nova em PostgreSQL isolado.
4. Implementar e revisar RPC atômica que transforme evento verificado em pagamento/reserva/venda.
5. Adicionar rate limiting persistente para os endpoints públicos.
6. Só então implantar migration e Edge Functions mediante autorização específica.

## Estado remoto

Nenhuma migration, função, segredo, produto, estoque, pedido ou configuração remota foi alterada nesta fase.

## Validação executada

- `npm test`: 122/122 aprovados.
- `npm run build`: aprovado com a flag padrão desativada.
- `npm run build:cloudflare`: aprovado.
- Build explícito com `VITE_ENABLE_V2_CHECKOUT=true`: aprovado, comprovando que a rota/tela V2 compila sem publicá-la.
- `npm audit --omit=dev`: zero vulnerabilidades.
- `git diff --check`: aprovado.
- Varredura de valores sensíveis em arquivos rastreados e bundle: nenhuma credencial materializada; ocorrências encontradas são nomes/proibições/documentação.
- `.env.local` e `supabase/functions/.env` estão ignorados e não rastreados.

## Validação PostgreSQL/Supabase local — 2026-10-28

- Docker Engine operacional: cliente e servidor Docker `29.8.2`.
- Supabase CLI `2.119.0`; projeto local confirmado em `C:\DEV PARTICULAR\BELLMONT LOJA\supabase\config.toml`, com PostgreSQL 17 e porta local do banco `54322`.
- `supabase db reset --local --no-seed` executado exclusivamente no ambiente local isolado. Nenhum comando de reset, push ou migration foi dirigido ao projeto remoto.
- As 13 migrations locais foram aplicadas em ordem, de `20261001112627` até `20261027190000`, sem falha de sintaxe, constraint ou dependência.
- `supabase test db --local`: 12 arquivos e **423/423 assertions pgTAP aprovadas**.
- A suíte V2 `phase_v2_1_checkout_order_orchestrator.test.sql` foi ampliada de 12 para 26 assertions e validou criação server-side, recálculo de preço/frete/total, reserva exata, token/hash, replay idempotente e rollback por estoque insuficiente.
- Teste PostgreSQL real de concorrência: 8/8 cenários aprovados, cobrindo chaves iguais e diferentes, venda versus expiração, liberação versus venda e devoluções simultâneas, sem duplicação ou deadlock não tratado.
- Teste PostgREST real: `anon` bloqueado, usuário autenticado não-admin rejeitado, Admin allowlisted autorizado e `service_role` autorizado apenas no backend; saldo final físico e reservado permaneceram corretos.
- Os scripts dinâmicos de concorrência/PostgREST deixam fixtures no banco local. Uma execução do pgTAP após esses scripts detectou contagens adicionais; após novo reset exclusivamente local, a suíte limpa voltou a 423/423. Isso confirma poluição de fixture no ambiente de teste, não regressão de migration/RLS.
- `supabase db lint --local --level warning` sinaliza `private.prepare_inventory_batch` por referenciar a tabela temporária `pg_temp.bellmont_inventory_batch_input`, criada dinamicamente pela própria função. Os 32 testes funcionais do batch passam; o achado permanece documentado como limitação estática do linter.
- O teste PostgREST emite aviso Node `[DEP0190]` pelo uso de `child_process` com `shell: true`; é uma pendência de baixa prioridade do harness de testes, sem falha funcional.
- Deno não está instalado. Portanto, as Edge Functions foram auditadas e compiladas pelo projeto, mas a execução local nativa do runtime Deno e a homologação Mercado Pago Sandbox continuam pendentes.

## Resultado por migration local

| Migration | Resultado no reset local |
|---|---|
| `20261001112627_phase_04_1_commerce_schema.sql` | Aplicada |
| `20261002103610_phase_04_2_b_2_atomic_inventory_movement.sql` | Aplicada |
| `20261005102858_phase_04_2_c_1_product_image_storage.sql` | Aplicada |
| `20261005114425_phase_04_2_c_1_fix_storage_policy_name_shadowing.sql` | Aplicada |
| `20261005173847_phase_04_2_c_2a_product_image_gallery_rpcs.sql` | Aplicada |
| `20261009153939_allow_null_product_brand.sql` | Aplicada |
| `20261013131441_phase_04_4_b_1_public_variant_availability.sql` | Aplicada |
| `20261014114138_phase_04_4_b_3_idempotent_inventory_batches.sql` | Aplicada |
| `20261015152633_phase_05_2a_orders_reservations_security.sql` | Aplicada |
| `20261015155402_phase_05_2b_transactional_inventory_engine.sql` | Aplicada |
| `20261018082521_phase_05_2c_1_reservation_authorization_remediation.sql` | Aplicada |
| `20261020102806_phase_05_w3b_1_product_sales_mode.sql` | Aplicada |
| `20261027190000_phase_v2_1_checkout_order_orchestrator.sql` | Aplicada |

## Parecer após validação local

**APTO PARA INICIAR A PREPARAÇÃO DA HOMOLOGAÇÃO MERCADO PAGO SANDBOX**, mantendo `VITE_ENABLE_V2_CHECKOUT=false` e sem cobranças reais. A validação não autoriza aplicação remota da migration, deploy de Edge Functions, configuração de segredos ou ativação do checkout.
