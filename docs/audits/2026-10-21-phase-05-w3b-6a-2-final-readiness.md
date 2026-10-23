# BELLMONT — Fase 05.W3B.6A.2 — prontidão final

Data: 2026-10-21  
Projeto remoto: `qbedfcdarmgiytlqntpf`  
Parecer: **APTO COM RESSALVAS PARA PLANEJAR W3B.6B**

## Baseline remoto read-only

| Indicador | Resultado |
|---|---:|
| Produtos totais / comerciais | 48 / 47 |
| Streetwear / perfumes / Fitness | 20 / 22 / 5 |
| Comerciais draft / active | 47 / 0 |
| Fixture técnica | `archived`, não publicável |
| Variantes totais / comerciais | 96 / 94 |
| Imagens totais / comerciais | 58 / 57 |
| Estoque físico / reservado comercial | 1.200 / 0 |
| Movimentos comerciais | 80 |
| Pedidos / reservas | 0 / 0 |
| Catálogo anônimo | vazio |
| Migrations remotas | 12, sincronizadas até `20261020102806` |

IF-01 a IF-05 foram conferidos: todos `draft`, `INQUIRY_ONLY`, com preço e uma imagem vinculada; IF-05 é Conjunto Jasmim por R$ 240,00. Nenhum dado remoto foi alterado.

## Evidências produzidas

- Backup lógico e archive custom restaurados e conciliados em PostgreSQL 17.11 isolado.
- 57 imagens comerciais preservadas fora do repositório com hashes.
- Aceite dos oito perfumes sem volume registrado, sem inventar dados.
- Auditoria read-only de RLS, grants, funções administrativas e Security Advisor.
- Compilação explícita com catálogo local e com catálogo Supabase.

## Testes

- `npm test`: 86/86 aprovados.
- `npm run build`: aprovado.
- `npm run build:cloudflare` com fonte local: aprovado.
- `npm run build:cloudflare` com `VITE_PUBLIC_CATALOG_SOURCE=supabase`: aprovado.
- `git diff --check`: aprovado; apenas avisos de normalização LF/CRLF e perfil Git externo inacessível.

## Ressalvas e bloqueios restantes

1. A homologação visual mobile real não pôde ser concluída porque o navegador automatizado não alcança o localhost isolado. O checklist manual é obrigatório antes de publicação.
2. Leaked Password Protection permanece desabilitada e é recurso Pro+.
3. A RPC `public.is_current_user_admin()` continua sinalizada pelo Advisor por ser `SECURITY DEFINER` executável por `authenticated`; não há exploração confirmada, mas recomenda-se hardening separado.
4. O backup cobre banco e bytes comerciais do Storage, mas não secrets/configuração operacional integral da plataforma.
5. O frontend local continua com catálogo local por padrão; a produção não foi alterada.

## Conclusão

A integridade comercial, o backup restaurável, os objetos de Storage e a regressão automatizada estão comprovados. A fase não autoriza ativação, alteração de fonte em produção, commit, push ou deploy. A próxima etapa só deve avançar após homologação mobile manual e autorização específica para cada mutação remota.

