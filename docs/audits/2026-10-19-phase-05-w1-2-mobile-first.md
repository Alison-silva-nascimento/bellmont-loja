# BELLMONT — Fase 05.W1.2

## Parecer

**PRONTO COM RESSALVAS**

A interface foi preparada para uma experiência mobile-first e o pacote para Cloudflare Pages foi validado por compilação. A publicação comercial continua condicionada às decisões já registradas nas fases W1/W1.1: os 42 produtos comerciais permanecem em `draft`, não houve ativação automática e itens sem dados comerciais/variantes suficientes não foram transformados em produtos compráveis.

Não houve commit, push, deploy, alteração remota no Supabase, ativação de checkout online, criação de pedido, reserva ou movimentação de estoque nesta fase.

## Diagnóstico anterior

- O hero móvel ocupava aproximadamente uma tela inteira, atrasando o acesso aos produtos.
- Regras responsivas anteriores reduziam grades comerciais para uma coluna em celulares.
- As vitrines da Home não ofereciam navegação horizontal compacta.
- Os filtros permaneciam extensos na página em telas pequenas.
- A rota de contato ainda reutilizava uma página utilitária genérica.
- O build de produção estava orientado ao subdiretório do GitHub Pages.

## Implementação

### Mobile-first

- Hero compacto entre aproximadamente 350 e 400 px nas larguras móveis suportadas.
- Catálogo, busca e favoritos em duas colunas no celular.
- Vitrines de novidades e categorias com rolagem horizontal, snap e cerca de dois cards visíveis.
- Filtros convertidos em painel inferior compacto, com bloqueio de rolagem da página, limpar e aplicar.
- Header, sacola, PDP, seletores, CTAs, rodapé e safe areas receberam ajustes específicos para toque e telas estreitas.
- Mantidos a identidade BELLMONT, o catálogo centralizado, favoritos, variantes, sacola e regras do modo `WHATSAPP_ONLY`.

### Contato comercial

A rota `#/contato` agora apresenta uma página própria e separa os canais oficiais:

- BELLMONT para Streetwear e Perfumaria: WhatsApp `+55 64 9302-6564` e Instagram `@bellmontstoree`.
- IMPÉRIO FIT para Fitness: WhatsApp `+55 64 9265-9825` e Instagram `@imperio.fit.carolribeiro`.
- Grupo oficial identificado somente como comunidade de novidades e promoções, nunca como destino de pedidos.

Todos os links externos abrem em nova aba com `noopener noreferrer`. Não foram inventados endereço, horário ou e-mail.

### Cloudflare Pages

- Comando de build: `npm run build:cloudflare`.
- Diretório de saída: `dist`.
- Base pública no modo Cloudflare: `/`.
- Fallback SPA: `public/_redirects` com `/* /index.html 200`.
- O projeto continua usando `HashRouter`, portanto as rotas públicas permanecem resilientes a recargas diretas.
- Domínio pretendido: `bellmontloja.com.br`; a vinculação DNS/domínio não foi executada.
- Variáveis públicas esperadas: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e, quando usado, `VITE_PUBLIC_CATALOG_SOURCE`.
- Nenhuma chave administrativa, `service_role`, `sb_secret_` ou senha foi adicionada ao frontend.

O build padrão mantém a base histórica `/bellmont-loja/`; o build `cloudflare` gera referências na raiz (`/assets/...`). O artefato Cloudflare foi inspecionado e contém `_redirects`.

## Arquivos desta fase

- `src/pages/ContactPage.tsx` — nova página comercial de contato.
- `src/App.tsx` — rota de contato ligada à nova página.
- `src/pages/ListingPage.tsx` — painel móvel de filtros.
- `src/styles/global.css` — regras mobile-first, vitrines horizontais, grade dupla, PDP, sacola, contato e safe areas.
- `vite.config.ts` — base distinta para Cloudflare e build histórico.
- `package.json` — comando `build:cloudflare`.
- `public/_redirects` — fallback para Cloudflare Pages.
- `docs/audits/2026-10-19-phase-05-w1-2-mobile-first.md` — este relatório.

As demais alterações já existentes no working tree pertencem às fases anteriores e foram preservadas integralmente.

## Validação

- `npm test`: **81/81 aprovados**.
- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado**.
- `git diff --check`: **aprovado**, apenas avisos locais de conversão LF/CRLF e configuração Git em `U:`.
- Servidor Vite: iniciou em `http://127.0.0.1:5173/`.
- Validação visual automatizada por viewport: **não comprovada neste executor**. O navegador isolado retornou `ERR_CONNECTION_TIMED_OUT` ao acessar o loopback, embora o Vite tenha iniciado. Portanto, não se declara inspeção visual real nas larguras 320, 360, 375, 390, 430, 768 e 1024 px.

## Fluxos preservados

- Header, menu, busca, filtros, favoritos, cards, Quick View, PDP, variantes, sacola e persistência local continuam usando a arquitetura existente.
- Finalização permanece exclusivamente via WhatsApp no modo inicial.
- O checkout online permanece bloqueado por configuração e não apenas escondido visualmente.
- Nenhuma abertura do WhatsApp limpa a sacola ou confirma pedido/pagamento.
- O roteamento BELLMONT/IMPÉRIO FIT e a separação de mensagens da sacola não foram alterados.

## Ressalvas antes da publicação

1. Executar validação visual manual em aparelho real ou navegador local nas larguras previstas, incluindo orientação, teclado virtual, safe areas e rolagem horizontal.
2. Definir a estratégia autorizada para tornar o catálogo comercial público: produtos `draft` não podem aparecer na leitura pública do Supabase.
3. Revisar produtos ainda não publicáveis por falta de variante/preço/dados completos conforme os relatórios W1/W1.1.
4. Configurar o projeto Cloudflare Pages com o comando e diretório acima; cadastrar somente variáveis públicas necessárias; depois vincular `bellmontloja.com.br`.
5. Fazer uma rodada final de Lighthouse/Web Vitals no ambiente publicado antes da divulgação ampla.

## Segurança e escopo

Nenhuma migration, policy, RLS, grant, produto, preço, imagem, SKU, estoque ou status comercial foi modificado. Nenhum checkout, pagamento ou pedido foi habilitado. O trabalho ficou exclusivamente local e aguarda validação manual e autorização específica para commit, push e deploy.
