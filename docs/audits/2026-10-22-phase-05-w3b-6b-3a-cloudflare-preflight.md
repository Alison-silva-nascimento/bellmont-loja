# BELLMONT + IMPÉRIO FIT — Fase 05.W3B.6B.3A

## Preflight final Cloudflare Pages

**Data:** 22 de outubro de 2026  
**Modo:** inspeção e preparação; nenhuma publicação executada  
**Parecer:** **NO-GO**

## 1. Resumo executivo

O código e o artefato Cloudflare estão tecnicamente íntegros. O build produzido explicitamente com `VITE_PUBLIC_CATALOG_SOURCE=supabase` carregou os 47 produtos públicos reais, preservou a Home editorial 6/6/4, as coleções completas e as rotas institucionais.

A publicação ainda não deve ser executada porque o projeto Cloudflare Pages e suas variáveis de Production não puderam ser identificados ou comprovados por configuração local/autenticada. Além disso, `bellmontloja.com.br` possui zona DNS, mas não apresentou registro A/AAAA utilizável e não respondeu por HTTPS no preflight.

## 2. Git e origem da publicação

| Item | Estado confirmado |
|---|---|
| Repositório local | `C:\DEV PARTICULAR\BELLMONT LOJA` |
| Remoto | `https://github.com/Alison-silva-nascimento/bellmont-loja.git` |
| Branch atual e planejada para produção | `main` |
| Último commit atual | `09b2e5987a67651611e230f8792583b37b1fd604` |
| Alterações tracked não commitadas antes deste relatório | 39 |
| Arquivos staged | 0 |
| Arquivos untracked antes deste relatório | 121 |

O workspace contém todo o desenvolvimento acumulado ainda não consolidado. Um deploy por integração Git não publicará esse estado até que exista commit e push autorizados.

Existe workflow para **GitHub Pages** em `.github/workflows/deploy-pages.yml`, acionado por push em `main`, usando `npm run build`. Esse workflow não comprova nem configura Cloudflare Pages.

## 3. Projeto Cloudflare Pages

- Não existe `wrangler.toml`, `wrangler.json` ou configuração equivalente no repositório.
- Wrangler não está instalado/disponível localmente.
- Não foi encontrada sessão/API autenticada que permita listar projetos Pages.
- O nome `bellmont-loja.pages.dev` aparece somente como planejamento em auditorias anteriores; não foi confirmado externamente.
- O método efetivo de deploy Cloudflare (integração Git ou Wrangler) permanece **não comprovado**.

### Configuração recomendada para confirmação no painel

- Repositório: `Alison-silva-nascimento/bellmont-loja`.
- Branch de produção: `main`.
- Build command: `npm run build:cloudflare`.
- Output directory: `dist`.
- Root directory: raiz do repositório.
- Versão Node compatível: 22.

Integração Git é o caminho preferencial para este repositório, mas isso somente deve ser registrado como efetivo depois de conferência no painel Cloudflare.

## 4. Variáveis públicas

Variáveis exigidas no ambiente **Production** do Pages:

- `VITE_PUBLIC_CATALOG_SOURCE=supabase`;
- `VITE_SUPABASE_URL`, apontando para o projeto `qbedfcdarmgiytlqntpf`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`, com uma chave publicável ativa.

Verificação local segura:

- URL local corresponde ao projeto esperado;
- publishable key está presente;
- `.env.local` está ignorado pelo Git;
- nenhum nome de `service_role`, `sb_secret_`, senha administrativa, `DATABASE_URL` ou `JWT_SECRET` foi encontrado em `.env.local`;
- o ambiente local persistente continua com `VITE_PUBLIC_CATALOG_SOURCE=local`;
- o build Cloudflare deste preflight recebeu `supabase` somente por variável temporária do processo;
- nenhum valor sensível foi impresso ou documentado.

As variáveis efetivas de **Production no Cloudflare não foram comprovadas**. Um build local aprovado não substitui essa confirmação.

## 5. Build Cloudflare

- Script: `npm run build:cloudflare`.
- Saída: `dist`.
- Base Vite em modo Cloudflare: `/`.
- Fallback SPA: `dist/_redirects` contém `/* /index.html 200`.
- Referências de assets: caminhos de raiz `/assets/...`.
- Busca no bundle por indicadores proibidos: zero ocorrências.

O artefato foi compilado explicitamente com fonte Supabase e servido localmente em preview. O catálogo remoto foi carregado com sucesso.

## 6. Catálogo e funcionalidades validadas

### Supabase remoto — leitura apenas

- 47 produtos comerciais ativos.
- 20 Streetwear.
- 22 perfumes.
- 5 IMPÉRIO FIT.
- A consulta sob o papel `anon` retornou exatamente 47 produtos ativos e nenhum registro não ativo.
- A fixture arquivada não ficou visível ao papel público.

### Artefato Cloudflare em preview

| Verificação | Resultado |
|---|---|
| Home Streetwear | 6 produtos |
| Home fragrâncias | 6 produtos |
| Home Fitness | 4 produtos |
| Catálogo completo | 47 produtos |
| `/streetwear` | 20 produtos |
| `/perfumes` | 22 produtos |
| `/imperio-fit` | 5 produtos |
| Grupo oficial antes do rodapé | confirmado |
| HashRouter | confirmado nas rotas testadas |
| Busca | rota funcional |
| Favoritos | rota e estado vazio funcionais |
| Sacola | rota e estado vazio funcionais |
| Cinco páginas institucionais | confirmadas |
| Identificação legal | BELLMONT e CNPJ presentes no rodapé |

Os 112 testes automatizados confirmam adicionalmente:

- Streetwear e perfumes na sacola BELLMONT;
- exclusão de Fitness da sacola BELLMONT e atendimento separado;
- favoritos, busca e aliases estáveis;
- seleção de variantes e limites de disponibilidade;
- WhatsApp-only sem pedido, pagamento ou reserva automáticos;
- dados institucionais e cinco rotas legais.

## 7. Responsividade

O preview não apresentou overflow horizontal nas larguras 360, 390, 430, 768 e 1440 px. As vitrines permaneceram em 6/6/4.

Em 320 px, o emulador com barra de rolagem não sobreposta reduziu a largura útil para 305 px, enquanto `body` mantém `min-width: 320px`, produzindo 15 px de overflow. Em smartphones com scrollbar sobreposta isso pode não se manifestar, mas deve ser corrigido ou aceito explicitamente antes do release para cumprir a validação estrita em 320 px.

## 8. Domínio e HTTPS

- Domínio planejado: `bellmontloja.com.br`.
- A consulta DNS retornou somente autoridade da zona (SOA), sem destino A/AAAA utilizável no teste.
- A conexão HTTPS falhou por ausência de resolução para o host.
- Não foi possível confirmar certificado TLS, redirecionamento ou vínculo com Pages.

O domínio deve ser conectado somente depois do primeiro deployment Pages aprovado e de smoke tests no domínio `pages.dev`.

## 9. Pendências institucionais e comerciais

1. Comprovante cadastral atualizado ainda não foi apresentado; o documento anterior contém endereço diferente do endereço público autorizado.
2. Confirmar formalmente como será feita a emissão fiscal das vendas IMPÉRIO FIT.
3. Confirmar responsável e fluxo completo de pós-venda da IMPÉRIO FIT.
4. Definir endereço/logística de troca e devolução; o endereço público não deve ser presumido para essa finalidade.
5. Obter ciência formal das ressalvas jurídicas registradas na LEGAL.2.

## 10. Testes executados

| Comando/verificação | Resultado |
|---|---|
| `npm test` | 112/112 aprovados |
| `npm run build` — execução 1 | aprovado |
| `npm run build` — execução 2 | aprovado |
| `npm run build:cloudflare` com fonte Supabase temporária | aprovado |
| `git diff --check` | aprovado |
| Fallback `_redirects` | aprovado |
| Assets com base `/` | aprovado |
| Varredura de indicadores de segredos no bundle | zero ocorrências |
| Preview com catálogo Supabase | 47 produtos carregados |

## 11. Plano exato de publicação

### Gate A — Cloudflare

1. Identificar ou criar o projeto Pages correto no painel.
2. Confirmar repositório, branch `main`, comando `npm run build:cloudflare` e saída `dist`.
3. Configurar e conferir as três variáveis públicas no ambiente **Production**.
4. Não cadastrar segredo administrativo no frontend.
5. Registrar o deployment atualmente elegível para rollback, se houver.

### Gate B — código

1. Revisar a lista completa de alterações locais.
2. Resolver ou aceitar formalmente a ressalva de 320 px.
3. Reexecutar testes, build Cloudflare com fonte Supabase e `git diff --check`.
4. Fazer commit e push somente após autorização específica.

### Gate C — primeiro deployment

1. Publicar primeiro no domínio `pages.dev`.
2. Executar smoke tests: Home 6/6/4, coleções 20/22/5, PDP, variantes, favoritos, busca, sacola BELLMONT, WhatsApps, institucionais e console/rede.
3. Confirmar que o bundle de Production usa Supabase e que a fixture não aparece.

### Gate D — domínio

1. Vincular `bellmontloja.com.br` somente após aprovação do smoke test.
2. Configurar DNS conforme instrução exibida pelo Pages.
3. Aguardar certificado HTTPS ativo.
4. Repetir todos os smoke tests no domínio final.

## 12. Rollback

1. Em falha de frontend, promover no Pages o deployment anterior conhecido como estável.
2. Se a integração Git gerar regressão, reverter por novo commit autorizado; não reescrever histórico.
3. Não alterar produtos, status, estoque ou Supabase automaticamente para corrigir falha de frontend.
4. Se o domínio falhar, manter ou restaurar o destino DNS anterior e continuar o diagnóstico no `pages.dev`.
5. Preservar logs e o identificador do deployment falho para investigação.

## 13. Parecer

**NO-GO para deploy imediato.**

O código e o artefato estão aprovados, e a fonte Supabase foi comprovada em preview com os 47 produtos. O bloqueio é operacional: projeto Pages, método efetivo, variáveis Production, deployment anterior e domínio/HTTPS ainda não estão comprovados. A publicação poderá mudar para **GO COM RESSALVAS** quando esses pontos forem verificados e a questão de 320 px for corrigida ou formalmente aceita.

Nenhum commit, push, deploy, alteração Cloudflare, alteração DNS, alteração Supabase ou migration foi executado.
