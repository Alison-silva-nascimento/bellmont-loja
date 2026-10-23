# BELLMONT — Fase 05.W3B.6B.0A — Sacola unificada

Data: 2026-10-21  
Escopo: implementação local, sem alteração remota  
Parecer: **GO**

## Resultado

A sacola em modo `WHATSAPP_ONLY` agora aceita, de forma explícita e restrita:

- Streetwear BELLMONT em `ASSISTED_PURCHASE`, com variante real e os controles de disponibilidade já existentes.
- Perfumaria BELLMONT em `INQUIRY_ONLY`, sem exigir ou fabricar variante, volume, preço ou estoque.

Os dois grupos são consolidados em uma única mensagem destinada ao WhatsApp oficial da BELLMONT. Produtos IMPÉRIO FIT continuam fora da sacola e usam exclusivamente a consulta individual no WhatsApp da IMPÉRIO FIT.

## Regras implementadas

- A exceção não libera genericamente produtos `INQUIRY_ONLY`.
- Apenas produtos da categoria `perfumes`, da marca/loja BELLMONT, não técnicos e não explicitamente indisponíveis são elegíveis.
- Fixture técnica, Fitness, produto indisponível e qualquer item não elegível permanecem bloqueados.
- Perfumes são persistidos por ID estável e sem `variantId` fictício.
- Quantidades válidas são preservadas e limitadas a 99 quando não existe estoque confirmado; esse limite operacional não representa estoque.
- Produtos sem preço exibem `Valor sob consulta`.
- Produtos sem volume não exibem volume.
- Havendo preço ausente, o resumo informa `Subtotal dos itens com preço conhecido` e `Valor final sujeito à confirmação pelo WhatsApp`.
- A abertura do WhatsApp não cria pedido, reserva, movimentação ou pagamento e não limpa a sacola.

## Arquivos alterados nesta fase

- `src/types/cart.ts`
- `src/utils/cart.ts`
- `src/context/CartContext.tsx`
- `src/pages/CartPage.tsx`
- `src/pages/ProductPage.tsx`
- `src/components/commerce/QuickView.tsx`
- `src/utils/whatsappOrder.ts`
- `src/utils/cart.test.ts`
- `src/utils/whatsappOrder.test.ts`
- Os três relatórios desta fase.

## Segurança e preservação

- Nenhuma chamada de criação de pedidos ou reservas foi adicionada.
- Nenhuma escrita de estoque foi adicionada.
- Nenhuma migration, RLS, policy, grant ou dado do Supabase foi alterado.
- `sales_mode` dos perfumes permanece `INQUIRY_ONLY`.
- Checkout online permanece bloqueado.
- Nenhum segredo foi adicionado ao frontend.

## Parecer

**GO.** A implementação local atende à sacola unificada BELLMONT sem ampliar a elegibilidade para IMPÉRIO FIT ou para todo produto `INQUIRY_ONLY`.
