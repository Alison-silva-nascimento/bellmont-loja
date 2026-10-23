# BELLMONT — Fase 05.2B — Motor transacional local

## Resultado

Foi criada a migration local `20261015155402_phase_05_2b_transactional_inventory_engine.sql`. Nenhuma migration ou escrita foi executada no projeto remoto.

## Arquitetura

- `private.order_inventory_operations`: ledger privado de idempotência, com chave única, tipo, payload e resultado.
- Helpers `SECURITY DEFINER` em `private`, `search_path=''`, autorização por `private.is_admin()` ou claim confiável `service_role`.
- Wrappers públicos `SECURITY INVOKER`: `reserve_order_inventory`, `release_order_inventory`, `confirm_order_sale`, `return_order_item` e `expire_due_reservations`.
- `anon` não possui `EXECUTE`; `authenticated` comum falha em `NOT_AUTHORIZED`; escrita direta continua proibida.

## Estados, locks e ledger

Reserva valida pedido comercial elegível, produto/variante ativos, itens e disponibilidade. Inventários são bloqueados em ordem de variante; pedido, inventário e reservas seguem ordem consistente. Falha em um item reverte tudo.

Liberação e expiração diminuem apenas `quantity_reserved`. Venda reduz físico e reservado na mesma transação e cria movimento físico `sale`. Devolução aumenta apenas físico, cria `return` e não implica reembolso. Reserva/liberação permanecem no histórico próprio, preservando a semântica do ledger físico antigo.

Confirmação sem reserva ativa retorna `reconciliation_required`, sem baixa. Operações repetidas com mesmo payload retornam replay; payload divergente gera `IDEMPOTENCY_CONFLICT`. Devoluções do mesmo item usam advisory lock próprio.

## Testes

- Reset local completo: aprovado.
- pgTAP: 8 arquivos, 316 assertions, todas aprovadas; 28 pertencem à 05.2B.
- Concorrência real de reserva, duas sessões: uma reservou 10 de 15; a outra recebeu `INSUFFICIENT_STOCK`; final `on_hand=15`, `reserved=10`, disponível 5 e uma reserva.
- `npm test`: 62/62.
- `npm run build`: aprovado.
- Lint do schema público: sem erros.
- `git diff --check`: aprovado; apenas avisos LF/CRLF preexistentes.

## Pendências obrigatórias

Ainda não foram executados, em sessões independentes, quatro cenários exigidos: retry concorrente com a mesma chave, confirmação versus expiração, liberação versus consumo e devolução concorrente. A suíte funcional cobre retry, venda, liberação e devolução sequenciais, mas isso não substitui a evidência concorrente.

Os testes pgTAP também precisam ser ampliados com casos explícitos de expiração, confirmação tardia após expiração, devolução total e expiração repetida, embora a lógica correspondente exista.

## Parecer

**NÃO APTO para iniciar a Fase 05.2C.** A implementação local e a regressão estão funcionais, porém o critério de aceite exige todas as provas concorrentes reais. Não houve commit, push, deploy, ativação de produto ou alteração remota.
