# BELLMONT — Fase 05.W2 — Auditoria final pré-publicação

Data da verificação: 19/20 de outubro de 2026 (America/Sao_Paulo)  
Workspace: `C:\DEV PARTICULAR\BELLMONT LOJA`  
Supabase: `qbedfcdarmgiytlqntpf`  
Modo: somente leitura, exceto este relatório e sua matriz CSV.

## 1. Parecer executivo

| Área | Parecer | Motivo principal |
|---|---|---|
| Frontend | **PRONTO COM RESSALVAS** | Testes e builds passam; alterações ainda não estão versionadas; inspeção mobile completa deve ser repetida no artefato final. |
| Catálogo | **BLOQUEADO** | A fonte Cloudflare ainda não foi decidida; Supabase retorna vazio porque os 42 produtos comerciais estão em `draft`; fonte local exibe 46 itens, inclusive 4 Fitness ausentes do Supabase. |
| Segurança | **PRONTO COM RESSALVAS** | RLS/grants efetivos protegem dados privados; há avisos do Advisor e proteção contra senhas vazadas desativada. |
| Cloudflare | **PRONTO COM RESSALVAS** | Build Cloudflare e fallback SPA funcionam; projeto/domínio/variáveis ainda precisam ser configurados e verificados no painel. |
| Publicação comercial geral | **BLOQUEADO** | Falta aprovação explícita do conjunto publicável e escolha da fonte; não se deve ativar automaticamente os 42 drafts. |

Não houve commit, push, deploy, migration ou alteração remota. Nenhum produto, preço, variante, inventário, pedido ou reserva foi alterado.

## 2. Evidências técnicas

- Repositório local: branch `main`, commit `09b2e5987a67651611e230f8792583b37b1fd604`.
- `git ls-remote origin refs/heads/main`: o mesmo hash; não existe divergência de commits entre a `main` local e remota neste instante.
- Há dezenas de mudanças locais não commitadas e arquivos novos. Elas incluem todo o trabalho das fases Supabase, catálogo, sacola, WhatsApp e interface. Não há arquivos staged.
- `.env.local` está ignorado por `.gitignore` e não é rastreado.
- Variáveis presentes localmente, sem registrar valores: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PUBLIC_CATALOG_SOURCE`.
- A fonte configurada no localhost auditado é **`local`**. Isso explica a presença de produtos na inspeção visual.
- O modo comercial está fixo em `WHATSAPP_ONLY`; `ONLINE_CHECKOUT_AVAILABLE` é `false`, e `/checkout/*` redireciona para `/sacola`.

## 3. Estado real do catálogo

### 3.1 Supabase

Consulta remota read-only confirmou:

- 43 fichas totais: 42 comerciais + `TEST-FIXTURE-01` arquivada.
- 42 comerciais em `draft`; 0 comerciais `active`.
- 20 Streetwear, 22 Perfumaria e 0 Fitness.
- 96 variantes totais; 94 comerciais (80 Streetwear + 14 Perfumaria) e 2 da fixture.
- 53 imagens totais; 52 comerciais e 1 da fixture.
- 82 linhas de inventário: 80 comerciais e 2 da fixture.
- Streetwear: 1.200 unidades físicas, 0 reservadas, 15 por tamanho P/M/G/GG para cada um dos 20 modelos.
- Perfumaria: nenhum estoque físico/reservado confirmado.
- 84 movimentos: 80 comerciais do lote inicial e 4 da fixture.
- 0 pedidos, 0 itens, 0 reservas, 0 pagamentos e 0 remessas.

O catálogo público Supabase fica vazio corretamente: a consulta exige `status = active` e as policies públicas também limitam produtos, imagens e variantes a produtos ativos. Não existe fallback para drafts.

### 3.2 Catálogo local

`src/data/products.ts` contém 46 produtos visíveis: os mesmos 20 Streetwear e 22 perfumes, mais 4 itens IMPÉRIO FIT que não existem no Supabase. `normalizeLocalCatalogIdentities()` mapeia IDs legados para códigos `ST-*`/`PF-*`; Fitness continua apenas com IDs locais.

Em `WHATSAPP_ONLY`, `prepareLocalCatalogForAssistedCommerce()` adiciona apenas opções previamente confirmadas:

- Streetwear: P, M, G e GG, com cor por modelo.
- 14 perfumes: volume confirmado.
- 8 perfumes: nenhuma variante/volume fabricado.
- Fitness: nenhuma variante inventada.

### 3.3 Fonte de verdade e risco de produção

1. **Fonte de verdade transacional:** Supabase.
2. **Fonte visual atual do localhost:** catálogo local, porque `.env.local` define `VITE_PUBLIC_CATALOG_SOURCE=local`.
3. **Fonte no Cloudflare:** dependerá da variável de build. Ausente ou `local` usa `products.ts`; `supabase` usa somente produtos ativos do banco.
4. **Se publicar com Supabase hoje:** o catálogo ficará vazio.
5. **Se publicar com local hoje:** os 46 itens aparecerão, inclusive quatro Fitness não cadastrados no banco, e o site operará apenas como atendimento assistido por WhatsApp.
6. **Risco de duplicação:** baixo dentro de uma única fonte, mas a troca de fonte preserva IDs/aliases na sacola e pode revalidar ou preservar itens; não há merge simultâneo das fontes.

Decisão obrigatória: aprovar explicitamente uma V1 local/WhatsApp ou aprovar uma lista de produtos para ativação controlada no Supabase. Não combinar as duas opções implicitamente.

## 4. Matriz de liberação

A matriz completa está em [2026-10-19-phase-05-w2-product-release-matrix.csv](./2026-10-19-phase-05-w2-product-release-matrix.csv).

Resumo:

- 20 Streetwear: tecnicamente **APTO PARA PUBLICAÇÃO**, com preços, imagens, variantes e estoque consistentes; autorização comercial/status `active` continua pendente.
- 14 perfumes com volume: **APTO SOMENTE PARA CONSULTA**, pois não há estoque confirmado.
- 8 perfumes sem variante confirmada (`PF-05`, `PF-07`, `PF-09`, `PF-14`, `PF-17`, `PF-19`, `PF-20`, `PF-22`): **APTO SOMENTE PARA CONSULTA**, sem inventar volume.
- 4 IMPÉRIO FIT locais: **APTO SOMENTE PARA CONSULTA** se a exibição e os preços forem aprovados; **BLOQUEADO** para uma publicação Supabase porque não existem no banco e não têm variantes/estoque confirmados.
- Fixture técnica: sempre bloqueada e invisível ao catálogo.

Prontidão técnica não equivale a autorização comercial. Nenhuma classificação autoriza mudar `draft` para `active`.

## 5. Fluxos WhatsApp

Contatos no código:

- BELLMONT/Streetwear/Perfumaria: `https://wa.me/556493026564`.
- IMPÉRIO FIT/Fitness: `https://wa.me/556492659825`.
- Grupo: `https://chat.whatsapp.com/JfzL6Si7kEtBvKaEjTT4OM`, usado apenas para comunidade.
- Instagram BELLMONT e IMPÉRIO FIT apontam para as contas informadas.

Resultados:

- A propriedade comercial é determinada centralmente por categoria/marca, não pelo texto da tela.
- Sacolas Streetwear, Perfumaria, Fitness e combinações mistas têm cobertura automatizada.
- Sacola mista gera mensagens separadas por loja.
- Mensagens incluem produto, variante real, quantidade, preço conhecido, subtotal e ressalvas de disponibilidade/frete/pagamento.
- URLs usam `encodeURIComponent`; o grupo não recebe pedidos.
- Abrir WhatsApp não limpa a sacola e não cria pedido, reserva, pagamento ou movimento.
- Variante explicitamente esgotada é bloqueada.
- No modo assistido, estoque desconhecido permite selecionar até 99 unidades para **consulta**, com confirmação posterior. Isso não baixa estoque, mas é uma ressalva de UX/comercial: a quantidade não é promessa de disponibilidade.
- Perfume/Fitness sem variante não entra na sacola; a PDP oferece consulta individual pelo WhatsApp sem fabricar opção.

## 6. Supabase e segurança

### 6.1 Estado e migrations

Projeto `BELLMONT E-commerce`, região `sa-east-1`, PostgreSQL 17.11, estado saudável. Onze migrations remotas estão registradas até `20261018082521_phase_05_2c_1_reservation_authorization_remediation`; o histórico observado é compatível com os arquivos locais relevantes.

### 6.2 RLS, grants e exposição

- Tabelas públicas comerciais/transacionais têm RLS forçada.
- `anon` possui `SELECT` de `products`, `product_variants` e `product_images`; RLS limita a produtos ativos.
- `anon` não possui acesso a inventário exato, movimentos, pedidos, reservas ou schemas administrativos.
- `authenticated` tem grants de tabela necessários ao Admin, mas policies exigem allowlist administrativa ou propriedade do cliente conforme o objeto.
- `private` não concede `USAGE` a `anon`; `authenticated` não tem grants diretos de tabela no schema.
- A helper de disponibilidade fica em `availability_private`; a RPC pública expõe apenas código do produto, SKU, booleano e status, nunca quantidades.
- Funções transacionais privadas usam autorização interna e `search_path` seguro; wrappers públicos não são executáveis por `anon` quando a operação é administrativa.
- Constraints e funções atômicas preservam estoque não negativo e reservas não superiores ao físico.
- O frontend usa apenas URL e chave publicável; não há `service_role`, `sb_secret_`, senha de banco ou credencial administrativa no bundle.

O modelo está alinhado ao princípio do Supabase de combinar privilégios de tabela com RLS: um `GRANT` sozinho não ignora a policy. Chaves publicáveis podem estar no browser quando RLS está correto; secret/service-role não podem.

### 6.3 Advisors

Pendências importantes:

1. **WARN — proteção de senha vazada desabilitada.** Habilitar antes de ampliar o uso de Auth/Admin.
2. **WARN — `public.is_current_user_admin()` é `SECURITY DEFINER` executável por `authenticated`.** O uso atual é intencional para o guard do Admin e retorna somente o estado do próprio usuário, mas deve ser formalmente aceito ou redesenhado fora do schema exposto.
3. **INFO — RLS sem policy** em `private.inventory_batches`, `private.inventory_batch_operations` e `public.payment_webhook_events`. O efeito atual é deny-all para acesso direto; documentar como intencional.
4. **Performance — 11 FKs sem índice**, três grupos de policies permissivas duplicadas para leitura autenticada e 23 índices ainda não utilizados. Não bloqueiam a V1 WhatsApp, mas devem ser revisados antes de volume transacional.

Nota de plataforma: a mudança anunciada pelo Supabase para 30/10/2026 endurece exposição automática da Data API em projetos novos/alterados. Este projeto deve manter schemas expostos explicitamente revisados; remover a especificação OpenAPI anônima não impede consultas REST normais.

## 7. Checkout online futuro

| Componente | Estado |
|---|---|
| Schema de pedidos/itens/endereços/pagamentos/remessas/histórico | Implementado no banco, vazio |
| Reservas de inventário | Implementado, vazio |
| Motor atômico, idempotência, concorrência e validação server-side | Implementado/testado por migrations e testes SQL prévios |
| Proteção de preço no servidor | Implementada na estrutura transacional |
| Edge Functions | Ausente (0 funções implantadas) |
| Pix e cartão | Ausentes |
| Webhooks de pagamento | Tabela preparada; integração ausente |
| Frete | Ausente |
| Cancelamento/expiração | Estrutura parcial no motor SQL; fluxo de produto/operacional não concluído |
| Painel de pedidos | Ausente |
| Histórico de compras no frontend | Ausente |

Conclusão: checkout online permanece **indisponível** e não deve ser liberado por variável ou ocultação visual. O guard de rota atual bloqueia `/checkout/*` em `WHATSAPP_ONLY`.

## 8. Cloudflare Pages

Configuração recomendada, não executada:

| Campo | Valor |
|---|---|
| Projeto | `bellmont-loja` (confirmar disponibilidade no painel) |
| Branch de produção | `main` |
| Preset | Vite |
| Root directory | `/` |
| Build command | `npm run build:cloudflare` |
| Output | `dist` |
| Base Vite | `/` no modo `cloudflare` |
| SPA fallback | `public/_redirects`: `/* /index.html 200` |
| Domínio inicial | `bellmont-loja.pages.dev` |
| Domínio final | `bellmontloja.com.br` após smoke test e DNS |

Variáveis:

| Nome | Finalidade | Obrigatória | Sensibilidade | Consequência se ausente |
|---|---|---|---|---|
| `VITE_PUBLIC_CATALOG_SOURCE` | `local` ou `supabase` | Opcional | Pública | Assume `local` |
| `VITE_SUPABASE_URL` | Endpoint do projeto | Para Admin/Supabase | Pública | Cliente Supabase não configurado |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Acesso público sujeito a RLS | Para Admin/Supabase | Pública, não secreta | Cliente Supabase não configurado |

Nenhuma variável `VITE_*` deve conter segredo. O build padrão usa base `/bellmont-loja/` para GitHub Pages; o build Cloudflare usa `/`. Usar o comando errado quebrará assets/rotas no destino correspondente.

## 9. Interface e responsividade

Evidência real desta auditoria:

- Browser local em 1280×720, viewport útil 1265 px: `scrollWidth === clientWidth` (sem overflow horizontal).
- Home carregou hero, New Drop, grupo oficial, Streetwear, IMPÉRIO FIT, Perfumaria, banner desktop e footer.
- Cards, favoritos, Quick View, links de PDP e contatos estavam presentes na árvore de acessibilidade.
- O banner `ESCOLHA A PEÇA. VISTA A ATITUDE.` estava presente no desktop, como esperado.
- Sacola persistida mostrou 2 itens no header, confirmando hidratação local.

Limitação: o controlador disponível não permitiu redimensionar o viewport nesta execução. Portanto, não se declara uma nova aprovação visual completa em 320/360/375/390/430/768/1024 px. CSS e testes anteriores cobrem os breakpoints, mas é obrigatória uma rodada manual/Playwright no build final antes do deploy. Esta é pendência importante, não evidência de defeito.

Observação: a inspeção visual usou catálogo local. O estado vazio Supabase foi confirmado pela consulta remota e pela lógica, não por uma segunda captura visual nesta rodada.

## 10. Testes e integridade do repositório

- `npm test`: **81/81 aprovados**.
- `npm run build`: **aprovado**; bundle principal ~469 kB bruto / 145 kB gzip.
- `npm run build:cloudflare`: **aprovado** quando executado isoladamente. A primeira tentativa concorrente com outro build falhou ao limpar `dist` (`EPERM`), caracterizando disputa entre builds, não falha do código.
- `npm audit --omit=dev`: **0 vulnerabilidades**.
- `git diff --check`: **aprovado**.
- Não há script `lint`; TypeScript é validado por `tsc -b` nos dois builds.
- Scan de bundle: nenhum marcador `service_role`, `sb_secret_` ou credencial de teste.
- Referências textuais a `service_role`/`sb_secret_` em arquivos rastreados são proibições/documentação/configuração local do Supabase, não valores de segredo.

## 11. Bloqueadores

### B1 — Fonte e conjunto publicável não aprovados

- Evidência: local = 46 itens; Supabase = 42 drafts e nenhum ativo.
- Impacto: catálogo vazio em modo Supabase ou publicação de itens locais sem status/autorização remota.
- Solução: escolher explicitamente V1 local/WhatsApp ou uma lista de ativação Supabase.
- Critério: decisão assinada, matriz revisada e teste do artefato com a variável final.

### B2 — Alterações da aplicação ainda não versionadas

- Evidência: working tree extensa, incluindo arquivos novos e migrations já aplicadas remotamente, enquanto `origin/main` continua no commit antigo.
- Impacto: Cloudflare conectado ao GitHub não receberá o site auditado.
- Solução: revisão final, commit/push autorizado e confirmação do build exato.
- Critério: árvore limpa, hash auditado e deploy a partir desse hash.

### B3 — Autorização comercial dos produtos

- Evidência: todos os 42 registros remotos permanecem `draft`; Fitness existe só localmente.
- Impacto: não há autorização técnica para ativação ou publicação ampla.
- Solução: cliente aprovar produto a produto, sobretudo Fitness e perfumes sem volume/estoque.
- Critério: lista aprovada sem alterar dados implicitamente.

## 12. Pendências importantes

1. Habilitar/avaliar proteção contra senhas vazadas no Supabase Auth.
2. Formalizar aceitação do RPC `is_current_user_admin()` exposto a `authenticated` ou planejar isolamento.
3. Executar inspeção real nos sete viewports solicitados e smoke test de PDP/sacola mista no artefato final.
4. Confirmar o projeto Pages, variáveis Preview/Production e propriedade de `bellmontloja.com.br`.
5. Revisar política de quantidade assistida: estoque desconhecido hoje aceita até 99 para cotação, sem promessa de venda.
6. Confirmar que preços/imagens dos quatro Fitness podem ser exibidos publicamente.
7. Definir política jurídica mínima (privacidade/informações legais ainda aparecem como “em breve”).

## 13. Melhorias futuras

- Índices para FKs antes de carga transacional.
- Revisão de policies permissivas duplicadas.
- Code splitting adicional do bundle público.
- Monitoramento/observabilidade e páginas legais completas.
- Edge Functions, gateway de pagamento, webhooks, frete, painel de pedidos e histórico antes do checkout online.

## 14. Plano de liberação controlada

1. Cliente revisa a matriz CSV e aprova nomes, preços, imagens, variantes e exibição por produto.
2. Escolher uma única estratégia V1:
   - **A — Local/WhatsApp:** publicar `products.ts`, sem operações transacionais; aprovar explicitamente os 46 itens.
   - **B — Supabase:** ativar em lote controlado apenas produtos aprovados; Fitness ficará ausente até ser cadastrado.
3. Reexecutar testes, builds, scan de segredos e auditoria dos sete viewports.
4. Autorizar commit e push; registrar o hash.
5. Criar/configurar Cloudflare Pages com `npm run build:cloudflare`, `dist`, root `/` e variáveis decididas.
6. Publicar primeiro em `bellmont-loja.pages.dev`.
7. Smoke test: Home, listagens, busca, favoritos, PDP, variantes, sacola, roteamento misto de WhatsApp, refresh direto, Admin e estados vazios.
8. Se falhar, rollback do deploy para o hash anterior; não alterar estoque/status como resposta automática.
9. Após aprovação, conectar `bellmontloja.com.br`, validar HTTPS/DNS e repetir smoke test.
10. Manter checkout online bloqueado até fase específica.

## 15. Conclusão

O frontend e a infraestrutura de segurança estão tecnicamente próximos da V1 WhatsApp, mas **a publicação comercial está BLOQUEADA** até que a fonte de catálogo e o conjunto publicável sejam aprovados. A opção de menor risco operacional é uma V1 explicitamente aprovada com fonte local e atendimento WhatsApp, seguida de migração/ativação controlada no Supabase; porém essa opção exige aceitar que Fitness ainda não possui equivalentes remotos e que estoque desconhecido é apenas consulta.

Referências oficiais consideradas:

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Segurança da Data API: https://supabase.com/docs/guides/api/securing-your-api
- Chaves publicáveis e secretas: https://supabase.com/docs/guides/getting-started/api-keys
- Ambientes e migrations: https://supabase.com/docs/guides/deployment/managing-environments
- Breaking changes: https://supabase.com/changelog?types=breaking-change
