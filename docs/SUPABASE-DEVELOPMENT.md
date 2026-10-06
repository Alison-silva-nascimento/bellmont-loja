# Supabase — ambiente de desenvolvimento

## Regra de segurança

O repositório nunca deve conter credenciais reais. Arquivos `.env` são locais e
ignorados pelo Git. O arquivo `.env.example` contém somente nomes e valores
fictícios.

No frontend Vite, toda variável prefixada por `VITE_` é incorporada ao bundle e
pode ser lida no navegador. Portanto, somente a URL pública do projeto e a
publishable key podem usar esse prefixo. Nunca usar em código cliente:

- `service_role`;
- secret key (`sb_secret_...`);
- senha do banco;
- connection string do Postgres;
- tokens administrativos ou segredos de provedores externos.

Segredos de backend deverão existir apenas no ambiente seguro que executará o
backend ou Edge Function. A publishable key não substitui autorização: tabelas
expostas devem ter RLS habilitado e policies específicas para cada operação.

Antes de qualquer commit:

1. executar uma busca por `.env`, `service_role`, `sb_secret_` e URLs de banco;
2. revisar `git diff --cached`;
3. confirmar que migrations não contêm valores secretos;
4. se um segredo tiver sido exposto, revogá-lo/rotacioná-lo imediatamente —
   removê-lo de um commit não torna a credencial segura novamente.

## Plano Free e projeto pausado

Durante o desenvolvimento, o plano Free é aceitável e o projeto pode ser
pausado por inatividade. Projeto pausado não deve ser interpretado como perda do
banco.

Sinais de indisponibilidade temporária incluem timeout, falha de DNS/conexão,
resposta 5xx ou erro explícito de projeto pausado no Dashboard. Para diagnosticar:

1. verificar o status do projeto no Dashboard do Supabase;
2. verificar o status público dos serviços do Supabase;
3. confirmar localmente a URL e a publishable key, sem imprimi-las em logs;
4. testar novamente depois que o projeto estiver ativo;
5. distinguir indisponibilidade do serviço de falhas de autorização/RLS.

Não criar ping, cron, tráfego sintético ou qualquer keep-alive destinado apenas
a impedir a pausa do plano Free.

## Comportamento da aplicação em falhas

Chamadas ao Supabase deverão ter tratamento explícito de erro e estado de
carregamento. Se o serviço estiver indisponível, a interface deve:

- exibir uma mensagem clara e recuperável;
- oferecer nova tentativa quando apropriado;
- não apagar dados locais por interpretar falha de rede como resposta vazia;
- não quebrar silenciosamente nem ficar em carregamento infinito;
- não mostrar mensagens técnicas, tokens, payloads sensíveis ou detalhes do
  banco ao usuário;
- registrar apenas contexto sanitizado para diagnóstico.

## Schema e migrations

O estado do Dashboard não será a única fonte do schema. Toda alteração de banco
deverá gerar migration versionada em `supabase/migrations/` e ser revisada junto
com o código.

As migrations devem permitir reconstruir o schema, incluindo tabelas, índices,
constraints, funções, triggers, RLS e policies. Dados secretos e credenciais não
pertencem às migrations.

### Estrutura preparada na Fase 04.1

A migration `phase_04_1_commerce_schema` prepara, sem inserir o catálogo atual:

- `public.products`: dados comerciais e estado `draft`, `active` ou `archived`;
- `public.product_variants`: SKU e opções futuras de cor, tamanho e volume;
- `public.inventory`: saldo físico e reservado por variante;
- `public.product_images`: imagens gerais ou específicas de uma variante;
- `public.inventory_movements`: histórico append-only de mudanças no saldo;
- `private.admin_users`: allowlist de usuários administrativos do Supabase Auth.

O arquivo atual `src/data/products.ts` continua sendo a fonte do catálogo visual.
A migração de dados ocorrerá em uma fase posterior e não deve ser antecipada.

### Administração e autorização

Criar o usuário pelo Supabase Auth não concede administração automaticamente.
Depois que uma pessoa autorizada existir em `auth.users`, um operador com acesso
seguro ao SQL deve registrar o UUID explicitamente:

```sql
insert into private.admin_users (user_id)
values ('UUID-REAL-DO-USUARIO');
```

Não automatizar esse cadastro a partir de email, `user_metadata` ou formulário
público. A função `public.is_current_user_admin()` apenas informa ao usuário
autenticado se o próprio UUID está na allowlist; ela não concede privilégios.

Permissões preparadas:

- `anon`: somente leitura de catálogo ativo;
- `authenticated` não-admin: mesma leitura pública e nenhuma escrita;
- `authenticated` admin: manutenção das tabelas comerciais via RLS;
- `service_role`: acesso elevado somente para backend seguro, nunca no Vite;
- movimentações de estoque: leitura somente para admin e escrita apenas pelo
  trigger de inventário.

Constraints impedem saldo físico negativo, reserva negativa e reserva superior
ao saldo físico. Toda mudança em `quantity_on_hand` gera uma movimentação; o
histórico não pode ser atualizado nem apagado.

### Desenvolvimento local e testes

Pré-requisito: Docker Desktop ou runtime compatível disponível localmente.

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:test
npm run supabase:lint
```

O teste pgTAP em `supabase/tests/phase_04_1_security.test.sql` valida schema,
RLS, visitante, usuário autenticado comum, administrador, estoque negativo e
imutabilidade das movimentações. Sem Docker ou projeto real, o arquivo permanece
versionado, mas a execução de banco fica pendente.

Para um projeto remoto real, primeiro autenticar e vincular a CLI sem registrar
tokens no repositório:

```bash
npx supabase login
npx supabase link --project-ref ID_REAL_DO_PROJETO
```

Antes de aplicar qualquer migration remotamente, revisar o diff, executar os
testes locais e confirmar que o projeto selecionado é o ambiente correto.

### Integração React/Vite

Copiar `.env.example` para `.env.local` e preencher somente:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Sem essas variáveis, a camada retorna `not-configured` de forma controlada e o
site continua usando `products.ts`. A integração preparada não substitui o
catálogo local nem altera a interface atual.

Antes da entrada comercial em produção, reavaliar:

- plano e disponibilidade necessária;
- estratégia de backup e restauração testada;
- observabilidade e alertas;
- limites de uso;
- recuperação de desastre;
- segurança, RLS e rotação de credenciais.
