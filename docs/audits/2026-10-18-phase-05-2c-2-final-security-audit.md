# BELLMONT E-COMMERCE — Fase 05.2C.2 — Auditoria final de segurança

## 1. Resumo executivo

**Parecer final: APTO PARA FASE 05.2C.3 — BACKUP E RECUPERAÇÃO.**

Uma auditoria independente, com leitura remota e reconstrução local completa, confirmou que os dois bloqueantes da Fase 05.2C foram corrigidos. As migrations 05.2A, 05.2B e 05.2C.1 aplicam juntas em PostgreSQL 17.11 local, as 387 assertions pgTAP passam, as corridas com sessões independentes preservam as invariáveis e a matriz PostgREST permite somente os papéis previstos.

O Supabase comercial `qbedfcdarmgiytlqntpf` permanece saudável e inalterado. Seu histórico termina na migration 04.4B.3; nenhum objeto 05.2 existe remotamente. O inventário comercial continua com 20 modelos, 80 variantes, 1.200 unidades físicas, zero reservado e ledger reconciliado.

A aprovação desta auditoria autoriza apenas preparar a próxima fase de backup e recuperação. Não autoriza migrations, estoque, produtos ativos, checkout, pagamentos ou deploy.

## 2. Escopo e evidências

Foram revisados integralmente os relatórios 05.2A, 05.2B, 05.2B.1, 05.2C e 05.2C.1; as migrations 05.2A/05.2B/05.2C.1; as migrations históricas de inventário; todas as suítes pgTAP; os scripts de concorrência/PostgREST; RLS, grants, triggers, constraints e dependências.

O `git status` foi inspecionado antes dos testes. O workspace já continha muitas alterações não commitadas, todas preservadas. Esta auditoria não modificou migrations nem código funcional; criou somente este relatório.

## 3. Revisão dos dois bloqueantes

### B01 — Reserva duplicada com chave diferente

**Evidência anterior:** uma segunda chave criava nova reserva para o mesmo item e duplicava `quantity_reserved`.

**Correção revisada no SQL:**

- índice parcial único por `order_item_id` quando `status = 'active'`;
- advisory lock por chave para idempotência;
- row lock do pedido para serializar chaves diferentes no mesmo agregado;
- comparação entre itens/quantidades pedidos e reservas ativas;
- `ORDER_ALREADY_RESERVED` para estado integralmente reservado;
- `RESERVATION_STATE_INCONSISTENT` para estado parcial/divergente;
- inventários bloqueados por variante em ordem determinística;
- falhas transacionais sem efeitos parciais.

**Evidência atual:**

- primeira reserva válida: aprovada;
- retry com a chave original: replay sem nova linha;
- nova chave: `ORDER_ALREADY_RESERVED`;
- estado parcial: `RESERVATION_STATE_INCONSISTENT`;
- duas sessões/chaves diferentes: uma conclusão, uma rejeição, uma operação, uma reserva;
- físico 100 permaneceu 100 no cenário concorrente;
- nenhum movimento físico foi criado pela reserva;
- pedido multi-item insuficiente reverteu integralmente;
- pedidos distintos continuam reservando normalmente.

**Status:** RESOLVIDO.

**Risco residual:** a invariável foi validada no stack local; a aplicação remota ainda depende de backup, hashes congelados e execução controlada.

### B02 — `service_role` recusado pelo PostgREST

**Evidência anterior:** a leitura do parâmetro legado `request.jwt.claim.role` retornava `NOT_AUTHORIZED` para a chave service-role local real.

**Correção revisada no SQL:** `private.is_commerce_executor()` usa o claim assinado retornado por `auth.jwt()->>'role'`, mantendo a allowlist Admin. A função é `SECURITY DEFINER`, possui `search_path = ''` e referências qualificadas. Os wrappers públicos permanecem `SECURITY INVOKER`.

O claim `role` usado pelo PostgREST determina o papel PostgreSQL somente depois da validação da assinatura. Um usuário comum não consegue transformar seu JWT em `service_role` alterando metadata ou o corpo do token sem invalidar a assinatura. Nenhum `user_metadata` é usado no guard.

**Evidência atual via PostgREST local:**

- anon: reserva/expiração bloqueadas;
- authenticated não-admin: `NOT_AUTHORIZED`;
- Admin allowlisted: reserva e liberação aprovadas;
- service-role local: reserva, expiração e liberação aprovadas;
- após limpeza: reservado 0, físico 20, zero movimentos de venda/devolução.

**Status:** RESOLVIDO.

**Risco residual:** a chave service-role deve continuar exclusivamente em backend confiável. Seu vazamento equivaleria a acesso elevado e RLS bypass.

## 4. Revisão das seis atenções

| ID | Evidência atual | Status | Ação antes da implantação |
|---|---|---|---|
| A01 — backup desatualizado | Último conjunto é de 14/10/2026 e antecede o lançamento das 1.200 unidades. | PENDENTE OBRIGATÓRIO | Criar novo backup, registrar hashes e validar restauração isolada na Fase 05.2C.3. |
| A02 — tipos TypeScript incompletos | `database.types.ts` ainda não declara as RPCs 05.2B. O frontend não as consome. | PENDENTE PARA INTEGRAÇÃO | Regenerar tipos após aplicação aprovada e antes do backend/Admin consumir RPCs. Não bloqueia backup. |
| A03 — disciplina financeira | `confirm_order_sale()` exige pagamento `paid`, mas a ingestão/verificação de webhook e o lock financeiro pertencem à fase futura. | PENDENTE OBRIGATÓRIO ANTES DE PAGAMENTOS | Checkout permanece bloqueado; implementar backend/webhook confiável antes de venda real. |
| A04 — janela e locks | 05.2A cria tabelas/FKs/índices vazios; 05.2B substitui função do trigger; 05.2C.1 cria índice na nova tabela vazia. | MITIGADO OPERACIONALMENTE | Aplicar em janela sem ajuste de estoque; monitorar locks e interromper diante de espera prolongada. |
| A05 — advisors preexistentes | Avisos atuais confirmados; grants efetivos não expõem `private.admin_users`, inventário ou movimentos ao anon. | ACOMPANHAMENTO | Reavaliar proteção de senha vazada, RLS de defesa em profundidade, função Admin, FKs e policies antes do lançamento. |
| A06 — retenção/LGPD | RLS protege leitura, porém política de retenção/anônimo/logs ainda não existe. | PENDENTE OBRIGATÓRIO ANTES DE PEDIDOS REAIS | Definir retenção, anonimização, atendimento ao titular e observabilidade sem PII. |

## 5. Revisão dos cinco informativos

| ID | Evidência atual | Status |
|---|---|---|
| I01 — Data API opt-in | As migrations usam grants explícitos e RLS forçada; não dependem de autoexposição de novas tabelas. | CONFIRMADO |
| I02 — PostgreSQL | Remoto saudável em PostgreSQL `17.11.0.002`; local aplicou as migrations na mesma geração principal. | CONFIRMADO |
| I03 — mudanças de extensões no PG 17.11 | As migrations 05.2 não usam `ltree`, `btree_gist`, cifras legadas ou operadores customizados; `extensions.digest()` permanece SHA-256. | NÃO APLICÁVEL |
| I04 — implantação não ativa comércio | As migrations não ativam produtos, checkout, pagamentos, cron ou webhooks. Os 42 produtos comerciais permanecem `draft`. | CONFIRMADO |
| I05 — fronteira do motor | Ledger idempotente é privado; wrappers são invoker; helpers são definer com guard explícito; anon não executa RPCs 05.2. | CONFIRMADO |

## 6. Auditoria das migrations

### 05.2A — schema e segurança

- Cria oito tabelas públicas vazias para pedidos, itens, endereços, pagamentos, remessas, histórico, reservas e inbox de webhook.
- Valores monetários usam `numeric(12,2)` e quantidades usam inteiros positivos.
- FKs relevantes usam `RESTRICT` ou `SET NULL` conforme a preservação histórica.
- O histórico é append-only por trigger.
- Todas as oito tabelas possuem RLS habilitada e forçada.
- Anon não recebe grants.
- Authenticated recebe somente leitura mediada por ownership/Admin; não recebe escrita.
- `payment_webhook_events` não é concedida ao navegador.
- Service-role possui grants de backend e deve permanecer fora do frontend.

### 05.2B — motor transacional

- Cria ledger idempotente privado.
- Helpers privilegiados usam `SECURITY DEFINER`, `search_path = ''`, autorização explícita e objetos qualificados.
- Wrappers públicos são `SECURITY INVOKER`.
- Lock order é pedido → inventários ordenados → reservas.
- Reserva/liberação alteram apenas `quantity_reserved`.
- Venda reduz físico e reservado na mesma transação.
- Devolução aumenta físico dentro do limite efetivamente vendido.
- A substituição de `record_inventory_movement()` preserva `initial`/`adjustment` e adiciona metadados transacionais `sale`/`return`.
- Não existe escrita durante a aplicação da migration; os efeitos comerciais só ocorrem quando as RPCs são chamadas.

### 05.2C.1 — remediação

- Cria um índice parcial único na tabela nova de reservas.
- Substitui somente `is_commerce_executor()` e `reserve_order_inventory()`.
- Não contém `DROP`, `TRUNCATE`, `DELETE` ou alteração de dados comerciais.
- Preserva grants explícitos e não amplia o anon.

### Ordem e compatibilidade

A ordem 05.2A → 05.2B → 05.2C.1 é obrigatória. Todas as dependências remotas existem: catálogo, variantes, inventário, ledger, constraint composta produto/variante, constraints de saldo, trigger de movimento, `private.is_admin()`, `private.set_updated_at()` e pgcrypto.

O remoto não contém objetos 05.2, portanto não foi identificada colisão nominal. A aplicação local integral e o lint público aprovados confirmam sintaxe/compatibilidade com PostgreSQL 17.

### Locks potenciais

- FKs/índices da 05.2A são criados sobre tabelas novas vazias.
- `CREATE OR REPLACE FUNCTION` pode aguardar transações concorrentes que referenciem a função histórica.
- O índice único da 05.2C.1 incide sobre tabela recém-criada e vazia na implantação inicial.
- Não há table rewrite de catálogo/inventário, mas a janela controlada continua obrigatória.

## 7. Hashes SHA-256 auditados

| Artefato | SHA-256 |
|---|---|
| Migration 05.2A | `19D697418BE3028F82DD38AD86CABBC738AEB277B0E22058754F5FFE6402D43F` |
| Migration 05.2B | `7B6BC967534F102E9ECEE556861129DA0EF53004C64070A2B316C9B1CC3D651B` |
| Migration 05.2C.1 | `735991D48C5F8BAA1CD0DF05E816E47B22890862206341C74345C20A7F60914C` |
| Teste 05.2A | `8A795869911D831A6C04E6989A9ECE29E5DA64EA014F1FB2E397C606231BEFC8` |
| Teste 05.2B | `0D0F462F11F8C766E906FBF64AEB5CEA9247AA8D6479A4BCEA7BA052F070B7E8` |
| Teste 05.2B.1 | `7C3F624767A3BA9F97F68A8EB4AEC8214D89A70FC3BCB1D717286932CADE290B` |
| Teste 05.2C.1 | `0E34066ADAE0DA6557AFE6CA5F855A495561D6B2F1AC75B520D1EF7FC204EEF0` |
| Concorrência | `734D4651AD88DDF1694F3A276A9E68850DA588214FEBE2A228B01197B4CF3E3B` |
| PostgREST | `1F59D48C1870E5AFC9EBBA4E1064D01FCE73F32ECAB57F1DDCD078E0FF840600` |

## 8. Segurança, RLS e grants

Auditoria local pós-reset:

- 0 pedidos, 0 reservas e 0 operações idempotentes;
- anon sem `SELECT` em pedidos/inventário e sem `EXECUTE` na reserva;
- anon sem `USAGE` no schema `private`;
- authenticated comum sem `INSERT` em pedidos;
- authenticated comum sem escrita em reservas;
- authenticated comum sem leitura do ledger privado;
- authenticated possui `EXECUTE` no wrapper, mas o guard interno retorna `NOT_AUTHORIZED` quando não é Admin;
- service-role possui `EXECUTE` previsto no wrapper.

No remoto atual, anon também não possui `SELECT` em inventário/movimentos, não possui `USAGE` em `private` e não lê `private.admin_users`. Authenticated possui `USAGE` em `private` para os guards existentes, mas nenhuma leitura da allowlist; RLS forçada protege inventário/movimentos.

O Advisor apresenta `private.admin_users` sem RLS como aviso estrutural. A alegação genérica de exposição não foi confirmada: o schema não é exposto ao anon, não há `USAGE` para anon e não há grants de tabela para anon/authenticated. Habilitar RLS sem planejar a policy poderia quebrar `private.is_admin()` e não foi feito nesta auditoria.

## 9. PostgREST e credenciais

Execução real local: `C521REST-475B0A66`.

| Papel | Resultado efetivo |
|---|---|
| anon | reserva e expiração bloqueadas |
| authenticated comum | reserva e expiração com `NOT_AUTHORIZED` |
| Admin allowlisted | reserva/liberação aprovadas |
| service-role | reserva/expiração/liberação aprovadas |

O frontend usa somente URL e chave publicável. A varredura do source/bundle não encontrou valor real `service_role`, `sb_secret_`, senha de teste, JWT secret ou connection string. Ocorrências textuais encontradas são documentação defensiva, nomes de variáveis em scripts locais ou código da biblioteca Supabase; nenhum segredo foi materializado no bundle. A chave publicável presente no bundle é pública por desenho.

O navegador não confirma pagamentos: authenticated comum não escreve em `order_payments`, não altera reservas/inventário e não passa no guard das RPCs. O fato de um pagamento estar `paid` deve ser produzido futuramente por backend/webhook confiável; esse risco permanece A03.

## 10. Concorrência e regressão transacional

Execução independente: `C521-63A57414`.

- Retry simultâneo: uma operação original e um replay; uma reserva; 5 reservadas.
- Chaves diferentes: uma conclusão e uma `ORDER_ALREADY_RESERVED`; uma operação; uma reserva; nenhuma mudança física.
- Confirmação primeiro × expiração: venda única; expirador processou zero.
- Expiração primeiro × confirmação: reserva expirada; confirmação tardia em reconciliação; zero venda.
- Liberação primeiro × consumo: liberada; venda tardia em reconciliação.
- Consumo primeiro × liberação: venda única; liberação posterior `already_inactive`.
- Duas devoluções totais: uma aprovada, uma `RETURN_EXCEEDS_SOLD`.
- Duas devoluções parciais complementares: ambas serializadas; total exatamente vendido.
- Sem deadlocks não tratados, saldo negativo, reserva acima do físico ou duplicação de ledger.

Os testes pgTAP também cobriram estoque insuficiente, expiração repetida, confirmação tardia, multi-item atômico, idempotência, payload divergente e proteção das tabelas.

## 11. Compatibilidade e integridade remota

Projeto confirmado: `BELLMONT E-commerce`, ref `qbedfcdarmgiytlqntpf`, região `sa-east-1`, estado `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`.

Histórico remoto aplicado:

- 04.1, 04.2B.2, 04.2C.1, hotfix Storage, galeria, fabricante NULL, disponibilidade pública e idempotência de lote;
- termina em `20261014114138`;
- 05.2A, 05.2B e 05.2C.1 ausentes.

Objetos remotos 05.2: nenhuma das nove tabelas/ledgers e nenhuma das seis funções do motor foi encontrada.

Estado comercial read-only:

| Métrica | Resultado |
|---|---:|
| Produtos comerciais | 42 |
| Produtos comerciais em draft | 42 |
| Modelos Streetwear | 20 |
| Variantes Streetwear | 80 |
| Linhas de inventário Streetwear | 80 |
| Linhas diferentes de 15 | 0 |
| Quantidade física total | 1.200 |
| Quantidade reservada | 0 |
| Movimentos Streetwear | 80 |
| Divergências inventário × ledger | 0 |
| Batch concluído | 1 |
| Operações aplicadas | 80/80 |
| Meta total do batch | 1.200 |
| Fixture técnica | 1, archived |

Não existem tabelas remotas de pedidos/reservas 05.2, portanto não há pedido ou reserva comercial inesperado nesse domínio.

## 12. Resultados finais

- `supabase db reset --local --no-seed`: aprovado; todas as migrations aplicadas em ordem.
- pgTAP: **10 arquivos, 387/387 assertions aprovadas**.
- Concorrência PostgreSQL independente: aprovada.
- PostgREST real local: matriz dos quatro papéis aprovada.
- `npm test`: **62/62**.
- Build catálogo local: aprovado.
- Build catálogo Supabase: aprovado.
- Lint público: nenhum erro.
- Reset final local: aprovado; fixtures removidas.
- `git diff --check`: aprovado ao final, com apenas avisos preexistentes de LF/CRLF e configuração `U:` inacessível.

## 13. Advisors atuais

Security Advisor:

- proteção de senha vazada desabilitada — WARN, pendente antes do lançamento;
- `public.is_current_user_admin()` executável por authenticated e `SECURITY DEFINER` — WARN, comportamento intencional limitado a booleano, manter sob revisão;
- tabelas privadas de batch com RLS sem policies — INFO, bloqueio por desenho além de grants revogados.

Referências: [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [funções SECURITY DEFINER executáveis](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS sem policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Performance Advisor:

- 8 FKs preexistentes sem índice;
- 2 índices de imagem ainda sem uso observado;
- 3 conjuntos de policies permissivas múltiplas.

Esses achados merecem medição com carga e não justificam remoção automática de índice/policy antes da implantação 05.2.

## 14. Backup e recuperação

O backup existente em `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-14-phase-04-4b-6a` está desatualizado. Ele antecede o lote comercial de 1.200 unidades.

Critérios obrigatórios da Fase 05.2C.3:

1. confirmar novamente destino, saúde, histórico e hashes;
2. criar novo diretório fora do repositório, sem sobrescrever o conjunto anterior;
3. exportar roles, schema e dados da aplicação por ferramentas oficiais;
4. registrar timestamp, tamanho e SHA-256 de cada arquivo;
5. restaurar em PostgreSQL/Supabase isolado, nunca no comercial;
6. reconciliar 42 produtos, 80 variantes Streetwear, 1.200 unidades, 80 movimentos, batch 80/80 e zero reservado;
7. validar funções, triggers, constraints, policies, grants e histórico;
8. documentar separadamente Auth, Storage, secrets e configurações gerenciadas;
9. não presumir recuperação integral de usuários/sessões Auth ou binários Storage sem prova específica;
10. interromper se dump, hash ou restauração divergirem.

## 15. Riscos residuais e pré-condições de implantação

Antes de qualquer migration remota:

- concluir a Fase 05.2C.3 com backup novo e restauração isolada comprovada;
- congelar os três hashes de migration deste relatório;
- reconsultar histórico e garantir ausência de migration inesperada;
- aplicar migration por migration com checkpoints separados;
- manter checkout, produtos e pagamentos desabilitados;
- executar em janela sem operação de estoque;
- validar grants/RLS/objetos após cada migration;
- interromper diante de lock prolongado, hash divergente, objeto inesperado ou saldo divergente;
- não usar rollback destrutivo depois da existência de pedidos; preferir diagnóstico e migration forward.

Riscos não bloqueadores para a preparação do backup: tipos TypeScript ainda não regenerados, advisors preexistentes e políticas operacional/LGPD pendentes. Todos bloqueiam etapas posteriores específicas, conforme seção 4.

## 16. Integridade da execução

- Nenhuma migration remota aplicada.
- Nenhuma função remota com efeito colateral executada.
- Nenhuma escrita remota realizada.
- Nenhum estoque, produto, preço, status, pedido ou reserva comercial alterado.
- Nenhum checkout, cobrança, webhook, cron, commit, push ou deploy criado.
- Todos os arquivos e alterações locais preexistentes foram preservados.

## 17. Parecer final

**APTO PARA FASE 05.2C.3 — BACKUP E RECUPERAÇÃO.**

Os bloqueantes estão comprovadamente resolvidos, a regressão completa passou e a compatibilidade remota foi confirmada por leitura. A próxima etapa deve limitar-se ao backup verificável e à restauração isolada; não iniciar implantação automaticamente.
