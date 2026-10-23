# BELLMONT — Fase 05.W3B.4 — prontidão da migration `sales_mode`

Data: 2026-10-20  
Workspace: `C:\DEV PARTICULAR\BELLMONT LOJA`  
Projeto remoto: `qbedfcdarmgiytlqntpf` — BELLMONT E-commerce — `sa-east-1`  
Modo: **PRÉ-EXECUÇÃO — NENHUMA ALTERAÇÃO REMOTA**  
Parecer: **APTA PARA AUTORIZAÇÃO ESPECÍFICA DE EXECUÇÃO**

## 1. Resultado executivo

A migration `20261020102806_phase_05_w3b_1_product_sales_mode.sql` foi auditada integralmente e é compatível com o estado remoto atual. O backup pré-implantação existe, os hashes continuam válidos e a restauração isolada foi comprovada. O histórico local e remoto coincide até `20261018082521`; existe exatamente uma migration pendente, a migration `sales_mode`.

O `dry-run` oficial do Supabase CLI confirmou que seriam enviados somente:

```text
20261020102806_phase_05_w3b_1_product_sales_mode.sql
```

Nenhum seed ou role integra o plano. A migration não ativa produtos, não altera preços, variantes, imagens, inventário, movimentos, pedidos ou reservas, e não modifica RLS, policies, grants, triggers ou funções.

Esta fase não aplicou a migration e não modificou o Supabase remoto.

## 2. Backup confirmado

Relatório: `docs/audits/2026-10-20-phase-05-w3b-3-backup-restore.md`  
Diretório externo: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-20-pre-w3b4`

| Arquivo | Bytes | SHA-256 conferido nesta fase |
|---|---:|---|
| `dumps/roles.sql` | 370 | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `dumps/schema.sql` | 115.730 | `3387C85F62322C6EAF1FFFA631FA6235C7D1610CE87BD7EFE2D9E649FB30B8B0` |
| `dumps/data.sql` | 150.313 | `930DE19EDAC655904B727DA85E2F53172E916C272D85E1B1865029A4896B525A` |
| `dumps/application-verified.custom` | 167.119 | `FB6DE1D610CAC5B68A80643FFF6716B6880F3B1CAD3C9D512B85F1026408EAC5` |

Confirmações:

- backup acessível e fora do repositório Git;
- ACL protegida e restrita ao usuário local e `SYSTEM`;
- restauração validada em PostgreSQL 17.11 isolado;
- contagens e sete fingerprints críticas idênticas à origem;
- plano de recuperação documentado;
- limitações documentadas para bytes do Storage e configuração gerenciada de Auth;
- classificação do backup: `APTO COM RESSALVAS`.

Baseline recuperável: 42 produtos comerciais em `draft`, 94 variantes comerciais, 52 imagens comerciais, 1.200 unidades físicas, zero reservadas, 80 movimentos comerciais, zero pedidos e zero reservas.

## 3. Migration revisada

Arquivo: `supabase/migrations/20261020102806_phase_05_w3b_1_product_sales_mode.sql`  
Tamanho: 1.088 bytes  
SHA-256: `0A30F7CBC106E6C0E8CF1E503216F02C41078586D4FD1029853C9B26D3852364`

### SQL auditado

```sql
alter table public.products
  add column sales_mode text not null default 'INQUIRY_ONLY'
  constraint products_sales_mode_check
  check (sales_mode in ('ASSISTED_PURCHASE', 'INQUIRY_ONLY', 'DISABLED'));

update public.products
set sales_mode = 'ASSISTED_PURCHASE'
where code ~ '^ST-(0[1-9]|1[0-9]|20)$';

update public.products
set sales_mode = 'INQUIRY_ONLY'
where code ~ '^PF-(0[1-9]|1[0-9]|2[0-2])$';

update public.products
set sales_mode = 'DISABLED'
where code = 'TEST-FIXTURE-01';

comment on column public.products.sales_mode is
  'Commercial action mode. Visibility remains controlled independently by products.status and RLS.';
```

### Objetos modificados

Somente `public.products`:

- nova coluna `sales_mode text`;
- `NOT NULL`;
- default constante e seguro `INQUIRY_ONLY`;
- constraint `products_sales_mode_check`;
- comentário da coluna;
- backfill de 20 Streetwear, 22 perfumes e uma fixture técnica.

Nenhuma outra tabela, sequence, função, trigger, policy, grant ou schema é criado ou modificado.

### Resultado esperado do backfill

| Conjunto | Linhas | Valor esperado |
|---|---:|---|
| `ST-01` a `ST-20` | 20 | `ASSISTED_PURCHASE` |
| `PF-01` a `PF-22` | 22 | `INQUIRY_ONLY` |
| `TEST-FIXTURE-01` | 1 | `DISABLED` |
| Códigos comerciais inesperados | 0 | nenhum |

Todos os registros recebem inicialmente o default seguro. Os updates depois especializam somente os códigos aprovados. Novos produtos também falham de forma conservadora para `INQUIRY_ONLY` quando o modo não for informado explicitamente.

### Compatibilidade e dependências

- `public.products` existe e ainda não possui `sales_mode`.
- Os 43 códigos existentes pertencem exatamente aos três grupos tratados.
- A coluna `code` é `UNIQUE`, não vazia e já utilizada nos backfills anteriores.
- O PostgreSQL remoto é 17.11.
- O frontend local já reconhece os três valores permitidos.
- A migration não depende de produtos Fitness já existirem. Inserções futuras de `IF-01..IF-05` devem informar `INQUIRY_ONLY` explicitamente, embora o default já seja seguro.
- A migration não ativa o catálogo: visibilidade pública continua dependendo de `products.status = 'active'` e da policy RLS.

### Trigger existente e efeito colateral esperado

`public.products` possui o trigger:

```text
products_set_updated_at BEFORE UPDATE
EXECUTE FUNCTION private.set_updated_at()
```

Os três comandos de backfill atualizarão `updated_at` dos 43 registros correspondentes. Isso é coerente com uma mudança comercial nesses registros, mas deve ser registrado no snapshot pós-migration. Nenhum outro trigger existe em `products` e não há efeito em estoque, pedidos ou reservas.

## 4. Locks, duração e indisponibilidade

`ALTER TABLE ... ADD COLUMN` exige `ACCESS EXCLUSIVE` em `public.products`. Em PostgreSQL 17, o default constante tende a ser aplicado por metadata sem reescrever a tabela, mas a criação/validação da constraint e os updates ainda executam trabalho sobre as linhas existentes.

O risco é baixo porque:

- a tabela possui somente 43 linhas e aproximadamente 80 KiB;
- não há produtos ativos;
- a migration não toca as tabelas transacionais;
- os updates atingem conjuntos pequenos e determinísticos.

Mesmo assim, uma transação antiga ou consulta que mantenha lock incompatível pode fazer a migration aguardar. Executar em janela controlada e interromper se houver espera anormal; não cancelar sessões de produção automaticamente.

## 5. RLS, grants e segurança

Estado remoto atual de `products`:

- RLS habilitada e forçada;
- leitura pública limitada por `status = 'active'`;
- `anon` possui somente `SELECT`;
- escrita de `authenticated` depende das policies que exigem `private.is_admin()`;
- `service_role` conserva os grants administrativos existentes.

A migration não contém `GRANT`, `REVOKE`, `CREATE POLICY`, `ALTER POLICY`, `SECURITY DEFINER`, função ou trigger. Portanto:

- não expõe função administrativa;
- não amplia acesso público;
- não enfraquece RLS;
- não expõe pedidos ou reservas;
- não permite manipulação pública de inventário.

O enforcement de grants explícitos da Data API anunciado para 30/10/2026 não muda a conclusão: a nova coluna pertence a uma tabela já exposta por grants explícitos, e o acesso às linhas continua restrito pela RLS. Referência: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

### Pendências de segurança não causadas pela migration

O Security Advisor continua registrando:

1. **Leaked Password Protection Disabled** — habilitar a proteção contra senhas vazadas em uma fase Auth autorizada.
2. `public.is_current_user_admin()` é `SECURITY DEFINER` executável por `authenticated` — comportamento já auditado e intencional para consulta booleana, mas permanece uma superfície que deve ser periodicamente revisada.
3. Três tabelas possuem RLS sem policies; no caso das tabelas privadas de batch e da inbox de webhooks, isso representa bloqueio por padrão. Não é alterado por esta migration.

Nenhuma dessas pendências é criada ou agravada por `sales_mode`, mas a proteção contra senhas vazadas deve permanecer registrada separadamente antes da publicação comercial.

## 6. Histórico local e remoto

O histórico remoto possui 11 migrations e termina em:

```text
20261018082521_phase_05_2c_1_reservation_authorization_remediation
```

Comparação:

- migrations remotas ausentes localmente: zero;
- versões/nomes divergentes: zero;
- migrations locais pendentes: uma;
- pending: `20261020102806_phase_05_w3b_1_product_sales_mode.sql`.

O Supabase CLI 2.119.0 confirmou via `db push --dry-run --skip-vault`:

```json
{
  "upToDate": false,
  "dryRun": true,
  "migrations": ["20261020102806_phase_05_w3b_1_product_sales_mode.sql"],
  "seeds": [],
  "roles": []
}
```

O histórico remoto não fornece o conteúdo/hash das migrations já aplicadas; a comparação comprova versões e nomes, não equivalência criptográfica do SQL histórico. Não há sinal de drift no schema auditado ou na restauração do backup.

## 7. Procedimento proposto de execução isolada

### Pré-condições obrigatórias

1. Receber autorização explícita adicional para aplicar somente `20261020102806`.
2. Confirmar projeto `qbedfcdarmgiytlqntpf`, nome BELLMONT E-commerce, região `sa-east-1`, estado `ACTIVE_HEALTHY` e PostgreSQL 17.11.
3. Recalcular o hash da migration e exigir exatamente `0A30F7CBC106E6C0E8CF1E503216F02C41078586D4FD1029853C9B26D3852364`.
4. Recalcular os quatro hashes do backup e exigir os valores da seção 2.
5. Repetir snapshot: 42 comerciais `draft`, 1.200/0, 80 movimentos, zero pedidos/reservas e `sales_mode` ausente.
6. Repetir a comparação local/remoto; deve existir exatamente uma migration pendente.
7. Repetir o dry-run abaixo e interromper se aparecer qualquer outro arquivo, seed ou role.

### Dry-run obrigatório

```powershell
npx supabase db push --linked --dry-run --skip-vault --log-level error
```

Saída aceitável: exatamente `20261020102806_phase_05_w3b_1_product_sales_mode.sql`, sem seeds e sem roles.

### Comando de aplicação proposto — não executado nesta fase

```powershell
npx supabase db push --linked --skip-vault --log-level error
```

O CLI não possui flag para selecionar um filename individual. A execução permanece isolada porque o gate imediatamente anterior exige apenas uma migration pendente e o dry-run deve listar exatamente esse arquivo. Não usar `--include-all`, `--include-seed` ou `--include-roles`.

## 8. Validação pós-migration planejada

Executar somente após uma futura aplicação autorizada.

### Coluna, default e constraint

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
  and column_name = 'sales_mode';

select
  conname,
  convalidated,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.products'::regclass
  and conname = 'products_sales_mode_check';
```

Esperado: `text`, `NOT NULL`, default `INQUIRY_ONLY`, constraint validada com os três valores aprovados.

### Backfill e visibilidade

```sql
select sales_mode, count(*)
from public.products
group by sales_mode
order by sales_mode;

select code, sales_mode
from public.products
where
  (code ~ '^ST-(0[1-9]|1[0-9]|20)$' and sales_mode <> 'ASSISTED_PURCHASE')
  or (code ~ '^PF-(0[1-9]|1[0-9]|2[0-2])$' and sales_mode <> 'INQUIRY_ONLY')
  or (code = 'TEST-FIXTURE-01' and sales_mode <> 'DISABLED');

select status, count(*)
from public.products
where code <> 'TEST-FIXTURE-01'
group by status;
```

Esperado: 20 `ASSISTED_PURCHASE`, 22 `INQUIRY_ONLY`, uma `DISABLED`, zero divergências e 42 comerciais ainda em `draft`.

### RLS, policies e grants

```sql
select relrowsecurity, relforcerowsecurity
from pg_class
where oid = 'public.products'::regclass;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'products'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'products'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;
```

Comparar com o baseline: RLS habilitada/forçada, cinco policies e os grants preexistentes sem ampliação.

### Inventário e transações

```sql
select
  coalesce(sum(i.quantity_on_hand), 0) as commercial_on_hand,
  coalesce(sum(i.quantity_reserved), 0) as commercial_reserved
from public.inventory i
join public.product_variants v on v.id = i.variant_id
join public.products p on p.id = v.product_id
where p.code <> 'TEST-FIXTURE-01';

select
  (select count(*) from public.inventory_movements m
     join public.product_variants v on v.id = m.variant_id
     join public.products p on p.id = v.product_id
    where p.code <> 'TEST-FIXTURE-01') as commercial_movements,
  (select count(*) from public.orders) as orders,
  (select count(*) from public.inventory_reservations) as reservations;
```

Esperado: 1.200 físicas, zero reservadas, 80 movimentos, zero pedidos e zero reservas.

### Histórico

Confirmar que o histórico ganhou somente `20261020102806` e que não há outra migration pendente.

## 9. Critérios de interrupção

Interromper antes da aplicação se:

- project ref, região, versão ou status divergirem;
- qualquer hash divergir;
- backup estiver inacessível;
- `sales_mode` já existir;
- contagens comerciais ou estoque divergirem;
- houver pedidos ou reservas inesperados;
- aparecer outra migration no dry-run;
- o CLI propuser seeds, roles ou atualização de Vault;
- houver lock prolongado ou erro SQL.

Interromper depois da aplicação, sem avançar para produtos Fitness, ativação ou deploy, se qualquer consulta da seção 8 divergir.

## 10. Plano de recuperação

### Falha durante a migration

- preservar a mensagem e o histórico;
- não executar `migration repair` automaticamente;
- confirmar se a migration foi registrada e se a coluna existe;
- não repetir o push antes de diagnosticar o estado transacional.

### Migration aplicada, validação pós-migration falhou

- bloquear todas as etapas seguintes;
- preservar snapshot e logs;
- comparar schema, contagens, RLS e grants com o backup;
- não restaurar ou remover coluna automaticamente no comercial.

### Reversão lógica imediata

Antes de qualquer release dependente, a reversão estrutural possível é:

```sql
alter table public.products drop column sales_mode;
```

Ela não deve ser executada automaticamente: apaga todas as classificações e exige migration corretiva autorizada. Depois de inserções/ativações dependentes, o caminho preferido é corrigir adiante, não remover a coluna.

### Recuperação por backup

Em dano mais amplo, restaurar primeiro em novo ambiente isolado usando os dumps verificados. Nunca restaurar diretamente sobre produção sem um plano de incidente, reconciliação do Storage e aprovação explícita.

## 11. Riscos restantes

1. Lock `ACCESS EXCLUSIVE` breve em `products`.
2. Atualização de `updated_at` nos 43 registros durante os backfills.
3. O comando CLI aplica todo o conjunto pendente; o isolamento depende do gate de exatamente um arquivo e do dry-run imediatamente anterior.
4. O backup não inclui bytes do Storage nem configuração integral de Auth.
5. Proteção contra senhas vazadas continua desabilitada.
6. A migration, sozinha, não publica catálogo: os 42 produtos continuarão `draft`.

## 12. Parecer final

**MIGRATION APTA PARA UMA AUTORIZAÇÃO ESPECÍFICA DE EXECUÇÃO.**

O backup está válido, a restauração foi comprovada, o schema remoto é compatível, o histórico não diverge e o dry-run lista exclusivamente a migration aprovada. A aplicação ainda não está autorizada por esta fase e não foi executada.

Após eventual autorização, executar somente os gates e o comando da seção 7, validar integralmente a seção 8 e parar antes de inserir produtos Fitness, ativar catálogo, alterar estoque ou realizar deploy.
