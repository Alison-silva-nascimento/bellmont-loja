# BELLMONT — Fase 05.W3B.6A.1 — próximos passos, backup e ativação

Este é um plano não executado. Não autoriza backup formal, alteração remota, ativação, commit, push ou deploy.

## Backup pós-Fitness

Destino sugerido fora do Git:

C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-21-pre-w3b6b

1. Confirmar projeto qbedfcdarmgiytlqntpf, PostgreSQL e 12 migrations.
2. Registrar baseline e fingerprints de produtos, variantes, imagens, inventário, movimentos, pedidos, reservas, policies e grants.
3. Exportar separadamente roles, schema e dados, sem credenciais em comandos ou relatórios.
4. Gerar archive custom da camada de aplicação.
5. Registrar data, ferramentas, versões, tamanho e SHA-256.
6. Gerar manifesto de storage.objects e product_images com bucket, path, MIME, tamanho, metadados e hashes.
7. Guardar bytes de Storage separadamente: dumps PostgreSQL preservam metadados, não objetos.
8. Documentar que secrets e configurações gerenciadas de Auth não integram o dump lógico.
9. Restaurar em PostgreSQL 17 isolado e descartável, nunca no comercial.
10. Comparar 48 produtos totais, 47 comerciais, 94 variantes comerciais, 57 imagens comerciais, estoque 1.200/0, 80 movimentos, zero pedidos/reservas, constraints, funções, policies e grants.
11. Interromper em qualquer erro de restauração, hash ou contagem.

O backup pre-w3b5e segue íntegro e restaurável, mas não contém IF-01 a IF-05 e não atende sozinho ao gate.

## Cloudflare Pages

No ambiente de build de produção, configurar explicitamente:

    VITE_PUBLIC_CATALOG_SOURCE=supabase

Manter a URL Supabase e a chave publicável. Nunca usar service_role, sb_secret_, senha ou connection string. Variáveis VITE_ entram no bundle durante o build; uma mudança só vale após novo build/deploy.

- local usa src/data/products.ts;
- supabase inicia em loading, lê somente active e mostra erro/estado vazio;
- falha/vazio no Supabase não aciona fallback local;
- .env.local permanece local, adequado ao desenvolvimento, não ao deploy remoto.

Antes da publicação, inspecionar o artefato e confirmar a fonte efetiva sem imprimir a chave.

## Roteiro manual mobile

Executar em 320, 360, 375, 390 e 430 px, depois tablet e desktop:

1. Home: header, primeira dobra, New Drop, perfumaria, carrosséis, grupo e rodapé.
2. Streetwear: 20 cards, imagem/nome/preço, busca, filtros e ordenação.
3. PDP Streetwear: P/M/G/GG, cor, variante, WhatsApp BELLMONT, adicionar, limitar, remover e persistir sacola.
4. Perfumaria: INQUIRY_ONLY, nenhum botão de sacola, oito itens sem volume não exibem volume fictício, WhatsApp BELLMONT.
5. IMPÉRIO FIT: IF-01 a IF-05, imagens/nome/preço, sem tamanho/estoque inventado, WhatsApp IMPÉRIO FIT.
6. Quick View: foco inicial, Escape, ciclo de Tab, CTA correto e retorno de foco.
7. Favoritos: adicionar/remover, F5 e alternância de fonte.
8. Sacola: múltiplos Streetwear, subtotal, limite da variante, F5, remoção e mensagem.
9. Links: WhatsApps oficiais e grupo em nova aba com noopener noreferrer.
10. Estados: loading, vazio, erro, produto inexistente e Consultar valor.
11. Layout: sem overflow, CTA visível, safe areas, contraste e áreas de toque.
12. Console/rede: zero erro crítico, imagens 2xx e nenhuma criação de pedido/reserva/movimento.

A ferramenta de navegador não alcançou o loopback do executor nas portas 5173/5174 e retornou ERR_CONNECTION_TIMED_OUT. O Vite iniciou corretamente em 127.0.0.1. Firewall e bind público não foram alterados.

## Sequência de pré-ativação

1. Autorizar e validar novo backup.
2. Aceitar nominalmente os oito perfumes sem volume como consulta.
3. Habilitar/testar proteção contra senhas vazadas ou aceitar o risco temporário.
4. Autorizar ativação nominal e transacional sem tocar preço/estoque/imagens.
5. Validar anon, fixture invisível e RPC sem quantidades.
6. Fazer smoke build com fonte Supabase.
7. Concluir roteiro mobile.
8. Autorizar Cloudflare, commit/push e deploy separadamente.

## Interrupção e recuperação

Interromper em migration inesperada, baseline divergente, imagem ausente, produto errado, INQUIRY_ONLY na sacola, WhatsApp incorreto, quantidade privada exposta ou fallback local.

Falha dentro da transação deve reverter integralmente. Após commit, qualquer retorno a draft exige autorização e deve atingir somente códigos afetados. Nunca restaurar dump completo automaticamente; preservar o estado real e avaliar dados posteriores.

## Próxima fase

Backup pós-Fitness com restauração isolada, seguido do aceite dos oito perfumes e do gate de Auth. Somente depois solicitar ativação.
