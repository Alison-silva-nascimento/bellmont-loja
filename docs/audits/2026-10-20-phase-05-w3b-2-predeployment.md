# BELLMONT — Fase 05.W3B.2 — Pré-implantação controlada

Data: 2026-10-20  
Workspace: `C:\DEV PARTICULAR\BELLMONT LOJA`  
Supabase auditado: `qbedfcdarmgiytlqntpf` — BELLMONT E-commerce — `sa-east-1`  
Modo: **READ-ONLY REMOTO — SEM DEPLOY**  
Parecer: **PLANO APTO PARA REVISÃO; IMPLANTAÇÃO E DEPLOY AINDA BLOQUEADOS POR GATES EXPLÍCITOS**

## 1. Resultado executivo

O catálogo local final está conciliado em 47 produtos, com códigos e slugs únicos, todos os preços presentes e todos os assets locais referenciados existentes:

- 20 Streetwear — `ASSISTED_PURCHASE`;
- 22 perfumes — `INQUIRY_ONLY`;
- 5 IMPÉRIO FIT — `INQUIRY_ONLY`.

O remoto permanece intocado e contém 42 produtos comerciais, todos `draft`: 20 Streetwear e 22 perfumes. Os cinco Fitness ainda não existem no Supabase. A migration de `sales_mode` também não consta no histórico remoto.

Não houve nesta fase migration remota, inserção, ativação, mudança de estoque, commit, push ou deploy.

## 2. Catálogo final local

Validação executável sobre a fonte normalizada:

| Verificação | Resultado |
|---|---:|
| Produtos | 47 |
| Streetwear | 20 |
| Perfumes | 22 |
| Fitness | 5 |
| `ASSISTED_PURCHASE` | 20 |
| `INQUIRY_ONLY` | 27 |
| Códigos únicos | 47 |
| Slugs únicos | 47 |
| Produtos sem preço | 0 |
| Assets locais ausentes | 0 |
| Fitness com variantes fabricadas | 0 |
| Perfumes com variantes locais fabricadas | 0 |

### IF-05 — Conjunto Jasmim

- Código: `IF-05`, sem conflito remoto.
- Slug: `conjunto-jasmim-marrom`, sem conflito remoto.
- ID local: `fitness-05`.
- Produto: conjunto de top e short separados, não macaquinho.
- Cor: marrom.
- Preço local confirmado: **R$ 240,00**.
- Modalidade: `INQUIRY_ONLY`.
- Tamanhos: não informados.
- Variantes: nenhuma.
- Estoque: nenhum registro criado.
- Imagem: `public/assets/imperio-fit-jasmim-brown.png`.
- SHA-256 da imagem local: `2D7B81731AA41761DBD983639A609CD8E6B605E5640909CBDA0BC8527347F810`.
- O hash é idêntico ao arquivo original fornecido pela cliente.

## 3. Snapshot remoto read-only

Projeto `ACTIVE_HEALTHY`, PostgreSQL 17.11.

| Objeto comercial | Estado remoto |
|---|---:|
| Produtos | 42 |
| Streetwear / perfumes / Fitness | 20 / 22 / 0 |
| Draft / active / archived | 42 / 0 / 0 |
| Variantes | 94 |
| Imagens comerciais | 52 |
| Linhas de inventário comercial | 80 |
| Físico / reservado | 1.200 / 0 |
| Movimentos comerciais | 80 |
| Códigos duplicados | 0 |
| Slugs duplicados | 0 |
| Coluna `sales_mode` | ausente, como esperado |

O bucket `product-images` é público, limita arquivos a 5 MiB e aceita JPEG, PNG e WebP. As 53 linhas totais de `product_images` — 52 comerciais e uma técnica — possuem path preenchido e objeto correspondente no Storage; não foram encontrados vínculos quebrados.

## 4. Auditoria da migration de sales mode

Arquivo: `supabase/migrations/20261020102806_phase_05_w3b_1_product_sales_mode.sql`  
SHA-256: `0A30F7CBC106E6C0E8CF1E503216F02C41078586D4FD1029853C9B26D3852364`

### Parecer técnico

- Compatível com o schema remoto atual: `products` existe, `code` está disponível e `sales_mode` ainda não existe.
- Adiciona `text not null default 'INQUIRY_ONLY'`, um padrão conservador.
- `CHECK` aceita somente `ASSISTED_PURCHASE`, `INQUIRY_ONLY` e `DISABLED`.
- Backfill Streetwear restringe-se a `ST-01..ST-20`.
- Backfill Perfumaria restringe-se a `PF-01..PF-22`.
- Fixture `TEST-FIXTURE-01` recebe `DISABLED`.
- Não altera `status`, preço, imagem, variante, estoque, movimento, pedido ou reserva.
- Não modifica RLS, policies ou grants.
- Não ativa produtos automaticamente.
- Os cinco Fitness podem ser inseridos posteriormente com `INQUIRY_ONLY`; o default já falha de forma segura, mas o insert planejado deve informar o modo explicitamente.

### Riscos operacionais

- `ALTER TABLE` obtém lock de DDL; a tabela é pequena, mas a aplicação deve ocorrer em janela controlada.
- Reaplicar a migration falhará porque a coluna/constraint já existirão; o histórico deve ser conferido antes de qualquer comando.
- `DROP COLUMN sales_mode` é um rollback estrutural possível antes da release dependente, mas destrói todas as classificações. Depois de ativação/frontend dependente, não deve ser usado automaticamente.
- O frontend preparado seleciona `sales_mode`; publicá-lo antes da migration causará falha de consulta no modo Supabase.

**Migration apta para aplicação controlada somente após backup restaurável e autorização específica.**

## 5. Segurança

### RLS e grants

RLS está habilitada e forçada em `products`, `product_variants`, `product_images`, `inventory` e `inventory_movements`.

- `anon`: somente `SELECT` em produtos, variantes e imagens.
- Policies públicas: somente produtos `active`, variantes ativas de produtos `active` e imagens de produtos `active`.
- `anon`: sem grants em `inventory` ou `inventory_movements`.
- `authenticated`: grants administrativos existem, mas as policies de escrita/leitura privada exigem `private.is_admin()`.
- Catálogo público atualmente retorna vazio porque todos os 42 produtos permanecem `draft`.

Isto também atende à mudança anunciada pelo Supabase para 30/10/2026, quando tabelas/funções deixarão de ser automaticamente expostas pela Data API: os grants públicos necessários já estão explícitos para as três tabelas de catálogo. Eles devem ser rechecados após a migration e antes da ativação. Referência: [breaking change de exposição da Data API](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

### `is_current_user_admin()`

- `SECURITY DEFINER`, proprietário `postgres`.
- `search_path` vazio e referências qualificadas.
- Sem parâmetros e sem SQL dinâmico.
- Exige `auth.uid()` não nulo e delega à allowlist em `private.admin_users`.
- `anon` e `PUBLIC`: sem `EXECUTE`.
- `authenticated`: `EXECUTE` intencional, retornando somente booleano.
- A tabela privada não possui grants de leitura para `anon` ou `authenticated` e o schema `private` não é exposto ao anônimo.

O Security Advisor marca a função pública como `WARN` porque todo `SECURITY DEFINER` executável por `authenticated` merece revisão. A implementação atual é restrita e não apresentou caminho de elevação, portanto o aviso não bloqueia a migration de catálogo. Ainda assim, deve haver aceite formal do risco ou uma fase separada para avaliar wrapper `SECURITY INVOKER`/helper privada sem quebrar as policies existentes.

### Outros avisos

- **WARN — proteção contra senhas vazadas desabilitada.** Deve ser habilitada em Auth > Password Security, se suportada pelo plano, e validada antes da abertura administrativa. [Remediação oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- **INFO — RLS sem policies** em duas tabelas internas de batches e `payment_webhook_events`. Não há exposição pública confirmada; manter como bloqueio por padrão é apropriado.
- Avisos de índices não utilizados/foreign keys sem índice e policies permissivas múltiplas são de performance, não bloqueiam esta implantação e não devem ser “corrigidos” sem workload real.

### Segredos

- `.env.local` está ignorado pelo Git.
- Somente `.env.example` é versionável e utiliza placeholders.
- Nenhum `service_role`, senha de teste, `DATABASE_URL` ou `JWT_SECRET` foi encontrado no bundle.
- A ocorrência literal `sb_secret_` no bundle tem somente o prefixo de 10 caracteres do `supabase-js`; não existe token anexado.
- O frontend usa exclusivamente URL pública e Publishable Key.

## 6. Cloudflare Pages

- `npm run build:cloudflare`: aprovado quando executado isoladamente.
- Saída: `dist`.
- SPA fallback: `public/_redirects` contém `/* /index.html 200` e foi copiado para `dist/_redirects`.
- Base Cloudflare: `/`.
- `WHATSAPP_ONLY`: preservado em código.
- `ONLINE_CHECKOUT_AVAILABLE`: `false`; rota `/checkout/*` redireciona para `/sacola`.

### Bloqueador de configuração

Não existe `.env.cloudflare` e o ambiente local usado pelo build define `VITE_PUBLIC_CATALOG_SOURCE=local`. Portanto, o artefato atual **não está configurado para usar o Supabase como fonte oficial em produção**.

Antes de qualquer deploy, configurar no projeto Cloudflare Pages, como variáveis públicas de build:

- `VITE_PUBLIC_CATALOG_SOURCE=supabase`;
- `VITE_SUPABASE_URL` apontando para o projeto confirmado;
- `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave publicável ativa.

Não usar `service_role`, `sb_secret_`, senha de banco ou segredo JWT. Reexecutar o build Cloudflare depois dessa configuração e somente após migration/inserções/status aprovados.

## 7. Plano de backup e recuperação

O projeto pertence a uma organização Free; não se deve presumir PITR ou backup gerenciado restaurável. Antes da primeira escrita:

1. confirmar novamente plano e opções de backup no Dashboard;
2. gerar dump lógico read-only de roles, schema e dados com Supabase CLI/PostgreSQL oficial;
3. exportar inventário dos objetos Storage e preservar separadamente os arquivos necessários; dump de banco não representa backup integral dos binários;
4. registrar horário UTC/local, tamanho e SHA-256 de cada artefato;
5. armazenar fora do repositório público;
6. restaurar em PostgreSQL/Supabase isolado e validar schema, 42 produtos, fixture, 94 variantes, 53 vínculos de imagem, inventário 1.200/0 e 80 movimentos;
7. interromper se a restauração não for comprovada.

Auth gerenciado, configurações do projeto e objetos Storage devem ser documentados separadamente; um dump SQL não garante recuperação integral desses componentes.

## 8. Sequência exata e gates de autorização

### Gate A — autorizar backup/snapshot read-only

1. Confirmar destino `qbedfcdarmgiytlqntpf`.
2. Criar backup lógico e snapshot verificável.
3. Testar restauração isolada.
4. Registrar baseline: 42 comerciais draft, 94 variantes, 52 imagens comerciais, 1.200/0, 80 movimentos, zero pedidos/reservas inesperados.

**Parar** se backup/restauração, contagens ou projeto divergirem.

### Gate B — autorizar somente a migration

1. Recalcular o hash da migration e exigir o hash registrado neste relatório.
2. Confirmar que nenhuma migration anterior está pendente/divergente.
3. Aplicar exclusivamente `20261020102806`.
4. Não inserir Fitness e não alterar status.
5. Validar coluna, default, constraint, 20 Streetwear assistidos, 22 perfumes inquiry, fixture disabled, RLS/grants e inventário intacto.

**Parar** se qualquer produto mudar de status/preço ou se estoque/movimentos divergirem.

### Gate C — autorizar inserção dos cinco Fitness

1. Inserir `IF-01..IF-05` como `draft` e `INQUIRY_ONLY`, por código/slug idempotente.
2. Usar nomes e preços conciliados; `IF-05` = Conjunto Jasmim, R$ 240,00.
3. Não criar variantes, inventory ou movimentos.
4. Fazer upload das cinco imagens originais em paths canônicos e vincular uma imagem principal por produto.
5. Validar 47 comerciais, 57 imagens comerciais, 94 variantes e estoque/movimentos inalterados.

**Parar** em conflito de código/slug, upload incompleto ou contagem divergente. Não repetir inserts cegamente.

### Gate D — autorizar ativação comercial

1. Revalidar todos os 47 registros, imagens, preços e `sales_mode`.
2. Ativar somente lista explícita de códigos aprovada.
3. Não alterar estoque, variante, preço ou imagem na mesma operação.
4. Validar leitura anônima: 47 produtos, sem fixture/drafts/archived.
5. Validar Streetwear com disponibilidade pública; perfumes/Fitness somente consulta.

**Parar** se qualquer `INQUIRY_ONLY` entrar na sacola ou se quantidade exata de inventário for exposta.

### Gate E — autorizar configuração e deploy

1. Configurar variáveis públicas Cloudflare com fonte `supabase`.
2. Build, inspeção de bundle e smoke test em preview.
3. Confirmar `WHATSAPP_ONLY`, contatos corretos e checkout bloqueado.
4. Somente então solicitar autorizações separadas para commit, push e deploy.

## 9. Rollback por etapa

- Falha na migration dentro da transação: interromper e preservar erro; não alterar histórico manualmente.
- Migration aplicada, antes de dependências: considerar rollback planejado somente após snapshot; `DROP COLUMN` perde classificações.
- Inserção Fitness parcial: consultar por código/slug e retomar idempotentemente; não excluir nem repetir sem diagnóstico.
- Upload parcial: registrar paths; remover órfãos apenas com autorização.
- Ativação parcial: parar e registrar códigos; retorno a `draft` exige autorização explícita e não deve tocar inventário.
- Regressão frontend: reverter deployment para artefato anterior; não reverter banco automaticamente.
- Divergência de estoque: bloquear publicação e reconciliar ledger; nunca zerar ou recalcular automaticamente.

## 10. Testes desta fase

- `npm test`: **86/86 aprovados**.
- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado isoladamente**. A primeira execução paralela colidiu com o build local ao limpar `dist` (`EPERM`); não foi falha de código.
- `git diff --check`: **aprovado**, somente avisos locais de LF/CRLF/configuração do drive Git.

## 11. Estado Git

O workspace permanece deliberadamente sujo, com alterações acumuladas das fases anteriores e desta fase. Nenhum arquivo foi staged ou commitado por esta auditoria. A revisão pré-commit deve abranger:

- 37 arquivos rastreados modificados;
- 2 arquivos rastreados removidos (`src/data/commerceCatalog.ts`, `src/services/supabaseCatalog.ts`);
- 64 arquivos não rastreados;
- documentação/auditorias e artefatos de inventário ainda não rastreados;
- novos componentes, providers, serviços e testes do catálogo/WhatsApp;
- sete migrations locais ainda não rastreadas, incluindo `20261020102806`;
- testes SQL locais ainda não rastreados;
- asset original do Conjunto Jasmim e fallback `_redirects` ainda não rastreados.

O snapshot completo foi obtido com `git status --short --untracked-files=all`: 103 entradas, sendo 37 modificadas, 2 removidas, 64 não rastreadas e zero staged. Antes de commit futuro, repetir a checagem de segredos, revisar inclusões individualmente e não agrupar artefatos temporários inadvertidamente.

## 12. Bloqueadores e parecer final

### Bloqueadores antes de deploy

1. backup lógico com restauração isolada ainda precisa ser produzido/validado para esta janela;
2. migration `sales_mode` ainda não foi aplicada remotamente;
3. cinco Fitness e suas imagens ainda não existem no remoto;
4. todos os produtos remotos continuam `draft`;
5. Cloudflare ainda não está configurado com `VITE_PUBLIC_CATALOG_SOURCE=supabase`;
6. proteção contra senhas vazadas continua desabilitada — requer decisão/remediação administrativa.

### Parecer

**PRONTO PARA REVISÃO E AUTORIZAÇÕES SEQUENCIAIS; NÃO APTO PARA DEPLOY IMEDIATO.** O catálogo local de 47 produtos e a migration estão tecnicamente conciliados. As operações remotas devem permanecer separadas pelos Gates A–E, sem combinar migration, inserção, ativação e deploy numa única autorização.
