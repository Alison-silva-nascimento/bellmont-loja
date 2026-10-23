# BELLMONT — Ajuste final das vitrines da Home

**Data:** 22 de outubro de 2026  
**Escopo:** implementação local, sem alterações remotas

## Ordem final da Home

1. Hero principal — preservado.
2. Streetwear — 6 produtos editoriais.
3. Essentials / Fragrances — 6 perfumes editoriais.
4. Fitness / IMPÉRIO FIT — 4 produtos editoriais.
5. Entre para o Grupo Oficial — link oficial preservado.
6. Rodapé institucional existente.

O banner `ESCOLHA A PEÇA. VISTA A ATITUDE.` deixou de ser renderizado na Home. Seu componente não foi apagado, evitando impacto em eventual reutilização futura.

## Seleção editorial

A seleção foi centralizada em `src/data/homeShowcases.ts` e usa uma ordem fixa por códigos comerciais:

- Streetwear: `ST-01` a `ST-06`.
- Perfumaria: `PF-01` a `PF-06`.
- Fitness: `IF-01` a `IF-04`.

Somente produtos da categoria correta, não desabilitados e com imagem válida são elegíveis. Quando algum destaque configurado não existe na fonte pública, a seleção usa os próximos produtos elegíveis na ordem estável recebida do catálogo. Não existe aleatoriedade, duplicação ou conteúdo artificial.

Os limites são exclusivos da Home. As coleções completas preservam:

- Streetwear: 20 produtos.
- Perfumaria: 22 produtos.
- IMPÉRIO FIT: 5 produtos.

## CTAs

| Vitrine | CTA | Rota |
|---|---|---|
| Streetwear | `VER STREETWEAR COMPLETA` | `/streetwear` |
| Essentials / Fragrances | `VER COLEÇÃO DE FRAGRÂNCIAS` | `/perfumes` |
| Fitness / IMPÉRIO FIT | `VER IMPÉRIO FIT COMPLETA` | `/imperio-fit` |

## Mobile

- Todas as vitrines usam duas colunas até 900 px.
- Streetwear: 2 colunas × 3 linhas.
- Perfumaria: 2 colunas × 3 linhas.
- Fitness: 2 colunas × 2 linhas.
- Imagens da Home usam proporção 1:1.
- A grade deixou de usar carrossel horizontal, eliminando overflow lateral da vitrine.
- Favoritos, Quick View, nomes, preços e navegação permanecem nos mesmos cards.
- Fitness permanece fora da sacola BELLMONT pelas regras existentes de modalidade comercial.

## Estados alternativos

Loading e erros continuam sob responsabilidade do `CatalogProvider`. Quando não existem produtos elegíveis, cada vitrine apresenta seu estado vazio existente, sem usar produtos draft como fallback e sem fabricar conteúdo.

## Arquivos alterados

- `src/pages/Home.tsx`
- `src/sections/NewDrop.tsx`
- `src/sections/CategoryShowcase.tsx`
- `src/data/homeShowcases.ts`
- `src/data/homeShowcases.test.ts`
- `src/styles/global.css`
- `docs/audits/2026-10-22-phase-05-w3b-6b-ui-final-home-showcases.md`

## Testes

- `npm test`: **112/112 aprovados**.
- `npm run build`: **aprovado** na primeira execução.
- `npm run build`: **aprovado** na segunda execução solicitada.
- `git diff --check`: **aprovado**, sem erros de whitespace; apenas avisos locais de LF/CRLF e acesso à configuração global do Git.

Os testes novos verificam as quantidades exatas 6/6/4, seleção determinística, ausência de duplicações, categorias corretas, rotas dos CTAs, totais completos 20/22/5 e comportamento com catálogo vazio.

## Restrições preservadas

- Nenhuma alteração no Supabase ou Cloudflare.
- Nenhum produto, preço, imagem, variante ou estoque alterado.
- Nenhum commit, push ou deploy.
- Hero, grupo oficial, rodapé, WhatsApps e regras comerciais preservados.

## Parecer

**IMPLEMENTAÇÃO LOCAL APROVADA PARA VALIDAÇÃO VISUAL.**

O servidor local deve ser iniciado para a conferência final pelo proprietário antes de qualquer autorização de publicação.
