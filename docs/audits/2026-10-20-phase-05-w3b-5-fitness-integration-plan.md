# BELLMONT — Fase 05.W3B.5 — preparação da integração IMPÉRIO FIT

Data: 2026-10-20  
Workspace: `C:\DEV PARTICULAR\BELLMONT LOJA`  
Supabase: `qbedfcdarmgiytlqntpf` — produção, somente leitura nesta fase  
Parecer: **APTO PARA SOLICITAR AUTORIZAÇÃO**

## 1. Resultado executivo

A integração dos cinco produtos reais IMPÉRIO FIT foi preparada, conciliada e simulada em PostgreSQL 17.11 isolado. Nenhuma escrita, migration, upload ou mudança de configuração foi realizada no Supabase remoto.

O plano mantém os cinco produtos em `draft`, com `sales_mode = 'INQUIRY_ONLY'`, sem variantes, inventário, movimentos, pedidos ou reservas. As cinco imagens locais são PNG válidos, possuem SHA-256 registrado e exigirão upload futuro ao bucket `product-images` mediante autorização separada.

O schema remoto aceita produtos `INQUIRY_ONLY` sem variantes e sem estoque. A publicação futura continua separada: inserir e relacionar os produtos não os torna visíveis ao catálogo anônimo enquanto estiverem em `draft`.

## 2. Estado remoto revalidado

- 43 registros em `products`: 42 comerciais e uma fixture técnica.
- 42 produtos comerciais em `draft`; zero `active`.
- 20 Streetwear em `ASSISTED_PURCHASE` e 22 perfumes em `INQUIRY_ONLY`.
- Nenhum código `IF-01` a `IF-05`, nenhum slug planejado e nenhum SKU `IF-%` existente.
- 94 variantes comerciais e 52 imagens comerciais.
- 1.200 unidades físicas comerciais; zero reservadas.
- 80 movimentos comerciais; zero pedidos e zero reservas.
- Migration `sales_mode` aplicada.
- Nenhum objeto Storage encontrado por nome/caminho contendo IMPÉRIO FIT, Fitness ou Jasmim.

Não existe checksum de conteúdo pesquisável nos metadados remotos atuais. Portanto, foi possível confirmar a inexistência dos caminhos planejados, mas não provar deduplicação binária global por SHA-256 antes do upload.

## 3. Matriz comercial

| Código | ID local | Nome | Slug | Preço | Cor | Imagem | Modalidade |
|---|---|---|---|---:|---|---|---|
| IF-01 | `fitness-01` | Macaquinho Ana | `macaquinho-fitness-vinho` | R$ 250,00 | vinho | `imperio-fit-burgundy.png` | `INQUIRY_ONLY` |
| IF-02 | `fitness-02` | Macaquinho Fitness — Preto | `macaquinho-fitness-preto` | R$ 200,00 | preto | `imperio-fit-black.png` | `INQUIRY_ONLY` |
| IF-03 | `fitness-03` | Conjunto Iza | `conjunto-fitness-marinho` | R$ 250,00 | marinho | `imperio-fit-navy.png` | `INQUIRY_ONLY` |
| IF-04 | `fitness-04` | Conjunto Fitness — Preto | `conjunto-fitness-preto-recortes` | R$ 210,00 | preto | `imperio-fit-lines.png` | `INQUIRY_ONLY` |
| IF-05 | `fitness-05` | Conjunto Jasmim | `conjunto-jasmim-marrom` | R$ 240,00 | marrom | `imperio-fit-jasmim-brown.png` | `INQUIRY_ONLY` |

O IF-05 preserva a descrição confirmada `Top e short separados · Marrom`. Para IF-01 a IF-04 o script não fabrica descrições adicionais. A matriz completa está em `2026-10-20-phase-05-w3b-5-fitness-products.csv`.

### Campos deliberadamente pendentes

- tamanhos;
- variantes/SKUs;
- estoque;
- disponibilidade comercial;
- descrições adicionais de IF-01 a IF-04.

Esses campos não impedem `INQUIRY_ONLY`; permanecem ausentes para evitar dados fictícios.

## 4. Imagens e Storage

As cinco imagens existem em `public/assets`, têm assinatura PNG e tamanhos entre 335.701 e 1.771.341 bytes, dentro do limite remoto de 5 MiB. O bucket `product-images` aceita `image/png` e possui leitura pública. Hashes, tamanhos, UUIDs e paths estão no manifesto `2026-10-20-phase-05-w3b-5-storage-manifest.csv`.

O path exigido pelo schema é `products/{product_id}/{uuid}.png`. A policy de upload exige que o produto referenciado pelo `{product_id}` já exista e que o executor seja Admin. Por isso, Storage e banco não podem formar uma única transação distribuída.

Arquitetura segura proposta:

1. inserir atomicamente os cinco produtos em `draft`;
2. registrar os IDs retornados;
3. derivar os cinco paths exatos e fazer os uploads autorizados sem sobrescrita;
4. confirmar presença, MIME e tamanho de todos os objetos;
5. inserir atomicamente os cinco vínculos `product_images`.

Durante as etapas intermediárias os produtos continuam invisíveis ao público por estarem em `draft`. O upload real deve usar a API oficial do Storage; a inserção direta em `storage.objects` foi usada apenas como proxy técnico dentro do banco descartável.

## 5. Scripts preparados

Diretório não automático: `scripts/prepared/phase-05-w3b-5/`.

- `01-insert-fitness-products.sql`: transação, lock consultivo, baseline estrito, conflitos por código/slug/SKU, inserção de exatamente cinco produtos e pós-condições.
- `02-link-fitness-images.sql`: valida os cinco produtos, exige todos os objetos já presentes com path/MIME/tamanho corretos e cria exatamente uma imagem principal por produto.

SHA-256 finais:

- etapa 1: `6BB8DA20D35CA2648B63B23BB4C8E51373AD29287D40802293A53729B2111F1E`;
- etapa 2: `F0752402404D14097581A666B5A5A1809EB5AC5F32C76E77B113D349AFCBADEC`.

Ambos declaram **PREPARADO — NÃO EXECUTADO — AGUARDANDO AUTORIZAÇÃO** e estão fora de `supabase/migrations`. Não utilizam `ON CONFLICT DO UPDATE` e não alteram registros preexistentes.

## 6. Simulação local isolada

Ambiente: PostgreSQL 17.11 no container local `supabase_db_BELLMONT_LOJA`, database descartável `bellmont_sim_w3b5_20261020`, restaurado do backup W3B.3 e atualizado localmente com a migration `sales_mode` já aplicada no remoto.

Resultados:

- baseline restaurado: 43 produtos totais, 42 comerciais em `draft`, estoque comercial 1.200/0;
- primeira etapa: cinco inserções, IDs locais simulados 44–48;
- segunda execução da etapa 1: bloqueada por `FITNESS_PRODUCT_IDENTITY_CONFLICT`;
- proxy de cinco uploads criado somente no laboratório;
- segunda etapa: cinco vínculos de imagem criados;
- segunda execução da etapa 2: bloqueada por `FITNESS_IMAGE_METADATA_CONFLICT`;
- estado final simulado: 48 produtos totais, 47 comerciais, 47 comerciais em `draft`, zero ativos;
- cada IF possui uma imagem principal e zero variantes;
- estoque comercial permaneceu 1.200 físico e zero reservado;
- 84 movimentos totais permaneceram inalterados, correspondendo aos 80 comerciais e quatro técnicos do baseline;
- zero pedidos e zero reservas.

O database descartável foi removido após a coleta das evidências.

## 7. Comportamento comercial

A implementação local já possui testes cobrindo os 47 produtos e garante que `INQUIRY_ONLY`:

- aparece em catálogo/PDP/Quick View quando a fonte autorizada o publicar;
- participa de busca, filtros e favoritos;
- não entra na sacola por nenhuma rota;
- não cria pedido, reserva ou baixa de estoque;
- gera consulta individual para o WhatsApp IMPÉRIO FIT: `https://wa.me/556492659825`;
- permanece compatível com `WHATSAPP_ONLY` e com checkout online bloqueado.

## 8. Testes e regressão

- `npm test`: **86/86 aprovados**.
- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado**.
- `git diff --check`: **aprovado**.
- códigos, slugs e IDs locais dos 47 produtos: sem duplicações nos testes.
- cinco produtos Fitness: todas as imagens locais válidas.

## 9. Plano futuro de implantação

Cada grupo abaixo exige autorização própria:

1. **Banco — produtos:** confirmar backup, baseline e hashes; executar somente `01-insert-fitness-products.sql`; validar 47 comerciais, cinco IF em `draft/INQUIRY_ONLY`, estoque 1.200/0 e zero pedidos/reservas.
2. **Storage — uploads:** usar os IDs retornados, revalidar hashes locais e inexistência dos paths, enviar exatamente os cinco PNGs com Admin autorizado e sem sobrescrita.
3. **Banco — vínculos:** após comprovar os cinco uploads, executar somente `02-link-fitness-images.sql`; validar uma imagem principal por IF.
4. **Publicação:** não faz parte desta fase. Qualquer ativação requer nova autorização, revisão de completude comercial e testes públicos.

O catálogo anônimo deve permanecer vazio ao final das três primeiras etapas porque os 47 produtos continuarão em `draft`.

## 10. Plano de rollback específico

- Falha na inserção da etapa 1: a transação inteira reverte automaticamente.
- Produtos inseridos, sem uploads: após autorização específica, remover somente IF-01 a IF-05 se ainda estiverem em `draft/INQUIRY_ONLY`, sem dependências, pedidos, variantes, inventário ou movimentos.
- Upload parcial: não vincular metadados; registrar os paths enviados e, com autorização específica, excluir somente os objetos exatos.
- Falha na etapa de vínculos: a transação de metadados reverte; os objetos permanecem órfãos controlados até decisão autorizada.
- Rollback completo antes da ativação: remover vínculos exatos, objetos exatos e por último produtos IF, após revalidar ausência de dependências.
- Nunca executar rollback destrutivo automático nem afetar os 42 produtos existentes ou a fixture.

## 11. Riscos e ressalvas

1. Não há atomicidade entre PostgreSQL e Storage; as etapas controladas e o status `draft` mitigam imagem quebrada pública.
2. A deduplicação remota por conteúdo não é comprovável com os metadados atuais; os hashes locais devem ser preservados e comparados após upload quando o mecanismo permitir.
3. IDs remotos são gerados pelo banco; os paths só podem ser finalizados depois da etapa 1.
4. Nenhum tamanho, variante ou estoque está confirmado; os produtos devem permanecer `INQUIRY_ONLY`.
5. Proteções de Auth e avisos de Data API permanecem assuntos de segurança gerais já documentados, sem mudança nesta fase.

## 12. Parecer

**APTO PARA SOLICITAR AUTORIZAÇÃO.**

Os cinco produtos, imagens, preços, identidade comercial e destino WhatsApp foram conciliados; os scripts bloquearam repetição e passaram na simulação isolada; estoque e dados transacionais ficaram preservados. Ainda são necessárias autorizações explícitas e separadas para inserir os produtos, subir os arquivos, vincular as imagens e, futuramente, publicar qualquer item.

Nenhuma alteração remota, migration, upload, ativação, commit, push ou deploy foi realizada nesta fase.
