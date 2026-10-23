# BELLMONT — Fase 05.W3A — Plano de liberação controlada

Estado: **PREPARADO — NÃO EXECUTADO — AGUARDANDO AUTORIZAÇÃO**

## Gates de autorização

| Gate | Autorização exigida | Resultado esperado |
|---|---|---|
| G1 | Aprovar matriz, códigos Fitness e preços confirmados | Escopo imutável de 47 produtos; IF-05 confirmado em R$ 240,00 |
| G2 | Autorizar migration de modalidade | Banco distingue compra, consulta e bloqueado |
| G3 | Autorizar inserção dos cinco Fitness | 47 produtos remotos, sem variante/estoque inventado |
| G4 | Autorizar ativação dos 47 | Catálogo público completo e controlado |
| G5 | Autorizar commit/push | GitHub recebe o hash validado |
| G6 | Autorizar deploy | Cloudflare publica o hash aprovado |

## Etapa 0 — congelamento

1. Aprovar esta matriz com os códigos Fitness `IF-01` a `IF-05`, já verificados sem conflito remoto.
2. Registrar hashes dos arquivos/migrations aprovados.
3. Interromper se contagens, códigos, preços, imagens, variantes ou inventário divergirem.

## Etapa A — backup e snapshot

1. Confirmar projeto `qbedfcdarmgiytlqntpf`.
2. Produzir backup lógico verificável e testar restauração isolada conforme processo já validado na 05.2C.3.
3. Snapshot: 42 produtos draft, 94 variantes, 52 imagens, 1.200 físico, 0 reservado, 80 movimentos comerciais, zero pedidos/reservas.
4. Critério de parada: qualquer movimento, reserva, pedido ou alteração de estoque inesperada.

## Etapa B — modalidade comercial

1. Criar migration versionada separada para `products.sales_mode` após G2.
2. Usar a constraint preparada com `ASSISTED_PURCHASE`, `INQUIRY_ONLY`, `DISABLED`.
3. Backfill explícito: ST-01..20 = `ASSISTED_PURCHASE`; PF-01..22 = `INQUIRY_ONLY`; fixture = `DISABLED`.
4. Ajustar consulta pública, tipos, Admin, PDP, cards, Quick View e sacola.
5. Testar que `inquiry_only` nunca entra na sacola, mesmo com variante/estoque.
6. Manter status `draft` durante toda a etapa.
7. Aplicar migration remota apenas após auditoria e autorização independentes.

## Etapa C — cinco IMPÉRIO FIT

1. Após G3, inserir por códigos aprovados e slugs existentes, inicialmente `draft` e `INQUIRY_ONLY`.
2. Campos: nome, marca pública IMPÉRIO FIT, categoria Fitness, preço somente após confirmação.
3. Upload/vínculo de uma imagem existente por produto, com path canônico e idempotente.
4. Não criar variantes, inventário ou movimentos.
5. Validar contagens esperadas: 47 comerciais, 94 variantes comerciais existentes + 0 novas Fitness e 57 imagens comerciais.
6. Confirmar roteamento ao `556492659825`.

## Etapa D — pré-ativação

1. Executar testes unitários, builds local/Cloudflare e testes RLS.
2. Consulta anônima ainda deve retornar vazio enquanto todos estiverem draft.
3. Verificar ausência de fixture, dados privados e quantidades exatas.
4. Validar os 47 PDPs em modo autenticado/Admin ou ambiente isolado sem burlar RLS público.
5. Revalidar todos os objetos de Storage.

## Etapa E — ativação controlada

1. Após G4, ativar por lista explícita de códigos, em transação/lotes auditáveis.
2. Não alterar preços, variantes, imagens ou estoque na mesma operação.
3. Primeiro checkpoint Streetwear: 20 ativos, compra assistida e disponibilidade correta.
4. Segundo checkpoint Perfumaria: 22 ativos, somente consulta, nenhum item adicionável à sacola.
5. Terceiro checkpoint Fitness: cinco ativos, somente consulta, WhatsApp IMPÉRIO FIT.
6. Resultado final: 47 ativos comerciais; fixture arquivada; estoque 1.200/0; zero pedido/reserva.

## Etapa F — frontend e Cloudflare

1. Definir produção como `VITE_PUBLIC_CATALOG_SOURCE=supabase`.
2. Build `npm run build:cloudflare`; inspecionar bundle e segredos.
3. Após G5, commit/push do conjunto revisado.
4. Após G6, publicar em `bellmont-loja.pages.dev`.
5. Smoke test antes do domínio: refresh de rotas, 47 produtos, busca, filtros, favoritos, PDP, sacola Streetwear, consulta de perfumes/Fitness, contatos e Admin.
6. Só então conectar `bellmontloja.com.br` e repetir smoke test.

## Rollback e interrupção

- Antes da ativação: corrigir migration/frontend sem tocar status.
- Falha ao inserir Fitness: transação deve reverter; excluir objeto órfão somente mediante autorização.
- Falha parcial de ativação: parar, registrar códigos alterados e restaurar `draft` apenas com autorização explícita; não mexer no inventário.
- Regressão frontend: rollback do deployment para hash anterior; banco permanece intacto.
- Divergência de estoque: bloquear publicação e investigar ledger; nunca zerar/recalcular.
- Falha de conexão: reconsultar por código antes de repetir qualquer operação para evitar duplicação.

## Critérios finais de aceite

- 47 códigos estáveis e únicos; 47 produtos ativos autorizados.
- Streetwear: 20 × quatro variantes, 1.200 físico, 0 reservado.
- Perfumes/Fitness: `inquiry_only`; nenhuma sacola/compra direta.
- Fixture invisível; drafts/archived não expostos.
- RLS e grants preservados; inventário exato privado.
- WhatsApps separados corretamente.
- Testes/builds/RLS/smoke test aprovados e hash documentado.
