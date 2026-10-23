# BELLMONT — Fase 05.W3B.6B.0A — Resultados dos testes

Data: 2026-10-21  
Parecer: **GO**

## Testes automatizados

- `npm test`: **99/99 aprovados**.
- Foram acrescentados 15 cenários focados nesta fase, distribuídos entre `cart.test.ts` e `whatsappOrder.test.ts`.

Cobertura específica:

1. Streetwear assistido continua elegível com variante.
2. Perfume BELLMONT entra sem variante.
3. Perfume sem preço entra sem total inventado.
4. Perfume sem volume não ganha volume fictício.
5. Opções artificiais em perfume são rejeitadas.
6. Adições repetidas consolidam a linha estável.
7. Quantidade pode ser alterada e o item removido.
8. Persistência restaura perfume sem variante.
9. Streetwear e perfume coexistem.
10. Subtotal soma somente preços conhecidos.
11. Mensagem única contém todos os itens BELLMONT.
12. Fitness é excluído da sacola e da mensagem BELLMONT.
13. Fixture técnica é bloqueada.
14. Produto explicitamente indisponível é bloqueado.
15. Perfume continua bloqueado no checkout online.

## Builds e integridade

- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado**.
- `git diff --check`: **aprovado**, sem erros; apenas avisos informativos de conversão LF/CRLF do Git no Windows.

## Efeitos transacionais

Os testes exercitam funções puras e a interface local. Não houve conexão de escrita com o Supabase, criação de pedido, reserva, alteração de inventário ou movimentação de estoque.

## Parecer

**GO.** Não foi encontrada regressão automatizada na suíte existente nem nos cenários comerciais acrescentados.
