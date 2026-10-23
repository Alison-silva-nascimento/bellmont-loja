# BELLMONT + IMPÉRIO FIT — 05.W3B.6B.0 — release readiness

Data: 2026-10-21  
Parecer: **GO COM RESSALVAS**

## Resposta executiva

1. **O site está pronto para ativação?** Tecnicamente preparado, mas a execução permanece condicionada à homologação visual humana e autorização específica.
2. **Existe bloqueador de segurança?** Nenhum bloqueador comprovado para catálogo público em `WHATSAPP_ONLY`. Há hardening recomendado da RPC administrativa e proteção de senha vazada dependente de plano.
3. **A homologação mobile foi concluída?** Não. A automação local foi bloqueada pelas políticas/isolamento dos navegadores; o checklist offline foi entregue.
4. **Quantos testes passaram?** 86/86 na execução final desta fase.
5. **O backup permanece válido?** Sim. Não houve escrita remota desde sua validação e as leituras atuais mantêm o baseline.
6. **Os 47 produtos estão preparados?** Sim: lista fechada, 20/22/5, modalidades 20/27 e scripts fail-safe preparados.
7. **A fixture continuará oculta?** Sim. Os scripts exigem `TEST-FIXTURE-01` archived/DISABLED e nunca a atualizam.
8. **O Cloudflare está preparado?** O build e o runbook estão preparados; a existência/configuração do projeto externo ainda precisa ser confirmada no Cloudflare.
9. **O que falta para publicar esta semana?** Aprovar checklist mobile, autorizar ativação, validar pós-ativação, confirmar/configurar Cloudflare, autorizar deploy e executar smoke test.
10. **Próxima ação que exige autorização:** após o proprietário concluir o checklist mobile, autorizar explicitamente a execução do preflight read-only e, em uma autorização separada, a ativação dos 47 produtos.

## Estado remoto confirmado nesta fase

- Projeto correto e saudável; 12 migrations sincronizadas.
- 48 registros, 47 comerciais todos draft e zero active.
- Fixture archived/DISABLED.
- RLS forçada nas sete tabelas críticas.
- `anon`: somente SELECT nas três tabelas do catálogo.
- Estoque 1.200/0; zero pedidos/reservas.

## Entregáveis

- Decisão de segurança.
- Resultado e limitação da homologação mobile.
- Checklist HTML offline com persistência/exportação.
- Runbook de ativação, Cloudflare, smoke test e recuperação.
- Quatro scripts SQL e README em `scripts/prepared/phase-05-w3b-6b-0/`, todos não executados.

## Validação final

- `npm test`: 86/86 aprovados.
- `npm run build`: aprovado.
- `npm run build:cloudflare` com `VITE_PUBLIC_CATALOG_SOURCE=supabase`: aprovado.
- Listas fechadas dos scripts: 47/47 códigos únicos.
- Checklist HTML: JavaScript validado sintaticamente.
- `git diff --check`: aprovado; somente avisos ambientais de LF/CRLF e perfil Git externo.

## Ressalvas que impedem publicação imediata

1. Homologação visual humana ainda não concluída.
2. Cloudflare externo não confirmado/configurado nesta fase.
3. Ativação e deploy ainda não autorizados.

## Ressalvas pós-release

- Reavaliar leaked-password protection/plano e MFA.
- Planejar hardening versionado de `is_current_user_admin()`.
- Reduzir grants autenticados onde possível, mantendo RLS.

Nenhum produto foi ativado; não houve alteração remota, commit, push ou deploy.

