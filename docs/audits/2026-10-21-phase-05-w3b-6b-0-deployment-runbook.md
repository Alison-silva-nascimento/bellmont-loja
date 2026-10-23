# BELLMONT — 05.W3B.6B.0 — runbook de ativação e deploy

Data: 2026-10-21  
Estado: preparado, não executado

## Baseline obrigatório

- Backup validado: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-21-pre-w3b6b`.
- Destino Supabase: `qbedfcdarmgiytlqntpf`, `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- 47 comerciais draft; fixture `TEST-FIXTURE-01` archived/DISABLED.
- Estoque comercial 1.200/0; 80 movimentos; zero pedidos/reservas.
- Homologação mobile aprovada pelo proprietário.

## Etapa A — autorização e preflight

1. Conferir hashes do backup e project ref.
2. Executar somente `scripts/prepared/phase-05-w3b-6b-0/01-preflight.sql` por conexão administrativa controlada.
3. Exigir `PREFLIGHT_OK`; qualquer exceção é NO-GO.
4. Registrar as saídas e solicitar autorização específica para ativação.

## Etapa B — ativação Supabase

1. Executar somente `02-activate.sql`.
2. Não executar migrations, seeds ou outros arquivos no mesmo comando.
3. Em sucesso, executar imediatamente `03-verify.sql`.
4. Confirmar 47 ativos, 20 assisted, 27 inquiry, fixture oculta, 1.200/0, zero pedidos/reservas e leitura anon.
5. Se a ativação falhar, preservar o erro e não improvisar correção ou rollback.

## Etapa C — Cloudflare Pages

Estado local verificado:

- Repositório: `Alison-silva-nascimento/bellmont-loja`.
- Branch de produção proposta: `main`.
- Build command: `npm run build:cloudflare`.
- Output: `dist`.
- Node recomendado: 22.
- Vite base no modo cloudflare: `/`.
- Navegação: `HashRouter`; `public/_redirects` contém `/* /index.html 200`.
- Variáveis públicas: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PUBLIC_CATALOG_SOURCE=supabase`.

Não existe configuração local (`wrangler.toml`) que comprove o projeto Cloudflare conectado. O nome/domínio `bellmont-loja.pages.dev` é planejado em auditorias anteriores, não foi confirmado por API nesta fase.

Procedimento futuro:

1. Abrir o projeto Cloudflare Pages correto e confirmar repositório/branch.
2. Configurar as três variáveis no ambiente Production; nunca usar `service_role`, `sb_secret_`, senha ou connection string.
3. Configurar build/output conforme acima. Como variáveis `VITE_` entram no bundle, disparar novo build.
4. Inspecionar artefato: `_redirects`, assets com hash, ausência de segredos e fonte Supabase.
5. Publicar somente após autorização específica.
6. Confirmar URL gerada antes de configurar domínio próprio.

Cache recomendado: HTML e `_redirects` revalidáveis; assets com hash podem receber cache longo/imutável. Cabeçalhos de segurança devem ser configurados e testados sem quebrar Supabase, imagens públicas ou links WhatsApp.

## Etapa D — smoke test

Executar o checklist mobile e validar Home, três categorias, busca, filtros, PDP, favoritos, sacola, WhatsApps, catálogo Supabase, console e segurança. Reconsultar estoque e pedidos em modo read-only.

## Etapa E — recuperação

- Falha antes do deploy: não publicar; avaliar `04-rollback-to-draft.sql` somente com autorização.
- Falha somente no frontend: reverter o deployment Cloudflare anterior; não alterar catálogo automaticamente.
- Falha de catálogo: interromper atendimento online, diagnosticar e decidir separadamente rollback dos 47 para draft.
- Nunca confundir rollback de deploy com rollback de banco.

