# BELLMONT + IMPÉRIO FIT — Fase 05.W3B.6B.1 — Preflight final read-only

Data da auditoria: 2026-10-21 (America/Sao_Paulo)  
Projeto remoto: `qbedfcdarmgiytlqntpf` — BELLMONT E-commerce  
Região: `sa-east-1`  
PostgreSQL: `17.11.0.002`  
Estado: `ACTIVE_HEALTHY`  
Classificação: **GO COM RESSALVAS**

## 1. Baseline remoto

O estado foi consultado diretamente por SQL read-only, sem depender apenas das auditorias históricas.

| Controle | Esperado | Observado | Resultado |
|---|---:|---:|---|
| Produtos totais | 48 | 48 | OK |
| Produtos comerciais | 47 | 47 | OK |
| Comerciais em `draft` | 47 | 47 | OK |
| Comerciais ativos | 0 | 0 | OK |
| Streetwear | 20 | 20 | OK |
| Perfumes | 22 | 22 | OK |
| IMPÉRIO FIT | 5 | 5 | OK |
| Variantes comerciais | 94 | 94 | OK |
| Imagens comerciais | 57 | 57 | OK |
| Estoque físico comercial | 1.200 | 1.200 | OK |
| Estoque reservado | 0 | 0 | OK |
| Movimentos comerciais | 80 | 80 | OK |
| Pedidos | 0 | 0 | OK |
| Reservas | 0 | 0 | OK |

A fixture `TEST-FIXTURE-01` permanece `archived` e `DISABLED`. Os 47 registros foram conciliados individualmente: `ST-01…ST-20`, `PF-01…PF-22` e `IF-01…IF-05`, todos com código/ID/slug único e modalidade correta (`ASSISTED_PURCHASE` para Streetwear; `INQUIRY_ONLY` para Perfumaria e Fitness).

Uma simulação transacional com `SET LOCAL ROLE anon`, dentro de transação read-only encerrada por `ROLLBACK`, retornou zero produtos, variantes, imagens e linhas de disponibilidade enquanto todos permanecem em `draft`.

## 2. Scripts preparados

Diretório auditado: `scripts/prepared/phase-05-w3b-6b-0/`.

| Arquivo | SHA-256 | Resultado |
|---|---|---|
| `01-preflight.sql` | `0CA5A634685DA9215DEEB511769F1427799C5FC1F0C45B829237B160160C696E` | read-only, lista fechada com 47 códigos |
| `02-activate.sql` | `8357A53C8A5E8AF53F57EBFAD00CBD80EABE875E8C099FC231CE66CE945AA7A4` | um `UPDATE` restrito a `products.status`; transacional e idempotente |
| `03-verify.sql` | `E5C74D145424522393BFFE288E6ADCCB293946CC8FC227EDDBB86E075FF43187` | read-only; valida ativação, modos, fixture, estoque e leitura anon |
| `04-rollback-to-draft.sql` | `0F66A2313BE89C30579611137A21B146D765D3E9F96172670D834566953623B0` | um `UPDATE` restrito a `products.status`; bloqueia estado misto |

Não há `INSERT`, `DELETE`, escrita em inventário, movimentos, pedidos ou reservas. Ativação e rollback exigem exatamente 47 alvos e falham diante de estado misto. A fixture não pertence à lista e é validada separadamente.

### Ressalva dos gates

O preflight atual valida explicitamente 94 variantes e 57 imagens, mas não transforma os 80 movimentos em uma assertion SQL. O pós-check valida status, modalidades, estoque, pedidos, reservas e leitura anônima, porém não faz assertions explícitas para 94 variantes, 57 imagens e 80 movimentos. As três contagens foram confirmadas nesta auditoria e os scripts não escrevem nesses objetos; ainda assim, devem ser reconferidas por consultas read-only imediatamente antes/depois da futura ativação ou adicionadas aos gates em uma fase autorizada.

Nenhum script preparado foi executado nesta fase.

## 3. Sacola unificada e catálogo Supabase

A implementação é compatível com a normalização da fonte Supabase:

- `fetchPublicSupabaseCatalog()` consulta somente `active` e mantém `sales_mode` remoto.
- Produtos `fitness` são normalizados como marca pública `imperio-fit`; os demais como `bellmont`.
- Perfumes `INQUIRY_ONLY` BELLMONT são elegíveis apenas no modo WhatsApp, sem variante/volume/preço/estoque inventado.
- Streetwear `ASSISTED_PURCHASE` continua exigindo variante real e respeita indisponibilidade.
- IMPÉRIO FIT, fixture, item explicitamente indisponível e checkout online permanecem bloqueados na sacola.
- Streetwear + perfumes geram um único grupo/mensagem para o WhatsApp BELLMONT.
- Preço ausente produz `Valor sob consulta`; totais parciais são identificados.
- Não existe chamada de criação de pedido, reserva ou movimento no fluxo.

A suíte executou esses cenários tanto sobre objetos normalizados quanto sobre regras independentes da fonte local.

## 4. Home final

O código atual preserva `<Hero />` com “VISTA A SUA PRESENÇA”. Em seguida renderiza `<NewDrop />`. Os componentes `Campaigns` (“PRESENÇA EM CADA VOLUME”) e `BrandWorlds` (“FORÇA EM MOVIMENTO”) não são renderizados na Home.

Ordem atual relevante:

1. Hero.
2. New Drop / Streetwear.
3. Grupo oficial.
4. Perfumaria.
5. Destaques IMPÉRIO FIT.
6. CTA final.

A rota `/imperio-fit` e seu hero próprio não foram modificados.

## 5. Backup e recuperação

Backup confirmado em `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-21-pre-w3b6b`, fora do repositório.

| Artefato | Bytes | SHA-256 confirmado |
|---|---:|---|
| `roles.sql` | 370 | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `schema.sql` | 116.105 | `802D9264B11AF7BA31302AD3F6F32079BCB8AE02446933ECBEA0965910E6FF3F` |
| `data.sql` | 154.924 | `66B38F5803C2E468A66E7D3B15115ABB936386D7725B96ABBFCB116DFC3AB22C` |
| `application-verified.custom` | 189.756 | `FDDDD513130F1DFC0F4C37A56F13BE67B54D99950F15289236F5CD88664DA47E` |
| Manifesto Storage | 8.756 | `33632DF8F1DF553B4B8A000D3E6953759F57B55F089EF92EFA31C73949D3E41A` |

Metadados confirmam `restore_validated=true` e `remote_writes=false`. O Storage contém 57/57 imagens comerciais, 89.303.001 bytes. A restauração isolada anterior conciliou produtos, variantes, imagens, inventário, movimentos, pedidos e reservas por contagem/fingerprint.

Limitações conhecidas: o backup lógico não recria secrets, providers e configurações gerenciadas de Auth/Storage; os arquivos do Storage são preservados separadamente.

## 6. Segurança

- RLS está habilitada e forçada nas sete tabelas críticas auditadas.
- `anon` possui somente `SELECT` em `products`, `product_variants` e `product_images`; não possui grant de tabela sobre inventário, movimentos, pedidos ou reservas.
- Grants amplos de `authenticated` permanecem limitados pelas policies administrativas/RLS; nenhuma policy ou grant foi alterado.
- `public.is_current_user_admin()` continua `STABLE SECURITY DEFINER`, `search_path=''`, sem parâmetros, não executável por `anon` e executável por `authenticated`. Retorna somente a checagem booleana baseada em `auth.uid()` e `private.is_admin()`.
- O Security Advisor continua apontando essa RPC como WARN. Não existe elevação comprovada; hardening permanece recomendado em migration separada.
- Proteção contra senhas vazadas continua desabilitada (WARN), já documentada como melhoria dependente de plano/decisão operacional.
- Tabelas fail-closed sem policies (`private.inventory_batches`, `private.inventory_batch_operations` e `public.payment_webhook_events`) aparecem como INFO e não liberam acesso.
- Avisos de performance (FKs sem índice, índices ainda sem uso e policies permissivas múltiplas) não são bloqueadores desta ativação de status, mas devem continuar no backlog.

Parecer de segurança: não há bloqueador comprovado para leitura pública em `WHATSAPP_ONLY`; existem ressalvas de hardening já conhecidas.

## 7. Cloudflare Pages — preparação, sem execução

### Confirmado localmente

- Repositório: `Alison-silva-nascimento/bellmont-loja`.
- Branch atual/proposta de produção: `main`.
- Build command: `npm run build:cloudflare`.
- Output directory: `dist`.
- Node recomendado nas auditorias: 22.
- Base Vite no modo Cloudflare: `/`.
- SPA: `public/_redirects` contém `/* /index.html 200`.
- Variáveis públicas necessárias:
  - `VITE_SUPABASE_URL`;
  - `VITE_SUPABASE_PUBLISHABLE_KEY`;
  - `VITE_PUBLIC_CATALOG_SOURCE=supabase`.

Não usar `service_role`, `sb_secret_`, password, connection string ou JWT secret. Todo valor `VITE_*` entra no bundle.

### Pendente externo

Não há `wrangler.toml` nem acesso autenticado ao painel/API da Cloudflare nesta auditoria. Portanto, permanecem pendentes a confirmação do nome/ID do projeto Pages conectado, repositório/branch configurados no painel, variáveis de Preview/Production, URL efetiva e deployment anterior elegível para rollback. Nada foi presumido.

### Procedimento futuro

1. Confirmar no painel o projeto Pages, repositório e branch `main`.
2. Configurar apenas as três variáveis públicas no ambiente Production.
3. Usar `npm run build:cloudflare` e `dist`.
4. Revisar artefato, `_redirects`, assets com hash, fonte Supabase e ausência de segredos.
5. Publicar somente com autorização separada.
6. Smoke tests: Home, Streetwear, Perfumaria, IMPÉRIO FIT, busca, filtros, PDP, favoritos, sacola mista, WhatsApps corretos, console, leitura pública e bloqueio da fixture.
7. Rollback: promover deployment anterior no Cloudflare; não alterar automaticamente catálogo/estoque. Rollback dos produtos para draft é decisão separada e exige autorização.

## 8. Testes

| Comando | Resultado |
|---|---|
| `npm test` | **99/99 aprovados** |
| `npm run build` | aprovado |
| `npm run build:cloudflare` | aprovado |
| `git diff --check` | aprovado; apenas avisos LF/CRLF do ambiente Windows |

Não houve mudança no banco, Storage, Auth, RLS, grants ou Cloudflare.

## 9. Pendências reais

1. Confirmar externamente o projeto e a configuração efetiva do Cloudflare Pages.
2. Garantir `VITE_PUBLIC_CATALOG_SOURCE=supabase` no ambiente Production antes do deploy.
3. Na janela futura, reconfirmar 94 variantes, 57 imagens e 80 movimentos antes/depois da ativação, pois nem todas essas contagens estão assertadas no `03-verify.sql`.
4. Manter no backlog o hardening de `is_current_user_admin()`.
5. Decidir sobre leaked-password protection conforme plano do Supabase.

## 10. Parecer final

**GO COM RESSALVAS.** O baseline remoto está íntegro e pronto para uma solicitação separada de autorização da ativação. As ressalvas não indicam divergência comercial atual: são o gate externo do Cloudflare, a necessidade de reconfirmar três contagens não totalmente assertadas no script pós-check e dois itens de hardening já conhecidos. A ativação dos 47 produtos não foi executada e continua proibida até autorização explícita em fase separada.
