# BELLMONT V1 — Auditoria e correção de sitemap e indexação SEO

Data: 23 de outubro de 2026

Domínio canônico: `https://bellmontloja.com.br`

Estado da auditoria: implementação validada localmente. Publicação autorizada em 26 de outubro de 2026, condicionada à repetição dos testes e à validação pós-deploy.

## Diagnóstico

- O `sitemap.xml` publicado contém nove URLs relativas e inclui páginas utilitárias que não devem ser indexadas.
- O projeto publicado utiliza `HashRouter`, embora o Cloudflare Pages já entregue `index.html` para rotas desconhecidas por meio de `public/_redirects`.
- A página base possuía apenas título e descrição genéricos, sem canonical por rota.
- O `robots.txt` publicado é combinado pelo Cloudflare com regras gerenciadas de Content Signals. A busca convencional permanece permitida, mas o sitemap informado pelo projeto ainda era relativo.
- O domínio oficial, o sitemap, o robots e a rota direta `/streetwear` responderam HTTP 200 na auditoria remota somente leitura.

## Correções locais

- Migração de `HashRouter` para `BrowserRouter`, usando o `BASE_URL` do Vite.
- Compatibilidade com links antigos `#/...`: o endereço é convertido para a rota convencional antes da renderização.
- Canonical absoluto, título, description, robots, Open Graph e Twitter por rota.
- `noindex, nofollow` para sacola, favoritos, busca, checkout, desenvolvimento, Admin e páginas inexistentes.
- Cabeçalho `X-Robots-Tag` preparado no Cloudflare para rotas utilitárias e restritas.
- Sitemap XML com 58 URLs absolutas, sem fragmentos e sem duplicações.
- Robots com sitemap absoluto e bloqueios das rotas não indexáveis.

## URLs indexáveis

Páginas principais e institucionais:

- `https://bellmontloja.com.br/`
- `https://bellmontloja.com.br/streetwear`
- `https://bellmontloja.com.br/imperio-fit`
- `https://bellmontloja.com.br/perfumes`
- `https://bellmontloja.com.br/produtos`
- `https://bellmontloja.com.br/contato`
- `https://bellmontloja.com.br/privacidade`
- `https://bellmontloja.com.br/termos`
- `https://bellmontloja.com.br/trocas-e-devolucoes`
- `https://bellmontloja.com.br/entregas`
- `https://bellmontloja.com.br/sobre`

Produtos:

- As 47 URLs canônicas `/produto/{slug}` dos produtos comerciais conhecidos foram incluídas em `public/sitemap.xml` e conferidas automaticamente contra o catálogo local conciliado.

Exclusões confirmadas:

- `/sacola`
- `/favoritos`
- `/buscar`
- `/checkout/*`
- `/admin/*`
- `/dev/*`

## Validação

- `npm test`: 119/119 aprovados.
- `npm run build`: aprovado.
- `npm run build:cloudflare`: aprovado.
- `git diff --check`: aprovado.
- XML: válido.
- URLs do sitemap: 58.
- URLs relativas: zero.
- Fragmentos `#`: zero.
- Duplicações: zero.
- Produtos no sitemap: 47, correspondentes aos 47 slugs comerciais conhecidos.

## Limitações restantes

- A aplicação continua sendo uma SPA client-side. Google normalmente renderiza JavaScript, mas crawlers que não executam JavaScript recebem inicialmente os metadados genéricos do `index.html`. Metadados de produto e canonical por rota são aplicados após o carregamento do React.
- Pré-renderização ou SSR seria uma evolução futura para entregar HTML e metadados específicos já na primeira resposta, principalmente para PDPs e compartilhamento em redes sociais.
- O sitemap de produtos deve ser atualizado quando produtos forem incluídos, removidos, arquivados ou tiverem slug alterado. Nesta versão ele é validado contra o catálogo local conciliado de 47 produtos.
- Dados estruturados JSON-LD (`Organization`, `WebSite`, `Product` e breadcrumbs) ainda não foram implementados.
- Após a publicação, o sitemap deve ser reenviado no Google Search Console e as rotas principais devem ser inspecionadas pela ferramenta de URL.

## Parecer

**PRONTO PARA COMMIT E DEPLOY SOB AUTORIZAÇÃO**, com a limitação conhecida de renderização client-side descrita acima.
