# BELLMONT E-commerce — Fase 05.1 — Arquitetura de pedidos e checkout

## Resumo executivo

A aplicação possui uma base segura para catálogo, variantes, disponibilidade, sacola, Auth Admin e inventário, mas ainda não possui domínio de pedidos. Não existem tabelas, funções ou telas para checkout, endereço, frete, pagamento, webhook, reserva ou atendimento pelo WhatsApp.

O projeto está **condicionalmente pronto para iniciar a Fase 05.2**, desde que ela se limite ao schema, às transações de reserva e às políticas de segurança. Checkout e pagamento não devem ser iniciados antes de existirem uma máquina de estados, idempotência e testes concorrentes para reservas.

Esta auditoria foi somente leitura. Nenhum dado remoto, migration, estoque, produto ou componente foi modificado.

## 1. Inventário do frontend existente

### Rotas

O roteamento usa `HashRouter`, adequado ao GitHub Pages atual. As rotas públicas são Home, Streetwear, IMPÉRIO FIT, Perfumaria, listagem geral, PDP, favoritos, busca, sacola e contato. `/admin/*` é carregada separadamente por lazy loading. Não há rota de checkout ou confirmação de pedido.

Arquivos principais:

- `src/main.tsx`: composição `CatalogProvider → FavoritesProvider → CartProvider`.
- `src/App.tsx`: rotas públicas e Admin.
- `src/components/layout/Layout.tsx`, `Header.tsx` e `MobileMenu.tsx`: navegação responsiva.
- `src/pages/ListingPage.tsx`, `ProductPage.tsx` e `components/commerce/QuickView.tsx`: descoberta e seleção.
- `src/pages/CartPage.tsx`: sacola e resumo.

### Catálogo

`CatalogProvider` centraliza catálogo local/Supabase. O modo local continua sendo o padrão configurável; o modo Supabase consulta apenas produtos `active`. `publicCatalog.ts` normaliza produtos, variantes e imagens e usa `get_public_variant_availability()` para disponibilidade sem expor quantidades exatas.

Pontos reutilizáveis:

- Identidade estável por código/SKU.
- Variantes com tamanho, cor e volume.
- Estados de catálogo vazio, carregando e indisponível.
- Fail-closed: falta de disponibilidade não significa estoque.

### Sacola

`CartContext` persiste em `localStorage`, reconcilia itens quando catálogo/estoque mudam, preserva itens incompatíveis durante alternância de fonte e limita quantidade ao estoque confirmado. `utils/cart.ts` concentra validação e cálculo de subtotal.

Pontos reutilizáveis:

- Seleções separadas por variante.
- Quantidades limitadas e revalidadas.
- Resolução de preço e subtotal para apresentação.
- Feedback acessível e persistência após F5.

Limite importante: a sacola é estado do navegador, não é autoridade comercial. Preços, totais e estoque deverão ser recalculados no backend ao iniciar checkout.

### PDP e Quick View

Ambas já exigem variante válida, explicam estoque não confirmado e impedem adição indisponível. Podem encaminhar ao checkout sem redesenho, mas precisarão lidar com erros de revalidação retornados pelo servidor.

### Favoritos

`FavoritesContext` é local, independente da sacola e compatível com migração de identidades. Não precisa participar do schema de pedidos.

### Estados e responsividade

Há mensagens de carregamento, indisponibilidade, erro e feedback `aria-live`. O layout já possui breakpoints mobile. O checkout deverá seguir o mesmo design system, com etapas curtas, resumo fixo apenas quando houver espaço e recuperação de progresso sem armazenar dados de cartão.

## 2. Auditoria do Admin

O painel existente está em `src/admin` e reutiliza o mesmo projeto React:

- `AdminGuard` distingue carregando, sem sessão, autenticado sem autorização, indisponível e autorizado.
- `AdminAuthContext` acompanha login, logout, refresh de token e mudanças de sessão.
- `adminAuth.ts` usa `getUser()` e `is_current_user_admin()` após obter sessão.
- `AdminLayout` fornece sidebar e área de conteúdo.
- Páginas atuais: Dashboard, Produtos, formulário/variantes/imagens, Estoque e Movimentações.
- Serviços usam o cliente Supabase tipado; RLS continua sendo a autorização efetiva.

### Nova seção proposta: Admin → Pedidos

Reutilizar `AdminLayout`, tabela, badges, filtros, tratamento de carregamento/erro e páginas responsivas existentes.

Rotas futuras:

- `/admin/pedidos`: tabela paginada no servidor.
- `/admin/pedidos/:id`: detalhe, timeline, pagamento, frete e itens.

Filtros: número, status comercial, pagamento, origem, intervalo de datas e entrega. Índices devem acompanhar esses filtros. A UI não deve carregar todos os pedidos para filtrar no navegador.

Ações administrativas devem ser RPCs transacionais específicas; nunca atualizações livres de status. Registrar ator, instante, status anterior, novo status e motivo.

## 3. Auditoria do schema remoto

Estado observado no projeto `qbedfcdarmgiytlqntpf`:

- 43 produtos totais; 42 comerciais em `draft`; zero ativos.
- 96 variantes e 53 imagens.
- 82 posições de inventário e 84 movimentos.
- Streetwear: 1.200 físicos e zero reservados.
- Batch inicial: 1 batch concluído e 80 operações aplicadas.
- RLS habilitado e forçado nas tabelas comerciais.
- Uma identidade Admin allowlisted.

Não existem `orders`, `order_items`, `order_addresses`, `order_payments`, `order_shipments`, `order_status_history`, `payment_webhook_events` ou `inventory_reservations`.

### Estoque atual

`inventory` garante:

- `quantity_on_hand >= 0`.
- `quantity_reserved >= 0`.
- `quantity_reserved <= quantity_on_hand`.

`apply_inventory_movement()` é Admin-only, serializa por variante e impede estoque físico abaixo do reservado. `inventory_movements` é append-only.

Lacuna estrutural: o trigger atual cria ledger somente quando `quantity_on_hand` muda e classifica como `initial`/`adjustment`. Uma reserva que altera apenas `quantity_reserved` não gera movimento; uma venda precisará de transição própria que diminua físico e reservado e registre `sale`, pedido e item. A Fase 05.2 deverá desenhar isso sem alterar semanticamente os 80 movimentos do lançamento inicial.

## 4. Componentes reutilizáveis e alterações necessárias

| Área | Reutilizar | Alteração futura |
|---|---|---|
| Catálogo | `CatalogProvider`, normalização e disponibilidade | ativação comercial separada; revalidação backend |
| PDP/Quick View | seleção de variante e mensagens | encaminhar seleção ao checkout e tratar conflito |
| Sacola | contexto, persistência, identidade e limites | criar payload mínimo; aceitar correções do servidor |
| Admin Auth | guard, sessão e `private.is_admin()` | nenhuma autorização baseada apenas na UI |
| Admin UI | layout, tabelas, badges e estados | páginas Pedidos, detalhe e timeline |
| Inventário | constraints, locks e ledger append-only | RPCs de reserva/consumo/liberação/retorno |
| Supabase | cliente público tipado e RLS | Edge Functions/segredos somente no backend |

## 5. Lacunas funcionais

- Nenhum identificador ou máquina de estados de pedido.
- Nenhum snapshot imutável de produto/preço/endereço/frete.
- Nenhuma reserva com expiração.
- Nenhuma idempotência de criação de checkout ou webhook.
- Nenhum backend confiável para recalcular valores.
- Produtos sem peso/dimensões para cotação de frete.
- Nenhum gateway, webhook ou reconciliação financeira.
- Nenhuma política LGPD/retention para dados pessoais.
- Nenhuma seção Pedidos no Admin.
- Nenhum registro distinto de solicitação via WhatsApp.

## 6. Modelo de dados proposto

Usar `bigint`/identity para relações internas ou UUID quando necessário para idempotência externa; valores monetários em `numeric(12,2)`, moeda fixada em `BRL`, timestamps em `timestamptz`. Estados devem ter `CHECK` explícito. Não armazenar números de cartão, CVV ou token reutilizável.

### `orders`

Responsabilidade: agregado comercial e totais confirmados.

Campos essenciais: `id uuid`, `order_number text unique`, `source` (`site`/`whatsapp`), `status`, `customer_user_id uuid null`, comprador nome/telefone/e-mail, `currency`, `items_subtotal`, `discount_total`, `shipping_total`, `grand_total`, `paid_total`, `checkout_idempotency_key unique`, `guest_access_token_hash null`, `expires_at`, `created_at`, `updated_at`.

Constraints: totais não negativos; `grand_total = items_subtotal - discount_total + shipping_total`; `paid_total <= grand_total` exceto regra explícita de crédito; origem/status válidos. O número público deve incluir aleatoriedade e não revelar contagem sequencial.

Índices: número único; `(status, created_at desc)`; `(source, created_at desc)`; `customer_user_id` parcial; `lower(buyer_email)` somente se necessário.

### `order_items`

Responsabilidade: snapshot imutável da compra.

Campos: `id`, `order_id`, `product_id`, `variant_id`, snapshots de código, SKU, nome, fabricante, categoria, cor, tamanho, volume e opções; `quantity`; `unit_price`; `line_total`; `created_at`.

Constraints: quantidade positiva, valores não negativos, `line_total = unit_price * quantity`, FK `RESTRICT`. Índices em `order_id` e `variant_id`.

### `order_addresses`

Responsabilidade: snapshot do destinatário e endereço de entrega.

Campos: `order_id` unique, destinatário nome/telefone, CEP, logradouro, número, complemento, bairro, cidade, UF, referência e timestamps. Validar formato, não presumir que o endereço retornado pelo CEP é completo.

### `order_payments`

Responsabilidade: tentativas e estado financeiro, permitindo mais de uma tentativa por pedido.

Campos: `id uuid`, `order_id`, `provider`, `provider_payment_id`, `idempotency_key`, método (`pix`/`credit_card`), status, valor, parcelas, `provider_status`, `pix_expires_at`, `approved_at`, `refunded_amount`, payload sanitizado mínimo e timestamps.

Unicidade: `(provider, provider_payment_id)` e `(provider, idempotency_key)`. Nunca armazenar PAN/CVV.

### `payment_webhook_events`

Responsabilidade: inbox idempotente de eventos.

Campos: `id`, `provider`, `provider_event_id`, tipo, payload bruto protegido, assinatura validada, `received_at`, `processed_at`, `processing_status`, erro sanitizado. Unique `(provider, provider_event_id)`. Persistir antes de processar; aceitar entrega at-least-once.

### `order_shipments`

Responsabilidade: cotação escolhida e ciclo da entrega.

Campos: `order_id`, provedor, serviço/transportadora, quote ID, preço e prazo em snapshot, `quoted_at`, `quote_expires_at`, shipment/label ID, tracking code, status, posted/shipped/delivered timestamps. Índices em tracking e status/data.

### `order_status_history`

Responsabilidade: timeline append-only.

Campos: `order_id`, status anterior/novo, motivo, origem (`system`, `admin`, `payment_webhook`, `shipping_webhook`), `actor_user_id null`, `created_at`. Sem update/delete.

### `inventory_reservations`

Responsabilidade: vínculo explícito entre item e quantidade reservada.

Campos: `id uuid`, `order_item_id`, `variant_id`, quantidade, status (`active`, `consumed`, `released`, `expired`), `expires_at`, `consumed_at`, `released_at`, `created_at`. Unique por `order_item_id`; índice parcial `(expires_at) where status='active'`; índice em `(variant_id, status)`.

### Venda assistida

Criar `assistance_requests` e `assistance_request_items`, separados de `orders`. A abertura do WhatsApp cria no máximo uma solicitação `open`; não cria pagamento, pedido concluído ou baixa. Após confirmação humana, uma RPC Admin converte a solicitação em pedido `source='whatsapp'`. Reserva é uma ação explícita, com prazo.

## 7. Fluxos de pedido

### Compra direta

1. Cliente envia somente identidades de variantes, quantidades, contato e endereço.
2. Backend reconsulta produto ativo, variante ativa, preço e estoque.
3. Em uma transação, bloqueia inventários em ordem determinística, cria pedido/itens/snapshots e incrementa reservas.
4. Backend obtém ou revalida cotação e grava snapshot.
5. Cria tentativa de pagamento com chave idempotente.
6. Retorno do navegador mostra estado, mas não aprova pagamento.
7. Webhook autenticado e idempotente consulta o provedor e confirma o estado.
8. Ao aprovar, transação consome reserva: reduz `quantity_on_hand` e `quantity_reserved`, cria movimento `sale` vinculado ao pedido/item e avança status.
9. Expiração/recusa libera reserva de forma idempotente.

### WhatsApp assistido

1. Backend valida sacola e cria `assistance_request`, sem mexer em estoque por padrão.
2. Frontend oferece botão click-to-chat explícito.
3. Abertura do link não significa mensagem enviada.
4. Admin pode criar reserva temporária ou converter em pedido.
5. Pix manual deve ser confirmado administrativamente antes de marcar pago; registrar evidência mínima, nunca segredo bancário.

## 8. Estratégia de estoque e reservas

- Disponibilidade: sempre `on_hand - reserved`, calculada no banco.
- Lock: `SELECT ... FOR UPDATE` das variantes em ordem crescente para reduzir deadlocks.
- Criação: idempotency key única por tentativa de checkout.
- Reserva: somente se todas as linhas puderem ser reservadas; falha atômica caso contrário.
- TTL inicial sugerido: 15–30 minutos, decisão comercial pendente; Pix pode exigir prazo alinhado à expiração da cobrança.
- Expiração: job agendado idempotente libera reservas vencidas em pequenos lotes com `SKIP LOCKED`.
- Consumo: somente webhook confirmado ou ação Admin auditada para venda manual.
- Liberação: pagamento recusado/expirado/cancelamento antes da expedição.
- Devolução: processo separado; estorno financeiro não repõe estoque automaticamente.
- Overselling: constraints existentes + locks + transação única de reserva.
- Ledger: evoluir o trigger/contexto para gravar `reservation`, `release`, `sale` e `return` com `reference_type/id`, preservando movimentos antigos.

## 9. Estratégia de endereço e frete

CEP deve auxiliar preenchimento, não substituir validação do cliente. A chamada pode passar por backend/cache para rate limiting; endereço escolhido é salvo como snapshot.

Recomendação inicial: avaliar Melhor Envio primeiro, pois oferece cotação, compra de etiqueta, rastreio e sandbox. A documentação exige CEP de origem/destino e peso/dimensões dos produtos ou volumes, e recomenda persistir a cotação usada no checkout. Produção e sandbox são ambientes separados. [Documentação oficial de cotação](https://docs.melhorenvio.com.br/docs/cotacao-de-fretes) e [sandbox](https://docs.melhorenvio.com.br/reference/introducao-api-melhor-envio).

Correios direto deve ser comparado se o lojista já possuir contrato, credenciais e regras comerciais. Não escolher sem obter CEP de origem, CNPJ/CPF, contrato, serviços desejados, política de embalagem e frequência de postagem.

Dependência bloqueadora: cadastrar peso, largura, altura e comprimento ou perfis logísticos para cada item. Definir embalagem, seguro, declaração de conteúdo/NF e margem de frete.

Cada cotação deve ter hash dos itens/endereço, valor, prazo, provider ID e expiração. Mudança na sacola/endereço invalida a cotação.

## 10. Estratégia de pagamentos

### Mercado Pago

Bom candidato para avaliação inicial: Orders API recomendada, Pix, cartão, ambiente de teste, Bricks/tokenização no navegador, idempotência obrigatória e webhooks. Access Token fica exclusivamente em Edge Function/secret store. [Orders/Checkout Transparente](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/overview), [Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix) e [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications).

### Pagar.me

Permanece candidato por Pix/cartão e recursos de adquirência, mas deve passar por nova verificação de documentação V5, onboarding, antifraude, parcelamento, prazo de liquidação, estorno, sandbox e custo antes da decisão. Não assumir compatibilidade contratual apenas pela API.

### Asaas

Alternativa relevante para checkout hospedado ou API de cobranças Pix/cartão. A documentação confirma sandbox, webhooks at-least-once e uso do ID do evento para idempotência. [Visão geral oficial](https://docs.asaas.com/docs/visao-geral), [Checkout](https://docs.asaas.com/docs/checkout-asaas) e [idempotência de webhooks](https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks).

### Critérios de escolha

- Taxas Pix/cartão e antecipação, verificadas na proposta comercial vigente.
- Parcelamento e responsabilidade pelos juros.
- Chargeback/antifraude e prazo de recebimento.
- Qualidade do sandbox, webhooks assinados, idempotência e reconsulta.
- Checkout transparente versus hospedado e impacto PCI.
- Estorno total/parcial e conciliação.
- Suporte, disponibilidade e SLA.

Arquitetura: Edge Functions separadas para criar pagamento e receber webhook; secrets por ambiente; allowlist de eventos; assinatura autenticada; persistência do evento antes do processamento; resposta rápida; worker idempotente; reconciliação periódica de estados pendentes.

## 11. Integração WhatsApp

Usar `https://wa.me/<numero>?text=<mensagem codificada>` somente após obter dados confirmados do backend. A mensagem é montada a partir do snapshot do pedido, nunca do subtotal local.

Conteúdo: número, comprador/destinatário, itens, variantes, quantidades, subtotal, frete, total, valor pago confirmado, status e endereço. Pagamento pendente deve ser explicitado.

Exibir botão “Enviar pedido pelo WhatsApp”; não depender de popup automático. Avisar que os dados serão compartilhados com o WhatsApp/Meta e pedir ação consciente do usuário. Evitar informação desnecessária; permitir copiar texto como fallback.

## 12. Modelo de permissões

- `anon`: sem acesso direto a tabelas de pedidos/PII.
- Visitante: Edge Function/RPC estreita cria checkout; consulta posterior somente com token aleatório de alta entropia armazenado como hash e resposta minimizada.
- Cliente autenticado futuro: SELECT apenas dos próprios pedidos (`auth.uid() = customer_user_id`), sem escrita direta.
- `authenticated` não-admin: nenhum acesso administrativo.
- Admin: policies com `(select private.is_admin())`; alterações sensíveis apenas por RPCs de transição.
- Webhooks: Edge Function autenticada pelo provedor; service role somente no servidor e com validação antes de mutar dados.
- Histórico/eventos: append-only; payloads restritos e retenção definida.

Checkout visitante é recomendado inicialmente pela menor fricção. Conta opcional pode ser adicionada depois; não condicionar a primeira compra a cadastro.

Proteções adicionais: rate limiting por IP/chave de tentativa, CAPTCHA adaptativo em abuso, limites de quantidade/valor, logs sem PII, erros não enumeráveis e ambientes de teste/produção totalmente separados.

## 13. Privacidade e retenção

- Coletar apenas dados necessários a pagamento, entrega, fiscal e suporte.
- Definir base legal, aviso de privacidade, prazo fiscal/comercial e processo de atendimento ao titular.
- Restringir telefone/endereço a Admin e backend.
- Não registrar endereço, token ou payload completo em logs.
- Criptografia em trânsito; avaliar criptografia de campos de maior risco conforme operação.
- Payload bruto de webhook deve ter retenção curta ou sanitização; preservar IDs, hash e resultado de processamento.

## 14. Riscos técnicos e dependências comerciais

### Altos

- Implementar pagamento antes de reserva transacional permite overselling.
- Confiar em retorno de sucesso do navegador permite fraude de status.
- Expor pedido por número previsível causa enumeração/IDOR.
- Reusar o ledger atual sem adaptação perde semântica de reserva/venda.

### Médios

- GitHub Pages não hospeda backend; Edge Functions ou backend equivalente são obrigatórios.
- Frete depende de dimensões/peso hoje ausentes.
- Webhooks chegam duplicados e fora de ordem.
- WhatsApp click-to-chat não confirma envio.
- Plano Supabase/backup/PITR deve ser reavaliado antes de pedidos reais.

### Decisões do lojista

- Gateway e modalidade de checkout.
- Conta/contrato, taxas, parcelamento e antifraude.
- CEP de origem, documentos, política fiscal e de embalagem.
- Transportadoras, retirada local e frete grátis.
- TTL de reserva e prazo Pix.
- Política de cancelamento, troca, devolução e recomposição de estoque.
- Número oficial do WhatsApp e texto de privacidade.

## 15. Roadmap recomendado

### 05.2 — Schema, segurança e transações de estoque

Escopo: tabelas centrais, estados, constraints, índices, RLS, funções transacionais de criar/reservar/liberar/consumir e testes concorrentes. Prever `assistance_requests`, mas não integrar provedores.

Aceite: migrations locais; pgTAP para anon/auth/admin; duas sessões concorrentes; nenhuma mutação no estoque comercial durante testes; rollback e idempotência comprovados.

### 05.3 — Serviço backend de pedidos

Escopo: Edge Functions tipadas para cotação interna do carrinho, criação idempotente, consulta guest segura e serviços Admin. Gerar tipos TypeScript.

Aceite: preços sempre do banco; rate limiting; nenhum segredo no bundle; testes de contrato e falhas.

### 05.4 — Admin → Pedidos

Escopo: lista paginada, filtros, detalhe, timeline e transições permitidas. Sem pagamento real.

### 06 — Endereço e frete

Escopo: CEP, dados logísticos, adaptador de provedor, cache, cotação e snapshot. Começar em sandbox.

### 07 — Checkout

Escopo: UI mobile-first, identificação, endereço, frete, revisão, criação idempotente e confirmação de pedido pendente. Ainda sem marcar pagamento como aprovado no cliente.

### 08 — Pagamentos e webhooks

Escopo: provedor escolhido, sandbox, Pix/cartão tokenizado, webhook assinado, reconciliação, estorno e consumo/liberação de reserva.

### 09 — WhatsApp e venda assistida

Escopo: solicitações distintas, click-to-chat, conversão Admin e reserva explícita.

### 10 — Testes e publicação

Escopo: E2E, concorrência, carga, segurança, LGPD, observabilidade, backup/restauração, runbooks e checklist de produção.

Ordem mantida com uma ressalva: a escolha comercial preliminar de frete/pagamento deve acontecer durante 05.2–05.3, embora a integração só ocorra nas fases 06/08.

## 16. Próxima fase sugerida e parecer

Próxima fase: **05.2 — Schema de pedidos, reservas e políticas de segurança**.

Parecer: **PRONTO COM PRÉ-CONDIÇÕES**.

O catálogo, Admin, Auth, disponibilidade e inventário fornecem uma base adequada. O projeto ainda não está pronto para aceitar pedidos ou pagamentos reais. A implementação pode começar pelo schema e pelas transações de reserva, desde que preserve os 1.200 itens, mantenha todos os produtos em `draft`, não publique checkout e trate concorrência/idempotência como critérios obrigatórios de aceite.

## Evidência de não alteração

- Nenhum SQL de escrita foi executado.
- Nenhuma migration foi criada ou aplicada.
- Nenhum pedido ou reserva foi criado.
- Estoque Streetwear permaneceu em 1.200 e reservas em zero.
- Nenhum produto foi ativado ou teve preço alterado.
- Nenhum commit, push ou deploy foi realizado.
