# BELLMONT V2 — Auditoria cumulativa até V2.3

Data da consolidação: 10/11/2026
Projeto: `C:\DEV PARTICULAR\BELLMONT LOJA`
Supabase vinculado: `qbedfcdarmgiytlqntpf`
Branch: `main`

## Parecer executivo

**V2 IMPLEMENTADA E VALIDADA LOCALMENTE; NÃO LIBERADA PARA PRODUÇÃO.**

A evolução V2 criou a fundação de checkout, pedidos, reservas, conciliação de pagamentos e integração Mercado Pago Sandbox sem substituir nem enfraquecer a operação V1 via WhatsApp. O checkout online permanece bloqueado por três controles independentes:

1. `COMMERCIAL_MODE=WHATSAPP_ONLY`;
2. `ONLINE_CHECKOUT_AVAILABLE=false` no código;
3. `VITE_ENABLE_V2_CHECKOUT=false` e `CHECKOUT_V2_ENABLED=false` nos ambientes padrão.

Não houve cobrança real, implantação das migrations V2 no Supabase comercial, publicação de Edge Functions V2, configuração de credenciais Mercado Pago ou ativação do checkout online.

## 1. Linha do tempo e entregas

### V2.1 — Orquestração do checkout

- Auditoria das tabelas e funções existentes de pedidos, reservas, estoque e movimentos.
- Reutilização do motor transacional existente, sem duplicar tabelas comerciais.
- Tela de checkout V2 para identificação, endereço, resumo e redirecionamento ao provedor.
- Migration local `20261027190000_phase_v2_1_checkout_order_orchestrator.sql`.
- RPC `create_checkout_order_v2` restrita ao backend:
  - recalcula preços no banco;
  - aceita apenas produtos ativos e `ASSISTED_PURCHASE`;
  - valida variante e estoque;
  - cria pedido, itens e endereço atomicamente;
  - reserva estoque usando o motor já auditado;
  - usa idempotência e rollback transacional.
- Rotas `/checkout` e `/pedido/:publicId` protegidas por feature flag.

### V2.2 — Segurança, estoque e concorrência

- Validação completa das migrations em PostgreSQL/Supabase local isolado.
- Testes de autorização para `anon`, usuário comum, Admin allowlisted e `service_role`.
- Testes reais de concorrência para:
  - mesma chave idempotente;
  - chaves diferentes;
  - venda versus expiração;
  - liberação versus consumo;
  - devoluções simultâneas.
- Preservação das regras de estoque físico, reservado, histórico e rollback.

### V2.3 — Mercado Pago Sandbox

- Escolha da Checkout Pro **Orders API**, sem misturar com o contrato legado de Preferences.
- Migration local `20261028144452_phase_v2_3_mercado_pago_order_reconciliation.sql`.
- Edge Function `checkout-create-order`:
  - allowlist de origem;
  - feature flag backend;
  - credencial de teste exclusivamente server-side;
  - rate limit persistente usando hash;
  - idempotência persistida para retries;
  - validação da referência, total e URL do provedor.
- Edge Function `mercado-pago-webhook`:
  - aceita apenas evento `order` Sandbox;
  - valida HMAC, `x-request-id`, `data.id` e janela contra replay;
  - consulta a Orders API para confirmar o estado;
  - nunca confia no retorno do navegador como prova de pagamento.
- Endpoint antigo `checkout-create-preference` convertido em tombstone local.
- RPCs atômicas de preparação, vínculo e reconciliação de pagamentos.

## 2. Estado comercial preservado

- V1 permanece finalizando exclusivamente pelo WhatsApp.
- Sacola, favoritos, catálogo, busca e rotas públicas existentes continuam funcionais.
- Nenhum pedido ou reserva é criado pela V1.
- IMPÉRIO FIT continua com atendimento independente.
- Nenhum produto, preço, imagem, variante ou estoque remoto foi alterado pela V2.
- O novo HERO âmbar é uma alteração visual separada e não interfere na arquitetura V2.

## 3. Modelo transacional

Fluxo preparado:

1. frontend valida dados básicos e envia apenas IDs de variantes e quantidades;
2. backend recalcula nomes, preços, totais e estoque;
3. banco cria o pedido e reserva unidades atomicamente;
4. Edge Function cria a ordem externa com chave idempotente;
5. usuário é redirecionado ao Checkout Pro;
6. webhook assinado dispara consulta server-to-server ao Mercado Pago;
7. RPC atômica confirma, mantém ou libera a reserva;
8. venda aprovada gera uma única baixa e um único movimento.

Regras comprovadas:

- webhooks repetidos não duplicam venda;
- eventos antigos não regridem estado final;
- pagamento pendente mantém reserva;
- cancelamento, expiração ou recusa liberam reserva;
- pagamento tardio sem reserva não baixa estoque e exige conciliação manual;
- reembolso financeiro não repõe estoque físico automaticamente;
- divergência de referência ou valor é rejeitada e auditada.

## 4. Segurança

### Controles implementados

- nenhum token Mercado Pago ou chave privilegiada em variável `VITE_`;
- nenhum `service_role`, `sb_secret_`, senha Admin ou access token materializado nos arquivos do commit;
- `.env.local` continua ignorado e não rastreado;
- Edge Functions usam a chave privilegiada somente no runtime backend;
- RPCs financeiras são restritas ao `service_role`;
- funções usam referências qualificadas, `search_path` controlado e locks transacionais;
- CORS por lista explícita de origens;
- webhook com autenticação de origem, tolerância temporal e proteção contra repetição;
- rate limit persistente para criação pública de checkout;
- URLs de redirecionamento são validadas como HTTPS do Mercado Pago;
- retorno do navegador é apenas informativo.

### Intertravamento de feature flags

Durante esta auditoria foi reforçado o bloqueio visual:

```text
V2_CHECKOUT_ENABLED = ONLINE_CHECKOUT_AVAILABLE
  && VITE_ENABLE_V2_CHECKOUT === true
```

Portanto, configurar apenas a variável Cloudflare não libera o checkout. É necessária mudança de código deliberada, configuração frontend e configuração backend.

### Pendências de segurança já conhecidas

- `public.is_current_user_admin()` permanece como ponto de revisão por ser `SECURITY DEFINER` executável por `authenticated`, embora valide a allowlist interna.
- proteção de senhas vazadas no Supabase Auth permanece pendente de configuração administrativa.
- advisors anteriores apontaram FKs sem índice e policies permissivas duplicadas; não bloqueiam o ambiente atual, mas devem ser tratados antes de escala.
- mudanças do Supabase em 2026 exigem grants explícitos para novas tabelas expostas à Data API. As tabelas V2 não dependem de acesso público direto e as RPCs financeiras permanecem backend-only.
- a remoção de cifras TLS antigas pelo Supabase em 10/11/2026 não afeta navegadores modernos usados pelo projeto; clientes obsoletos devem ser evitados.

## 5. Testes e evidências

### Revalidação em 10/11/2026

| Verificação | Resultado |
|---|---:|
| Testes frontend/TypeScript | **129/129 aprovados** |
| Build Vite padrão | aprovado |
| Build Cloudflare | aprovado |
| Varredura de segredos nos arquivos candidatos | nenhum segredo encontrado |
| `.env.local` | ignorado e não rastreado |
| `git diff --check` | aprovado |

O build mantém aviso de chunk principal acima de 500 kB. É uma pendência de performance, não uma falha funcional ou de segurança.

O Docker Desktop estava desligado na revalidação de 10/11/2026, portanto a suíte SQL não foi repetida neste dia. A tentativa foi interrompida sem conectar ao Supabase remoto e sem alterar dados.

### Última validação SQL completa — 28/10/2026

| Verificação | Resultado |
|---|---:|
| Migrations aplicadas em banco local limpo | **14/14** |
| Arquivos pgTAP | **13** |
| Assertions pgTAP | **484/484** |
| Assertions específicas V2.3 | **61/61** |
| Concorrência histórica | **8/8 cenários** |
| Concorrência de pagamento V2.3 | 1 pagamento, 1 baixa e 1 movimento |
| Edge Runtime local | aprovado |
| Build explícito com V2 | aprovado |

Após os testes de concorrência, o banco local foi resetado para remover fixtures.

## 6. Migrations V2 locais

### `20261027190000_phase_v2_1_checkout_order_orchestrator.sql`

- cria a orquestração server-side de pedido e reserva;
- não habilita catálogo nem checkout automaticamente;
- não concede escrita financeira a clientes públicos;
- depende das funções transacionais auditadas nas fases 05.2.

### `20261028144452_phase_v2_3_mercado_pago_order_reconciliation.sql`

- amplia `order_payments` com IDs e estados da Orders API;
- adiciona índices de unicidade para idempotência;
- adiciona armazenamento privado de rate limit;
- cria RPCs de preparação, vínculo e reconciliação;
- protege contra duplicação, regressão de status e estoque negativo.

Ambas permanecem somente no repositório/local até autorização específica para implantação remota.

## 7. Edge Functions

| Função | Estado |
|---|---|
| `checkout-create-order` | implementada e validada localmente; não implantada |
| `mercado-pago-webhook` | implementada e validada localmente; não implantada |
| `checkout-create-preference` | legado desativado/tombstone; não implantar como fluxo ativo |

Dependências estão com versões fixadas nos imports. Não há Deno separado obrigatório porque o Edge Runtime local do Supabase executou as funções.

## 8. Pendências para homologação Sandbox real

1. disponibilizar ambiente HTTPS de homologação;
2. aplicar as duas migrations V2 em ambiente de teste autorizado;
3. implantar somente as Edge Functions revisadas;
4. configurar secrets backend, sem valores no Git;
5. definir regra real de frete e `CHECKOUT_SHIPPING_CENTS`;
6. configurar o webhook Sandbox no Mercado Pago;
7. executar compras Sandbox aprovadas, pendentes, recusadas, canceladas e expiradas;
8. confirmar reenvio, assinatura inválida e eventos fora de ordem reais;
9. criar observabilidade para eventos `failed` e conciliação manual;
10. definir procedimento operacional para pagamento tardio e devolução física.

## 9. Critérios para produção

- homologação Sandbox integralmente aprovada;
- backup e plano de recuperação atualizados;
- migrations aplicadas controladamente e auditadas após aplicação;
- secrets configurados no backend;
- frete e prazo de reserva aprovados;
- proteção contra senhas vazadas revisada;
- alertas e rotina de conciliação operacionais;
- smoke test em ambiente de homologação;
- autorização explícita para mudar `ONLINE_CHECKOUT_AVAILABLE`;
- autorização explícita para configurar as flags de produção;
- nenhuma cobrança real antes dessa autorização.

## 10. Arquivos principais

- `src/pages/CheckoutPage.tsx`
- `src/pages/CheckoutReturnPage.tsx`
- `src/services/checkoutV2.ts`
- `src/types/checkout.ts`
- `src/utils/checkout.ts`
- `src/utils/checkout.test.ts`
- `src/utils/mercadoPago.test.ts`
- `supabase/functions/_shared/http.ts`
- `supabase/functions/_shared/mercado_pago.ts`
- `supabase/functions/checkout-create-order/index.ts`
- `supabase/functions/mercado-pago-webhook/index.ts`
- `supabase/migrations/20261027190000_phase_v2_1_checkout_order_orchestrator.sql`
- `supabase/migrations/20261028144452_phase_v2_3_mercado_pago_order_reconciliation.sql`
- `supabase/tests/phase_v2_1_checkout_order_orchestrator.test.sql`
- `supabase/tests/phase_v2_3_mercado_pago_order_reconciliation.test.sql`
- `scripts/test-v2-3-payment-concurrency.mjs`

## 11. Escopo excluído do commit

Os seguintes artefatos locais foram preservados, mas não fazem parte da V2 e não serão versionados neste commit:

- instalador `SW_DVD5_Office_2013w_SP1_64Bit_Brazilian_MLF_X19-34888.zip`;
- exports e pacote ZIP em `docs/catalog/`.

## Conclusão

**GO PARA VERSIONAR O CÓDIGO LOCAL; NO-GO PARA ATIVAR O CHECKOUT EM PRODUÇÃO.**

A base V2 está tecnicamente consistente, testada e isolada da V1. O próximo marco correto é homologação real no Mercado Pago Sandbox em ambiente separado e autorizado.
