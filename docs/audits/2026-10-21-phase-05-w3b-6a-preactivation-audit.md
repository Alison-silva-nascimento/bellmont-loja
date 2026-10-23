# BELLMONT — Fase 05.W3B.6A — auditoria completa pré-ativação

Data: 2026-10-21  
Projeto: `qbedfcdarmgiytlqntpf` — Supabase remoto  
Classificação: **APTO COM RESSALVAS**  
Escopo efetivo: leitura remota, análise local, testes e documentação. Nenhuma escrita remota foi realizada.

## 1. Resultado executivo

O baseline remoto coincide com as fases W3B.4E e W3B.5E: 47 produtos comerciais em `draft` (20 Streetwear, 22 perfumes e cinco IMPÉRIO FIT), uma fixture `DISABLED`, 1.200 unidades físicas, zero reservadas, 80 movimentos comerciais, zero pedidos e zero reservas. As 12 migrations locais/remotas estão sincronizadas e o catálogo anônimo retorna zero produto, variante, imagem e linha de disponibilidade.

Parecer por produto:

- 35 **APTO**;
- 12 **APTO COM RESSALVAS**;
- 0 **BLOQUEADO** por integridade do cadastro.

A solicitação de ativação ainda não deve ocorrer antes de três gates operacionais: novo backup contendo os cinco Fitness, decisão sobre os 12 cadastros com informação editorial pendente e comprovação de que o build Cloudflare usa `VITE_PUBLIC_CATALOG_SOURCE=supabase`. O arquivo local auditado permanece com fonte `local`; não foi feita nem inferida alteração da configuração externa Cloudflare.

## 2. Baseline remoto comprovado

| Indicador | Resultado |
|---|---:|
| Produtos totais / comerciais | 48 / 47 |
| Streetwear / perfumes / Fitness | 20 / 22 / 5 |
| Comerciais `draft` / `active` | 47 / 0 |
| Fixture técnica | 1, `TEST-FIXTURE-01`, `DISABLED` |
| Variantes comerciais | 94 |
| Imagens comerciais | 57 |
| Estoque físico / reservado | 1.200 / 0 |
| Movimentos comerciais | 80 |
| Pedidos / reservas | 0 / 0 |
| Migrations | 12; última `20261020102806_phase_05_w3b_1_product_sales_mode` |
| Leitura `anon` | 0 produtos, 0 variantes, 0 imagens, 0 disponibilidades |

Não foi encontrada divergência que exigisse interrupção da auditoria.

## 3. Catálogo e prontidão individual

A matriz completa está em `2026-10-21-phase-05-w3b-6a-product-readiness.csv`.

### Streetwear

ST-01 a ST-20 têm `ASSISTED_PURCHASE`, preço R$ 80,00, capa primária, quatro variantes ativas P/M/G/GG e 15 unidades disponíveis por variante (60 por produto). As cores registradas correspondem ao cadastro; quantidade reservada é zero. O frontend centraliza limites por variante, restauração da sacola, bloqueio de indisponibilidade e teto 99. O fluxo WhatsApp inclui produto, variante, quantidade, preço e total estimado sem criar pedido, reserva ou movimento.

Os 20 estão **APTO**. Descrições textuais estão vazias, mas nomes, cores, imagens, preço e variantes fornecem os dados obrigatórios do fluxo; recomenda-se enriquecimento editorial posterior, sem impedir o lançamento aprovado.

### Perfumaria

Os 22 estão em `INQUIRY_ONLY`, têm preço confirmado e exatamente uma imagem primária, sem inventário. Quatorze possuem volume confirmado por variante (100 ml, ou 105 ml em PF-06) e estão **APTO**. Oito sem volume confirmado — PF-05, PF-07, PF-09, PF-14, PF-17, PF-19, PF-20 e PF-22 — estão **APTO COM RESSALVAS** e não devem exibir volume inventado. `brand=NULL` é intencional e suportado.

### IMPÉRIO FIT

IF-01 a IF-05 estão em `INQUIRY_ONLY`, cada um com uma imagem original primária, preço confirmado e zero variantes/estoque fictícios. IF-05, Conjunto Jasmim, preserva top e short separados, cor marrom e R$ 240,00: **APTO**. IF-01 a IF-04 estão **APTO COM RESSALVAS** por descrição vazia; nomes reais, imagens e preços estão preservados.

Não existe coluna explícita de ordem em `products`; a apresentação usa `featured`, `new_arrival` e ordenação do frontend. Isso é uma característica atual, não corrupção referencial.

## 4. Imagens e Storage

- bucket `product-images` público, limite 5 MiB e MIME JPEG/PNG/WebP;
- 58 registros em `product_images` e 58 objetos no bucket (incluindo fixture);
- zero objetos ausentes, vínculos órfãos, paths duplicados, capas ausentes/múltiplas ou metadados MIME/tamanho inválidos;
- cada comercial tem capa; galerias Streetwear adicionais mantêm ordem;
- os cinco hashes Fitness coincidem com a W3B.5E;
- leitura pública de bytes é compatível com catálogo; escritas exigem Admin e path canônico.

O dump PostgreSQL não contém bytes do Storage. Eles precisam de inventário/hashes e recuperação próprios.

## 5. Simulação funcional sem escrita remota

Não foi tecnicamente seguro promover uma cópia sanitizada completa para `active` sem preparar um ambiente Supabase isolado com os mesmos serviços. A comprovação foi feita em três camadas:

1. leitura real `anon` no remoto confirmou o estado fechado com drafts;
2. testes unitários exercitaram linhas públicas simuladas, normalização, busca, filtros, favoritos, sacola, persistência, limites, `INQUIRY_ONLY`, roteamento e mensagens;
3. builds padrão e Cloudflare confirmaram integração TypeScript/Vite.

O navegador isolado usado pela auditoria não conseguiu alcançar o `localhost` da máquina (`ERR_CONNECTION_TIMED_OUT`), portanto não se declara inspeção visual dinâmica nesta execução. A análise estática confirma lazy loading nos cards, estados de loading/erro, CSS responsivo e rotas; a validação visual final em 320/360/375/390/430 px permanece gate manual pré-deploy.

O `CatalogProvider` mantém catálogo local por padrão. Em modo Supabase, consulta somente `active`; vazio ou erro não faz fallback local. Isso é correto para segurança, mas exige variável explícita no build de produção.

## 6. Segurança

RLS está habilitada e forçada nas tabelas críticas. Produtos, variantes e imagens só são públicos quando o produto está ativo; variantes também precisam estar ativas. Escritas administrativas usam `private.is_admin()`. `anon` não possui grant de inventário, e `authenticated` não-admin é bloqueado pela RLS. A RPC pública de disponibilidade não expõe quantidades.

O frontend aplica `sales_mode` na lógica central: `INQUIRY_ONLY` não entra na sacola; `DISABLED` não normaliza como comercial; WhatsApp não cria pedido, reserva ou baixa. Checkout online permanece bloqueado.

Pendências:

- proteção contra senhas vazadas desabilitada;
- `public.is_current_user_admin()` é `SECURITY DEFINER` com `search_path=''` e apenas `authenticated` pode executar; não foi confirmado abuso, mas a superfície pública deve ser reduzida em etapa própria;
- grants existentes continuam válidos. Para objetos novos após a mudança da Data API de 30/10/2026, grants explícitos devem ser parte de cada migration; RLS não substitui grants e grants não substituem RLS.

`.env.local` está ignorado e não rastreado. Não há credenciais administrativas temporárias nele nem atribuições sensíveis não vazias em arquivos rastreados. O bundle não contém segredo real; a string `sb_secret_` é parte do código de detecção de formato do SDK.

## 7. Performance, mobile e acessibilidade

Os bundles foram gerados com sucesso; o maior chunk público ficou em aproximadamente 470 kB (145 kB gzip). Imagens são carregadas de forma progressiva/lazy nos cards. O Security/Performance Advisor reporta 11 FKs sem índice, 23 índices sem uso observado e três conjuntos de policies permissivas múltiplas. São melhorias de performance a medir com tráfego, não bloqueadores de segurança confirmados.

Pontos manuais antes do deploy: inspeção responsiva nas cinco larguras solicitadas, console do navegador, contraste/foco, swipe de carrosséis, Quick View, barra inferior, sacola e links externos.

## 8. Backup e recuperação

O backup `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-21-pre-w3b5e` existe, seus quatro hashes SHA-256 continuam idênticos ao relatório e a restauração PostgreSQL 17.11 foi aprovada. Ele cobre 43 registros anteriores à integração Fitness. Limitações: não inclui bytes de Storage, secrets/configurações Auth e não contém IF-01 a IF-05.

Consequentemente, um novo backup com 48 registros totais/47 comerciais, restauração isolada e inventário de Storage é obrigatório antes da ativação.

## 9. Regressão

| Verificação | Resultado |
|---|---|
| `npm test` | 86/86 aprovados |
| `npm run build` | aprovado |
| `npm run build:cloudflare` | aprovado |
| `git diff --check` | aprovado; somente avisos LF/CRLF e drive Git local |
| Segredos rastreados | nenhum valor sensível encontrado |

## 10. Alterações e restrições

Foram criados somente os quatro entregáveis locais da auditoria. O workspace já continha numerosas alterações não commitadas de fases anteriores; elas foram preservadas. Não houve alteração de produto, imagem, Storage, estoque, movimento, pedido, reserva, Auth, migration, RLS, grant, Cloudflare, commit, push ou deploy.

## 11. Parecer final

**APTO COM RESSALVAS.**

Não há produto bloqueado por corrupção, falta de preço/imagem ou regra comercial insegura. Há 35 produtos aptos e 12 aptos com ressalvas editoriais. Antes de solicitar autorização de ativação, é obrigatório criar backup pós-Fitness, decidir o lote dos 12 itens e comprovar a fonte Supabase no ambiente Cloudflare. As pendências de Auth devem ser aceitas ou remediadas por autorização própria.

A próxima fase 05.W3B.6B não está autorizada por este relatório.
