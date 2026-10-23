# BELLMONT — 05.W3B.6A.2 — plano de ativação futura

Data: 2026-10-21  
Estado: planejamento; nenhuma ativação autorizada

## Pontos de parada

1. **Go/no-go:** conferir hashes do backup W3B.6A.2, projeto/ref, 47 comerciais em `draft`, 1.200/0 no inventário e zero pedidos/reservas.
2. **Homologação mobile:** concluir checklist real nos cinco viewports e registrar aceite visual.
3. **Segurança:** aceitar formalmente os riscos residuais ou aprovar uma fase separada de hardening; nenhuma correção improvisada durante ativação.
4. **Lote de ativação:** preparar SQL/manifesto imutável contendo somente os códigos comerciais aprovados. Excluir `TEST-FIXTURE-01`.
5. **Autorização específica:** obter autorização para atualizar apenas `status`; não misturar imagens, preços, variantes, estoque, grants ou migrations.
6. **Ativação controlada:** ativar em transação/lote auditável. Primeiro os 39 sem ressalva; os oito perfumes somente com o aceite comercial deste dossiê incorporado. Os cinco Fitness permanecem `INQUIRY_ONLY`.
7. **Validação imediata:** conferir 47 ativos esperados, 20/22/5, sales modes 20 `ASSISTED_PURCHASE` e 27 `INQUIRY_ONLY`, 57 imagens, inventário 1.200/0, zero novos movimentos/pedidos/reservas.
8. **Leitura pública:** testar anon products/variants/images/availability e confirmar que nenhuma quantidade exata ou fixture é exposta.
9. **Frontend:** somente após autorização separada, configurar produção com `VITE_PUBLIC_CATALOG_SOURCE=supabase`, manter `WHATSAPP_ONLY`, build Cloudflare e smoke test.
10. **Publicação:** commit/push/deploy exigem autorização própria e ficam fora deste plano.

## Interrupção e recuperação

Interromper se houver divergência de hash, contagem, status, sales mode, imagem, estoque, migration, RLS/grant ou se surgir pedido/reserva. Não executar rollback destrutivo automático. Preservar evidências, bloquear novas escritas e avaliar restauração em ambiente isolado antes de qualquer ação no comercial.

