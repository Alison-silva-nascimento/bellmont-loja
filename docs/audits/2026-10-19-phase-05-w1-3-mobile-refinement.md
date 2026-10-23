# BELLMONT — Fase 05.W1.3

## Parecer

**PRONTO COM RESSALVAS**

O refinamento mobile foi implementado e validado no navegador local nas larguras solicitadas. A ressalva permanece comercial: os produtos do Supabase continuam em `draft`, não houve ativação automática e a publicação/implantação continua fora do escopo desta execução.

Não houve commit, push, deploy, migration, escrita remota, ativação de produto, pedido, reserva, pagamento ou movimento de estoque.

## Problemas identificados

1. O header móvel tinha largura reservada para apenas busca e sacola; ao adicionar Favoritos, o logo e a busca se sobrepunham em 320 px e os ícones ficavam comprimidos em tablets.
2. Favoritos herdava `min-height: 70vh` e padding editorial da página utilitária, afastando desnecessariamente os produtos.
3. Os cards da sacola mantinham espaçamento e hierarquia do desktop; o resumo e o WhatsApp ficavam longe dos itens.
4. A mensagem de disponibilidade não possuía separação visual suficiente do preço em cards estreitos.
5. O banner do grupo mantinha dimensões de campanha em telas pequenas.
6. Hero e cards de Contato ainda exigiam rolagem excessiva no mobile.

## Correções implementadas

### Header

- Favoritos agora permanece visível entre Busca e Sacola.
- Menu à esquerda, marca posicionada no espaço livre e três ações à direita.
- Áreas de toque de 42–44 px preservadas até 320 px.
- Contador da sacola e atalhos do menu lateral preservados.
- Geometria distinta para celular e tablet, sem sobreposição observada.

### Sacola

- Cards reorganizados com miniatura compacta, informação, preço, quantidade e remoção.
- Preço unitário, subtotal da linha e mensagem auxiliar possuem blocos próprios.
- Controles continuam respeitando estoque/variante e limites existentes.
- Barra inferior móvel exibe subtotal e finalização por WhatsApp, respeitando `safe-area-inset-bottom`.
- Em sacolas mistas, a barra suporta os botões separados por loja já produzidos pela lógica central.
- Barra não aparece em sacola vazia, fora do modo `WHATSAPP_ONLY` ou em telas maiores.
- O resumo completo e os avisos sobre frete, disponibilidade, pedido e pagamento permanecem no fluxo.

### Favoritos

- Removido o `min-height` excessivo somente dentro de Favoritos.
- Cabeçalho reduzido e alinhado ao início no celular.
- Grade de duas colunas e persistência existentes preservadas.
- Com produto salvo a primeira imagem começou em 103 px na validação de 390 px, dentro da primeira dobra.
- Estado vazio mantém sua mensagem, porém sem o grande vazio anterior.

### Grupo oficial

- Banner transformado em bloco promocional compacto no celular.
- Título, descrição, ícone, gaps e padding reduzidos.
- Em tablet, ícone/copy/CTA foram reorganizados para evitar uma pilha vertical longa.
- Link oficial e aviso conceitual de grupo para novidades foram preservados.

### Contato

- Hero reduzido sem perder contraste e hierarquia.
- Cards BELLMONT e IMPÉRIO FIT compactados.
- WhatsApp segue como ação principal e Instagram como secundária.
- Nenhum endereço, horário ou contato foi inventado.

## Comparativo objetivo

| Área | Antes | Depois |
| --- | --- | --- |
| Header 320 px | Favoritos oculto; espaço para duas ações | Busca, Favoritos e Sacola visíveis; nenhuma interseção |
| Favoritos mobile | Cabeçalho com até 70vh | Cabeçalho aproximado de 224 px em 390 px |
| Sacola mobile | Cards altos e resumo distante | Cards de 160–186 px e CTA fixo de 68 px |
| Grupo 768 px | Aproximadamente 533 px | Aproximadamente 327 px |
| Contato 390 px | Hero e cards extensos | Hero ~209 px e card ~282 px |

## Arquivos alterados nesta fase

- `src/components/layout/Header.tsx`
- `src/pages/CartPage.tsx`
- `src/styles/global.css`
- `docs/audits/2026-10-19-phase-05-w1-3-mobile-refinement.md`

Todas as alterações anteriores presentes no working tree foram preservadas.

## Validação visual real

O navegador local acessou `http://localhost:5173/` e foram inspecionadas as larguras 320, 360, 375, 390, 430, 768 e 1024 px.

- Header: sem interseções geométricas nas sete larguras; Busca, Favoritos e Sacola mantiveram áreas de toque independentes no modo móvel.
- Overflow: nenhuma largura apresentou conteúdo além do `innerWidth` nas páginas verificadas.
- Favoritos: produto salvo apareceu na primeira dobra em 390 px.
- Sacola: cenário DEV com duas variantes mostrou dois cards, controles e barra inferior sem cobrir o conteúdo.
- Barra da sacola: visível até 600 px e ausente em 768/1024 px.
- Grupo e Contato: alturas reduzidas e CTAs visíveis.
- A sacola comercial mista não foi criada no navegador para evitar dados artificiais; o roteamento separado por loja permanece coberto pelos testes automatizados existentes.

## Testes

- `npm test`: **81/81 aprovados**.
- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado**.
- `git diff --check`: **aprovado**; somente avisos locais de LF/CRLF e configuração Git em `U:`.

## Regras comerciais preservadas

- `WHATSAPP_ONLY` permanece ativo.
- Checkout online continua bloqueado.
- Variantes, limites, indisponibilidade e estoque não foram relaxados.
- Separação BELLMONT/IMPÉRIO FIT continua centralizada.
- Abrir WhatsApp não cria pedido, reserva, pagamento ou movimentação e não limpa a sacola.
- Supabase, Auth, RLS, policies, migrations e produtos `draft` não foram modificados.

## Pendências

1. Validação manual do proprietário nos aparelhos reais, especialmente safe areas de iPhone e teclado/zoom do navegador.
2. Validação visual manual de uma sacola comercial mista quando houver produtos publicáveis e variantes reais das duas lojas.
3. Commit, push e deploy dependem de autorização específica.
