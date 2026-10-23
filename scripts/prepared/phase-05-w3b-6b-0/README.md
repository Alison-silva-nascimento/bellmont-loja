# Scripts preparados — Fase 05.W3B.6B.0

Status: **NÃO EXECUTADOS**. Destino futuro exclusivo: Supabase `qbedfcdarmgiytlqntpf`.

## Ordem futura autorizada

1. Confirmar o project ref pelo Dashboard/MCP/CLI e validar os hashes do backup `2026-10-21-pre-w3b6b`.
2. Executar `01-preflight.sql`. Ele usa transação read-only e falha se contagens, status, sales modes, fixture, estoque, RLS, grants, pedidos ou reservas divergirem.
3. Parar e solicitar autorização específica para ativação.
4. Executar somente `02-activate.sql`; a transação aceita exatamente 47 drafts ou 47 já ativos. Estado misto falha e reverte.
5. Executar imediatamente `03-verify.sql`; a validação é read-only e também simula `anon`.
6. Publicar frontend somente após uma autorização separada.

`04-rollback-to-draft.sql` é contingência e exige autorização adicional. Ele não apaga dados e só aceita os 47 todos ativos ou todos draft; estado misto é bloqueado.

## Limites de segurança

- As listas são fechadas: ST-01…ST-20, PF-01…PF-22 e IF-01…IF-05.
- `TEST-FIXTURE-01` deve permanecer `archived` e `DISABLED`.
- Os scripts não alteram preços, sales mode, variantes, imagens, estoque, movimentos, pedidos, reservas, RLS ou grants.
- O trigger existente poderá atualizar `updated_at` nos produtos cujo status mudar; esse é o único efeito colateral esperado.
- Não usar `supabase db push`, migration, seed ou execução em lote com outros arquivos.
- Credenciais e connection strings devem ser fornecidas somente no ambiente da sessão, nunca no repositório ou linha de comando registrada.

