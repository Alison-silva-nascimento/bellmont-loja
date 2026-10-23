# BELLMONT — Fase 05.2B.1 — Conclusão de concorrência e idempotência

## Parecer

**APTO PARA REVISÃO 05.2C.**

Os cenários pendentes da Fase 05.2B foram comprovados dinamicamente em PostgreSQL local isolado, com sessões `psql` independentes. A migration `20261015155402_phase_05_2b_transactional_inventory_engine.sql` não precisou ser alterada. Nenhuma migration, função, policy, produto, pedido, estoque ou movimento foi modificado no Supabase remoto.

## Ambiente

- Supabase CLI local: `2.119.0`.
- PostgreSQL: container local `supabase_db_BELLMONT_LOJA`.
- O banco local foi reconstruído a partir de todas as migrations locais antes da regressão final.
- As fixtures concorrentes foram criadas exclusivamente no banco local e eliminadas pelo reset final.
- Execução concorrente registrada: `C521-5ACC0C51`.

## Testes reais de concorrência

O executor `scripts/test-phase-05-2b-concurrency.mjs` abre processos `psql` independentes e falha com código não zero diante de qualquer invariável incorreta.

### Retry concorrente com a mesma chave

- Duas sessões reservaram o mesmo pedido com a mesma operation key.
- Uma sessão retornou `idempotent_replay=false`; a outra, `idempotent_replay=true`.
- Estado final: 1 operação idempotente, 1 reserva, 5 unidades reservadas.
- Não houve duplicação de reserva nem de saldo.

### Confirmação versus expiração

As duas ordens de lock foram forçadas:

1. Confirmação primeiro: `sold`; o expirador usou `SKIP LOCKED` e processou 0 pedidos. Reserva final `consumed`, exatamente 1 movimento `sale`.
2. Expiração primeiro: 1 pedido expirado; a confirmação tardia retornou `reconciliation_required`. Reserva final `expired`, zero movimentos `sale`.

Não houve venda e expiração simultâneas para o mesmo saldo.

### Liberação versus consumo

As duas ordens de lock foram forçadas:

1. Liberação primeiro: `released`; confirmação posterior retornou `reconciliation_required`; zero movimentos `sale`.
2. Consumo primeiro: `sold`; liberação posterior retornou `already_inactive`; reserva final `consumed`; exatamente 1 movimento `sale`.

Não houve dupla liberação, consumo sem reserva ou saldo negativo.

### Devoluções concorrentes

- Duas devoluções totais de 4 unidades: uma sessão concluiu; a outra recebeu `RETURN_EXCEEDS_SOLD`. Estado final: 1 movimento e 4 unidades devolvidas.
- Duas devoluções parciais concorrentes de 2 unidades: ambas concluíram após serialização pelo lock do item. Estado final: 2 movimentos e total de 4 unidades devolvidas.
- O estoque físico foi restaurado exatamente ao saldo anterior à venda, sem duplicação.
- Não foram observados deadlocks não tratados.

## Cobertura pgTAP adicionada

Foi criada a suíte transacional `phase_05_2b_1_inventory_lifecycle_edges.test.sql`, com rollback e 32 assertions adicionais:

- expiração explícita de reserva vencida;
- reserva válida não expirada;
- repetição de expiração sem duplicação;
- confirmação após expiração;
- confirmação após liberação;
- confirmação duplicada e confirmação posterior ao consumo;
- evento webhook duplicado;
- mesma chave idempotente com payload divergente;
- falha atômica de pedido com vários itens;
- devolução parcial seguida de devolução total;
- bloqueio de over-return;
- replay de devolução sem novo movimento.

Resultado final: **9 arquivos, 348 assertions, todas aprovadas**. A suíte original 05.2B permaneceu com suas 28 assertions e a nova suíte adicionou 32.

## Regressão final

- Reset local completo e reaplicação de migrations: aprovado.
- `npx supabase test db`: **348/348**.
- `npm test`: **62/62**.
- Build com `VITE_PUBLIC_CATALOG_SOURCE=local`: aprovado.
- Build com `VITE_PUBLIC_CATALOG_SOURCE=supabase`: aprovado.
- `npx supabase db lint --local --schema public --level warning --fail-on error`: nenhum erro.
- `git diff --check`: aprovado; somente avisos preexistentes de conversão LF/CRLF.

## Arquivos desta conclusão

- `scripts/test-phase-05-2b-concurrency.mjs` — executor reproduzível de sessões PostgreSQL independentes.
- `supabase/tests/phase_05_2b_1_inventory_lifecycle_edges.test.sql` — 32 assertions pgTAP transacionais.
- `docs/audits/2026-10-16-phase-05-2b-1-concurrency-completion.md` — este relatório.

Arquivos preexistentes, inclusive todas as alterações locais não commitadas, foram preservados. A migration 05.2B e sua suíte original não foram modificadas nesta fase.

## Integridade

- SHA-256 da migration 05.2B: `7B6BC967534F102E9ECEE556861129DA0EF53004C64070A2B316C9B1CC3D651B`.
- SHA-256 da nova suíte pgTAP: `7C3F624767A3BA9F97F68A8EB4AEC8214D89A70FC3BCB1D717286932CADE290B`.
- SHA-256 do executor concorrente: `CF4ECE987B786111C87B3E2A9FC8ED441C2B7349A1670B3E34855A3088571A42`.

## Riscos restantes

- Os testes comprovam o comportamento no stack Supabase/PostgreSQL local, não em produção.
- A migration permanece exclusivamente local e ainda exige auditoria/aprovação própria antes de aplicação remota.
- Falhas externas de provedor de pagamento e entrega fora do banco continuam fora do escopo desta fase.
- Nenhum checkout, pagamento real ou ativação comercial foi executado.

## Restrições confirmadas

- Sem `supabase db push` ou aplicação remota.
- Sem escrita no banco comercial.
- Sem estoque, produto ou status comercial alterado.
- Sem commit, push ou deploy.
