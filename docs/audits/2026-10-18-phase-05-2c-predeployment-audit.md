# BELLMONT E-COMMERCE — Fase 05.2C — Auditoria pré-implantação

## 1. Resumo executivo

**Parecer final: NÃO APTO.**

As migrations 05.2A e 05.2B são compatíveis com o schema remoto atual, são aplicadas com sucesso em PostgreSQL 17.11 local e mantêm a regressão existente verde. O banco comercial está saudável e íntegro: 20 modelos Streetwear, 80 variantes, 15 unidades por variante, 1.200 unidades físicas, nenhuma reserva e todos os 42 produtos comerciais em `draft`.

Entretanto, a auditoria encontrou dois bloqueadores funcionais na migration 05.2B:

1. O mesmo pedido pode ser reservado novamente usando uma nova chave idempotente. Uma prova local dentro de `BEGIN/ROLLBACK` criou duas reservas ativas para o mesmo item e elevou `quantity_reserved` de 1 para 2.
2. O caminho de backend com `service_role` falha no PostgREST real. `private.is_commerce_executor()` consulta `request.jwt.claim.role`; uma chamada local usando a chave service-role real recebeu `NOT_AUTHORIZED`. A documentação atual expõe os claims no JSON `request.jwt.claims`/`auth.jwt()`.

A 05.2A não apresentou bloqueador próprio. Nenhuma migration ou dado remoto foi alterado durante esta auditoria.

## 2. Achados

### BLOQUEANTE 1 — reserva duplicada do mesmo pedido

`private.reserve_order_inventory()` aceita pedidos em `draft` ou `pending_payment`. Após a primeira reserva, o pedido fica em `pending_payment`, mas a função não verifica a existência de reservas ativas e `inventory_reservations` não possui unicidade por item ativo.

Evidência dinâmica local, com rollback:

- primeira chamada, chave `AUD-DUP-KEY-1`: `reserved`, 1 reserva;
- segunda chamada para o mesmo pedido, chave `AUD-DUP-KEY-2`: `reserved`, 2 reservas;
- resultado observado: `active_reservations=2`, `reserved_balance=2`, embora o item tivesse quantidade 1.

Impacto: uma confirmação posterior percorre as duas reservas e pode consumir estoque duas vezes para um único item. A idempotência por operation key protege retries idênticos, mas não protege o agregado pedido contra uma nova chave.

Correção mínima futura: adicionar invariável no banco e na função que impeça mais de uma reserva ativa para o mesmo item/pedido. A solução deve ser segura sob concorrência, retornar resultado determinístico e incluir testes sequenciais e com duas sessões usando chaves diferentes. Não basta verificar antes do lock sem constraint ou serialização equivalente.

### BLOQUEANTE 2 — `service_role` não é reconhecido pelo motor

`private.is_commerce_executor()` autoriza Admin ou:

```sql
current_setting('request.jwt.claim.role', true) = 'service_role'
```

Uma chamada ao PostgREST local usando a chave service-role real e a RPC `expire_due_reservations()` retornou `P0001 / NOT_AUTHORIZED`. O ambiente PostgREST atual disponibiliza o JWT em `request.jwt.claims`; `auth.jwt()->>'role'` é o mecanismo atual documentado.

Impacto: o backend/webhook futuro não consegue reservar, expirar, consumir ou devolver estoque com a credencial de servidor prevista. Usar uma sessão Admin humana como contorno seria inadequado.

Correção mínima futura: ler o claim assinado pelo mecanismo atual (`auth.jwt()` ou JSON `request.jwt.claims`) e manter a validação Admin existente. Repetir testes via PostgREST real para `service_role`, Admin allowlisted, authenticated não-admin e anon. Nenhuma chave deve ser persistida em scripts ou relatórios.

### ATENÇÃO 1 — backup precisa ser atualizado

O backup verificado em 15/10/2026 precede o lançamento das 1.200 unidades. Ele validou restauração de schema e dados da aplicação, mas não comprovou recuperação integral de Auth e Storage. Antes da implantação, criar novos dumps de schema, dados e roles fora do repositório, registrar tamanho/SHA-256 e restaurar em PostgreSQL isolado. A limitação de Auth/Storage permanece aberta e não foi tratada como resolvida.

### ATENÇÃO 2 — tipos TypeScript incompletos para as RPCs 05.2B

`database.types.ts` contém as oito tabelas da 05.2A, mas não declara `reserve_order_inventory`, `release_order_inventory`, `confirm_order_sale`, `return_order_item` e `expire_due_reservations`. Isso não afeta o frontend atual porque nenhuma delas é chamada, mas os tipos deverão ser regenerados após a correção/aplicação e antes da integração backend/Admin.

### ATENÇÃO 3 — confirmação financeira ainda depende de disciplina do backend

`confirm_order_sale()` valida um pagamento `paid`, mas não bloqueia a linha do pagamento nem implementa ingestão/verificação de webhook. Uma alteração concorrente do estado financeiro permanece responsabilidade da futura camada 05.3/08. Até essa camada existir, checkout e pagamento devem continuar desabilitados.

### ATENÇÃO 4 — janela operacional e locks

A 05.2A cria tabelas vazias, FKs e índices; a 05.2B substitui `private.record_inventory_movement()`. Não há rewrite de tabela comercial nem alteração de linhas históricas, porém criação de FKs e substituição da função podem aguardar transações concorrentes. Aplicar em janela sem ajustes de estoque e interromper diante de lock prolongado.

### ATENÇÃO 5 — advisors preexistentes

- Security Advisor: proteção de senha vazada desabilitada.
- Security Advisor: `public.is_current_user_admin()` é `SECURITY DEFINER` executável por authenticated; isso é intencional para o guard, mas deve continuar retornando apenas booleano.
- O advisor sinaliza `private.admin_users` sem RLS. A verificação efetiva mostrou zero privilégios de tabela para anon/authenticated e nenhum `USAGE` de `private` para anon; portanto não foi confirmada exposição pública. É defesa em profundidade a reavaliar, não motivo para alteração nesta fase.
- Performance Advisor: oito FKs sem índice e três conjuntos de policies permissivas múltiplas preexistentes. Não bloqueiam as migrations 05.2, mas devem ser avaliados com carga real.

### ATENÇÃO 6 — política de retenção e operação ainda pendente

Endereços, telefone, e-mail e metadados de pagamento são PII. RLS limita leitura ao proprietário/Admin, mas retenção, anonimização, atendimento ao titular e logs sem PII ainda precisam de definição antes de pedidos reais.

### INFORMATIVOS

- A mudança da Data API que torna exposição de novas tabelas opt-in não quebra esta migration: grants e RLS são explícitos.
- O remoto executa PostgreSQL 17.11 e o local validou as migrations na mesma geração.
- O aviso PostgreSQL 17.11 sobre `ltree`, `btree_gist`, pgcrypto com cifras legadas e operadores customizados não encontrou uso afetado nas migrations 05.2. `extensions.digest()` continua sendo usado apenas para SHA-256 de manifesto.
- A implantação do schema não ativa produtos, checkout, pagamento ou cron.
- `private.order_inventory_operations` fica fora do schema público, com acesso direto revogado de anon/authenticated; os wrappers validam o executor.

Contagem: **2 BLOQUEANTES, 6 ATENÇÕES e 5 INFORMATIVOS**.

## 3. Artefatos auditados

- Relatórios 05.1, 05.2A, 05.2B e 05.2B.1.
- Migrations históricas 04.1, 04.2B.2, 04.4B.1 e 04.4B.3.
- `20261015152633_phase_05_2a_orders_reservations_security.sql`.
- `20261015155402_phase_05_2b_transactional_inventory_engine.sql`.
- Suítes pgTAP 05.2A, 05.2B e 05.2B.1.
- `scripts/test-phase-05-2b-concurrency.mjs`.
- `src/lib/supabase/database.types.ts`, rotas, sacola e estado de checkout.
- Histórico e metadados remotos do projeto `qbedfcdarmgiytlqntpf`.

Hashes SHA-256 atuais:

- 05.2A: `19D697418BE3028F82DD38AD86CABBC738AEB277B0E22058754F5FFE6402D43F`.
- 05.2B: `7B6BC967534F102E9ECEE556861129DA0EF53004C64070A2B316C9B1CC3D651B`.

## 4. Compatibilidade com o schema remoto

Projeto confirmado: BELLMONT E-commerce, `qbedfcdarmgiytlqntpf`, região `sa-east-1`, `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`.

O histórico remoto termina em `20261014114138_phase_04_4_b_3_idempotent_inventory_batches`. As migrations 05.2A e 05.2B não estão registradas e nenhuma migration anterior inesperada existe.

Todos os nove objetos de tabela 05.2 e os nomes das seis funções auxiliares/RPCs comerciais estão ausentes no remoto, portanto não há colisão nominal. As dependências exigidas existem:

- `products`, `product_variants`, `inventory` e `inventory_movements`;
- constraint composta `(product_id,id)` em `product_variants`;
- constraint `quantity_reserved <= quantity_on_hand`;
- vocabulário do ledger inclui `sale` e `return`;
- `private.is_admin()` e `private.set_updated_at()`;
- trigger `inventory_record_movement` aponta para `private.record_inventory_movement()`;
- pgcrypto está instalado em `extensions`.

A definição remota atual de `record_inventory_movement()` corresponde à versão 04.2B.2. A 05.2B a substitui preservando `initial`/`adjustment` como padrão e adicionando metadados transacionais para `sale`/`return`. Nenhum movimento histórico é atualizado.

## 5. Estado do estoque comercial

Consultas remotas exclusivamente `SELECT` confirmaram:

| Métrica | Resultado |
|---|---:|
| Produtos Streetwear ST-01…ST-20 | 20 |
| Variantes Streetwear | 80 |
| Linhas de inventário Streetwear | 80 |
| Variantes diferentes de 15 unidades | 0 |
| Unidades físicas | 1.200 |
| Unidades reservadas | 0 |
| Unidades disponíveis | 1.200 |
| Movimentos Streetwear | 80 |
| Variantes divergentes do ledger | 0 |
| Batch inicial | 1, concluído |
| Operações do batch | 80/80 aplicadas |
| Delta total do batch | 1.200 |
| Produtos comerciais em `draft` | 42 |
| Fixture técnica | 1, `archived` |
| Tabelas/pedidos/reservas 05.2 remotos | inexistentes |

O ledger foi reconciliado por variante: a soma dos deltas corresponde ao `quantity_on_hand` de todas as 80 variantes. A contagem isolada de movimentos não foi usada como única evidência.

## 6. Revisão da migration 05.2A

### Estrutura e integridade

A migration cria oito tabelas públicas vazias, com FKs `RESTRICT`, snapshots monetários `numeric(12,2)`, constraints de totais e estados, índices de consulta, lifecycle coerente de reservas e inbox de webhook idempotente. Não insere pedidos, não altera inventário e não cria endpoint.

`order_status_history` é protegido por trigger append-only. As oito tabelas têm RLS habilitada e forçada. `anon` não recebe acesso. `authenticated` recebe somente SELECT mediado por ownership/Admin em sete tabelas e nenhum acesso ao inbox de webhook. Escrita fica reservada a `service_role` e futuras funções confiáveis.

### Risco residual

`service_role` possui grants amplos por desenho e ignora RLS; por isso somente backend com validação poderá usá-lo. As constraints não reconciliam somas entre tabelas, corretamente delegando isso às transações. A migration, isoladamente, não habilita criação de pedidos pelo navegador.

**Conclusão da 05.2A:** tecnicamente compatível, sem bloqueador próprio identificado.

## 7. Revisão da migration 05.2B

### Pontos aprovados

- Helpers `SECURITY DEFINER` em schema privado, referências qualificadas e `search_path=''`.
- Wrappers públicos `SECURITY INVOKER` com grants explícitos e sem anon.
- Locks do pedido antes de inventário/reservas e inventários em ordem determinística.
- Operation key serializada por advisory lock.
- Venda reduz físico e reservado na mesma transação e escreve um movimento por item.
- Liberação/expiração não alteram físico.
- Devolução usa lock por item, limita o total vendido e escreve ledger físico.
- Contexto de movimento é transacional e limpo pelo trigger após consumo.
- Retry idêntico e payload divergente têm comportamento determinístico.
- `SKIP LOCKED` evita que um expirador aguarde pedido ocupado.

### Bloqueios

Os dois bloqueadores descritos na seção 2 impedem implantação: ausência de invariável contra nova chave no mesmo pedido e falha do executor `service_role` real.

### Concorrência residual

Os testes provaram retry com a mesma chave, confirmação/expiração nas duas ordens, liberação/consumo nas duas ordens e devoluções concorrentes. Eles não testavam duas chaves diferentes para o mesmo pedido; o novo ensaio revelou a lacuna. Não foram observados deadlocks nas provas existentes, mas a correção deverá preservar a ordem pedido → inventário → reservas.

## 8. RLS, grants e exposição

No remoto atual:

- anon não lê `inventory` nem `inventory_movements` e não possui `USAGE` em `private`;
- authenticated tem grants de tabela existentes, mas RLS forçada limita inventário/movimentos a Admin;
- `private.admin_users` não tem grants diretos para anon/authenticated;
- disponibilidade pública expõe apenas status grosseiro por RPC;
- todos os produtos estão em `draft`, portanto o catálogo Supabase público permanece vazio.

Após a aplicação futura, anon continuará sem acesso às tabelas/RPCs 05.2. Usuário authenticated não-admin poderá ler somente pedidos próprios e não poderá escrever ou executar com sucesso as funções comerciais. Admin poderá executar os wrappers. O backend `service_role` só ficará funcional depois da correção bloqueante.

## 9. Impacto no frontend

A implantação das tabelas não altera Home, catálogo, filtros, PDP, sacola, favoritos ou Admin existentes. O catálogo continua dependente de produtos `active`; todos permanecem `draft`. A consulta pública de disponibilidade continua usando a RPC grosseira e não lê inventário exato.

`CartPage` mantém o botão desabilitado e a mensagem de que nenhum pedido/pagamento será criado. Não há rota de checkout. Portanto a migration não habilita vendas automaticamente.

Antes de consumir as novas RPCs, regenerar os tipos TypeScript, criar uma camada backend confiável e nunca usar `service_role` no navegador.

## 10. Backup e recuperação

O backup anterior, em `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-14-phase-04-4b-6a`, possuía hashes verificados e restauração de schema/dados da aplicação validada. Ele antecede o lote de estoque e está desatualizado para esta implantação.

Pré-condições de backup:

1. Novo dump de schema, dados da aplicação e roles imediatamente antes da janela.
2. Arquivos fora do repositório, sem credenciais, sem sobrescrever o conjunto anterior.
3. Registrar timestamp, tamanho e SHA-256.
4. Restaurar em PostgreSQL/Supabase isolado e reconciliar migrations, 42 produtos, 80 variantes Streetwear, 1.200 unidades, 80 movimentos do lote e hashes do batch.
5. Documentar separadamente objetos gerenciados, Auth e Storage; a recuperação integral desses dois serviços continua não comprovada.

Se a migration falhar antes de commit, a transação deve reverter. Depois de existirem pedidos/reservas, não remover tabelas automaticamente: suspender operações, capturar dumps, diagnosticar e preferir migration forward. Recuperação é necessária se houver corrupção/dados divergentes ou se uma reversão destrutiva for a única alternativa.

## 11. Plano de implantação futura

Este plano não autoriza nem automatiza execução.

### Pré-implantação

1. Corrigir os dois bloqueadores em arquivos locais.
2. Adicionar pgTAP e teste real para duas operation keys no mesmo pedido e teste PostgREST com service-role.
3. Repetir reset, 100% pgTAP, concorrência, testes frontend, builds, lint e diff-check.
4. Congelar e registrar novos hashes das migrations revisadas.
5. Criar e restaurar o backup atualizado.
6. Reconsultar projeto, histórico de migrations, advisors, objetos e estoque.
7. Confirmar nenhuma migration inesperada entre 04.4B.3 e 05.2A.
8. Confirmar janela sem operação de estoque e checkout ainda desabilitado.

### Implantação

1. Aplicar exclusivamente 05.2A.
2. Verificar registro da migration, oito tabelas, constraints, índices, triggers, RLS e grants; confirmar tabelas vazias e estoque intacto.
3. Interromper se houver erro, objeto inesperado, lock prolongado, alteração de estoque ou permissão divergente.
4. Somente após aceite do checkpoint, aplicar exclusivamente a 05.2B corrigida.
5. Verificar ledger privado, funções, wrappers, ACLs, trigger substituído e hashes aprovados.

### Pós-implantação

1. Confirmar as duas versões no histórico, sem migration adicional.
2. Confirmar zero pedidos, itens, endereços, pagamentos, entregas, reservas, webhooks e operações comerciais.
3. Revalidar 20/80/1.200, zero reservado, 80 movimentos Streetwear e reconciliação por variante.
4. Confirmar 42 produtos em `draft` e fixture `archived`.
5. Testar apenas autorização não destrutiva: anon bloqueado; não-admin sem escrita; Admin reconhecido; service-role reconhecido por função de diagnóstico segura ou transação isolada aprovada.
6. Reexecutar Security/Performance Advisor e revisar qualquer novo aviso.
7. Confirmar checkout desabilitado e frontend inalterado.

## 12. Critérios de interrupção e recuperação

Interromper antes ou entre migrations se:

- hash divergir;
- existir migration pendente inesperada;
- estoque/reservas/ledger divergirem;
- objetos 05.2 já existirem sem histórico correspondente;
- backup atualizado/restauração não estiverem validados;
- qualquer teste novo falhar;
- grants ou RLS concederem escrita a anon/non-admin;
- `service_role` continuar não autorizado;
- duas chaves ainda puderem reservar o mesmo pedido;
- ocorrer timeout/lock prolongado ou perda de conexão com estado incerto.

Em estado incerto, não repetir cegamente. Consultar histórico e objetos por leitura, conferir se a transação foi aplicada, comparar hashes e escolher correção forward ou restauração conforme existência de dados.

## 13. Testes executados

- Reset Supabase local: migrations 04.1 a 05.2B aplicadas em ordem.
- pgTAP: **9 arquivos, 348/348 assertions aprovadas**.
- Concorrência real: execução `C521-FF1775E1`, todos os cenários previstos aprovados.
- Teste adicional duas chaves/mesmo pedido: **falhou a invariável**, confirmando o bloqueador.
- Teste PostgREST local com service-role: **`NOT_AUTHORIZED`**, confirmando o bloqueador.
- `npm test`: **62/62**.
- Build catálogo local: aprovado.
- Build catálogo Supabase: aprovado.
- Lint do schema público: nenhum erro.
- `git diff --check`: aprovado; somente avisos LF/CRLF preexistentes.
- Reset final removeu as fixtures concorrentes locais.

## 14. Parecer final

**NÃO APTO.**

O banco remoto e as 1.200 unidades estão íntegros, e a 05.2A é compatível. A 05.2B, porém, não deve ser aplicada até que os dois bloqueadores sejam corrigidos e toda a validação seja repetida. Aprovação técnica posterior não equivalerá a autorização de implantação.

Não houve aplicação de migration, DDL, escrita comercial, commit, push, deploy, cron, webhook ou ativação de checkout.
