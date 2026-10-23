# BELLMONT + IMPÉRIO FIT — Fase 05.W3B.6B.LEGAL

**Conclusão técnica:** 22/10/2026  
**Classificação:** `GO COM RESSALVAS`

## 1. Dados cadastrais confirmados

Fonte: comprovante de inscrição e situação cadastral fornecido pelo proprietário em captura de tela.

- Razão social: **69.725.785 ANNA CAROLINA SANTOS NASCIMENTO**.
- CNPJ: **69.725.785/0001-66**.
- Situação cadastral: **ATIVA**.
- Município visível: **Itumbiara**.
- Natureza jurídica: **213-5 — Empresário (Individual)**.
- CNAE principal: **47.81-4-00 — Comércio varejista de artigos do vestuário e acessórios**.
- Atividade secundária relevante: **47.72-5-00 — Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal**.
- O comprovante não informa nome fantasia. BELLMONT não foi apresentada como nome fantasia oficialmente registrado.

O endereço cadastral completo, telefone e e-mail presentes no comprovante foram deliberadamente omitidos das páginas e deste relatório versionável. A captura corta parte dos campos de endereço e pode retratar endereço de natureza residencial. O documento não comprova loja física, retirada, recebimento de clientes ou devoluções nesse local.

## 2. Dados pendentes

- UF e complemento integral não estão legíveis na captura fornecida.
- Canal específico e formal para exercício de direitos de privacidade.
- Procedimento operacional de troca/devolução, endereço de retorno e responsável pelo pós-venda.
- Regiões atendidas, modalidades de envio, transportadoras, retirada e acompanhamento.
- Prazo operacional de reembolso.
- Revisão jurídica final e validação comercial das políticas.

Os telefones cadastrais do comprovante não foram usados como atendimento. O site preserva exclusivamente os contatos comerciais já confirmados no projeto: BELLMONT para Streetwear/Perfumaria e IMPÉRIO FIT para Fitness.

## 3. Páginas e rotas criadas

| Página | Rota HashRouter |
| --- | --- |
| Política de Privacidade | `#/privacidade` |
| Termos de Uso | `#/termos` |
| Trocas e Devoluções | `#/trocas-e-devolucoes` |
| Política de Entrega | `#/entregas` |
| Sobre a BELLMONT | `#/sobre` |

Todas usam o layout existente, navegação de retorno, foco visível herdado do design system, tipografia responsiva e avisos explícitos quando um procedimento depende de confirmação.

## 4. Auditoria do funcionamento real

- Sacola e favoritos usam `localStorage` no navegador.
- O catálogo público pode consultar Supabase quando essa fonte é habilitada.
- WhatsApp e Instagram são serviços externos abertos somente por ação do usuário.
- Google Fonts é carregado externamente pela folha de estilos atual.
- Não foram identificados analytics, cookies publicitários ou rastreadores de marketing no código auditado.
- O site está em `WHATSAPP_ONLY`: não processa pagamento, não confirma pedido, não reserva estoque e não calcula frete automaticamente.
- Streetwear e perfumes compartilham o atendimento BELLMONT; IMPÉRIO FIT mantém atendimento separado.

## 5. Links corrigidos

Os textos provisórios `Privacidade — em breve` e `Informações legais — em breve` foram removidos. O rodapé desktop e o acordeão mobile agora possuem os cinco links institucionais reais. A razão social e o CNPJ confirmados aparecem em uma linha discreta de identificação comercial.

## 6. Arquivos desta fase

- `src/data/institutionalPages.ts`
- `src/data/institutionalPages.test.ts`
- `src/pages/InstitutionalPage.tsx`
- `src/App.tsx`
- `src/components/layout/Footer.tsx`
- `src/styles/global.css`
- `docs/audits/2026-10-21-phase-05-w3b-6b-legal.md`

O workspace já continha numerosas alterações locais de fases anteriores. Elas foram preservadas; não houve reset, clean ou descarte.

## 7. Validação

- `npm test`: **102/102 aprovados**.
- `npm run build`: **aprovado**.
- `npm run build:cloudflare`: **aprovado**.
- `git diff --check`: **aprovado**, somente avisos preexistentes de conversão LF/CRLF.
- Navegação real: as cinco rotas abriram no servidor Vite via HashRouter.
- Inspeção desktop: Política de Privacidade e Sobre renderizaram com legibilidade e identidade consistentes.
- Foi detectado e corrigido overflow horizontal no título longo da página Sobre.
- Mobile: regras responsivas revisadas para coluna única, tipografia mínima legível, ações empilhadas e `overflow-x: clip`. Não havia runner de browser com viewport programável instalado; a homologação manual em 320–430 px continua recomendada antes da publicação.

## 8. Referências oficiais verificadas

- [Lei Geral de Proteção de Dados Pessoais — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Direitos dos titulares — ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares)
- [Código de Defesa do Consumidor — Lei 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm)

O texto preserva o direito de arrependimento legal de sete dias nas contratações fora do estabelecimento e não cria exclusão genérica para perfumes abertos, prazo fictício de reembolso ou restrição incompatível com o CDC.

## 9. Riscos residuais e parecer

O resultado é `GO COM RESSALVAS`: a implementação técnica está íntegra e coerente com a operação atual, mas a Política de Privacidade não deve ser publicada como definitiva sem um canal formal para os titulares. Trocas/devoluções e entrega também precisam dos procedimentos comerciais pendentes. A criação das páginas não substitui revisão jurídica profissional.

Nenhuma Home, catálogo, sacola, produto, dado remoto, migration, estoque, configuração Cloudflare ou regra comercial foi alterada nesta fase. Nenhum commit, push ou deploy foi realizado.
