# BELLMONT — Fase 05.W3B.6A — plano controlado de ativação

Este documento é somente um plano. Não autoriza escrita remota, commit, deploy ou ativação.

## Classificação

- **APTO:** 35 produtos — ST-01 a ST-20; PF-01, PF-02, PF-03, PF-04, PF-06, PF-08, PF-10, PF-11, PF-12, PF-13, PF-15, PF-16, PF-18, PF-21; IF-05.
- **APTO COM RESSALVAS:** 12 produtos — PF-05, PF-07, PF-09, PF-14, PF-17, PF-19, PF-20, PF-22; IF-01 a IF-04.
- **BLOQUEADO por dado do produto:** 0.

As ressalvas não autorizam inventar informação: oito perfumes não têm volume confirmado e quatro Fitness não têm descrição comercial. Fabricante `NULL` em perfumaria é uma representação aprovada e o frontend exibe “Fabricante não informado”.

## Pré-condições obrigatórias

1. Gerar novo backup lógico após a inserção dos cinco Fitness e validar restauração isolada; registrar separadamente bytes/hashes de Storage e limitações de Auth.
2. Decidir comercialmente se os 12 itens com ressalvas serão ativados como consulta ou mantidos em `draft` até complementação.
3. Confirmar no ambiente Cloudflare `VITE_PUBLIC_CATALOG_SOURCE=supabase`; o build local atual usa `local` e poderia mascarar o catálogo remoto.
4. Revalidar que o modo comercial é `WHATSAPP_ONLY`, checkout está inacessível e os dois números oficiais permanecem corretos.
5. Aceitar ou remediar, em autorização separada, proteção de senhas vazadas e a superfície de `is_current_user_admin()`.
6. Capturar snapshot read-only: 48 produtos totais, 47 comerciais `draft`, 94 variantes comerciais, 57 imagens comerciais, 1.200 físicas, 0 reservadas, 80 movimentos, 0 pedidos e 0 reservas.

## Sequência proposta com pontos de parada

1. **Gate de backup:** criar e restaurar o novo backup. Interromper em qualquer divergência de hash/contagem.
2. **Gate de conteúdo:** aprovar lista nominal e separar lote sem ressalvas do lote com ressalvas.
3. **Ativação mínima:** em transação explícita, alterar somente `status` dos códigos autorizados, exigindo estado anterior `draft`, `sales_mode` esperado e contagem exata. Não tocar preço, estoque, variantes ou imagens.
4. **Validação imediata:** consultar códigos/status; executar leitura `anon`; confirmar fixture invisível e payload sem inventário exato.
5. **Smoke test sem deploy:** build com fonte Supabase explicitamente injetada; validar Home, listagens, busca, filtros, PDP, Quick View, favoritos, sacola Streetwear, consulta Perfumaria/Fitness e WhatsApps.
6. **Publicação frontend:** somente em autorização posterior, após confirmar variáveis Cloudflare e artefato sem segredos.
7. **Observação:** validar erros de console, imagens, métricas e atendimento; não interpretar abertura do WhatsApp como venda.

## Critérios de interrupção

- contagens, hashes, preço, modalidade, estoque ou status divergirem do snapshot;
- migration pendente inesperada;
- qualquer produto `DISABLED`, fixture, draft não autorizado ou variante inativa aparecer para `anon`;
- quantidade exata de inventário aparecer na Data API pública;
- item `INQUIRY_ONLY` entrar na sacola;
- WhatsApp de categoria apontar para loja errada;
- build usar catálogo local ou fallback silencioso;
- imagem ausente/órfã, erro de RLS, console crítico ou regressão nos testes.

## Validação e recuperação

- Registrar antes/depois por código e fingerprints de produtos, variantes, imagens, inventário, movimentos, policies e grants.
- Se a ativação transacional falhar, a própria transação deve reverter integralmente.
- Se a validação pós-commit falhar, não “corrigir no improviso”: pausar publicação, manter frontend anterior e solicitar autorização para devolver apenas os códigos afetados a `draft`.
- Não restaurar dump por cima do banco comercial automaticamente. Movimentos e dados posteriores tornam restauração total uma decisão de incidente.
- Falha parcial de rede deve ser resolvida por nova leitura do estado real, nunca por repetição cega.

## Autorizações adicionais necessárias

- novo backup e teste de restauração;
- aceite/correção dos 12 itens com ressalvas;
- ativação nominal dos produtos;
- configuração Cloudflare para fonte Supabase;
- commit, push e deploy;
- qualquer mudança de Auth, RLS, grants ou função administrativa.
