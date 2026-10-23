# BELLMONT — Fase 04.4B.6B — Aplicação remota da migration de idempotência

## Registro da execução

- Data e horário: 2026-10-15 07:22:38 -03:00
- Projeto: BELLMONT E-commerce
- Project Ref: `qbedfcdarmgiytlqntpf`
- Região: `sa-east-1`
- Estado do projeto após a execução: `ACTIVE_HEALTHY`
- PostgreSQL: 17.11
- Migration: `20261014114138_phase_04_4_b_3_idempotent_inventory_batches.sql`
- SHA-256 da migration: `8E8348EB5122912F256DFB7AFE63E3204129043F6FB4D3713823FD8AF6B4216B`
- SHA-256 do manifesto não executado: `EA7BDAC7D89B74D56FD25F7B849044F836FE934E7527B48F54540EEBC6F36CE1`

Nenhuma senha, token, connection string ou chave privada está registrada neste relatório.

## Backups verificados antes da aplicação

Diretório externo: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-14-phase-04-4b-6a`

- `roles.sql`: `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308`
- `schema.sql`: `A09A11BDE16F5D131FEBCAFDA3EAECCD627E4E01C6A53E644C19B403199D1BCD`
- `data.sql`: `DB797AF124CE22AAD3FB2237FF1479B4592CF592D4E76AD65A0426A02CC757B7`
- `application-data.sql`: `FDB9F50C6DAA303A19B01C8A7797480EFF59601ECDAA90420FC3DBD9B1A3FA63`

Todos estavam presentes, legíveis e com os hashes esperados. A limitação previamente aceita permanece: schema e dados comerciais tiveram restauração validada, enquanto a restauração integral dos serviços gerenciados Auth/Storage não foi comprovada.

## Pré-condições

- Projeto vinculado localmente: `qbedfcdarmgiytlqntpf`.
- Projeto remoto saudável e em PostgreSQL 17.
- Histórico remoto terminava em `20261013131441_phase_04_4_b_1_public_variant_availability`.
- A migration `20261014114138` ainda não estava aplicada.
- As sete migrations remotas anteriores correspondiam exatamente às sete migrations locais anteriores.
- Somente a migration autorizada estava pendente.
- 43 produtos totais e 42 comerciais.
- 42 produtos comerciais em `draft` e zero ativos.
- 20 produtos Streetwear, de ST-01 a ST-20.
- 80 variantes e 80 SKUs Streetwear únicos.
- Digest de identidade do manifesto/catálogo: `a6d3cba8787d36b579b41723f8d2fc3a`.
- Zero estoque e zero movimentos comerciais.
- Nenhuma tabela, função ou batch da idempotência existia.

## Aplicação

Comando executado uma única vez:

```powershell
npx supabase migration up --linked
```

Resultado da CLI: somente `20261014114138_phase_04_4_b_3_idempotent_inventory_batches.sql` foi aplicada. Não houve retry, timeout, repair, reset ou aplicação de migration adicional.

## Histórico posterior

O histórico remoto passou a terminar exatamente em:

`20261014114138_phase_04_4_b_3_idempotent_inventory_batches`

Nenhuma migration inesperada foi registrada.

## Objetos criados

Tabelas privadas:

- `private.inventory_batches`
- `private.inventory_batch_operations`

Funções:

- `private.prepare_inventory_batch(text,text,jsonb)`
- `private.apply_inventory_batch_operation(text,text)`
- `public.prepare_inventory_batch(text,text,jsonb)`
- `public.apply_inventory_batch_operation(text,text)`

Foram confirmadas as constraints de chave primária, unicidade, formato, estados, integridade da operação e todas as foreign keys esperadas. Foram criados sete índices únicos/primários associados às constraints. As novas tabelas não precisam de triggers próprios; o fluxo utiliza a função atômica e o trigger preexistente de `public.inventory` para registrar movimentos.

## Segurança posterior

- RLS habilitado e forçado nas duas tabelas.
- ACL das tabelas restrita ao proprietário `postgres`.
- Nenhum privilégio herdado de `PUBLIC` nas tabelas ou nas quatro funções.
- `anon` não possui `USAGE` no schema `private`.
- `anon` não executa os wrappers.
- `authenticated` não possui SELECT, INSERT, UPDATE ou DELETE direto nas tabelas privadas.
- `authenticated` executa somente os wrappers e helpers explicitamente concedidos.
- Helpers privadas são `SECURITY DEFINER`, com `search_path` vazio e validação de `auth.uid()`/`private.is_admin()`.
- Wrappers públicos são `SECURITY INVOKER`, com `search_path` vazio.
- Locks de batch e inventário, idempotência e chamada à movimentação atômica estão presentes.
- Policies comerciais preexistentes permaneceram inalteradas.

O Security Advisor passou a informar RLS sem policy nas duas tabelas privadas. Isso é intencional: todo acesso direto foi revogado e o acesso ocorre exclusivamente pelas funções administrativas protegidas.

## Comparativo comercial

| Métrica | Antes | Depois |
|---|---:|---:|
| Produtos totais | 43 | 43 |
| Produtos comerciais | 42 | 42 |
| Produtos comerciais em draft | 42 | 42 |
| Produtos comerciais ativos | 0 | 0 |
| Produtos Streetwear | 20 | 20 |
| Variantes Streetwear | 80 | 80 |
| SKUs Streetwear únicos | 80 | 80 |
| Estoque comercial | 0 | 0 |
| Movimentos comerciais | 0 | 0 |
| Batches | 0 | 0 |
| Operações de batch | 0 | 0 |
| Inventários da fixture técnica | 2 | 2 |
| Movimentos da fixture técnica | 4 | 4 |

O digest dos 80 SKUs permaneceu `a6d3cba8787d36b579b41723f8d2fc3a`.

## Avisos e riscos residuais

- A recuperação integral de Auth/Storage continua não comprovada, conforme risco aceito antes da aplicação.
- O Security Advisor mantém o aviso preexistente sobre `public.is_current_user_admin()` e proteção contra senhas vazadas desabilitada.
- O Performance Advisor indica foreign keys sem índice de cobertura, inclusive nas novas tabelas. Não houve alteração porque índices adicionais não faziam parte da migration autorizada e não são necessários para validar sua segurança funcional neste momento.
- O plano Free não possui PITR garantido.

## Resultado

**APLICADA E VALIDADA**

A migration foi aplicada, o histórico está correto, a segurança foi validada e nenhum dado comercial foi alterado. Nenhum estoque foi lançado, nenhum produto foi ativado e nenhum batch comercial foi preparado ou executado.
