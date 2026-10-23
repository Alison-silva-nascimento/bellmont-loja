# BELLMONT — 05.W3B.6B.0 — resultados mobile

Data: 2026-10-21  
Resultado: **HOMOLOGAÇÃO VISUAL NÃO CONCLUÍDA**

## Tentativas realizadas

O Vite iniciou corretamente em `127.0.0.1:5175`. O navegador isolado da automação não alcançou o localhost (`ERR_CONNECTION_TIMED_OUT`). Em seguida foram tentados Chrome e Edge corporativos em modo headless, com perfil temporário e sem bind público; ambos encerraram sem produzir screenshots. O processo Vite foi finalizado.

Não foram alterados firewall, proxy, rede, política do navegador ou portas públicas. Não foi criado túnel e não houve deploy temporário.

## Validado automaticamente

- 86 testes funcionais cobrem catálogo, busca, favoritos, sales mode, sacola, persistência, estoque, WhatsApps e bloqueio de checkout.
- CSS possui breakpoints mobile/tablet/desktop, safe areas, overflow horizontal protegido, scroll-snap e painéis móveis.
- Builds local e Cloudflare renderizam a árvore React sem erro de compilação.
- Fonte Supabase compila separadamente e não recorre a drafts.
- O checklist offline foi validado sintaticamente e persiste resultados no `localStorage`.

## Ainda exige validação humana

- Aparência real nos viewports 360×800, 390×844, 430×932, 768×1024 e 1440×900.
- Gestos, foco, teclado, modais, rolagem e ausência de controles encobertos.
- Imagens carregadas e recortes visuais reais.
- Abertura dos links WhatsApp no dispositivo do proprietário.

Ferramenta entregue: [release-mobile-checklist.html](./release-mobile-checklist.html). Ela contém 33 cenários, três estados, observações, resumo e exportação JSON/CSV; funciona offline e não integra a navegação pública.

## Como homologar

1. Executar `npm run dev -- --host 127.0.0.1` no workspace.
2. Abrir a URL local exibida pelo Vite em Chrome/Edge.
3. Abrir DevTools → modo responsivo e testar os cinco viewports.
4. Abrir `docs/audits/release-mobile-checklist.html` em outra aba.
5. Marcar cada teste, registrar falhas e exportar JSON ao concluir.
6. Não autorizar ativação/deploy se houver item crítico reprovado ou não testado.

