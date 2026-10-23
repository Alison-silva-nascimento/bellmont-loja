# BELLMONT — 05.W3B.6A.2 — validação mobile

Data: 2026-10-21  
Resultado: **NÃO HOMOLOGADO VISUALMENTE NESTE EXECUTOR**

## O que foi validado

- Build TypeScript/Vite local e Cloudflare concluídos.
- CSS possui proteção global contra overflow horizontal, breakpoints mobile, safe areas, carrosséis com scroll-snap, filtros em painel móvel e barra fixa da sacola com `safe-area-inset-bottom`.
- Rotas, catálogo, busca, favoritos, PDP, Quick View, sacola, WhatsApps e bloqueio de checkout são cobertos pela suíte de 86 testes.
- O modo Supabase foi compilado explicitamente; como os 47 produtos remotos estão em `draft`, a leitura anônima real permanece vazia e não recorre a drafts como fallback.

## Bloqueio da inspeção visual

O Vite iniciou com sucesso em `127.0.0.1:5174`, porém o navegador automatizado roda em isolamento de rede e retornou `net::ERR_CONNECTION_TIMED_OUT`. Não foram abertas portas públicas, alterado firewall ou feito bind externo para contornar a proteção. Portanto, não há evidência visual suficiente para declarar homologação em 320, 360, 375, 390 e 430 px.

## Checklist manual obrigatório

1. Abrir a Home em 320, 360, 375, 390 e 430 px e confirmar ausência de rolagem lateral.
2. Validar header/menu, busca, favoritos, carrosséis New Drop e Perfumaria, grupo oficial e rodapé.
3. Abrir Streetwear, Perfumaria e IMPÉRIO FIT; confirmar duas colunas ou carrossel conforme seção, imagens proporcionais e alvos de toque.
4. Abrir PDP/Quick View; Streetwear permite opções e sacola, perfumes/Fitness mostram consulta e nunca entram na sacola.
5. Testar sacola simples e mista; confirmar roteamento BELLMONT/IMPÉRIO FIT e que abrir WhatsApp não limpa a sacola.
6. Confirmar que `/checkout/*` redireciona para `/sacola` em `WHATSAPP_ONLY`.
7. Repetir em tablet e desktop e verificar teclado, foco visível e links externos.

Até esse checklist ser realizado por navegador com acesso ao localhost, a homologação mobile é uma pendência, não uma falha funcional confirmada.

