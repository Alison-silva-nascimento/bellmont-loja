# BELLMONT + IMPÉRIO FIT — Fase 05.W3B.6B.2

## Ativação remota controlada dos 47 produtos

**Execução:** 22/10/2026, aproximadamente 07:50 (America/Sao_Paulo)  
**Projeto:** `qbedfcdarmgiytlqntpf` — BELLMONT E-commerce  
**Região:** `sa-east-1`  
**PostgreSQL:** `17.11.0.002`  
**Classificação:** `ATIVAÇÃO EXECUTADA E VALIDADA`

## 1. Destino e histórico

O projeto remoto foi identificado pela API oficial como `qbedfcdarmgiytlqntpf`, nome `BELLMONT E-commerce`, status `ACTIVE_HEALTHY`, região `sa-east-1`.

As 12 migrations locais e remotas estavam sincronizadas, da `20261001112627_phase_04_1_commerce_schema` até `20261020102806_phase_05_w3b_1_product_sales_mode`. Nenhuma migration, seed ou alteração de schema foi executada nesta fase.

## 2. Backup validado

Diretório externo ao repositório: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-21-pre-w3b6b`.

| Artefato | SHA-256 verificado |
| --- | --- |
| `roles.sql` | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `schema.sql` | `802D9264B11AF7BA31302AD3F6F32079BCB8AE02446933ECBEA0965910E6FF3F` |
| `data.sql` | `66B38F5803C2E468A66E7D3B15115ABB936386D7725B96ABBFCB116DFC3AB22C` |
| `application-verified.custom` | `FDDDD513130F1DFC0F4C37A56F13BE67B54D99950F15289236F5CD88664DA47E` |
| Manifesto Storage | `33632DF8F1DF553B4B8A000D3E6953759F57B55F089EF92EFA31C73949D3E41A` |

O metadado preservado confirma `restore_validated=true`, 57 arquivos de Storage e nenhuma escrita remota durante a criação do backup. A última atualização de produto observada antes da execução era anterior ao backup; não foi identificado drift posterior que invalidasse a cópia.

## 3. Scripts auditados

| Script | SHA-256 |
| --- | --- |
| `01-preflight.sql` | `0CA5A634685DA9215DEEB511769F1427799C5FC1F0C45B829237B160160C696E` |
| `02-activate.sql` | `8357A53C8A5E8AF53F57EBFAD00CBD80EABE875E8C099FC231CE66CE945AA7A4` |
| `03-verify.sql` | `E5C74D145424522393BFFE288E6ADCCB293946CC8FC227EDDBB86E075FF43187` |
| `04-rollback-to-draft.sql` | `0F66A2313BE89C30579611137A21B146D765D3E9F96172670D834566953623B0` |

A execução utilizou a mesma lista fechada de `ST-01…ST-20`, `PF-01…PF-22` e `IF-01…IF-05`. Como o executor SQL oficial não interpreta metacomandos `psql`, a lógica autorizada do script de ativação foi executada diretamente em uma única transação, acrescida das assertions de variantes, imagens, movimentos e fingerprints exigidas pelo prompt.

## 4. Preflight remoto

| Controle | Esperado | Observado |
| --- | ---: | ---: |
| Produtos totais | 48 | 48 |
| Produtos comerciais | 47 | 47 |
| IDs comerciais distintos | 47 | 47 |
| Comerciais em `draft` | 47 | 47 |
| Comerciais ativos | 0 | 0 |
| Streetwear | 20 | 20 |
| Perfumes | 22 | 22 |
| IMPÉRIO FIT | 5 | 5 |
| Variantes comerciais | 94 | 94 |
| Imagens comerciais | 57 | 57 |
| Estoque físico | 1.200 | 1.200 |
| Estoque reservado | 0 | 0 |
| Movimentos comerciais | 80 | 80 |
| Pedidos | 0 | 0 |
| Reservas | 0 | 0 |

A fixture `TEST-FIXTURE-01` estava `archived` e `DISABLED`. Não havia produto inesperado, conflito de código ou divergência de `sales_mode`. As sete tabelas críticas mantinham RLS habilitada e forçada; não havia grant inesperado para `anon`.

## 5. Execução transacional

- Uma única transação foi aberta no projeto confirmado.
- As 47 linhas da lista fechada foram bloqueadas e revalidadas.
- O único `UPDATE` executado foi `products.status: draft → active`.
- Exatamente 47 linhas foram alteradas.
- O trigger de `updated_at` foi o único efeito colateral previsto.
- Assertions antes do `COMMIT` confirmaram fixture, modalidades, contagens, estoque, movimentos, pedidos, reservas e fingerprints.
- A transação realizou `COMMIT` com sucesso.
- Nenhum rollback foi necessário ou executado.

## 6. Comparação antes × depois

| Controle | Antes | Depois | Resultado |
| --- | ---: | ---: | --- |
| Produtos totais | 48 | 48 | preservado |
| Comerciais ativos | 0 | 47 | alteração autorizada |
| Comerciais `draft` | 47 | 0 | alteração autorizada |
| Streetwear | 20 | 20 | preservado |
| Perfumes | 22 | 22 | preservado |
| IMPÉRIO FIT | 5 | 5 | preservado |
| `ASSISTED_PURCHASE` | 20 | 20 | preservado |
| `INQUIRY_ONLY` | 27 | 27 | preservado |
| Variantes comerciais | 94 | 94 | preservado |
| Imagens comerciais | 57 | 57 | preservado |
| Estoque físico | 1.200 | 1.200 | preservado |
| Estoque reservado | 0 | 0 | preservado |
| Movimentos comerciais | 80 | 80 | preservado |
| Pedidos | 0 | 0 | preservado |
| Reservas | 0 | 0 | preservado |
| Fixture | `archived / DISABLED` | `archived / DISABLED` | preservado |

## 7. Fingerprints

Os fingerprints calculados imediatamente antes e em consulta independente após o `COMMIT` permaneceram idênticos:

| Conjunto | MD5 antes/depois |
| --- | --- |
| Campos comerciais de produtos, exceto `status` e `updated_at` | `9d04cb08b004a3addc1e91c8ba7d27f0` |
| Variantes | `57d7f2eef9ba53fb19ffa7099c3ed8e1` |
| Imagens | `d8b5383d2850cb249e6b3ee2baf71f7d` |
| Inventário | `46962a7aefb22ff744c79c181271bbec` |
| Movimentos | `5545679d4852bde8489cdb66c10d87b4` |
| Policies | `cab5d8ca003b2f01525c50cf52a17065` |
| Grants | `7f195b5dc5e10ab07cfac4a03ce2f2ca` |

Isso comprova que preços e demais atributos comerciais, variantes, imagens, estoque, movimentos, policies e grants não foram alterados pela ativação.

## 8. Validação pública anônima real

A Data API foi consultada usando exclusivamente a chave publicável existente, sem credencial administrativa e sem imprimir seu valor.

- `products`: HTTP 200, 47 produtos públicos, todos `active`.
- Categorias: 20 Streetwear, 22 perfumes e 5 Fitness.
- Modalidades: 20 `ASSISTED_PURCHASE` e 27 `INQUIRY_ONLY`.
- Fixture visível: zero.
- `product_images`: HTTP 200, 57 metadados públicos.
- Storage: 57/57 objetos verificados por `HEAD`, zero falhas.
- RPC pública de disponibilidade: HTTP 200, 94 variantes.
- Campos retornados pela RPC: somente `product_code`, `variant_sku`, `available`, `availability_status`.
- `inventory`, `inventory_movements`, `orders` e `inventory_reservations`: HTTP 404 para `anon`.

O catálogo anônimo está disponível. Quantidades privadas, reservas, movimentos e dados de pedidos permanecem ocultos.

## 9. Regressão local

| Comando | Resultado |
| --- | --- |
| `npm test` | **102/102 aprovados** |
| `npm run build` | aprovado |
| `npm run build:cloudflare` | aprovado |
| `git diff --check` | aprovado; somente avisos LF/CRLF do ambiente Windows |

Não houve alteração de código funcional nesta fase. O frontend não foi publicado.

## 10. Pendências e próxima etapa

- O catálogo remoto já está ativo, mas o frontend público somente utilizará essa fonte quando o ambiente de produção definir `VITE_PUBLIC_CATALOG_SOURCE=supabase` e houver deploy autorizado.
- Permanecem documentadas, sem mudança nesta fase, a proteção contra senhas vazadas e o hardening futuro de `is_current_user_admin()`.
- A próxima etapa deve ser uma autorização separada para configuração/verificação do Cloudflare e deploy, seguida de smoke tests públicos.
- O rollback preparado não foi executado e continua exigindo diagnóstico e autorização específicos.

## 11. Parecer final

**ATIVAÇÃO EXECUTADA E VALIDADA.**

- Produtos ativos: **47**.
- Produtos comerciais em `draft`: **0**.
- `COMMIT`: **sim**.
- `ROLLBACK`: **não**.
- Catálogo anônimo: **disponível**.
- Estoque, imagens, variantes e movimentos: **íntegros**.
- Fixture técnica: **oculta, `archived` e `DISABLED`**.
- Commit, push, deploy, Cloudflare e migrations: **não executados**.
