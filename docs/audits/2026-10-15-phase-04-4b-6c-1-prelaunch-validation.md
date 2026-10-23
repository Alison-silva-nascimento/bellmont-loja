# BELLMONT — Fase 04.4B.6C.1 — Pré-validação comercial

## 1. Ambiente e escopo

- Data: 2026-10-15.
- Projeto remoto: `BELLMONT E-commerce` (`qbedfcdarmgiytlqntpf`), região `sa-east-1`.
- Estado observado: `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- Auditoria exclusivamente read-only: somente consultas `SELECT` foram executadas.
- Nenhuma RPC de escrita, migration, batch ou operação de estoque foi executada.

## 2. Estado da migration e dos objetos

- O histórico remoto contém oito migrations e termina exatamente em `20261014114138_phase_04_4_b_3_idempotent_inventory_batches`.
- Não há migration posterior ou inesperada.
- Existem `private.inventory_batches` e `private.inventory_batch_operations`.
- As duas tabelas têm RLS habilitado e forçado, ACL direta somente para `postgres` e nenhuma linha armazenada.
- Existem as quatro funções previstas: duas helpers privadas e dois wrappers públicos.

## 3. Manifesto validado

- Arquivo: `docs/inventory/manifests/bellmont-streetwear-initial-2026-10-14-v1.json`.
- SHA-256: `EA7BDAC7D89B74D56FD25F7B849044F836FE934E7527B48F54540EEBC6F36CE1`.
- Batch key: `BELLMONT-STREETWEAR-INITIAL-2026-10-14-V1`.
- 20 produtos, `ST-01` a `ST-20`.
- 80 SKUs e 80 operation keys únicos.
- Tamanhos P, M, G e GG: 20 variantes e 300 unidades-alvo por tamanho.
- 15 unidades por SKU, 60 por produto e 1.200 no total.
- O validador local concluiu com sucesso e manteve o manifesto em modo `PREVIEW_ONLY_NOT_APPLIED`.

## 4. Identidade catálogo × manifesto

Foi feita comparação remota, linha a linha, dos 80 registros usando `product_code`, `product_id`, `variant_id`, `sku`, `size`, vínculo pai, status do produto e atividade da variante.

- Registros comparados: 80.
- Divergências: 0.
- Produtos Streetwear: 20, todos em `draft`.
- Variantes Streetwear: 80, todas ativas.
- SKUs únicos: 80.
- O digest canônico de identidade aprovado para esse conjunto permanece `a6d3cba8787d36b579b41723f8d2fc3a`; a equivalência foi revalidada pela comparação integral das tuplas, sem depender apenas do digest.

## 5. Estado de estoque, reservas e histórico

- Linhas de inventário comercial para os 80 SKUs: 0; ausência foi tratada como saldo zero.
- Quantidade física total: 0.
- Quantidade reservada total: 0.
- Movimentos comerciais: 0.
- Batch comercial com a batch key aprovada: 0.
- Operações comerciais com as operation keys aprovadas: 0.
- Não existem tabelas `orders`, `order_items` ou `reservations` no schema público.
- A fixture `TEST-FIXTURE-01` não foi consultada como alvo, modificada ou incluída na simulação.

## 6. Simulação read-only

A tabela completa das 80 operações está em `docs/inventory/simulations/bellmont-streetwear-initial-2026-10-14-v1-read-only.csv`.

- Elegíveis: 80.
- Bloqueadas: 0.
- Saldo atual/esperado por SKU: 0.
- Alvo por SKU: 15.
- Delta simulado por SKU: +15.
- Delta total simulado: +1.200.
- Alterações remotas produzidas: 0.

## 7. Idempotência e concorrência

- `batch_key` é única e protegida por advisory transaction lock determinístico.
- `operation_key` é globalmente única; cada batch também restringe variante e operation key duplicadas.
- O manifesto é persistido com SHA-256 e conteúdo JSON; reenvio divergente gera `IDEMPOTENCY_CONFLICT`.
- O preparo valida catálogo e saldo esperado antes de criar o batch.
- A aplicação bloqueia batch/operação, serializa a variante, reconfirma saldo esperado e usa a RPC atômica de inventário.
- Operação já aplicada retorna `already_applied` sem novo movimento.
- Operações pendentes permitem retomada parcial; falhas transacionais não deixam operação com forma parcial devido às constraints e ao rollback PostgreSQL.
- O vínculo `movement_id` é único e a forma `pending/applied` é validada por constraint.

## 8. Segurança efetiva

- Helpers privadas: `SECURITY DEFINER`, proprietária `postgres`, `search_path` vazio, guardas `auth.uid()` e `private.is_admin()`.
- Wrappers públicos: `SECURITY INVOKER`, `search_path` vazio.
- `anon`: sem USAGE no schema `private`, sem EXECUTE nas quatro funções e sem leitura de inventário/movimentos.
- `authenticated`: sem acesso direto às duas tabelas de batch; pode executar funções, mas as helpers recusam não-admin.
- `public.inventory` e `public.inventory_movements` permanecem com RLS habilitado e forçado; policies exigem `private.is_admin()`.
- Nenhum segredo administrativo, `service_role`, `sb_secret_`, senha de teste ou connection string foi encontrado em arquivo rastreado ou no bundle existente.
- `.env.local` continua ignorado pelo Git; somente `.env.example` está rastreado.

## 9. Fixture e dados fora do escopo

- Nenhum perfume, item IMPÉRIO FIT ou fixture técnica integra o manifesto.
- Nenhum produto, preço, status, imagem, variante, Auth, Storage, RLS ou grant foi alterado.
- Os dados comerciais continuam em `draft`; a pré-validação não publica o catálogo.

## 10. Plano preparado para a futura Fase 04.4B.6C.2

1. Reconfirmar projeto, saúde, migration final, SHA-256 do manifesto e contagens zero imediatamente antes da escrita.
2. Autenticar uma identidade Admin allowlisted sem persistir credenciais no repositório.
3. Preparar uma única vez o batch imutável com a batch key e o manifesto aprovados.
4. Aplicar as 80 operation keys individualmente, registrando retorno por SKU.
5. Em timeout, consultar o estado do batch e repetir a mesma operation key; nunca gerar outra chave.
6. Interromper diante de qualquer divergência, conflito, SKU não elegível ou resultado que não seja `applied`/`already_applied`.
7. Validar 80 operações aplicadas, 80 movimentos únicos, 15 por SKU, 1.200 unidades totais e zero reservas.
8. Não ativar produtos nesta etapa; ativação comercial exige autorização separada.

## 11. Critérios de interrupção da futura execução

- Projeto, migration ou hash diferentes dos aprovados.
- Qualquer saldo, reserva, movimento, batch ou operação comercial inesperada.
- Mudança de IDs, SKUs, tamanhos, vínculo pai, status ou atividade de variante.
- Identidade sem autorização Admin.
- Falha de conexão sem estado conclusivo: retomar somente com a mesma batch/operation key após consulta.
- Qualquer divergência entre saldo esperado e saldo remoto.

## 12. Parecer

**APTO para solicitar autorização separada da Fase 04.4B.6C.2.**

Este parecer aprova somente a preparação técnica. Não autoriza lançar estoque, preparar batch, chamar RPC de escrita, ativar produtos ou alterar dados remotos.

## Riscos residuais

- A restauração integral de Auth/Storage continua não comprovada, conforme risco já aceito na etapa de backup.
- `authenticated` possui grants nas tabelas públicas de inventário, mas RLS forçado e policies Admin impedem o uso por usuário comum; esse desenho deve permanecer coberto por regressão de segurança.
- A recuperação após timeout depende de consulta do estado e reenvio da mesma chave; criar nova chave quebraria a garantia operacional de idempotência.
