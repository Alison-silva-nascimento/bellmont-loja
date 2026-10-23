# Fase 04.4B.3 — lançamento idempotente de estoque

Este documento descreve uma operação futura. A migration e o manifesto permanecem locais até aprovação explícita.

## Arquitetura

A RPC existente `apply_inventory_movement` permanece inalterada e continua atendendo às movimentações unitárias do Admin.

A migration 04.4B.3 acrescenta:

- `private.inventory_batches`: manifesto imutável, hash do payload, responsável, totais e estado;
- `private.inventory_batch_operations`: uma operação-alvo por variante, com chave idempotente, saldo esperado, alvo, movimento e responsável;
- `prepare_inventory_batch`: valida integralmente o manifesto, catálogo e saldos antes de registrar o lote;
- `apply_inventory_batch_operation`: aplica uma operação pendente e retorna `already_applied` em reenvios.

As tabelas não têm grants para `anon` ou `authenticated`. Wrappers públicos são `SECURITY INVOKER`; helpers internos são `SECURITY DEFINER`, têm `search_path` vazio, grants explícitos e repetem a verificação `private.is_admin()`.

## Manifesto aprovado

Arquivo:

`docs/inventory/manifests/bellmont-streetwear-initial-2026-10-14-v1.json`

Controle esperado:

- lote: `BELLMONT-STREETWEAR-INITIAL-2026-10-14-V1`;
- produtos: ST-01 a ST-20;
- variantes: 80;
- alvo: 15 por SKU;
- total por tamanho: 300;
- total por modelo: 60;
- total geral: 1.200;
- saldo esperado antes da aplicação: zero/sem inventário.

O mesmo arquivo e as mesmas chaves devem ser reutilizados em qualquer retomada. Nunca gerar novas chaves para repetir o mesmo lançamento.

## Pré-validação futura

1. Revisar e aprovar migration e testes.
2. Confirmar que não há migrations anteriores pendentes/divergentes.
3. Aplicar somente a migration aprovada em janela controlada.
4. Confirmar grants, RLS, funções, tabelas privadas e Security Advisor.
5. Consultar novamente os 80 IDs/SKUs e confirmar que correspondem ao manifesto.
6. Confirmar que todos permanecem ativos como variantes e com saldo físico esperado igual a zero.
7. Confirmar que perfumes, fitness e fixture não aparecem no manifesto.
8. Executar `npm run inventory:manifest:validate`.
9. Autenticar um administrador allowlisted.
10. Preparar o lote uma vez, enviando apenas o array `operations` do manifesto.

Qualquer divergência deve interromper o lançamento.

## Execução futura

Para cada `operation_key` do manifesto, chamar `apply_inventory_batch_operation` com o mesmo `batch_key`.

- Operação pendente: aplica o alvo e registra um movimento.
- Operação aplicada: retorna `already_applied`, sem novo delta.
- Catálogo ou saldo divergente: a transação falha e a operação permanece pendente.
- Interrupção de rede/processo: consultar o lote e retomar somente as operações pendentes.
- Nunca chamar diretamente `apply_inventory_movement` para este lote.
- Nunca executar UPDATE direto em `inventory`.

Cada operação é uma transação atômica. O lote completo é retomável, não uma transação única com 80 alterações.

## Pós-validação futura

Confirmar:

- 80 operações `applied`;
- lote `completed`;
- 80 linhas comerciais de inventário;
- 15 unidades em cada SKU;
- 300 unidades por tamanho;
- 1.200 unidades totais;
- exatamente 80 movimentos associados;
- nenhum estoque negativo ou abaixo do reservado;
- nenhuma alteração em PF-01..PF-22, IMPÉRIO FIT ou TEST-FIXTURE-01.

Cadastrar estoque não ativa produtos. A ativação exige autorização separada.

