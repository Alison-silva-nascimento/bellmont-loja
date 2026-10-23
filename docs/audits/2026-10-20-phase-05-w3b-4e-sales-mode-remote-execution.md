# BELLMONT — Fase 05.W3B.4E — execução remota de `sales_mode`

Data da execução: 2026-10-20  
Horário de conclusão das validações: 16:06:28 -03:00 / 19:06:28Z  
Workspace: `C:\DEV PARTICULAR\BELLMONT LOJA`  
Projeto remoto: `qbedfcdarmgiytlqntpf` — BELLMONT E-commerce — `sa-east-1`  
Classificação: **EXECUTADA E VALIDADA**

## 1. Resumo executivo

A migration `20261020102806_phase_05_w3b_1_product_sales_mode.sql` foi aplicada exclusivamente ao Supabase remoto autorizado. O dry-run imediatamente anterior listou somente essa migration, sem seeds ou roles. O comando de aplicação confirmou exatamente o mesmo plano.

As validações pós-execução comprovaram:

- coluna, default, constraint e comentário corretos;
- 20 Streetwear como `ASSISTED_PURCHASE`;
- 22 perfumes como `INQUIRY_ONLY`;
- fixture técnica como `DISABLED`;
- 42 produtos comerciais ainda em `draft` e zero ativos;
- catálogo anônimo ainda vazio;
- preços, status, variantes, imagens, inventário, movimentos, policies e grants inalterados;
- estoque comercial preservado em 1.200 físicas e zero reservadas;
- zero pedidos e zero reservas;
- histórico remoto atualizado apenas com `20261020102806`;
- nenhuma migration restante no dry-run pós-execução.

Os 43 registros de `products` tiveram `updated_at` atualizado pelo trigger existente, efeito conhecido e autorizado. Nenhum produto Fitness foi inserido, nenhum produto foi ativado e não houve commit, push ou deploy.

## 2. Gate pré-execução

### Projeto e ambiente

- Project ID: `qbedfcdarmgiytlqntpf`.
- Nome: BELLMONT E-commerce.
- Região: `sa-east-1`.
- Estado: `ACTIVE_HEALTHY`.
- PostgreSQL: 17.11.0.002.
- CLI: Supabase CLI 2.119.0.

### Backup e restauração

Diretório: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-20-pre-w3b4`

| Arquivo | SHA-256 revalidado |
|---|---|
| `roles.sql` | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `schema.sql` | `3387C85F62322C6EAF1FFFA631FA6235C7D1610CE87BD7EFE2D9E649FB30B8B0` |
| `data.sql` | `930DE19EDAC655904B727DA85E2F53172E916C272D85E1B1865029A4896B525A` |
| `application-verified.custom` | `FB6DE1D610CAC5B68A80643FFF6716B6880F3B1CAD3C9D512B85F1026408EAC5` |

Os relatórios W3B.3 e W3B.4 estavam acessíveis. A restauração PostgreSQL 17.11 isolada permanecia aprovada e suas limitações para bytes do Storage e configurações gerenciadas de Auth estavam documentadas.

### Migration

Arquivo: `supabase/migrations/20261020102806_phase_05_w3b_1_product_sales_mode.sql`  
SHA-256: `0A30F7CBC106E6C0E8CF1E503216F02C41078586D4FD1029853C9B26D3852364`

O hash coincidiu com a versão auditada. A coluna `sales_mode` ainda estava ausente do remoto.

### Baseline read-only

- 43 produtos totais;
- 42 comerciais em `draft` e zero ativos;
- 20 Streetwear, 22 perfumes e uma fixture técnica;
- 96 variantes totais, sendo 94 comerciais;
- 53 imagens totais, sendo 52 comerciais;
- 1.200 unidades físicas comerciais;
- zero unidades comerciais reservadas;
- 80 movimentos comerciais;
- zero pedidos e zero reservas;
- RLS habilitada e forçada nas sete tabelas críticas auditadas;
- cinco policies e doze grants relevantes em `products`;
- fingerprints de preços/status, variantes, imagens, inventário, movimentos, policies e grants registradas.

### Histórico e dry-run

O remoto terminava em `20261018082521`. Existia exatamente uma migration pendente local e nenhuma migration remota ausente localmente.

Comando de dry-run:

```powershell
npx supabase db push --linked --dry-run --skip-vault --log-level error
```

Resultado:

```json
{
  "dryRun": true,
  "migrations": ["20261020102806_phase_05_w3b_1_product_sales_mode.sql"],
  "seeds": [],
  "roles": []
}
```

Todas as pré-condições obrigatórias foram atendidas.

## 3. Execução

Comando utilizado, sem credenciais na linha de comando:

```powershell
npx supabase db push --linked --skip-vault --log-level error
```

Não foram usados `--include-all`, `--include-seed` ou `--include-roles`. O Vault foi explicitamente ignorado.

Resultado retornado pelo CLI:

```json
{
  "dryRun": false,
  "migrations": ["20261020102806_phase_05_w3b_1_product_sales_mode.sql"],
  "seeds": [],
  "roles": [],
  "message": "Finished supabase db push."
}
```

Nenhum script auxiliar, seed, inserção, ativação ou correção improvisada foi executado.

## 4. Validação do schema

| Item | Resultado observado |
|---|---|
| Coluna | `public.products.sales_mode` presente |
| Tipo | `text` |
| Nullable | `NO` |
| Default | `'INQUIRY_ONLY'::text` |
| Constraint | `products_sales_mode_check` presente e validada |
| Valores permitidos | `ASSISTED_PURCHASE`, `INQUIRY_ONLY`, `DISABLED` |
| Comentário | presente e idêntico ao SQL auditado |
| Migration no histórico | `20261020102806_phase_05_w3b_1_product_sales_mode` |

O dry-run posterior retornou `upToDate: true`, migrations vazias, seeds vazios e roles vazios.

## 5. Validação dos 43 registros

| Grupo | Esperado | Observado | Divergências |
|---|---:|---:|---:|
| Streetwear `ASSISTED_PURCHASE` | 20 | 20 | 0 |
| Perfumes `INQUIRY_ONLY` | 22 | 22 | 0 |
| Fixture `DISABLED` | 1 | 1 | 0 |
| Comerciais `draft` | 42 | 42 | 0 |
| Comerciais `active` | 0 | 0 | 0 |

Os 43 registros tiveram `updated_at` renovado nos três backfills, conforme o trigger `products_set_updated_at` e o risco previamente autorizado.

O teste sob o papel `anon` retornou zero produtos visíveis. A migration não publicou o catálogo.

## 6. Comparação antes × depois

| Indicador | Antes | Depois | Resultado |
|---|---:|---:|---|
| Produtos totais | 43 | 43 | preservado |
| Comerciais `draft` / `active` | 42 / 0 | 42 / 0 | preservado |
| `ASSISTED_PURCHASE` | inexistente | 20 | previsto |
| `INQUIRY_ONLY` | inexistente | 22 | previsto |
| `DISABLED` | inexistente | 1 | previsto |
| Variantes totais | 96 | 96 | preservado |
| Imagens totais | 53 | 53 | preservado |
| Estoque comercial físico | 1.200 | 1.200 | preservado |
| Estoque comercial reservado | 0 | 0 | preservado |
| Movimentos comerciais | 80 | 80 | preservado |
| Pedidos | 0 | 0 | preservado |
| Reservas | 0 | 0 | preservado |
| Policies da aplicação | fingerprint `292973996d572941c5cad84ddbb12378` | mesmo fingerprint | preservado |
| Grants da aplicação | fingerprint `82383b7fc218c66278a2f812470523d7` | mesmo fingerprint | preservado |
| Policies de `products` | 5 | 5 | preservado |
| Grants relevantes de `products` | 12 | 12 | preservado |
| Funções da aplicação auditadas | 29 | 29 | preservado |
| Histórico de migrations | 11 | 12 | somente `20261020102806` |

Fingerprints idênticas antes/depois:

- conteúdo comercial de produtos, desconsiderando `updated_at` e a nova coluna;
- preços e status;
- variantes;
- imagens;
- inventário;
- movimentos;
- policies;
- grants.

Não foi encontrada diferença não prevista.

## 7. Segurança pós-execução

RLS permaneceu habilitada e forçada em:

- `products`;
- `product_variants`;
- `product_images`;
- `inventory`;
- `inventory_movements`;
- `orders`;
- `inventory_reservations`.

A migration não criou funções, policies, grants ou novas superfícies de escrita. `anon` continua sem enxergar produtos porque todos permanecem `draft`. Inventário, pedidos e reservas permanecem protegidos.

### Pendências preexistentes

O Security Advisor continua registrando, sem mudança causada por esta migration:

1. proteção contra senhas vazadas desabilitada;
2. `public.is_current_user_admin()` como `SECURITY DEFINER` executável por `authenticated`, já auditada como consulta booleana mas mantida sob revisão;
3. três tabelas com RLS sem policies, atualmente bloqueadas por padrão.

A mudança de grants explícitos da Data API prevista para 30/10/2026 também permanece no checklist operacional. A migration não modifica grants.

## 8. Testes locais

| Verificação | Resultado |
|---|---|
| `npm test` | **86/86 aprovados** |
| `npm run build` | **aprovado** |
| `npm run build:cloudflare` | **aprovado** |
| `git diff --check` | **aprovado**; somente avisos locais LF/CRLF/configuração do drive Git |

Nenhuma configuração de produção foi alterada e nenhum artefato foi publicado.

## 9. Restrições confirmadas

- nenhum produto Fitness inserido;
- nenhum produto ativado;
- nenhum preço, variante ou imagem alterado;
- nenhum estoque ou movimento criado;
- nenhum pedido ou reserva criado;
- Auth, checkout e pagamentos não modificados;
- nenhuma policy ou grant alterado;
- nenhum commit, push, deploy ou domínio configurado.

## 10. Parecer final

**EXECUTADA E VALIDADA.**

A migration `sales_mode` foi aplicada exclusivamente ao projeto autorizado e registrada corretamente. O resultado corresponde integralmente ao SQL auditado: 20 Streetwear em compra assistida, 22 perfumes em consulta, fixture desabilitada e todos os produtos comerciais ainda em `draft`.

O estoque, o ledger, pedidos, reservas, preços, variantes, imagens e controles de segurança foram preservados. A migration não habilita o catálogo público nem autoriza as fases posteriores de inserção Fitness, ativação comercial ou deploy.
