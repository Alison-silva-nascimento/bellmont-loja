# BELLMONT — Fase 05.W3B.3 — backup e restauração isolada

Data: 2026-10-20  
Workspace: `C:\DEV PARTICULAR\BELLMONT LOJA`  
Projeto remoto: `qbedfcdarmgiytlqntpf` — BELLMONT E-commerce — `sa-east-1`  
Classificação: **APTO COM RESSALVAS**

## 1. Resultado executivo

Foi produzido um backup lógico atualizado e somente leitura do Supabase comercial. A camada de aplicação foi restaurada em PostgreSQL 17.11 local, isolado e descartável. As contagens, relações e fingerprints determinísticas de produtos, variantes, imagens, inventário, movimentos e batches coincidiram integralmente com a origem.

O remoto permaneceu inalterado: 42 produtos comerciais em `draft`, zero ativos, 94 variantes comerciais, 52 imagens comerciais, 1.200 unidades físicas comerciais, zero reservadas, 80 movimentos comerciais, zero pedidos e zero reservas. A coluna `sales_mode` continua ausente e a migration correspondente não foi aplicada.

O parecer possui ressalvas porque um dump PostgreSQL não contém os bytes dos objetos do Storage nem reproduz sozinho configurações e segredos dos serviços gerenciados Auth/Storage. A recuperação da camada de aplicação e de seus dados relacionais foi comprovada; a recuperação integral da plataforma exige artefatos e procedimentos adicionais.

Nenhuma migration, registro, policy, grant, produto, preço, status, estoque, pedido ou reserva foi alterado no Supabase remoto. Não houve commit, push ou deploy.

## 2. Ambiente e ferramentas

- Supabase remoto: `ACTIVE_HEALTHY`.
- PostgreSQL remoto: 17.11.0.002; `server_version` 17.11.
- Supabase CLI: 2.119.0.
- Docker Engine: 29.8.2.
- `pg_dump`, `pg_restore` e destino do laboratório: PostgreSQL 17.11.
- Database descartável: `bellmont_restore_w3b3_20261020_1304` dentro do container local `supabase_db_BELLMONT_LOJA`.
- O database descartável e os arquivos temporários internos foram removidos após a validação; a consulta final confirmou zero databases restantes com esse nome.
- Diretório externo: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-20-pre-w3b4`.
- O diretório não está dentro do repositório Git. A herança de ACL foi removida e o acesso ficou restrito ao usuário local e ao `SYSTEM`.

## 3. Arquivos e hashes

| Arquivo | Formato/escopo | Bytes | SHA-256 |
|---|---|---:|---|
| `dumps/roles.sql` | roles exportáveis | 370 | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `dumps/schema.sql` | schema `public`, `private` e `availability_private` | 115.730 | `3387C85F62322C6EAF1FFFA631FA6235C7D1610CE87BD7EFE2D9E649FB30B8B0` |
| `dumps/data.sql` | dados em SQL/COPY | 150.313 | `930DE19EDAC655904B727DA85E2F53172E916C272D85E1B1865029A4896B525A` |
| `dumps/application-verified.custom` | archive custom da camada restaurada e validada | 167.119 | `FB6DE1D610CAC5B68A80643FFF6716B6880F3B1CAD3C9D512B85F1026408EAC5` |

Evidências auxiliares preservadas:

- `restore-logs/01-foundation-restore.log`;
- `restore-logs/01b-managed-prerequisites.log`;
- `restore-logs/02-application-schema-restore.log`;
- `restore-logs/03-data-restore.log`;
- `validation/application-verified-toc.txt`.

Os logs da restauração final não contêm `ERROR`, `FATAL` ou `WARNING`. O TOC do archive custom foi lido com sucesso por `pg_restore -l`.

O arquivo `data.sql` contém dados gerenciados de Auth e deve ser tratado como sensível, embora nenhuma credencial tenha sido impressa neste relatório.

## 4. Pré-verificações remotas

- Project ref, nome, região e host corresponderam ao projeto comercial esperado.
- Histórico remoto com 11 migrations, terminando em `20261018082521_phase_05_2c_1_reservation_authorization_remediation`.
- Migration local `20261020102806_phase_05_w3b_1_product_sales_mode` ausente no remoto, como esperado.
- Tabelas comerciais e transacionais acessíveis por consultas read-only.
- 43 produtos totais: 42 comerciais e uma fixture técnica.
- 42 comerciais em `draft`; zero `active`.
- 20 Streetwear, 22 perfumes e zero Fitness no remoto.
- 96 variantes totais; 94 comerciais.
- 53 imagens totais; 52 comerciais.
- 82 linhas de inventário totais.
- 1.214 unidades físicas totais, incluindo 14 unidades das duas variantes técnicas; 1.200 unidades comerciais.
- Zero unidades reservadas.
- 84 movimentos totais; 80 comerciais.
- Um batch e 80 operações idempotentes.
- Zero divergências entre ledger e saldo.
- Zero pedidos, itens, pagamentos, envios, histórico de status, webhooks e reservas.

## 5. Procedimento de backup

Foram usados os comandos oficiais do Supabase CLI em modo vinculado e somente leitura:

1. dump de roles com `--role-only`;
2. dump de schema restrito a `public,private,availability_private`;
3. dump de dados com `--data-only --use-copy`.

O CLI executa dumps separados. Eles não compartilham um snapshot transacional global. A mitigação foi realizar snapshot remoto antes do dump, restauração integral, comparação por contagens e fingerprints, e uma nova leitura remota após o dump. Nenhum drift foi observado.

O archive `application-verified.custom` foi gerado a partir do database já restaurado e validado. Ele é um caminho adicional para recuperar a camada de aplicação; os três dumps oficiais permanecem a evidência primária da exportação remota.

## 6. Restauração isolada

Procedimento final:

1. criação de database vazio a partir de `template0`;
2. restauração da fundação local dos schemas gerenciados necessários;
3. garantia da PK de `auth.users` e da publicação `supabase_realtime`, objetos normalmente fornecidos pela plataforma;
4. restauração de `schema.sql` com `ON_ERROR_STOP=1`;
5. restauração de `data.sql` com `ON_ERROR_STOP=1`;
6. validação de dados, relações, RLS, policies, funções, índices e fingerprints;
7. geração e leitura do archive custom;
8. exclusão do database descartável e dos arquivos temporários do container.

A primeira tentativa foi interrompida antes da carga de dados porque o papel local `postgres` não podia reaplicar uma configuração de função gerenciada. O database incompleto foi identificado pelo nome exato, removido e recriado. A restauração final utilizou `supabase_admin`, papel superusuário exclusivamente local do stack Supabase, e terminou sem erros. Nenhuma proteção foi ignorada e nenhum comando foi executado contra o remoto.

A etapa de restauração do schema e dados da aplicação levou 1,75 segundo após a preparação da fundação gerenciada. Esse tempo é uma medição do laboratório local, não uma estimativa de RTO de produção.

## 7. Comparação origem x restauração

| Indicador | Remoto | Restaurado | Resultado |
|---|---:|---:|---|
| Produtos totais | 43 | 43 | igual |
| Produtos comerciais | 42 | 42 | igual |
| Comerciais `draft` / `active` | 42 / 0 | 42 / 0 | igual |
| Variantes | 96 | 96 | igual |
| Imagens | 53 | 53 | igual |
| Inventários | 82 | 82 | igual |
| Físico total / reservado | 1.214 / 0 | 1.214 / 0 | igual |
| Físico comercial / reservado | 1.200 / 0 | 1.200 / 0 | igual |
| Movimentos totais / comerciais | 84 / 80 | 84 / 80 | igual |
| Batches / operações | 1 / 80 | 1 / 80 | igual |
| Pedidos / reservas | 0 / 0 | 0 / 0 | igual |
| Usuários Auth | 1 | 1 | igual |
| Buckets / metadados Storage | 1 / 53 | 1 / 53 | igual |
| Índices da aplicação | 66 | 66 | igual |
| Funções da aplicação | 29 | 29 | igual |
| Policies da aplicação | 18 | 18 | igual |
| Constraints não validadas | 0 | 0 | igual |
| Divergências ledger/saldo | 0 | 0 | igual |

As fingerprints MD5 determinísticas coincidiram para:

- produtos;
- variantes;
- imagens e vínculos;
- inventário;
- movimentos;
- batch;
- 80 operações do batch.

Na restauração também foram encontrados zero órfãos em variantes, imagens, inventário e movimentos, além de zero registros com estoque negativo, reserva negativa ou reserva maior que o físico.

## 8. Estado remoto após o backup

A leitura posterior confirmou novamente:

- 42 produtos comerciais em `draft` e zero ativos;
- 94 variantes e 52 imagens comerciais;
- 1.200 unidades físicas comerciais e zero reservadas;
- 80 movimentos comerciais;
- zero pedidos e reservas;
- coluna `sales_mode` ausente;
- histórico de migrations inalterado e terminado em `20261018082521`.

Portanto, nenhuma quantidade ou estrutura remota foi alterada durante esta fase.

## 9. Cobertura e limitações

### Coberto e comprovado

- schemas `public`, `private` e `availability_private`;
- tabelas e dados da aplicação;
- funções, constraints, índices, triggers, policies, grants e RLS presentes no dump;
- dados Auth e metadados Storage exportados pelo CLI;
- integridade referencial e conciliação do ledger;
- legibilidade e restauração do backup em PostgreSQL 17.11.

### Não integralmente coberto

1. **Storage físico:** os 53 registros de `storage.objects` são metadados. Os bytes das imagens não integram o dump PostgreSQL e precisam de backup separado para recuperação integral.
2. **Auth gerenciado:** dados relacionais foram restaurados, mas providers, chaves, secrets, URLs e configuração operacional do GoTrue não são reconstituídos apenas pelo dump.
3. **Roles e secrets:** passwords, chaves gerenciadas e secrets não fazem parte do backup recuperável.
4. **Migrations gerenciadas:** o histórico foi verificado pela API/CLI, mas o schema `supabase_migrations` não faz parte do dump de aplicação.
5. **Snapshot global:** roles, schema e dados são dumps separados; a igualdade pré/pós e pós-restauração mitiga, mas não transforma o conjunto em snapshot único.
6. **Backups gerenciados/PITR:** o projeto está em organização Free; a disponibilidade de restore gerenciado/PITR não foi presumida nem comprovada. A documentação oficial orienta backups lógicos off-site para projetos Free.

Referências oficiais:

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/troubleshooting/download-logical-backups

## 10. Plano de recuperação

1. Declarar incidente e interromper novas escritas antes de escolher o ponto de recuperação.
2. Confirmar project ref, região, PostgreSQL 17.11 e destino. Nunca iniciar a restauração sobre o comercial.
3. Verificar todos os SHA-256 antes de usar os arquivos.
4. Preparar um projeto Supabase isolado ou PostgreSQL 17.11 com roles, extensões e fundação gerenciada compatíveis.
5. Restaurar roles customizadas aplicáveis; redefinir passwords e secrets fora dos dumps.
6. Restaurar `schema.sql` e `data.sql` com parada em erro, ou usar `application-verified.custom` para a camada de aplicação.
7. Reconciliar o histórico de migrations com o schema restaurado sem marcar versões artificialmente.
8. Restaurar separadamente os bytes do Storage, preservando paths, MIME, tamanho e checksum.
9. Validar contagens, fingerprints, PKs/FKs, constraints, índices, triggers, funções, RLS, policies e grants.
10. Reconciliar inventário e ledger: 80 SKUs comerciais, 1.200 físicas, zero reservadas e zero mismatches.
11. Validar Auth com identidade de teste autorizada e catálogo público antes de qualquer corte.
12. Somente após aprovação, planejar chaves, URLs, janela e corte controlado.

Em falha parcial, preservar dumps e logs, descartar o destino incompleto e reiniciar em novo ambiente isolado. Não executar rollback destrutivo automático no comercial.

## 11. Critérios de interrupção para W3B.4

Interromper antes de qualquer implantação se ocorrer:

- divergência de project ref, região ou versão PostgreSQL;
- alteração no histórico remoto ou presença inesperada de `sales_mode`;
- hash divergente dos backups ou da migration aprovada;
- restauração que não pare em erro;
- diferença de contagens/fingerprints;
- estoque comercial diferente de 1.200/0 ou ledger inconsistente;
- pedidos/reservas inesperados;
- inexistência de uma estratégia separada para imagens Storage;
- qualquer migration pendente anterior à migration autorizada.

## 12. Parecer

**APTO COM RESSALVAS PARA W3B.4.**

O backup lógico atualizado existe fora do repositório, possui hashes verificáveis e foi restaurado com sucesso em PostgreSQL 17.11 isolado. A camada de aplicação necessária para proteger a futura implantação de `sales_mode` está recuperável e conciliada.

A ressalva permanece para recuperação integral da plataforma: antes de tratar este conjunto como disaster recovery completo, é necessário preservar também os bytes do Storage e documentar/recriar configurações gerenciadas de Auth e do projeto. Essa ressalva não autoriza migration, inserção, ativação ou deploy; cada operação futura continua dependente de autorização explícita.
