# BELLMONT — 05.W3B.6A.2 — auditoria de segurança

Data: 2026-10-21  
Modo: remoto read-only

## Controles confirmados

- Projeto `qbedfcdarmgiytlqntpf` está `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002.
- As 12 migrations locais aplicáveis constam no histórico remoto; a última é `20261020102806_phase_05_w3b_1_product_sales_mode`. Não há migration pendente conhecida.
- RLS está habilitada e forçada em products, product_variants, product_images, inventory, inventory_movements, orders e inventory_reservations.
- `anon` tem apenas `SELECT` em products, product_variants e product_images; com as policies atuais, o catálogo anônimo retorna zero porque não há produto `active`.
- `anon` não recebeu `USAGE` no schema administrativo `private` e não possui grants nas tabelas de inventário, movimentos, pedidos ou reservas.
- `public.is_current_user_admin()` e `private.is_admin()` pertencem a `postgres`, são `STABLE SECURITY DEFINER` e têm `search_path` vazio. O wrapper público exige identidade autenticada e consulta a allowlist privada.
- Nenhum segredo administrativo foi colocado no bundle; a integração usa apenas URL/chave publicável.

## Findings do Security Advisor

| Severidade | Finding | Avaliação |
|---|---|---|
| WARN | Leaked Password Protection desabilitada | Confirmado. O recurso é Pro+; não foi habilitado nesta fase. Compensar com senha forte, MFA da conta/organização e futura reavaliação de plano. |
| WARN | authenticated executa `public.is_current_user_admin()` SECURITY DEFINER | Exposição intencional do predicado booleano, mas merece hardening futuro para reduzir superfície RPC. Não houve evidência de elevação de privilégio. |
| INFO | RLS sem policy em duas tabelas privadas de batch e `payment_webhook_events` | Fail-closed; não concede acesso. Manter documentado e revisar quando houver fluxo público legítimo. |

Grants amplos de `authenticated` em tabelas administrativas continuam limitados por RLS forçada e policies administrativas. A defesa é efetiva, mas privilégios de tabela podem ser reduzidos numa migration futura auditada; nenhuma alteração remota foi feita agora.

## Parecer

Sem vulnerabilidade crítica confirmada nesta leitura. Permanecem duas pendências de segurança pré-produção: proteção de senhas vazadas indisponível no plano atual e revisão/hardening da RPC pública de verificação administrativa. Isso não autoriza alteração de Auth, grants ou policies.

