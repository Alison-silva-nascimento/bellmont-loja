# BELLMONT — Fase 05.W1.4

## Parecer

**PRONTO COM RESSALVAS**

A Home mobile foi convertida em uma experiência comercial mais direta, com vitrines horizontais reais para Streetwear e Perfumaria e remoção apenas mobile do CTA Streetwear redundante. A ressalva permanece relacionada à fonte Supabase: os produtos comerciais continuam em `draft`, logo o modo Supabase corretamente apresenta estados vazios até uma futura ativação autorizada.

Não houve commit, push, deploy, migration, alteração remota, ativação de produto ou modificação de estoque.

## Arquivos alterados

- `src/sections/NewDrop.tsx`
- `src/sections/CategoryShowcase.tsx`
- `src/styles/global.css`
- `docs/audits/2026-10-19-phase-05-w1-4-home-commerce.md`

As alterações das fases anteriores no working tree foram preservadas.

## Origem dos produtos

As vitrines continuam consumindo exclusivamente o `CatalogProvider`:

- Fonte local: produtos reais de `src/data/products.ts`, normalizados para as identidades comerciais estáveis.
- Fonte Supabase: somente produtos públicos retornados pela consulta já protegida por RLS; não existe fallback para itens `draft`.

Foi corrigida uma incompatibilidade preexistente: as vitrines filtravam IDs legados (`street-*` e `perfume-*`) depois que o catálogo já havia normalizado os IDs para `ST-*` e `PF-*`. A seleção agora utiliza `productMatchesIdentity()`, compatível com identidade atual e IDs legados.

Produtos sem imagem são descartados e IDs repetidos são eliminados antes da renderização.

## New Drop

- Mantido o título `NEW DROP`.
- Link alterado para `VER TODAS AS PEÇAS`.
- Seleção real validada no modo local:
  - Camiseta Oversized Caveira — Preta — R$ 80,00.
  - Camiseta Oversized Goku — Branca — R$ 80,00.
  - Camiseta Oversized Estampada — Preta — R$ 80,00.
- Cards mantêm favoritos, link para PDP e Quick View no desktop.
- No mobile, o trilho usa CSS scroll-snap e mostra aproximadamente dois cards.

## Perfumaria

- Mantida a identidade `COMPLETE SUA PRESENÇA`.
- Seleção real validada no modo local:
  - Asad — R$ 159,00.
  - Al Noble Wazeer — R$ 288,00.
  - Yara — R$ 280,00.
  - Athena — R$ 280,00.
- Nenhum volume foi adicionado pela vitrine.
- Preços são exibidos somente quando presentes no cadastro.
- Ausência de variante continua sendo tratada pela PDP e pelo modo WhatsApp existente, sem criação de opção fictícia.
- Heading, descrição e espaçamento foram compactados somente no mobile.

## Estado vazio

Quando a fonte ativa não fornece produtos válidos, cada vitrine apresenta um estado editorial explícito de seleção em preparação. Nenhum produto local é usado como fallback quando a fonte Supabase está ativa.

Esse comportamento foi observado no localhost principal configurado para Supabase: como os produtos permanecem em `draft`, Streetwear e Perfumaria não foram expostos.

## Banner redundante

`ESCOLHA A PEÇA. VISTA A ATITUDE.` fica oculto somente até 600 px. A seção continua com `display: flex` em 768 e 1024 px, preservando tablet/desktop e sem deixar lacuna mobile.

## Validação responsiva real

Foi executada uma segunda prévia temporária em modo local, sem alterar `.env.local`, para verificar os produtos reais. As larguras 320, 360, 375, 390, 430, 768 e 1024 px foram medidas no navegador.

- Nenhuma largura apresentou overflow horizontal da página.
- Em 320 px: trilho útil de 304 px, cards de 138 px.
- Em 390 px: trilho útil de 359 px, cards de 173 px.
- Em 430 px: trilho útil de 399 px, cards de 193 px.
- Mobile: `overflow-x: auto`, scroll-snap e aproximadamente dois cards visíveis.
- Tablet 768 px: trilhos horizontais preservados.
- Desktop 1024 px: New Drop em três colunas e Perfumaria em quatro, sem rolagem forçada.
- Links dos sete cards verificados apontam às respectivas PDPs.

## Preservação

- Header, Favoritos, sacola e barra inferior da W1.3 não foram alterados.
- `WHATSAPP_ONLY`, contatos, variantes, disponibilidade e checkout bloqueado foram preservados.
- Supabase, RLS, policies, migrations, produtos, preços, imagens, status e estoque não foram modificados.
- Nenhuma biblioteca foi adicionada.

## Testes

- `npm test`: **81/81 aprovados**.
- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado**.
- `git diff --check`: **aprovado**, com somente os avisos locais já conhecidos de LF/CRLF e configuração Git em `U:`.

## Pendências

1. A exibição via Supabase depende de autorização futura para publicar produtos; produtos `draft` devem continuar invisíveis.
2. Validar manualmente o gesto de swipe em aparelhos iOS e Android reais.
3. Commit, push e deploy exigem autorização específica.
