# BELLMONT — Fase 05.2D — implantação controlada

## 1. Resumo executivo

**Classificação final: IMPLANTAÇÃO CONCLUÍDA COM SUCESSO.**

As três migrations expressamente autorizadas foram aplicadas, uma por vez e na ordem aprovada, no projeto comercial BELLMONT `qbedfcdarmgiytlqntpf`. Cada aplicação foi precedida por dry-run contendo somente a migration da etapa e seguida por checkpoint remoto read-only.

As novas estruturas permanecem vazias. Não foram criados pedidos, reservas, pagamentos, webhooks ou operações comerciais. O inventário continua com 1.200 unidades Streetwear, zero reservadas, 80 movimentos e zero divergências no ledger. Os 42 produtos comerciais permanecem em `draft`.

Nenhuma outra migration foi aplicada. Não houve alteração de frontend, produto, preço ou status, nem commit, push ou deploy.

## 2. Autorização e destino

- Autorização: expressa no prompt da Fase 05.2D, limitada às três migrations listadas neste relatório.
- Projeto: `qbedfcdarmgiytlqntpf`
- Nome: BELLMONT E-commerce
- Região: `sa-east-1`
- Estado antes da implantação: `ACTIVE_HEALTHY`
- PostgreSQL: 17.11.0.002
- Janela observada: 2026-10-19 07:36–07:44, America/Sao_Paulo

## 3. Pré-condições validadas

- Relatórios 05.2A, 05.2B, 05.2B.1, 05.2C, 05.2C.1, 05.2C.2 e 05.2C.3 revisados.
- Alterações locais preexistentes identificadas e preservadas.
- Histórico remoto terminava em `20261014114138`.
- Objetos 05.2 e as três versões autorizadas estavam ausentes.
- Backup externo atualizado e sua restauração isolada estavam aprovados.
- Os quatro dumps coincidiram com o manifesto.
- Riscos de Auth e Storage permaneceram explicitamente documentados.
- Estado comercial inicial: 20 modelos, 80 variantes, 1.200 físicas, zero reservadas, 80 movimentos, zero divergências e 42 comerciais em `draft`.

## 4. Hashes congelados

| Migration | SHA-256 |
|---|---|
| `20261015152633_phase_05_2a_orders_reservations_security.sql` | `19D697418BE3028F82DD38AD86CABBC738AEB277B0E22058754F5FFE6402D43F` |
| `20261015155402_phase_05_2b_transactional_inventory_engine.sql` | `7B6BC967534F102E9ECEE556861129DA0EF53004C64070A2B316C9B1CC3D651B` |
| `20261018082521_phase_05_2c_1_reservation_authorization_remediation.sql` | `735991D48C5F8BAA1CD0DF05E816E47B22890862206341C74345C20A7F60914C` |

## 5. Backup de referência

Diretório: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-18-phase-05-2c-3`

| Dump | Bytes | SHA-256 |
|---|---:|---|
| `application-verified.custom` | 85.023 | `E7F903069ADAB9E219E83C5F7EBC904A777D6B67E442AA0D57B256A441F3EA70` |
| `data.sql` | 145.718 | `9243664320273837B74C042F7383277BC26B2955A7EB4C6C93C036DDD1894723` |
| `roles.sql` | 370 | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `schema.sql` | 54.779 | `CC04D4425AAB887C8A52952288CC1CE4C56949E857D7E4FAA668CCA6914AE366` |

O backup da aplicação foi restaurado previamente em PostgreSQL 17.11 isolado, com contagens e fingerprints iguais ao remoto. Os bytes físicos do Storage não integram o dump PostgreSQL; Auth/Storage dependem da fundação gerenciada da plataforma para recuperação integral.

## 6. Estratégia de aplicação

O CLI 2.119.0 não oferece seleção de uma versão individual por `db push`. Para impedir que mais de uma migration fosse aplicada por etapa, foi criado um workspace temporário sem credenciais contendo:

1. todo o histórico local já aplicado no remoto; e
2. somente a próxima migration autorizada.

Cada etapa usou:

```text
npx supabase db push --project-ref <project-ref> --skip-vault --dry-run --workdir <stage>
npx supabase db push --project-ref <project-ref> --skip-vault --workdir <stage> --yes
```

O dry-run de cada stage listou exatamente uma migration. Não foram enviados roles, seeds ou Vault secrets. Os workspaces temporários não alteraram `supabase/migrations` no repositório.

## 7. Resultado da 05.2A

- Dry-run: somente `20261015152633_phase_05_2a_orders_reservations_security.sql`.
- Aplicação: concluída e registrada com a versão original.
- 8/8 tabelas presentes.
- 8/8 com RLS habilitada e forçada.
- 11 foreign keys.
- 37 índices.
- 7 policies.
- Trigger append-only de `order_status_history` presente.
- Total de linhas nas oito tabelas: zero.
- `anon`: zero privilégios nas novas tabelas.
- `authenticated`: zero privilégios diretos de escrita.
- Estoque após a etapa: 1.200 físicas, zero reservadas, ledger reconciliado.

## 8. Resultado da 05.2B

- Dry-run: somente `20261015155402_phase_05_2b_transactional_inventory_engine.sql`.
- Aplicação: concluída e registrada com a versão original.
- `private.order_inventory_operations` criada e vazia.
- 5 helpers privados `SECURITY DEFINER` presentes.
- 5 wrappers públicos `SECURITY INVOKER` presentes.
- Todas as 10 funções com `search_path` vazio.
- `anon`: zero `EXECUTE` nas funções do motor.
- `authenticated`: wrappers/helpers executáveis conforme desenho, mas protegidos pelo guard; nenhuma escrita direta nas tabelas e nenhum acesso ao ledger privado.
- `service_role`: execute nas 10 funções previstas.
- Pedidos, reservas e operações: zero.
- Estoque após a etapa: 1.200 físicas, zero reservadas, 80 movimentos, zero divergências.

Nenhuma RPC comercial foi chamada no remoto durante a validação.

## 9. Resultado da 05.2C.1

- Dry-run: somente `20261018082521_phase_05_2c_1_reservation_authorization_remediation.sql`.
- Aplicação: concluída e registrada com a versão original.
- Índice parcial único `inventory_reservations_one_active_per_item_idx` presente e condicionado a reserva `active`.
- `private.is_commerce_executor()` usa o claim assinado via `auth.jwt()`.
- O mecanismo legado `request.jwt.claim.role` não está mais na definição.
- Função corretiva com `search_path` vazio.
- Bloqueios de `anon` preservados.
- Usuário comum continua sem escrita direta e sem acesso ao ledger privado.
- Nenhum pedido, reserva ou operação foi criado.

## 10. Histórico remoto final

O histórico possui, em ordem:

1. `20261001112627_phase_04_1_commerce_schema`
2. `20261002103610_phase_04_2_b_2_atomic_inventory_movement`
3. `20261005102858_phase_04_2_c_1_product_image_storage`
4. `20261005114425_phase_04_2_c_1_fix_storage_policy_name_shadowing`
5. `20261005173847_phase_04_2_c_2a_product_image_gallery_rpcs`
6. `20261009153939_allow_null_product_brand`
7. `20261013131441_phase_04_4_b_1_public_variant_availability`
8. `20261014114138_phase_04_4_b_3_idempotent_inventory_batches`
9. `20261015152633_phase_05_2a_orders_reservations_security`
10. `20261015155402_phase_05_2b_transactional_inventory_engine`
11. `20261018082521_phase_05_2c_1_reservation_authorization_remediation`

Nenhuma versão adicional apareceu.

## 11. Estado das estruturas de pedidos

| Estrutura | Linhas |
|---|---:|
| `orders` | 0 |
| `order_items` | 0 |
| `order_addresses` | 0 |
| `order_payments` | 0 |
| `order_shipments` | 0 |
| `order_status_history` | 0 |
| `inventory_reservations` | 0 |
| `payment_webhook_events` | 0 |
| `private.order_inventory_operations` | 0 |

Não houve pedido, reserva, pagamento, evento de webhook ou movimento criado pela implantação.

## 12. Inventário e ledger após implantação

| Indicador | Resultado |
|---|---:|
| Modelos Streetwear | 20 |
| Variantes Streetwear | 80 |
| Variantes diferentes de 15 | 0 |
| Estoque físico | 1.200 |
| Estoque reservado | 0 |
| Movimentos Streetwear | 80 |
| Divergências no ledger | 0 |
| Produtos comerciais em `draft` | 42 |

Nenhuma correção automática de estoque foi necessária ou executada.

## 13. Segurança, RLS e grants

- RLS habilitada e forçada nas oito novas tabelas públicas.
- Nenhum grant de tabela nova para `anon`.
- Nenhum grant direto de escrita nas tabelas novas para `authenticated`.
- Nenhum grant direto do ledger privado para `anon` ou `authenticated`.
- Wrappers públicos são `SECURITY INVOKER`.
- Helpers privados são `SECURITY DEFINER`, possuem referências qualificadas e `search_path` vazio.
- Claim elevado reconhecido pelo mecanismo atual `auth.jwt()`, não por metadata editável.
- `service_role` permanece destinado exclusivamente ao backend e não foi adicionado ao frontend.

## 14. Advisors pós-implantação

Security Advisor:

- `payment_webhook_events` com RLS e sem policy: INFO e intencional; tabela fechada a clientes.
- dois avisos preexistentes de RLS sem policy em tabelas privadas de batch: INFO.
- `public.is_current_user_admin()` `SECURITY DEFINER` executável por authenticated: WARN preexistente e intencionalmente limitado a booleano.
- proteção de senha vazada desabilitada: WARN preexistente, pendente antes do lançamento comercial.

Referências oficiais:

- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Performance Advisor:

- 11 foreign keys sem índice cobridor; 3 são novas/relevantes ao domínio 05.2.
- 23 índices ainda sem uso; esperado para tabelas recém-criadas e vazias, sem justificativa para remoção imediata.
- 3 conjuntos de policies permissivas múltiplas preexistentes no catálogo.

Nenhum advisor foi corrigido automaticamente nesta fase.

## 15. Logs

Diretório protegido:

`C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-18-phase-05-2c-3\validation\deployment-2026-10-19`

| Log | SHA-256 |
|---|---|
| `01-stage-a-dry-run.log` | `068A4ABAAB3228CE1364BB0B537F93D3ADE1A55BA539CDEE26BE4C2203663300` |
| `02-stage-a-apply.log` | `2E09B0B2182E812978B80FCE1385A38E0DFDF1F56A5B4F953E2A7863605E6FEC` |
| `03-stage-b-dry-run.log` | `0D1D7D260753FB86F9970EFE42E85E440E3E1A56EBE25CE86C396575AE2A8009` |
| `04-stage-b-apply.log` | `0D7AE1248DBAEACF4BAAF085EE381B74E64D147B6F2EFA27E2D7ADD7F7E385A6` |
| `05-stage-c-dry-run.log` | `7F59D2A076F282AF99BD5730A7096498061B68F3586F56F582F8C2E34780C6AF` |
| `06-stage-c-apply.log` | `AD32B0EED419409E973165FDB6CB69D1119D5C20F25750E6DBDF991B6651584D` |

Nenhuma credencial ou string de conexão foi incluída neste relatório.

## 16. Testes locais pós-implantação

- `npm test`: 62/62 aprovados.
- `npm run build`: aprovado, 2.405 módulos transformados.
- `git diff --check`: aprovado; somente avisos preexistentes de LF/CRLF/configuração Git em `U:`.
- `.env.local`: permanece ignorado pelo Git.
- Alterações locais não commitadas: preservadas.

Os 387 testes pgTAP, concorrência e PostgREST foram executados e aprovados antes da implantação, conforme auditorias 05.2C.1/05.2C.2. Não foram repetidos no banco comercial porque criariam fixtures e violariam a restrição de ausência de dados de teste remotos.

## 17. Limitações e riscos residuais

1. O checkout continua desabilitado; schema implantado não significa fluxo comercial liberado.
2. Nenhum provedor de pagamento, webhook, cron ou backend confiável foi configurado.
3. Os tipos TypeScript das RPCs ainda devem ser regenerados antes de integração do backend/Admin.
4. Política de retenção, anonimização e atendimento LGPD permanece pendente antes de pedidos reais.
5. A proteção contra senhas vazadas deve ser avaliada antes do lançamento.
6. Os avisos de índices devem ser medidos com carga real; não remover ou adicionar índices automaticamente nesta janela.
7. O backup recupera a aplicação, mas não contém os bytes físicos do Storage nem comprova recuperação integral de Auth.

## 18. Parecer final

**IMPLANTAÇÃO CONCLUÍDA COM SUCESSO.**

As três migrations autorizadas foram aplicadas e validadas em checkpoints independentes. Não houve divergência de inventário, ledger, produtos, histórico ou permissões críticas. As estruturas de pedidos estão vazias e nenhum comportamento comercial foi ativado.

A próxima fase não foi iniciada. Qualquer integração de backend, checkout, pagamento, tipos ou ativação comercial exige autorização nova e específica.

