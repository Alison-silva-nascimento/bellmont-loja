# BELLMONT — 05.W3B.6B.0 — decisão final de segurança

Data: 2026-10-21  
Projeto remoto: `qbedfcdarmgiytlqntpf`  
Modo: read-only

| Controle | Classificação | Evidência e decisão |
|---|---|---|
| Proteção contra senhas vazadas | MELHORIA PÓS-RELEASE | O Advisor confirma que está desabilitada. O risco se concentra no login administrativo, não na leitura anônima do catálogo. A documentação atual informa que o recurso é Pro+. Compensar com senha exclusiva forte, MFA da conta/organização, sessões curtas e reavaliar o plano. |
| `public.is_current_user_admin()` | CORREÇÃO RECOMENDADA ANTES DO RELEASE, NÃO BLOQUEADORA | É `SECURITY DEFINER`, owner `postgres`, `search_path=''`, executável por `authenticated` e não por `anon`. O retorno é um predicado booleano e a função exige usuário allowlisted; nenhuma elevação foi demonstrada. O Advisor recomenda reduzir a superfície em uma migration futura, nunca como hotfix durante ativação. |
| Helper `private.is_admin()` | SEM PROBLEMA IDENTIFICADO | `private` não concede `USAGE` a `anon`; somente autenticados alcançam o helper, e a autorização depende da allowlist privada. |
| RLS | SEM PROBLEMA IDENTIFICADO | RLS habilitada e forçada nas sete tabelas comerciais/transacionais críticas. Tabelas sem policy sinalizadas pelo Advisor permanecem fail-closed. |
| Grants anônimos | SEM PROBLEMA IDENTIFICADO | `anon` possui somente `SELECT` em products, product_variants e product_images. Não possui grants em estoque, movimentos, pedidos ou reservas. |
| Data API | SEM PROBLEMA IDENTIFICADO COM A CONFIGURAÇÃO ATUAL | Grants definem objetos alcançáveis e RLS define linhas visíveis. Antes da ativação, o catálogo retorna zero; após ativação, somente produtos `active` e vínculos permitidos devem aparecer. |
| Chave publicável no frontend | SEM PROBLEMA IDENTIFICADO | A chave publicável é apropriada ao navegador quando combinada com RLS e menor privilégio. Ela não é tratada como segredo. |
| `service_role`, `sb_secret_` ou senha no frontend | SEM PROBLEMA IDENTIFICADO | Nenhum desses valores é requerido pela arquitetura pública ou pelos scripts preparados. A varredura dos entregáveis não encontrou atribuições sensíveis. |
| Storage público de imagens | SEM PROBLEMA IDENTIFICADO | Leitura pública é deliberada para mídia comercial; upload, edição e exclusão continuam sujeitos às policies administrativas. |

## Procedimento futuro para leaked-password protection

1. Confirmar plano elegível e janela de mudança.
2. Dashboard Supabase → Authentication → Providers/Password security.
3. Habilitar proteção contra senhas vazadas sem alterar outros providers.
4. Testar com identidade administrativa de teste autorizada: senha comprometida deve ser recusada; senha forte deve funcionar.
5. Reexecutar Security Advisor e registrar evidência.

Não usar usuário real nem armazenar senha no repositório. Nenhuma configuração Auth foi alterada nesta fase.

## Decisão

**Não existe bloqueador de segurança comprovado para o catálogo público em modo `WHATSAPP_ONLY`.** Há um hardening recomendado da RPC administrativa e uma melhoria de Auth dependente de plano. Ambos devem ser acompanhados, mas não justificam alteração improvisada antes da entrega.

Referências oficiais:

- https://supabase.com/docs/guides/database/secure-data
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/auth/password-security

