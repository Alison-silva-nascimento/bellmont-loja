# BELLMONT — Fase 05.W1.1 — Correção WhatsApp na PDP

Data: 2026-10-19  
Parecer: **PRONTO COM RESSALVAS** para publicação V1.

## 1. Causa raiz

A página de produto utilizava `isProductReadyForCart()` — regra de disponibilidade transacional criada para checkout online — para decidir se o atendimento comercial poderia começar. Como o catálogo local não materializava variantes e os produtos Supabase continuam corretamente em `draft`, a mesma regra bloqueava tanto o checkout quanto a compra assistida e exibia apenas “Consultar disponibilidade”.

O problema não era somente o texto do botão. A seleção de variantes, a inclusão na sacola, a reidratação da sacola e a resolução dos itens também dependiam da disponibilidade transacional.

## 2. Correção arquitetural

Foram separados dois fluxos:

- `ONLINE_CHECKOUT`: continua exigindo disponibilidade publicada/confirmada, variante válida, preço e regras transacionais.
- `WHATSAPP_ONLY`: aceita uma variante comercial real ainda não confirmada para atendimento assistido. A confirmação de disponibilidade, frete e pagamento ocorre no WhatsApp.

Uma variante explicitamente esgotada continua bloqueada nos dois fluxos. Produto sem preço ou sem variante confirmada não entra na sacola, mas pode abrir uma consulta individual pelo WhatsApp sem opção ou valor inventado.

## 3. Variantes utilizadas

Foi realizada auditoria read-only no projeto `qbedfcdarmgiytlqntpf`.

- Streetwear: ST-01 a ST-20, tamanhos P/M/G/GG e cores/SKUs reais confirmados no cadastro comercial.
- Perfumaria: somente os 14 produtos que possuem volume confirmado em `product_variants` receberam a opção local correspondente.
- Perfumes sem variante confirmada permanecem em consulta individual.
- IMPÉRIO FIT não recebeu tamanhos, cores ou estoque inventados; os produtos permanecem em consulta individual no número da IMPÉRIO FIT.

As variantes preparadas para o catálogo local são marcadas como `unconfirmed`, com `stock = null`. Isso permite selecionar a opção para atendimento, mas não afirma disponibilidade física.

## 4. Comportamento final da PDP

### Produto com variante real e preço

1. Exibe somente opções confirmadas pelo cadastro comercial.
2. Exige selecionar a opção aplicável.
3. Após a seleção, exibe `COMPRAR VIA WHATSAPP`.
4. Permite também `ADICIONAR À SACOLA` para o fluxo de múltiplos itens.
5. A mensagem contém produto, categoria, variante, quantidade e preço conhecido.
6. Informa que disponibilidade, frete e pagamento ainda serão confirmados.

### Produto sem variante confirmada

- Exibe `CONSULTAR PELO WHATSAPP`.
- Não inventa tamanho, cor, volume, estoque ou disponibilidade.
- Não permite inclusão indevida na sacola.

### Produto sem preço

- A mensagem apresenta o preço como “a confirmar”.
- Nenhum total é inventado.

O número é escolhido pelo mapeamento central da loja responsável:

- Streetwear e Perfumaria: BELLMONT.
- Fitness: IMPÉRIO FIT.
- O grupo oficial nunca é usado como destino comercial.

## 5. Comportamento final da sacola

- Aceita variantes reais `unconfirmed` somente em `WHATSAPP_ONLY`.
- Preserva produto, SKU, tamanho/cor/volume e quantidade.
- Limita a quantidade global a 99 quando não existe quantidade pública exata.
- Respeita estoque exato quando ele estiver disponível.
- Bloqueia variante explicitamente esgotada.
- Mantém separação entre BELLMONT e IMPÉRIO FIT.
- Não limpa a sacola ao abrir o WhatsApp.
- Não cria pedido, reserva, cobrança ou movimento de estoque.
- O checkout online e `/checkout/*` continuam bloqueados.

## 6. Arquivos alterados nesta correção

Criados:

- `src/data/assistedCatalog.ts`
- `src/data/assistedCatalog.test.ts`
- `docs/audits/2026-10-19-phase-05-w1-1-whatsapp-pdp-fix.md`

Modificados:

- `src/context/CatalogContext.tsx`
- `src/context/CartContext.tsx`
- `src/components/commerce/QuickView.tsx`
- `src/pages/CartPage.tsx`
- `src/pages/ProductPage.tsx`
- `src/styles/global.css`
- `src/utils/cart.ts`
- `src/utils/cart.test.ts`
- `src/utils/whatsappOrder.ts`
- `src/utils/whatsappOrder.test.ts`

Nenhuma migration, policy, grant, produto, status, imagem, estoque, pedido ou reserva foi alterado no Supabase.

## 7. Testes

- `npm test`: **81/81 aprovados**.
- `npm run build`: **aprovado**.
- Auditoria read-only das variantes remotas: **concluída**.
- Streetwear com preço e tamanho: **coberto**.
- Variante não confirmada no modo WhatsApp: **coberta**.
- Variante esgotada: **bloqueada**.
- Produto sem variante/preço: **consulta sem dados inventados**.
- IMPÉRIO FIT: **número correto**.
- Sacolas de uma loja e mistas: **cobertas**.
- Mensagens e `encodeURIComponent`: **cobertos**.
- Checkout online: **permanece bloqueado**.

## 8. Pendências e ressalvas

- Os 42 produtos Supabase permanecem em `draft`; não foram publicados.
- O catálogo público continua local por padrão.
- Oito perfumes não possuem variante/volume confirmado no banco e permanecem fora da sacola.
- Os quatro produtos locais IMPÉRIO FIT ainda não possuem cadastro comercial/variantes confirmadas no Supabase e permanecem fora da sacola.
- A validação visual manual final em smartphones e desktop deve ser repetida no navegador do proprietário antes da publicação.
- Commit, push e deploy dependem de autorização específica.

## 9. Parecer V1

**PRONTO COM RESSALVAS.**

O bloqueador original da PDP foi corrigido: produtos com variantes comerciais reais agora permitem seleção, compra assistida direta pelo WhatsApp e inclusão na sacola sem liberar checkout transacional. Produtos ainda incompletos continuam acessíveis por consulta individual, com comunicação honesta e sem dados fictícios.
