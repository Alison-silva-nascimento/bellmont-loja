# BELLMONT — Fase 05.W3B.5E — integração remota IMPÉRIO FIT

Data da execução: 2026-10-21  
Horário de conclusão: 01:53:26 -03:00  
Projeto remoto: `qbedfcdarmgiytlqntpf` — BELLMONT E-commerce — `sa-east-1`  
Classificação: **EXECUTADA E VALIDADA**

## 1. Resultado executivo

Foram integrados exclusivamente os cinco produtos IMPÉRIO FIT autorizados, códigos IF-01 a IF-05, com suas cinco imagens originais. Todos permanecem em `draft` e `INQUIRY_ONLY`; nenhum produto foi ativado.

O remoto encerrou com 48 registros em `products`: 47 comerciais e uma fixture técnica. Os 47 comerciais continuam em `draft`. O estoque comercial permaneceu em 1.200 unidades físicas e zero reservadas; os 80 movimentos comerciais, zero pedidos e zero reservas foram preservados.

Não houve migration, modificação de RLS/grants, criação de variantes, alteração de estoque, ativação, commit, push ou deploy.

## 2. Pré-checks

- Project ID, nome, região e estado `ACTIVE_HEALTHY` confirmados.
- PostgreSQL remoto: 17.11.0.002.
- Histórico local/remoto sincronizado em 12 migrations, terminando em `20261020102806_phase_05_w3b_1_product_sales_mode`.
- Baseline: 43 produtos totais, 42 comerciais em `draft`, zero ativos.
- Modalidades: 20 Streetwear `ASSISTED_PURCHASE`, 22 perfumes `INQUIRY_ONLY` e fixture `DISABLED`.
- 94 variantes e 52 imagens comerciais.
- Estoque comercial 1.200/0; 80 movimentos comerciais; zero pedidos e reservas.
- Zero conflito nos códigos IF-01 a IF-05, slugs, SKUs ou paths de Storage.
- Zero códigos ou slugs duplicados no baseline.
- Fingerprint dos 43 produtos preexistentes: `1dc5114e874342a8d28bf46d5383f665`.

## 3. Backup pós-`sales_mode`

Diretório externo ao Git: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-21-pre-w3b5e`.

| Arquivo | Bytes | SHA-256 |
|---|---:|---|
| `dumps/roles.sql` | 370 | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `dumps/schema.sql` | 116.105 | `802D9264B11AF7BA31302AD3F6F32079BCB8AE02446933ECBEA0965910E6FF3F` |
| `dumps/data.sql` | 150.991 | `EA82423D7406C0A992452ABC9B90D3F52F5E98F35C23B2012E0CA70198FABEE4` |
| `dumps/application-verified.custom` | 189.302 | `CC9A159A9A98CEE49B8E01F84F8CBC5D097F32C1B3825FA42ECEB1D4E2E6B11F` |

O backup foi restaurado no database PostgreSQL local descartável `bellmont_restore_w3b5e_20261021`. A restauração de schema e dados utilizou parada em erro e reproduziu 43/42 produtos, 42 drafts, modalidades 20/22/1, estoque 1.200/0, 80 movimentos comerciais e zero pedidos/reservas. Não foram encontrados órfãos em variantes/imagens nem inventário inválido.

A preparação dos schemas gerenciados locais emitiu quatro erros não fatais para funções que referenciavam `private` antes da restauração do schema de aplicação; essas funções foram restauradas posteriormente pelo dump oficial, com `ON_ERROR_STOP=1`. O archive custom da camada de aplicação foi listado com sucesso. Persistem as limitações já conhecidas: o dump PostgreSQL preserva metadados de Storage, mas não os bytes dos objetos, nem secrets/configurações gerenciadas de Auth.

## 4. Artefatos executados

- `scripts/prepared/phase-05-w3b-5/01-insert-fitness-products.sql`  
  SHA-256: `6BB8DA20D35CA2648B63B23BB4C8E51373AD29287D40802293A53729B2111F1E`
- `scripts/prepared/phase-05-w3b-5/02-link-fitness-images.sql`  
  SHA-256: `F0752402404D14097581A666B5A5A1809EB5AC5F32C76E77B113D349AFCBADEC`

O primeiro script executou em transação explícita, com lock consultivo e pré/pós-condições. Inseriu somente IF-01 a IF-05. O segundo validou previamente a presença, MIME e tamanho dos cinco objetos e criou somente os cinco vínculos de imagem.

## 5. Ordem efetiva da operação

Foi usada a ordem segura já documentada na W3B.5:

1. inserção transacional dos cinco produtos em `draft`;
2. obtenção dos IDs reais 44 a 48;
3. upload oficial das cinco imagens para os paths derivados desses IDs;
4. verificação de path, tamanho, MIME e SHA-256 remoto;
5. vínculo transacional das imagens.

A ordem “upload antes do produto” não era tecnicamente válida: o path canônico contém o ID gerado pelo banco e a policy do Storage exige o produto referenciado. Durante todo o intervalo intermediário os produtos permaneceram invisíveis ao catálogo anônimo por estarem em `draft`.

## 6. Produtos criados

| ID | Código | Nome | Preço | Status | Sales mode | Variantes | Imagens |
|---:|---|---|---:|---|---|---:|---:|
| 44 | IF-01 | Macaquinho Ana | R$ 250,00 | `draft` | `INQUIRY_ONLY` | 0 | 1 |
| 45 | IF-02 | Macaquinho Fitness — Preto | R$ 200,00 | `draft` | `INQUIRY_ONLY` | 0 | 1 |
| 46 | IF-03 | Conjunto Iza | R$ 250,00 | `draft` | `INQUIRY_ONLY` | 0 | 1 |
| 47 | IF-04 | Conjunto Fitness — Preto | R$ 210,00 | `draft` | `INQUIRY_ONLY` | 0 | 1 |
| 48 | IF-05 | Conjunto Jasmim | R$ 240,00 | `draft` | `INQUIRY_ONLY` | 0 | 1 |

O IF-05 preserva `Top e short separados · Marrom`. Nenhum tamanho, variante ou estoque foi inventado.

## 7. Storage e integridade das imagens

| Código | Path | Bytes | SHA-256 remoto validado |
|---|---|---:|---|
| IF-01 | `products/44/232b2c47-38fb-4228-85c1-c9c8babf9857.png` | 346.169 | `C7BD17F832E43D54D902AA6BB67F5873B40922E0B9B5C04F04B8CC663E60538D` |
| IF-02 | `products/45/1e2559d3-9abe-4a2d-ad14-716eed5dec7d.png` | 335.701 | `7C968EFD20B14519DCDF567AB653675342EA42FFDB99899034773E103E0AE588` |
| IF-03 | `products/46/bed583d6-9619-4d30-b2e7-2a86d0daf44e.png` | 353.396 | `0281D694F38D2E8B5DBB17324415AC16237637A06B753D30D8EDD10DCFEB43BB` |
| IF-04 | `products/47/a2f6a566-fbbb-4495-b4af-ab2b3eaa1ad8.png` | 347.818 | `C3206BF6B07FBECD8FA0D95702BA6ECB2C3DDC4C33FF8E87BFA5F95E353F32B2` |
| IF-05 | `products/48/56f19ac0-055b-4764-8a8e-7c3385f4910d.png` | 1.771.341 | `2D7B81731AA41761DBD983639A609CD8E6B605E5640909CBDA0BC8527347F810` |

Os cinco objetos apresentaram `image/png` e tamanhos idênticos ao manifesto. Cada objeto foi baixado pela URL pública oficial e seu SHA-256 coincidiu com o original local. Nenhum objeto existente foi sobrescrito ou excluído.

Cada produto recebeu exatamente um vínculo `product_images`, `sort_order = 0`, `is_primary = true`, `variant_id = NULL`. Não existem vínculos órfãos.

## 8. Comparação antes × depois

| Indicador | Antes | Depois | Resultado |
|---|---:|---:|---|
| Produtos totais | 43 | 48 | +5 autorizado |
| Produtos comerciais | 42 | 47 | +5 autorizado |
| Comerciais `draft` | 42 | 47 | todos preservados |
| Produtos ativos | 0 | 0 | preservado |
| Produtos Fitness | 0 | 5 | autorizado |
| Variantes totais/comerciais | 96 / 94 | 96 / 94 | preservado |
| Imagens totais/comerciais | 53 / 52 | 58 / 57 | +5 autorizado |
| Estoque comercial físico | 1.200 | 1.200 | preservado |
| Estoque comercial reservado | 0 | 0 | preservado |
| Movimentos comerciais | 80 | 80 | preservado |
| Pedidos | 0 | 0 | preservado |
| Reservas | 0 | 0 | preservado |
| Migrations | 12 | 12 | nenhuma nova migration |

O fingerprint dos 43 produtos anteriores permaneceu `1dc5114e874342a8d28bf46d5383f665`, comprovando que os registros comerciais existentes e a fixture não foram modificados.

## 9. Segurança

- RLS permanece habilitada e forçada nas sete tabelas críticas verificadas.
- 22 policies e 27 grants públicos/autenticados relevantes permaneceram presentes; nenhum DDL de policy/grant foi executado.
- Histórico de migrations inalterado.
- Nenhuma função foi criada ou modificada.
- Consulta sob o papel `anon` retornou zero produtos e zero Fitness: o catálogo público continua vazio.
- Não houve escrita em inventário, movimentos, pedidos, reservas ou Auth.

O changelog vigente mantém para 30/10/2026 a mudança de exposição explícita da Data API; esse item continua como pendência operacional geral e não foi alterado nesta execução.

## 10. Testes

| Verificação | Resultado |
|---|---|
| `npm test` | **86/86 aprovados** |
| `npm run build` | **aprovado** |
| `npm run build:cloudflare` | **aprovado** |
| `git diff --check` | **aprovado**; apenas avisos locais de LF/CRLF/configuração Git |

Nenhuma configuração de produção foi alterada e nenhum frontend foi publicado.

## 11. Divergências e ressalvas

1. A ordem operacional foi produto → upload → vínculo, em vez de upload → produto, devido à dependência obrigatória do ID e à policy canônica do Storage. Esta ordem já estava auditada na W3B.5 e não ampliou o escopo autorizado.
2. A Supabase CLI instalada é 2.119.0; 2.121.0 estava disponível. A versão instalada executou backup, listagem e uploads com sucesso e não foi atualizada durante a operação.
3. O backup lógico não contém os bytes de Storage nem secrets/configurações gerenciadas; os cinco bytes enviados foram verificados separadamente por download e SHA-256.
4. Proteção contra senhas vazadas e revisão futura dos grants explícitos da Data API continuam pendências preexistentes, sem alteração nesta fase.

## 12. Parecer final

**EXECUTADA E VALIDADA.**

O Supabase comercial contém agora 47 produtos comerciais: 20 Streetwear, 22 perfumes e cinco IMPÉRIO FIT. Todos permanecem em `draft`; os cinco Fitness estão em `INQUIRY_ONLY`, possuem uma imagem original íntegra e não possuem variantes ou estoque fictícios.

Estoque, movimentos, pedidos, reservas, RLS, grants e histórico de migrations foram preservados. Não houve commit, push, deploy, ativação de catálogo, checkout ou pagamento.
