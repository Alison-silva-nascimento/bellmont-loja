# BELLMONT — Fase 05.W3B.6A.1 — saneamento pré-ativação

Data: 2026-10-21  
Projeto remoto: qbedfcdarmgiytlqntpf  
Classificação: **APTO COM RESSALVAS**  
Escopo: remoto somente leitura; código preservado; quatro documentos locais criados.

## Resultado

Os 12 produtos foram reavaliados contra a matriz anterior, catálogo local, manifestos Fitness e Supabase remoto.

- **39 APTO SEM RESSALVAS** no conjunto total: os 35 anteriores e IF-01 a IF-04, cujas descrições longas são opcionais.
- **8 APTO PARA CONSULTA COM RESSALVA ACEITA**: PF-05, PF-07, PF-09, PF-14, PF-17, PF-19, PF-20 e PF-22, sem volume confirmado.
- **0 AGUARDANDO CONFIRMAÇÃO COMERCIAL** para identidade, imagem ou preço.
- **0 BLOQUEADO PARA PUBLICAÇÃO** por dado.

Os oito perfumes podem ser apresentados apenas como INQUIRY_ONLY: o frontend omite volume ausente, não cria variante, não permite sacola e informa que opções, disponibilidade, frete e pagamento serão confirmados. Um volume só pode aparecer após confirmação.

## Baseline remoto

| Controle | Resultado |
|---|---:|
| Produtos totais / comerciais | 48 / 47 |
| Streetwear / perfumes / Fitness | 20 / 22 / 5 |
| Comerciais draft / active | 47 / 0 |
| Fixture DISABLED | 1 |
| Estoque físico / reservado | 1.200 / 0 |
| Movimentos comerciais | 80 |
| Pedidos / reservas | 0 / 0 |
| Migrations local/remoto | 12 / 12 |
| Leitura anon | 0 produtos, variantes, imagens e disponibilidades |

Nenhuma divergência ou escrita remota ocorreu.

## Decisões individuais

### Perfumaria — categoria B

Os oito perfumes possuem nome, imagem primária, preço e INQUIRY_ONLY. A ausência de volume é real e preservada. PF-07, PF-17, PF-19 e PF-20 também têm fabricante NULL, modelagem aprovada. O atendimento confirma opções e a interface não fabrica informação.

Decisão: **APTO PARA CONSULTA COM RESSALVA ACEITA**. Não exibir volume ou fabricante desconhecido.

### IMPÉRIO FIT — categoria C

IF-01 a IF-04 têm identidade, cor/subcategoria nos manifestos, imagem original, preço e WhatsApp correto. Não possuem variante ou estoque fictício. Descrição longa vazia não prejudica identificação ou regra comercial.

Decisão: **APTO SEM RESSALVAS**. Enriquecimento editorial pode ocorrer depois.

A matriz completa está em 2026-10-21-phase-05-w3b-6a-1-product-decisions.csv.

## Revalidação funcional

### Streetwear

- ST-01 a ST-20: ASSISTED_PURCHASE, R$ 80,00, P/M/G/GG e 15 unidades por variante.
- Limite por estoque e teto 99 estão centralizados e testados.
- WhatsApp BELLMONT: https://wa.me/556493026564.
- Mensagem contém produto, variante, quantidade, preço e subtotal.
- Abrir WhatsApp não cria pedido, reserva, movimento ou baixa.

### Perfumaria

- 22/22 INQUIRY_ONLY, imagem e preço confirmados.
- Sacola e compra direta bloqueadas na lógica central.
- Preço nulo futuro vira Consultar valor ou a confirmar.
- Volume desconhecido não é renderizado; a mensagem solicita confirmação.
- Destino: BELLMONT.

### IMPÉRIO FIT

- IF-01 a IF-05 draft, INQUIRY_ONLY, uma imagem, preço e zero variantes/estoque.
- IF-01 Macaquinho Ana, IF-03 Conjunto Iza e IF-05 Conjunto Jasmim R$ 240,00 preservados.
- IF-02/IF-04 mantêm nomes existentes.
- Destino: https://wa.me/556492659825.

## Correções locais

Nenhuma alteração de código foi necessária. A implementação já:

- trata preço opcional;
- omite volume/fabricante ausentes;
- bloqueia INQUIRY_ONLY na sacola centralmente;
- separa WhatsApps por proprietário;
- falha fechado no Supabase sem fallback local;
- mantém checkout online indisponível.

Alterar o código sem defeito comprovado aumentaria risco. Foram criados somente os quatro entregáveis.

## Segurança

public.is_current_user_admin() e private.is_admin() são SECURITY DEFINER, STABLE, com search_path vazio, auth.uid() obrigatório e referências qualificadas. anon não executa; authenticated recebe apenas booleano da própria identidade. Não foi confirmado vetor de escalação, embora o Advisor mantenha o alerta.

A proteção contra senhas vazadas continua desabilitada e precisa de autorização. RLS/policies e grants atuais estão coerentes; anon só tem SELECT no catálogo público e nenhum acesso privado. Objetos futuros precisam de grants explícitos conforme a mudança da Data API de 30/10/2026.

Detalhes: 2026-10-21-phase-05-w3b-6a-1-security-remediation.md.

## Cloudflare e catálogo

VITE_PUBLIC_CATALOG_SOURCE=local permanece no ambiente local. supabase é opt-in; loading/erro são explícitos e não há fallback silencioso. Em Cloudflare Pages, a variável precisa ser supabase no ambiente certo e um novo build/deploy será necessário.

Esta fase não alterou Cloudflare.

## Mobile

O Vite iniciou em 127.0.0.1, mas os navegadores controlados não alcançaram o loopback do executor em 5173/5174. Isso indica isolamento de rede da ferramenta, não falha demonstrada do site. Nenhum firewall foi desabilitado e o servidor não foi exposto.

Não se declara aprovação visual. O roteiro manual está no plano de próximos passos.

## Backup

O backup pre-w3b5e segue íntegro, mas antecede IF-01 a IF-05. Novo backup com 47 comerciais, manifesto/bytes de Storage, hashes e restauração isolada é obrigatório.

## Testes

| Verificação | Resultado |
|---|---|
| npm test | 86/86 aprovados |
| npm run build | aprovado |
| npm run build:cloudflare | aprovado |
| git diff --check | aprovado; somente avisos locais LF/CRLF e configuração do drive Git |
| Atribuições sensíveis rastreadas | zero |

## Riscos e parecer

Riscos residuais:

1. backup pós-Fitness não executado;
2. proteção contra senhas vazadas desabilitada;
3. validação visual ainda manual;
4. fonte Supabase não comprovada no Cloudflare;
5. oito perfumes dependem do atendimento para volume.

Parecer: **APTO COM RESSALVAS**. Aptidão técnica não autoriza publicação. Próxima fase: backup pós-Fitness, aceite nominal dos oito perfumes e gate de Auth antes da ativação.

Produtos, estoque, Auth, RLS, grants, migrations, Storage e Cloudflare permaneceram inalterados.
