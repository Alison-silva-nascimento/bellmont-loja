# BELLMONT — Fase 05.W1 — WhatsApp Launch Readiness

Data: 2026-10-19  
Classificação: **BLOQUEADO** para publicação comercial completa; implementação técnica WhatsApp pronta para validação manual.

## Resultado executivo

O modo comercial foi centralizado em `WHATSAPP_ONLY`. O checkout online permanece explicitamente indisponível e a rota `/checkout/*` retorna à sacola. A finalização da sacola cria somente links `wa.me` com mensagens codificadas; não chama Supabase, não cria pedido, não reserva estoque, não registra movimento e não limpa a sacola.

O bloqueio de publicação comercial completa é de dados/publicação, não da integração WhatsApp:

- o Supabase possui 42 produtos comerciais, porém todos estão em `draft` e a leitura pública aceita somente `active`;
- o catálogo local continua sendo a fonte padrão e exibe os produtos reais, mas seus registros comerciais não possuem variantes/disponibilidade confirmada suficientes para tornar a sacola funcional em todas as categorias;
- os quatro itens locais de Fitness não pertencem aos 42 produtos comerciais atualmente migrados e não possuem variantes comerciais confirmadas no Supabase;
- não é seguro inventar tamanhos, volumes, disponibilidade ou estoque para contornar essas lacunas.

## Configuração comercial

- Modo inicial: `WHATSAPP_ONLY`.
- Modo futuro definido: `ONLINE_CHECKOUT`, mantido indisponível.
- BELLMONT / Streetwear / Perfumaria: `+55 64 9302-6564` (`https://wa.me/556493026564`).
- IMPÉRIO FIT / Fitness: `+55 64 9265-9825` (`https://wa.me/556492659825`).
- Grupo oficial, somente divulgação: `https://chat.whatsapp.com/JfzL6Si7kEtBvKaEjTT4OM`.

O proprietário de cada item é determinado centralmente pela categoria e pela marca cadastrada. O texto visível da interface não é usado como critério de roteamento.

## Fluxo implementado

- Sacola somente BELLMONT/Perfumaria: um CTA `Finalizar com BELLMONT`.
- Sacola somente Fitness: um CTA `Finalizar com IMPÉRIO FIT`.
- Sacola mista: um CTA por loja, cada mensagem contendo somente os itens daquele responsável.
- Mensagem: nome, tamanho/cor/volume, quantidade, preço unitário conhecido, subtotal conhecido e total somente de itens com preço válido.
- A mensagem esclarece que disponibilidade, frete e pagamento serão confirmados separadamente e que não existe pedido, reserva ou pagamento confirmado.
- Links usam `encodeURIComponent`, abrem em nova aba com `noopener noreferrer` e não limpam a sacola.
- Produtos sem preço nunca recebem total inventado.
- A Home ganhou uma seção responsiva do grupo oficial após a primeira vitrine; o rodapé ganhou o acesso secundário.
- Streetwear e Perfumaria apontam para BELLMONT; Fitness aponta para IMPÉRIO FIT.

## Auditoria read-only do Supabase

Projeto: `qbedfcdarmgiytlqntpf`.

- 42 produtos comerciais: 20 Streetwear e 22 perfumes.
- 42 em `draft`; 0 em `active`.
- 94 variantes comerciais.
- 52 imagens comerciais.
- Fixture técnica em `archived`.
- 80 linhas de inventário comercial Streetwear.
- 1.200 unidades físicas e 0 reservadas.

Nenhum dado remoto foi alterado durante esta fase.

## Estratégia de publicação V1

1. Manter `products.ts` como fonte visual até a autorização comercial, evitando expor drafts ou a fixture.
2. Antes de disponibilizar compra pela sacola, completar e validar as variantes reais que faltam no catálogo comercial, especialmente Fitness e perfumes sem inventário confirmado.
3. Solicitar autorização separada para alterar o status dos produtos aprovados de `draft` para `active`.
4. Após a ativação autorizada, definir `VITE_PUBLIC_CATALOG_SOURCE=supabase` no ambiente de build e validar que somente produtos ativos são retornados pela RLS.
5. Executar validação manual mobile/desktop da sacola com itens reais publicados antes de commit/push/deploy.

Ativar produtos no Supabase é uma alteração comercial remota e não foi autorizada neste pedido. A ativação deve listar explicitamente os códigos aprovados. Fitness exige antes cadastro/migração comercial e confirmação de variantes/disponibilidade.

## GitHub Pages

- URL de destino esperada pela origem e base do Vite: `https://alison-silva-nascimento.github.io/bellmont-loja/`.
- Branch de publicação: `main`.
- Artefato: diretório `dist`.
- Automação: `.github/workflows/deploy-pages.yml`, acionada por push em `main`.
- Navegação: `HashRouter`, compatível com GitHub Pages.

A URL externa não pôde ser consultada pelo navegador desta execução. Nenhum deploy foi iniciado.

## Arquivos desta fase

Criados:

- `src/config/commercialMode.ts`
- `src/utils/whatsappOrder.ts`
- `src/utils/whatsappOrder.test.ts`
- `src/components/commerce/WhatsAppContactLink.tsx`
- `src/sections/WhatsAppGroup.tsx`
- `docs/audits/2026-10-19-phase-05-w1-whatsapp-launch-readiness.md`

Modificados:

- `src/App.tsx`
- `src/pages/CartPage.tsx`
- `src/pages/Home.tsx`
- `src/pages/ImperioFit.tsx`
- `src/pages/ListingPage.tsx`
- `src/pages/ProductPage.tsx`
- `src/pages/UtilityPage.tsx`
- `src/components/layout/Footer.tsx`
- `src/styles/global.css`

Nenhuma migration, função de inventário, policy, grant, produto, variante, imagem, estoque ou movimento foi alterado nesta fase.

## Validação

- `npm test`: **74/74 aprovados**.
- Cenários de roteamento: Streetwear; perfumes; Fitness; Streetwear + perfumes; Streetwear + Fitness; perfumes + Fitness; três categorias — **aprovados**.
- Codificação da mensagem e separação por número — **aprovadas**.
- `npm run build`: **aprovado**.
- `git diff --check`: **aprovado**, somente avisos de conversão LF/CRLF já existentes no ambiente.
- Bundle: nenhuma ocorrência de `service_role` ou senha administrativa. A string `sb_secret_` aparece somente na proteção que rejeita chaves secretas; a chave publicável é, por definição, pública e protegida por RLS.
- Servidor Vite: iniciou em `http://127.0.0.1:5173/`, mas a ferramenta de navegador isolada não conseguiu alcançar o loopback do executor. A inspeção visual final precisa ser repetida no navegador do proprietário.

## Pendências antes da publicação

1. Autorizar ou rejeitar a ativação dos produtos comerciais aprovados, por código.
2. Decidir se a V1 usará Supabase após ativação ou permanecerá visualmente no catálogo local.
3. Confirmar variantes e disponibilidade reais de Fitness e dos perfumes que participarão da sacola.
4. Validar manualmente Home, menu, busca, filtros, favoritos, PDP, Quick View, sacola, safe areas e ausência de overflow em smartphone real.
5. Repetir o build final com a origem de catálogo escolhida.
6. Autorizar separadamente commit, push e deploy.

Enquanto essas pendências existirem, a publicação pode funcionar como vitrine e atendimento direto por produto/rodapé, mas não atende ao requisito de sacola comercial completa para todas as categorias. Por isso, o parecer permanece **BLOQUEADO**.
