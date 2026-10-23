# BELLMONT — Fase 05.W3B.1 — Sales Mode local

Data da validação: 2026-10-20  
Projeto remoto de referência: `qbedfcdarmgiytlqntpf`  
Resultado: **PRONTO PARA SOLICITAR IMPLANTAÇÃO CONTROLADA, COM ORDEM DE DEPLOY OBRIGATÓRIA**

## Escopo e preservação

Esta fase foi implementada e validada localmente. A migration foi aplicada somente no Supabase local. Nenhuma migration foi enviada ao projeto hospedado, nenhum produto foi ativado e nenhum preço, estoque, movimento, pedido, reserva, policy ou grant remoto foi alterado. Não houve commit, push ou deploy.

O workspace já continha alterações não commitadas de fases anteriores. Elas foram preservadas integralmente. A lista abaixo identifica apenas os arquivos diretamente criados ou adaptados para esta fase.

## Modalidades implementadas

- `ASSISTED_PURCHASE`: exige modalidade explícita, variante válida e não esgotada; permite a sacola assistida e o atendimento via WhatsApp, sem criar pedido, reserva ou pagamento.
- `INQUIRY_ONLY`: permite navegação, favoritos, PDP, Quick View e consulta direta pelo WhatsApp; não entra na sacola por nenhuma função pública do frontend.
- `DISABLED`: estado seguro para registros técnicos ou sem ação comercial.

O estado de publicação continua independente em `products.status`. A leitura pública Supabase continua aceitando somente `active`; `draft` e `archived` permanecem invisíveis.

## Mapeamento dos 47 produtos

- 20 Streetwear (`ST-01` a `ST-20`): `ASSISTED_PURCHASE`.
- 22 perfumes (`PF-01` a `PF-22`): `INQUIRY_ONLY`.
- 5 Fitness: `IF-01` Macaquinho Ana; `IF-02` Macaquinho Fitness — Preto; `IF-03` Conjunto Iza; `IF-04` Conjunto Fitness — Preto; `IF-05` Conjunto Jasmim: `INQUIRY_ONLY`.

Os códigos `IF-01` a `IF-05` foram verificados por consulta somente leitura no banco remoto: não existem códigos nem slugs conflitantes. Eles foram associados apenas ao catálogo local. O `IF-05` usa a foto original fornecida, tem preço confirmado de R$ 240,00, não possui variante ou estoque inventado e permanece somente para consulta.

## Migration preparada

Arquivo: `supabase/migrations/20261020102806_phase_05_w3b_1_product_sales_mode.sql`

A migration:

1. adiciona `products.sales_mode` como `text not null`;
2. usa o padrão seguro `INQUIRY_ONLY`;
3. limita valores com `CHECK` a `ASSISTED_PURCHASE`, `INQUIRY_ONLY` e `DISABLED`;
4. classifica exclusivamente `ST-01..ST-20` como compra assistida;
5. mantém `PF-01..PF-22` como consulta;
6. classifica `TEST-FIXTURE-01` como desabilitada;
7. não altera `status`, RLS, grants, policies, inventário, pedidos ou reservas.

Plano de reversão anterior a uma release dependente: remover a coluna. Depois que o frontend ou novos registros dependerem dela, a reversão deve ser planejada, pois o `DROP COLUMN` elimina as classificações.

A migration foi aplicada com sucesso **somente no banco local**. O histórico remoto não foi alterado.

## Frontend e domínio

Arquivos da fase:

- `src/types/product.ts`
- `src/data/products.ts`
- `src/data/catalogIdentity.ts`
- `src/data/assistedCatalog.ts`
- `src/services/publicCatalog.ts`
- `src/lib/supabase/database.types.ts`
- `src/utils/cart.ts`
- `src/utils/whatsappOrder.ts`
- `src/pages/ProductPage.tsx`
- `src/components/commerce/QuickView.tsx`
- `src/admin/domain/adminProductForm.ts`
- `src/admin/pages/AdminProductFormPage.tsx`

Testes criados ou adaptados:

- `src/data/catalogIdentity.test.ts`
- `src/data/assistedCatalog.test.ts`
- `src/services/publicCatalog.test.ts`
- `src/utils/cart.test.ts`
- `src/utils/whatsappOrder.test.ts`
- `src/admin/domain/adminProductForm.test.ts`
- `supabase/tests/phase_05_w3b_1_product_sales_mode.test.sql`

A normalização central atribui a modalidade por código comercial conhecido. Qualquer produto não reconhecido falha de forma segura como `INQUIRY_ONLY`. A sacola, a restauração do localStorage e a geração de mensagens de pedido exigem `ASSISTED_PURCHASE`; portanto, alterar a interface ou forjar estado local não torna perfume ou Fitness comprável. PDP e Quick View exibem somente consulta para `INQUIRY_ONLY`.

## Segurança

### `public.is_current_user_admin()`

Auditoria read-only confirmou:

- `SECURITY DEFINER`;
- proprietário `postgres`;
- `search_path` vazio;
- referência qualificada a `private.is_admin()`;
- `EXECUTE` concedido a `authenticated`;
- sem `EXECUTE` para `anon` ou `PUBLIC`;
- decisão baseada em `auth.uid()` e na allowlist administrativa.

O desenho é adequado para o guard administrativo atual: usuários autenticados comuns podem chamar o predicado, mas recebem `false` e não ganham privilégios. Deve-se preservar a ausência de acesso direto do público aos objetos internos do schema `private`. Nenhuma função foi modificada nesta fase.

### Proteção contra senhas vazadas

O Security Advisor remoto ainda informa que a proteção contra senhas vazadas está desabilitada. Isso não foi alterado, conforme a restrição da fase. Antes da publicação administrativa, habilitar a verificação de senhas comprometidas em Auth > Password Security, se disponível no plano contratado, e repetir login, recuperação e troca de senha. Se o recurso não estiver disponível, registrar o risco residual e aplicar política de senha forte até reavaliar o plano.

Referências oficiais: [Database security](https://supabase.com/docs/guides/database/secure-data), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [Password security](https://supabase.com/docs/guides/auth/password-security).

## Resultados

- `npm test`: **85/85 aprovados**.
- `npx supabase test db --local`: **397 assertions aprovadas**, incluindo 10/10 de `sales_mode`.
- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado**.
- `git diff --check`: **aprovado**, sem erros; apenas avisos de conversão LF/CRLF e do drive de configuração do Git.
- Migration local: **aplicada com sucesso no Supabase local**.
- Supabase remoto: **não alterado**.

## Pendências e ordem de implantação

1. revisar e autorizar explicitamente a migration;
2. obter/verificar backup recuperável e conferir novamente o projeto de destino;
3. aplicar somente `20261020102806_phase_05_w3b_1_product_sales_mode.sql`;
4. validar coluna, constraint, classificações dos 42 produtos e preservação de RLS/estoque/status;
5. somente depois publicar o frontend que seleciona `sales_mode`.

O frontend preparado consulta a nova coluna; portanto, ele não deve ser publicado no modo Supabase antes da migration remota. Os cinco produtos Fitness continuam na fonte local e exigirão uma etapa separada de cadastro/migração caso devam existir no Supabase.

## Parecer final

**APTO para solicitar autorização da implantação controlada.** A regra comercial está centralizada, falha de forma segura e foi coberta em frontend e PostgreSQL local. Permanecem pendentes a aplicação remota autorizada, a validação pós-migration, a futura ativação comercial dos produtos e o tratamento da proteção contra senhas vazadas. Nenhuma dessas ações foi executada nesta fase.
