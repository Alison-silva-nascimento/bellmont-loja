# BELLMONT — Fase 05.W3B.6A — checklist de segurança

Data: 2026-10-21  
Projeto: `qbedfcdarmgiytlqntpf`  
Escopo: remoto somente leitura; nenhuma configuração foi alterada.

| Controle | Evidência | Resultado | Ação pré-ativação |
|---|---|---|---|
| Produtos `draft` invisíveis | consulta executada sob `anon`: produtos, variantes, imagens e RPC de disponibilidade retornaram 0 | APROVADO | ativar somente lote explicitamente aprovado |
| Fixture técnica | `TEST-FIXTURE-01`, `sales_mode=DISABLED`, fora do conjunto comercial | APROVADO | nunca mudar para `active` |
| RLS de produtos | SELECT público exige `status='active'`; escritas administrativas exigem `private.is_admin()` | APROVADO | preservar policies |
| RLS de variantes/imagens | leitura pública exige pai ativo; variante também precisa estar ativa | APROVADO | preservar policies |
| Inventário | `anon` sem grant; `authenticated` possui grants de tabela, mas RLS restringe escrita/leitura a admin | APROVADO | não ampliar grants/policies |
| Movimentos | leitura e escrita protegidas por fluxo administrativo/transacional | APROVADO | preservar ledger imutável |
| Pedidos/reservas | zero registros; RLS de proprietário/admin | APROVADO | modo WhatsApp não chama RPCs transacionais |
| Disponibilidade pública | RPC retorna somente código, SKU, booleano e status; sem quantidades | APROVADO | manter schema interno fora da Data API |
| `INQUIRY_ONLY` | bloqueio central de sacola testado; não depende só do botão | APROVADO | preservar `sales_mode` no frontend e banco |
| WhatsApp | BELLMONT `556493026564`; IMPÉRIO FIT `556492659825`; envio não cria pedido/reserva/baixa | APROVADO | manter `WHATSAPP_ONLY` |
| `is_current_user_admin()` | `SECURITY DEFINER`, `search_path=''`, EXECUTE somente `authenticated`; retorna booleano | RESSALVA MÉDIA | reduzir superfície pública em fase dedicada, com reteste de Admin |
| Senhas vazadas | Security Advisor: proteção desabilitada | RESSALVA MÉDIA | habilitar no Dashboard em autorização separada e testar Auth |
| Data API | grants explícitos atuais: `anon` tem SELECT em produtos/variantes/imagens; RLS continua decisiva | APROVADO ATUAL | registrar grants explicitamente em toda migration futura após 30/10/2026 |
| Storage | bucket público limitado a JPEG/PNG/WebP e 5 MiB; uploads/escritas exigem admin e path canônico | APROVADO | não alterar policies; manter bytes fora do dump lógico |
| Integridade Storage | 58 vínculos e 58 objetos; 0 ausentes, órfãos, paths duplicados, MIME/tamanho inválidos | APROVADO | novo backup deve documentar hashes/bytes separadamente |
| Imagens Fitness | hashes remotos coincidem com W3B.5E; uma capa primária por produto | APROVADO | preservar objetos e vínculos |
| Segredos Git | `.env.local` ignorado e não rastreado; 0 atribuições sensíveis não vazias em arquivos rastreados | APROVADO | nunca versionar credenciais de teste/admin |
| Bundle | nenhum segredo real; literal `sb_secret_` é somente detector interno do SDK Supabase | APROVADO | repetir varredura no artefato final |
| Fallback de catálogo | Supabase vazio/erro não cai silenciosamente para catálogo local | APROVADO | produção deve definir explicitamente a fonte Supabase |
| Fonte Cloudflare | `.env.local` auditado usa `local`; não foi comprovada variável externa do projeto Cloudflare | BLOQUEADOR OPERACIONAL | antes do deploy, configurar/verificar `VITE_PUBLIC_CATALOG_SOURCE=supabase` no ambiente de build |

## Advisors

- Segurança: proteção contra senhas vazadas desabilitada; função pública `SECURITY DEFINER` executável por `authenticated`; tabelas internas sem policy permanecem deny-by-default.
- Performance: 11 FKs sem índice, 23 índices ainda não utilizados e três conjuntos de policies permissivas múltiplas em SELECT. São oportunidades de performance, não vazamentos confirmados nem bloqueadores imediatos do catálogo.
- A mudança da Data API anunciada para 30/10/2026 não remove grants existentes. Ela exige grants explícitos para novas tabelas/funções; RLS continua independente e obrigatória.

## Parecer de segurança

Não foi confirmada exposição de dados privados nem escrita pública. A ativação comercial permanece condicionada à fonte Supabase explícita no build, novo backup pós-Fitness e aceite das duas ressalvas de Auth.
