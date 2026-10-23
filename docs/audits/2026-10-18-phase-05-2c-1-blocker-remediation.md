# BELLMONT E-COMMERCE — Fase 05.2C.1 — Remediação dos bloqueantes

## 1. Resumo executivo

**Parecer: BLOQUEANTES CORRIGIDOS — APTO PARA NOVA AUDITORIA.**

Os dois bloqueantes da auditoria 05.2C foram corrigidos em uma migration nova e exclusivamente local. A proteção contra reserva duplicada passou a existir no PostgreSQL, inclusive sob concorrência com chaves diferentes, e o papel `service_role` voltou a ser reconhecido em chamadas HTTP reais ao PostgREST local.

Anon e usuário autenticado não-admin permanecem bloqueados. Admin continua dependendo da allowlist. Nenhuma credencial privilegiada foi adicionada ao frontend, scripts ou relatório. Nenhuma migration, dado, estoque, pedido ou reserva foi escrito no Supabase comercial `qbedfcdarmgiytlqntpf`.

## 2. Auditoria inicial e histórico

Foram lidos os relatórios 05.2A, 05.2B, 05.2B.1 e 05.2C, as migrations 05.2A/05.2B, as suítes pgTAP, o executor independente de concorrência, as policies, grants e funções administrativas.

O `git status` já continha muitas alterações locais não commitadas. Todas foram preservadas; não houve `reset`, `clean`, checkout destrutivo, commit, push ou deploy.

O histórico read-only confirmou:

- remoto aplicado somente até `20261014114138`;
- `20261015152633` (05.2A), `20261015155402` (05.2B) e `20261018082521` (05.2C.1) continuam sem versão remota;
- a correção foi versionada em migration nova, sem reescrever as migrations anteriores.

## 3. Causa-raiz dos bloqueantes

### Bloqueante 01 — reservas duplicadas

A idempotência anterior era indexada apenas por `operation_key`. Depois da primeira reserva, o pedido permanecia elegível em `pending_payment`; uma segunda chave passava pela validação, inseria novas reservas e incrementava novamente `inventory.quantity_reserved`. Não existia uma invariável de unicidade para uma reserva ativa por item.

### Bloqueante 02 — autorização do backend

`private.is_commerce_executor()` consultava o parâmetro legado `request.jwt.claim.role`. O PostgREST local fornece o JWT assinado em `request.jwt.claims`, que é lido por `auth.jwt()`. Consequentemente, a chave local real de `service_role` chegava ao wrapper, mas falhava no guard com `NOT_AUTHORIZED`.

## 4. Correções implementadas

### 4.1 Invariável de reserva

A migration `20261018082521_phase_05_2c_1_reservation_authorization_remediation.sql` adiciona:

- índice parcial único `inventory_reservations_one_active_per_item_idx` sobre `order_item_id`, somente para `status = 'active'`;
- lock da linha do pedido antes de avaliar o estado agregado;
- comparação entre quantidade/itens pedidos e reservas ativas;
- `ORDER_ALREADY_RESERVED` para uma nova chave quando o pedido já está integralmente reservado;
- `RESERVATION_STATE_INCONSISTENT` para um estado parcial ou divergente;
- preservação de `IDEMPOTENCY_CONFLICT` para uma chave reutilizada com payload diferente;
- preservação do replay idempotente para a mesma chave e o mesmo payload.

O índice é a defesa independente contra violações diretas ou futuras regressões de função. O lock do pedido serializa chaves diferentes para o mesmo agregado. Inventários continuam bloqueados por variante em ordem determinística. Qualquer exceção reverte a transação inteira, sem reserva parcial ou incremento parcial do agregado.

O modelo atual não admite “completar” uma reserva parcial: esse estado é classificado como inconsistência e exige reconciliação. Pedidos cancelados, expirados, consumidos ou já confirmados continuam inelegíveis pelas regras de estado existentes.

### 4.2 Autorização PostgREST

`private.is_commerce_executor()` agora reconhece exclusivamente:

- Admin validado pela allowlist existente via `private.is_admin()`; ou
- claim JWT assinado `role = service_role`, lido por `auth.jwt()->>'role'`.

A função permanece `SECURITY DEFINER`, `search_path = ''`, com referências qualificadas. Os grants foram reaplicados de forma explícita. O wrapper público continua `SECURITY INVOKER`; `anon` não recebe `EXECUTE`; authenticated comum alcança o wrapper, mas é recusado pelo guard; `service_role` recebe somente os acessos já previstos ao motor. Nenhum metadado editável do usuário é usado para autorização.

## 5. Respostas estáveis

| Cenário | Resultado |
|---|---|
| Mesma chave + mesmo pedido | replay com `idempotent_replay = true` |
| Mesma chave + payload/pedido diferente | `IDEMPOTENCY_CONFLICT` |
| Nova chave + pedido integralmente reservado | `ORDER_ALREADY_RESERVED` |
| Reserva ativa parcial/divergente | `RESERVATION_STATE_INCONSISTENT` |
| Pedido em estado não elegível | `ORDER_NOT_ELIGIBLE` |
| Usuário sem autorização | `NOT_AUTHORIZED` |

## 6. Arquivos criados ou modificados

- `supabase/migrations/20261018082521_phase_05_2c_1_reservation_authorization_remediation.sql` — migration corretiva local.
- `supabase/tests/phase_05_2c_1_reservation_authorization_remediation.test.sql` — 39 assertions novas.
- `scripts/test-phase-05-2b-concurrency.mjs` — novo cenário concorrente com duas chaves para o mesmo pedido.
- `scripts/test-phase-05-2c-1-postgrest.mjs` — prova HTTP real dos quatro papéis no stack local, sem persistir/imprimir chaves.
- `docs/audits/2026-10-18-phase-05-2c-1-blocker-remediation.md` — este relatório.

## 7. Hashes SHA-256

| Artefato | SHA-256 |
|---|---|
| Migration 05.2C.1 | `735991D48C5F8BAA1CD0DF05E816E47B22890862206341C74345C20A7F60914C` |
| Teste pgTAP 05.2C.1 | `0E34066ADAE0DA6557AFE6CA5F855A495561D6B2F1AC75B520D1EF7FC204EEF0` |
| Executor de concorrência | `734D4651AD88DDF1694F3A276A9E68850DA588214FEBE2A228B01197B4CF3E3B` |
| Executor PostgREST | `1F59D48C1870E5AFC9EBBA4E1064D01FCE73F32ECAB57F1DDCD078E0FF840600` |

## 8. Testes pgTAP

O banco local foi reconstruído por `supabase db reset --local --no-seed`, aplicando todas as migrations até 05.2C.1 em PostgreSQL local.

Resultado final: **10 arquivos, 387/387 assertions aprovadas**.

A nova suíte possui 39 assertions e cobre:

- índice parcial e invariável de item ativo;
- anon sem `EXECUTE`;
- authenticated comum recusado;
- Admin allowlisted e claim `service_role` reconhecidos;
- reserva válida e retry original;
- chave diferente após reserva;
- ledger e agregado sem duplicação;
- constraint independente contra segunda reserva ativa;
- pedido com múltiplos itens e quantidades exatas;
- confirmação, cancelamento, expiração e devolução;
- ausência de movimentos físicos em liberação/expiração;
- estado parcialmente reservado rejeitado sem novos efeitos.

Duas execuções intermediárias localizaram somente leituras do ledger privado feitas pelo próprio teste ainda sob `authenticated`. O teste foi corrigido para restaurar o papel de auditoria; nenhum grant foi afrouxado. A execução integral seguinte passou.

## 9. Concorrência real

Execução: `C521-A6F1BD66`, com processos `psql` independentes.

No novo cenário “mesmo pedido + chaves diferentes”:

- códigos das sessões: uma conclusão e uma rejeição;
- sessão vencedora: `reserved`;
- sessão concorrente: `ORDER_ALREADY_RESERVED`;
- operações efetivas: 1;
- reservas ativas: 1;
- quantidade do pedido reservada: 7;
- estoque físico: 100, inalterado;
- movimentos físicos: 0;
- agregado reservado durante a prova: 12, composto pelos 5 itens do cenário de retry anterior mais os 7 deste pedido;
- após liberação de limpeza, o agregado retornou ao saldo esperado do cenário anterior.

Também passaram novamente:

- retry simultâneo com a mesma chave;
- confirmação × expiração nas duas ordens;
- liberação × consumo nas duas ordens;
- devolução total concorrente;
- devoluções parciais concorrentes.

Não houve deadlock não tratado, saldo negativo, duplicação de movimento ou alteração física por reserva/liberação.

## 10. Testes reais via PostgREST

Execução local: `C521REST-514D24E9`.

| Papel | Reserva | Expiração | Liberação |
|---|---|---|---|
| anon | bloqueada | bloqueada | não executada |
| authenticated não-admin | `NOT_AUTHORIZED` | `NOT_AUTHORIZED` | não executada |
| Admin allowlisted | `reserved` | — | `released` |
| service_role local | `reserved` | `processed` | `released` |

Estado após as duas reservas autorizadas: 2 reservas, agregado 4, físico 20 e 2 operações. Estado após a limpeza pelas próprias RPCs: reservado 0, físico 20 e zero movimentos `sale`/`return`.

As chaves/JWTs foram obtidos em memória do ambiente local e nunca foram impressos, gravados em arquivo ou adicionados ao frontend.

## 11. Regressão completa

- Reset local e aplicação integral das migrations: aprovado.
- pgTAP: **387/387**.
- Concorrência independente: aprovado.
- PostgREST real: aprovado para anon, authenticated não-admin, Admin e service_role.
- `npm test`: **62/62**.
- Build com catálogo local: aprovado.
- Build com catálogo Supabase: aprovado.
- Lint do schema público: nenhum erro.
- `git diff --check`: aprovado; apenas avisos preexistentes de LF/CRLF e configuração Git inacessível em `U:`.
- Reset local final: aprovado; fixtures removidas.
- Auditoria local pós-reset: 0 pedidos, 0 reservas e 0 operações; índice presente; funções privadas `SECURITY DEFINER`; anon sem execute; authenticated sem leitura do ledger privado; service_role com execute no wrapper.

## 12. Revisão dos seis achados de atenção

### Atenção 1 — backup desatualizado

**Pendente obrigatório antes de implantação.** O conjunto existente de 14/10/2026 antecede as 1.200 unidades e contém `roles.sql`, `schema.sql`, `data.sql` e `application-data.sql`, com hashes novamente legíveis. Nenhum backup remoto novo foi executado nesta fase, conforme restrição.

### Atenção 2 — tipos TypeScript das RPCs

**Pendente obrigatório antes da integração do backend/Admin, não bloqueia a nova auditoria SQL.** O frontend ainda não consome essas RPCs. Os tipos devem ser regenerados depois da aplicação aprovada das migrations, sem introduzir `service_role` no navegador.

### Atenção 3 — disciplina financeira

**Pendente obrigatório antes de pagamentos reais.** A confirmação ainda depende do futuro backend/webhook confiável e da validação transacional do pagamento. Checkout e pagamentos permanecem desabilitados, portanto não bloqueia a auditoria da migration, mas bloqueia lançamento comercial do fluxo de pedidos.

### Atenção 4 — janela e locks

**Mitigação operacional obrigatória na implantação.** Aplicar em janela sem ajustes de estoque, monitorar locks e interromper diante de espera prolongada. Não foi identificada regressão lógica nova.

### Atenção 5 — advisors preexistentes

**Acompanhamento posterior, com itens de segurança antes do lançamento.** Proteção de senha vazada, função booleana administrativa, RLS de defesa em profundidade para `private.admin_users`, índices de FKs e policies permissivas múltiplas não foram alterados nesta correção. Os grants efetivos locais continuam restritivos.

### Atenção 6 — retenção/LGPD

**Pendente obrigatório antes de pedidos reais.** Definir retenção, anonimização, atendimento ao titular e logs sem PII. Não afeta os testes locais do motor, mas impede considerar o checkout pronto para produção.

## 13. Backup e restauração — procedimento preparado

Backup existente: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-14-phase-04-4b-6a`.

Hashes atuais do conjunto antigo:

- `application-data.sql`: `FDB9F50C6DAA303A19B01C8A7797480EFF59601ECDAA90420FC3DBD9B1A3FA63`;
- `data.sql`: `DB797AF124CE22AAD3FB2237FF1479B4592CF592D4E76AD65A0426A02CC757B7`;
- `roles.sql`: `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308`;
- `schema.sql`: `A09A11BDE16F5D131FEBCAFDA3EAECCD627E4E01C6A53E644C19B403199D1BCD`.

Antes de futura implantação, criar uma pasta nova fora do repositório e, após autorização específica, usar os comandos confirmados pelo `supabase db dump --help`:

```powershell
npx supabase db dump --linked --role-only --file '<backup>\roles.sql'
npx supabase db dump --linked --file '<backup>\schema.sql'
npx supabase db dump --linked --data-only --use-copy --file '<backup>\data.sql'
npx supabase db dump --linked --data-only --use-copy --schema public,private,availability_private --file '<backup>\application-data.sql'
```

Depois: registrar tamanho e SHA-256, copiar para armazenamento protegido e testar restauração em PostgreSQL/Supabase isolado — nunca no comercial — na ordem roles, schema e dados. Validar migrations, 42 produtos comerciais, 80 variantes Streetwear, 1.200 unidades, 80 movimentos iniciais, zero reservas/pedidos e reconciliação por variante antes da migration 05.2.

Limitações: dumps SQL não constituem, por si só, recuperação integral dos usuários/sessões de Auth nem dos objetos binários do Storage. Metadados e arquivos de Storage precisam de estratégia separada; secrets e configurações gerenciadas também devem ser inventariados sem serem gravados no repositório. A restauração completa permanece não comprovada até um ensaio isolado do novo conjunto.

## 14. Riscos residuais e critérios para próxima auditoria

- As migrations 05.2A, 05.2B e 05.2C.1 ainda não foram aplicadas em ambiente compartilhado.
- É obrigatório criar e validar backup atualizado antes de qualquer aplicação remota.
- A futura auditoria deve congelar os hashes, revisar grants/owners/search paths, repetir advisors e definir aplicação migration por migration com checkpoints.
- Nenhuma aprovação técnica desta fase autoriza ativar produtos, checkout, pagamentos, cron, webhooks ou pedidos reais.

## 15. Integridade e restrições

- Supabase comercial: nenhuma escrita e nenhuma migration aplicada.
- Estoque comercial de 1.200 unidades: não alterado por esta execução.
- Nenhum pedido/reserva comercial criado.
- Nenhum produto ativado, preço alterado ou checkout habilitado.
- Nenhum segredo impresso ou persistido.
- Sem commit, push ou deploy.

**Conclusão: BLOQUEANTES CORRIGIDOS — APTO PARA NOVA AUDITORIA.**

A migration permanece exclusivamente local e exige autorização explícita e nova auditoria antes de qualquer aplicação remota.
