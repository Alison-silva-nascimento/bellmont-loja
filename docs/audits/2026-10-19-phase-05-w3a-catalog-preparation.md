# BELLMONT — Fase 05.W3A — Preparação e conciliação do catálogo

Data: 19/20 de outubro de 2026  
Projeto remoto auditado: `qbedfcdarmgiytlqntpf`  
Estado: **PREPARADO — NÃO EXECUTADO — AGUARDANDO AUTORIZAÇÃO**

## Resumo executivo

Os 46 produtos aprovados em escopo foram conciliados. Os 20 Streetwear estão tecnicamente consistentes para futura ativação. Os 22 perfumes e os quatro produtos IMPÉRIO FIT podem ser publicados somente como consulta, mas o modelo atual não representa explicitamente essa modalidade: depois de ativados, 14 perfumes com variantes seriam aceitos pela sacola no modo WhatsApp. Essa lacuna precisa ser corrigida antes da ativação.

Nenhum dado remoto, migration, policy, função, status, produto, variante, imagem ou estoque foi alterado.

## Estado confirmado

- Supabase: 42 produtos comerciais, todos `draft`; 20 Streetwear e 22 perfumes.
- 94 variantes comerciais: 80 Streetwear e 14 perfumes.
- 52 imagens comerciais; nenhum vínculo sem objeto correspondente no Storage.
- 80 linhas comerciais de inventário, todas Streetwear.
- 1.200 unidades físicas e 0 reservadas: 15 por P/M/G/GG em cada Streetwear.
- 0 códigos, slugs ou SKUs duplicados.
- Catálogo local: 46 produtos; todos os 56 assets únicos referenciados existem em `public/assets`.
- IMPÉRIO FIT: quatro registros somente locais, sem código remoto aprovado, variante ou estoque.

A conciliação produto a produto está em [2026-10-19-phase-05-w3a-product-reconciliation.csv](./2026-10-19-phase-05-w3a-product-reconciliation.csv).

## Respostas obrigatórias

### 1. Os 20 Streetwear estão prontos para ativação?

**Sim, tecnicamente, com autorização ainda pendente.** Todos têm código `ST-01..ST-20`, correspondência local/remota única, preço R$ 80, imagens, quatro variantes P/M/G/GG, cor coerente, 60 unidades físicas por modelo e reserva zero. A disponibilidade pública passará a ser calculada somente após `active`. Nenhum dado comercial precisa ser alterado para ativá-los.

### 2. Os 22 perfumes podem ser exibidos apenas para consulta?

**Sim, após uma adequação de modalidade.** Preços e imagens estão conciliados; 14 têm volume confirmado e oito não têm variante/volume confirmado. Entretanto, a aplicação hoje considera variantes `unconfirmed` selecionáveis na sacola WhatsApp. Logo, apenas ativar os perfumes violaria a regra `INQUIRY_ONLY` para os 14 com variante.

### 3. Os quatro IMPÉRIO FIT podem ser integrados sem duplicação?

**Sim, mediante aprovação prévia de códigos estáveis.** Slugs e IDs locais são únicos, não existe correspondência remota e as imagens locais existem. Não se atribuiu código arbitrário nesta fase. A inserção futura deve usar upsert/checagem por código e slug, uma imagem por produto, `brand='imperio-fit'`, `category='fitness'`, modalidade `INQUIRY_ONLY`, sem variantes e sem inventário.

### 4. O frontend suporta os dois modos comerciais?

**Parcialmente.** Suporta compra assistida, consulta individual, roteamento por loja e bloqueio de checkout. Porém a modalidade não é atributo do produto; ela é inferida por preço/variantes/categoria. Isso não garante que todo perfume continue somente consulta após ativação.

### 5. Há necessidade de migrations adicionais?

**Recomendado: sim.** Proposta mínima para a W3B, ainda não criada/aplicada:

- coluna explícita `sales_mode` em `products`, com valores `assisted_purchase`, `inquiry_only`, `disabled`;
- valor inicial seguro `disabled` ou derivação controlada, nunca ativação implícita;
- incluir `sales_mode` na leitura pública e tipos TypeScript;
- PDP/sacola respeitarem o valor, não a categoria;
- Admin permitir alteração somente a administradores;
- testes RLS e de regressão.

`status` continua controlando visibilidade; `sales_mode` controla a ação comercial. Estoque não deve ser usado para representar modalidade.

### 6. Dados dependentes de confirmação

- Código estável dos quatro Fitness.
- Confirmação comercial final dos quatro preços Fitness antes da inserção.
- Aprovação formal de exibição/ativação dos 46 produtos.
- Fabricante ainda nulo em sete perfumes, aceitável como “não informado”.
- Volumes de PF-05, PF-07, PF-09, PF-14, PF-17, PF-19, PF-20 e PF-22 continuam não confirmados.

### 7. Riscos de segurança restantes

- Proteção contra senhas vazadas permanece desativada no Supabase Auth; habilitação recomendada pelo Dashboard antes de ampliar uso administrativo.
- `public.is_current_user_admin()` é `SECURITY DEFINER`, owner `postgres`, `search_path=''`, não executável por `anon`/`PUBLIC` e executável por `authenticated`. A função retorna apenas `auth.uid() IS NOT NULL AND private.is_admin()`. O abuso direto por não-admin resulta `false`; o risco residual é superfície pública privilegiada e dependência da correção de `private.is_admin()`.
- A função é usada pelo guard do Admin; as policies usam majoritariamente `private.is_admin()`. Não remover sem ajustar o frontend.
- Recomendação futura: manter o wrapper mínimo ou mover a verificação para RPC em schema dedicado/não exposto, preservando um endpoint seguro para o guard; repetir advisors e testes RLS.

### 8. Sequência exata para 05.W3B

Detalhada em [2026-10-19-phase-05-w3a-release-plan.md](./2026-10-19-phase-05-w3a-release-plan.md): aprovar códigos/matriz; backup; migration de modalidade; adaptar frontend; inserir somente Fitness; validar; ativar em lote controlado; smoke test; depois commit/push/deploy sob autorizações separadas.

### 9. Operações que exigem autorização explícita

Migration `sales_mode`; inserção dos quatro Fitness; upload/vínculo de imagens; alteração de status dos 46 produtos; mudanças de Auth; commit; push; configuração/deploy Cloudflare; domínio/DNS. Estoque, reservas e movimentos permanecem fora do escopo.

### 10. Parecer final

**PRONTO COM RESSALVAS PARA A W3B; NÃO PRONTO PARA ATIVAÇÃO DIRETA.** Streetwear está pronto. A publicação dos 26 itens de consulta depende de modalidade explícita e dos códigos Fitness aprovados.

## Compatibilidade Cloudflare

- `npm run build:cloudflare`: aprovado; `dist`, base `/`.
- `public/_redirects`: `/* /index.html 200`.
- Produção deve usar `VITE_PUBLIC_CATALOG_SOURCE=supabase` somente depois da ativação controlada.
- Requer `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; ambos são valores públicos sujeitos a RLS.
- Nenhuma chave secret/service-role deve ser usada no frontend.

## Validações executadas

- `npm test`: 81/81.
- `npm run build`: aprovado.
- `npm run build:cloudflare`: aprovado.
- `git diff --check`: aprovado.
- Integridade CSV: 46 linhas, 46 identificadores locais, 20/22/4 por categoria.
- Nenhuma escrita remota foi executada.

Referências atuais: [segurança de dados](https://supabase.com/docs/guides/database/secure-data), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [proteção de senha](https://supabase.com/docs/guides/auth/password-security) e [segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api).
