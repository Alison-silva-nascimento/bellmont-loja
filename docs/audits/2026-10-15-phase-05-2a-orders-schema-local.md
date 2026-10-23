# BELLMONT E-commerce — Fase 05.2A — Schema local de pedidos, reservas e segurança

## Resumo executivo

A Fase 05.2A implementa apenas a fundação local do domínio de pedidos. A migration cria oito tabelas em `public`, constraints, índices, RLS forçada, grants mínimos e um trigger auxiliar para manter o histórico de status append-only.

Nenhum pedido, reserva, cobrança ou movimento comercial foi criado. A migration não foi aplicada ao Supabase comercial `qbedfcdarmgiytlqntpf` e não contém seed comercial, endpoint de webhook, checkout ou função de execução de pedido.

## 1. Arquitetura implementada

O agregado central é `orders`. Os itens, endereços, tentativas de pagamento, entregas, histórico e reservas são snapshots vinculados ao pedido. `payment_webhook_events` é somente a estrutura futura de inbox idempotente; nesta fase não existe endpoint que a alimente.

Pedido comercial e solicitação assistida são distinguidos por `record_type`:

- `commercial_order`: pedido comercial.
- `assistance_request`: solicitação de atendimento, limitada por constraint a estados não confirmados e `paid_total = 0`.

As origens aceitas são `website` e `whatsapp_assisted`. Isso prepara WhatsApp sem interpretar a abertura de uma conversa como pedido confirmado.

### Diagrama textual

```text
auth.users
   └── orders.customer_user_id (SET NULL)

orders
   ├── order_items
   │     ├── products/product_variants (RESTRICT)
   │     └── inventory_reservations
   │            └── product_variants (RESTRICT)
   ├── order_addresses
   ├── order_payments
   │     └── payment_webhook_events
   ├── order_shipments
   └── order_status_history

product_variants
   └── inventory (saldo agregado já existente: on_hand/reserved)
          └── inventory_movements (ledger já existente)
```

## 2. Tabelas e responsabilidades

### `orders`

- Chave interna `bigint identity`.
- `public_id uuid` aleatório, único e não sequencial para referência pública futura.
- `order_number` único, fornecido futuramente pelo backend confiável.
- Comprador autenticado opcional e snapshots de nome, telefone e e-mail.
- Moeda fixada em `BRL`.
- Subtotal, desconto, frete, total e valor pago em `numeric(12,2)`.
- Estados comercial, financeiro e de atendimento separados.
- Chave de idempotência única.
- Expiração opcional posterior à criação.

### `order_items`

- Snapshot de código, SKU, nome, marca, categoria, cor, tamanho, volume, quantidade e preços.
- `quantity > 0`.
- `line_total = unit_price * quantity - discount_total`.
- Produto/variante referenciados por FK composta.
- Exclusão de produto ou variante já usado é `RESTRICT`; o catálogo deve ser arquivado, preservando a história.

### `order_addresses`

- Snapshot de entrega ou cobrança.
- Um endereço por tipo e pedido.
- CEP com oito dígitos e UF com duas letras maiúsculas.
- Não funciona como catálogo de endereços mutável do cliente.

### `order_payments`

- Múltiplas tentativas por pedido.
- Métodos: `pix`, `credit_card` e `manual`.
- Idempotência por `(provider, idempotency_key)`.
- Identificador externo único por provedor quando informado.
- Valores solicitados/confirmados e estados validados.
- Não há campos para PAN, CVV ou credencial reutilizável de cartão.

### `order_shipments`

- Pedido pode existir sem cotação.
- Snapshot de provedor, transportadora, serviço, cotação, frete e prazo.
- Rastreamento e marcos de envio/entrega opcionais.
- Constraints impedem valor negativo, prazo não positivo e cronologia de entrega inválida.

### `order_status_history`

- Timeline separada por tipo de alteração e ator.
- Motivo e referência técnica opcionais.
- Trigger bloqueia `UPDATE` e `DELETE`, inclusive para acessos privilegiados comuns.
- Não contém PII nem segredos de pagamento.

### `inventory_reservations`

- Liga pedido, item e variante por FK composta, impedindo associação cruzada.
- Quantidade estritamente positiva.
- Estados `active`, `consumed`, `released` e `expired`.
- Datas de consumo/liberação coerentes com o estado.
- Expiração obrigatória posterior à criação.
- Chave de idempotência única.

### `payment_webhook_events`

- Unicidade por `(provider, external_event_id)`.
- Estados de recebimento/processamento explícitos.
- Erro técnico sanitizado limitado a 1.000 caracteres.
- Não armazena payload bruto nem segredo.
- Sem grants ou policies para `anon` e `authenticated`.

## 3. Constraints e valores monetários

Valores monetários usam `numeric(12,2)`, nunca `float` ou `money`. A moeda é estritamente `BRL` nesta primeira versão.

O banco valida totais internos de pedido e linha. Regras que atravessam múltiplas tabelas — soma dos itens versus subtotal do pedido, soma de pagamentos versus `paid_total` e soma das reservas versus `inventory.quantity_reserved` — não foram simuladas com constraints inadequadas. Elas deverão ser validadas dentro das transações atômicas da Fase 05.2B.

Status são `text` com `CHECK`, seguindo o padrão real do projeto e evitando enum global difícil de evoluir.

Todas as FKs usadas em joins e deleções possuem índice útil. Há índices parciais para cliente autenticado, rastreamento, webhook ligado a pagamento e reservas ativas por expiração.

## 4. RLS, grants e Auth

As oito tabelas possuem RLS habilitada e forçada.

### `anon`

- Nenhum `SELECT`, `INSERT`, `UPDATE` ou `DELETE`.
- Visitante não acessa tabelas de pedido nem PII diretamente.
- Checkout visitante futuro deverá passar por backend/Edge Function estreita.

### `authenticated` não-admin

- Somente `SELECT` em pedido próprio e filhos do pedido próprio.
- Nenhuma escrita direta.
- Nenhum acesso a `payment_webhook_events`.
- Pedidos de visitante, com `customer_user_id = NULL`, não ficam expostos.

### Admin allowlisted

- As policies usam `(select private.is_admin())` e permitem leitura de todos os pedidos e filhos.
- Não há escrita administrativa direta nesta fase; transições futuras deverão usar funções específicas e auditadas.

### `service_role`

- Possui grants explícitos para o futuro backend confiável.
- Não deve ser usado no frontend.
- RLS não substitui validação transacional do backend.

O projeto local usa `auto_expose_new_tables = false`. Os grants explícitos tornam o comportamento independente da mudança da Data API que deixa de autoexpor novas tabelas.

## 5. Funções e triggers

Nenhuma função comercial de checkout, reserva, consumo, pagamento ou expiração foi criada.

A única função nova é `private.prevent_order_status_history_mutation()`, `SECURITY INVOKER`, com `search_path = ''` e `EXECUTE` revogado de `PUBLIC`, `anon`, `authenticated` e `service_role`. Ela é chamada somente pelo trigger append-only.

Os triggers `updated_at` reutilizam `private.set_updated_at()` já existente para `orders`, `order_payments` e `order_shipments`.

## 6. Integração prevista com inventário

Não foi criado segundo saldo. `public.inventory.quantity_reserved` continua sendo o único agregado reservado, e `quantity_on_hand - quantity_reserved` continua definindo disponibilidade.

`inventory_reservations` é o detalhe auditável por pedido/item. Na Fase 05.2B, qualquer transação deverá:

1. bloquear variantes/inventários em ordem determinística;
2. revalidar catálogo, preço e disponibilidade no servidor;
3. inserir o pedido e snapshots;
4. criar reservas e incrementar `quantity_reserved` atomicamente;
5. garantir que a soma ativa permaneça reconciliada com o agregado;
6. registrar reserva/liberação/venda no ledger com semântica própria;
7. preservar integralmente os movimentos históricos existentes.

A migration 05.2A não altera `inventory`, `inventory_movements`, triggers antigos ou as 1.200 unidades Streetwear.

## 7. Preparação para pagamentos

O schema suporta múltiplas tentativas, idempotência por provedor, ID externo e inbox de eventos at-least-once. Ainda faltam:

- escolha contratual do provedor;
- Edge Function/backend com secrets;
- autenticação e revalidação de webhook;
- persistência/processamento idempotente do evento;
- transações de confirmação, recusa, estorno e reconciliação;
- política de retenção.

O retorno do navegador nunca deverá marcar um pedido como pago.

## 8. Preparação para frete

O schema aceita pedido sem cotação e preserva a cotação escolhida. A Fase seguinte ainda depende de peso/dimensões, CEP de origem, política de embalagem, provedor e expiração da cotação.

## 9. Preparação para WhatsApp

`record_type = 'assistance_request'` e `source = 'whatsapp_assisted'` distinguem solicitação de pedido confirmado. Uma solicitação não pode ficar em estado confirmado, pago ou entregue. Conversão futura deve ser uma ação explícita e transacional; abrir `wa.me` não cria venda nem reserva automaticamente.

## 10. Tipagem TypeScript

`src/lib/supabase/database.types.ts` foi reconciliado com a saída de `supabase gen types typescript --local --schema public` e mantém os tipos anteriores. Foram adicionados tipos de Row/Insert/Update e relacionamentos para as oito tabelas, além de aliases exportados.

Nenhum serviço de checkout foi criado.

## 11. Testes realizados

Ambiente: Supabase CLI 2.119.0, Docker local e PostgreSQL 17 configurado pelo projeto.

- `supabase db reset --local --no-seed`: todas as migrations, incluindo `20261015152633`, aplicadas com sucesso.
- `supabase test db`: 7 arquivos, 288 assertions, todas aprovadas.
- Nova suíte 05.2A: 66 assertions aprovadas.
- `supabase db lint --local --schema public --level warning --fail-on error`: nenhum erro no schema público.
- `npm test`: 62/62 testes aprovados.
- `npm run build`: TypeScript e build Vite aprovados.
- `git diff --check`: aprovado; apenas avisos informativos de conversão LF/CRLF em arquivos preexistentes.

A suíte cobre existência, FKs, dinheiro, status, totais, quantidades, lifecycle de reservas, unicidade, RLS forçada, grants, isolamento entre clientes, leitura Admin, bloqueio de `anon`, bloqueio de escrita direta, proteção do webhook, append-only e compatibilidade do inventário.

O lint global ainda reporta o falso positivo preexistente em `private.prepare_inventory_batch`: o analisador estático não resolve a tabela temporária criada dinamicamente antes do `INSERT`. Essa função já é coberta pelos testes pgTAP e não foi alterada na Fase 05.2A.

## Arquivos da Fase 05.2A

- `supabase/migrations/20261015152633_phase_05_2a_orders_reservations_security.sql` — migration local.
- `supabase/tests/phase_05_2a_orders_schema_security.test.sql` — 66 assertions pgTAP.
- `src/lib/supabase/database.types.ts` — tipos das oito tabelas e aliases de linhas.
- `docs/audits/2026-10-15-phase-05-2a-orders-schema-local.md` — este relatório.

## 12. Plano de rollback

Como a migration permanece exclusivamente local e não contém dados, o rollback antes de qualquer aplicação compartilhada é remover os objetos em ordem reversa durante uma recriação local controlada.

Depois de uma futura aplicação remota, não se deve apagar automaticamente o schema, especialmente após existirem pedidos. O procedimento seguro será:

1. interromper novas operações;
2. exportar schema e dados;
3. identificar se há linhas em qualquer tabela 05.2A;
4. corrigir por migration forward quando houver dados;
5. somente em ambiente comprovadamente vazio, usar uma migration de reversão revisada que remova policies/triggers, depois tabelas filhas e por último `orders`;
6. nunca reverter alterações no inventário histórico como efeito colateral.

## 13. Riscos residuais

- Ainda não existem transações atômicas de criar pedido/reservar/liberar/consumir.
- Não há reconciliação automática entre reservas detalhadas e `inventory.quantity_reserved`.
- Não há endpoint seguro de visitante nem token de consulta de alta entropia.
- Não há webhook, rate limiting, CAPTCHA, provedor de pagamento ou frete.
- Não há política final de retenção/LGPD.
- A máquina de transições ainda precisa ser implementada e testada contra concorrência.
- A escrita futura com `service_role` deve permanecer exclusivamente no backend e validar toda entrada.

## 14. Próximos passos — Fase 05.2B

1. Auditar novamente a migration antes de qualquer aplicação remota.
2. Definir máquina de estados e transições permitidas.
3. Implementar RPCs/backend atômicos para criação e reserva, sem confiar em preços do navegador.
4. Implementar liberação, expiração, consumo e retorno idempotentes.
5. Evoluir o ledger para registrar referências de pedido/item sem reclassificar movimentos antigos.
6. Testar concorrência real com duas sessões.
7. Criar acesso de consulta de visitante minimizado e não enumerável.
8. Só depois integrar checkout/frete/pagamento em ambiente de teste.

## Parecer

**APTO para revisão técnica que antecede a Fase 05.2B**, condicionado à aprovação da migration local e sem autorização implícita para aplicação remota.
