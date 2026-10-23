# BELLMONT — Fase 05.W3B.1A — Catálogo IMPÉRIO FIT

Data: 2026-10-20  
Estado: **IMPLEMENTADO E VALIDADO LOCALMENTE — NÃO PUBLICADO**

## Resultado

O catálogo local passou de 46 para 47 produtos:

- 20 Streetwear — `ASSISTED_PURCHASE`;
- 22 perfumes — `INQUIRY_ONLY`;
- 5 IMPÉRIO FIT — `INQUIRY_ONLY`.

Nenhum dado, arquivo de Storage, status, estoque, variante, pedido ou reserva foi alterado no Supabase remoto. Não houve migration remota, commit, push ou deploy.

## Associação confirmada por imagem

| Código | ID local | Slug preservado | Imagem | Nome atual |
|---|---|---|---|---|
| `IF-01` | `fitness-01` | `macaquinho-fitness-vinho` | `imperio-fit-burgundy.png` | **Macaquinho Ana** |
| `IF-02` | `fitness-02` | `macaquinho-fitness-preto` | `imperio-fit-black.png` | Macaquinho Fitness — Preto |
| `IF-03` | `fitness-03` | `conjunto-fitness-marinho` | `imperio-fit-navy.png` | **Conjunto Iza** |
| `IF-04` | `fitness-04` | `conjunto-fitness-preto-recortes` | `imperio-fit-lines.png` | Conjunto Fitness — Preto |
| `IF-05` | `fitness-05` | `conjunto-jasmim-marrom` | `imperio-fit-jasmim-brown.png` | **Conjunto Jasmim** |

`IF-01` e `IF-03` tiveram somente o nome comercial alterado. IDs, códigos, slugs, imagens, preços e demais características foram preservados. `IF-02` e `IF-04` permaneceram intactos.

## Novo produto

O `IF-05` foi preparado com a foto original fornecida pela cliente. A imagem mostra top e short separados; o item não foi classificado como macaquinho.

- Nome: **Conjunto Jasmim**, confirmado na observação final da solicitação.
- Categoria: Fitness / conjunto fitness.
- Cor informada: marrom.
- Composição: top e short separados.
- Modalidade: `INQUIRY_ONLY`.
- Preço confirmado: **R$ 240,00**.
- Tamanhos: ausentes, pendentes.
- Variantes: nenhuma.
- Estoque: nenhum dado criado.
- Imagem local: `public/assets/imperio-fit-jasmim-brown.png`.
- SHA-256 da imagem: `2D7B81731AA41761DBD983639A609CD8E6B605E5640909CBDA0BC8527347F810`.

Consulta read-only no projeto `qbedfcdarmgiytlqntpf` confirmou ausência de conflito para o código `IF-05` e o slug `conjunto-jasmim-marrom`. O produto não foi inserido remotamente.

## Sales mode e migration

A migration `20261020102806_phase_05_w3b_1_product_sales_mode.sql` foi preservada sem alterações. Ela continua compatível com a inclusão futura do `IF-05`, pois novos produtos recebem o padrão seguro `INQUIRY_ONLY`. A futura inserção remota deverá informar explicitamente esse modo, manter `draft`, usar o preço confirmado de R$ 240,00 e não criar variantes ou inventário.

Os bloqueios existentes permanecem ativos: todos os cinco Fitness podem ser consultados pelo WhatsApp da IMPÉRIO FIT, mas não entram na sacola e não acionam checkout, pedido, reserva ou movimentação de estoque.

## Arquivos desta atualização

- `src/data/products.ts`
- `src/data/catalogIdentity.ts`
- `src/data/catalogIdentity.test.ts`
- `src/data/assistedCatalog.test.ts`
- `public/assets/imperio-fit-jasmim-brown.png`
- `docs/audits/2026-10-19-phase-05-w3a-product-reconciliation.csv`
- `docs/audits/2026-10-19-phase-05-w3a-release-plan.md`
- `docs/audits/2026-10-20-phase-05-w3b-1-sales-mode-local.md`
- `docs/audits/2026-10-20-phase-05-w3b-1a-imperio-fit-catalog.md`

## Validação

- `npm test`: **86/86 aprovados**.
- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado**.
- `git diff --check`: **aprovado**, sem erros; somente avisos locais de LF/CRLF e configuração do drive Git.
- Teste novo: confirma 47 produtos, contagem 20/22/5, códigos e slugs únicos, preço de R$ 240,00 no `IF-05`, ausência de variantes e imagem original presente.

## Pendências para implantação futura

1. autorização específica para aplicar a migration de `sales_mode` no remoto;
2. autorização separada para cadastrar os cinco produtos IMPÉRIO FIT como `draft`;
3. confirmação dos tamanhos do Conjunto Jasmim antes de criar variantes;
4. upload da imagem original ao Storage e vínculo em `product_images` somente na etapa remota autorizada;
5. ativação comercial em etapa independente, após validação dos 47 registros.

## Parecer

**APTO LOCALMENTE.** O catálogo está preparado para 47 produtos sem duplicações e sem dados comerciais inventados. A publicação remota continua pendente de autorização explícita.
