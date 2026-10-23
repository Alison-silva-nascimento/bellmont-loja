# BELLMONT — Fase 05.2C.3 — backup e validação de recuperação

## 1. Resumo executivo

Em 2026-10-18 foi produzido um backup lógico atualizado e somente leitura do projeto comercial `qbedfcdarmgiytlqntpf` (`sa-east-1`, PostgreSQL 17.11.0.002). A camada de aplicação foi restaurada em um banco PostgreSQL 17.11 exclusivamente local e isolado. Contagens e fingerprints de produtos, variantes, imagens, inventário, movimentos, batches e operações coincidiram integralmente com o remoto.

**Parecer: APTO PARA SOLICITAR AUTORIZAÇÃO DE IMPLANTAÇÃO.**

O parecer cobre a recuperação da aplicação e seus dados críticos. Ele não equivale a recuperação integral da plataforma Supabase: os bytes dos objetos do Storage não fazem parte do dump PostgreSQL, e a restauração completa dos serviços gerenciados Auth/Storage depende da fundação fornecida pela plataforma.

Nenhuma migration, policy, grant, produto, estoque, pedido ou reserva foi alterado no Supabase comercial. Não houve commit, push ou deploy.

## 2. Data, destino e ferramentas

- Diretório externo: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-18-phase-05-2c-3`
- Início da execução: 2026-10-18 16:55:17 -03:00
- Projeto: BELLMONT E-commerce (`qbedfcdarmgiytlqntpf`)
- Estado remoto: `ACTIVE_HEALTHY`
- Supabase CLI: 2.119.0
- PostgreSQL remoto: 17.11.0.002
- `pg_dump`/`pg_restore` do laboratório: 17.11
- Ambiente de restauração: banco descartável `bellmont_restore_052c3_20261018_1655`, dentro do container local `supabase_db_BELLMONT_LOJA`, sem porta ou serviço comercial apontado para ele
- Limpeza: após as validações, o banco descartável e as três cópias temporárias dentro do container foram removidos; dumps, manifestos e logs externos foram preservados
- ACL do diretório de backup: herança removida; acesso integral restrito ao usuário local e ao `SYSTEM`

## 3. Arquivos gerados

| Arquivo | Formato | Bytes | SHA-256 |
|---|---:|---:|---|
| `dumps/schema.sql` | SQL plano, schema | 54.779 | `CC04D4425AAB887C8A52952288CC1CE4C56949E857D7E4FAA668CCA6914AE366` |
| `dumps/data.sql` | SQL plano, `COPY` | 145.718 | `9243664320273837B74C042F7383277BC26B2955A7EB4C6C93C036DDD1894723` |
| `dumps/roles.sql` | SQL plano, roles | 370 | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `dumps/application-verified.custom` | PostgreSQL custom/gzip | 85.023 | `E7F903069ADAB9E219E83C5F7EBC904A777D6B67E442AA0D57B256A441F3EA70` |

O arquivo custom contém 130 entradas e foi lido com sucesso por `pg_restore -l`. Ele foi gerado da camada de aplicação restaurada somente depois da igualdade das fingerprints com o remoto. Os SQLs originais continuam sendo a evidência primária da exportação remota.

Artefatos auxiliares:

- `manifests/backup-manifest.json`
- `manifests/remote-migrations.json`
- `validation/remote-snapshot.json`
- `validation/restore-validation.json`
- `validation/application-object-inventory.txt`
- `validation/application-verified-toc.txt`
- `restore-logs/*.log`

O dump `data.sql` contém dados gerenciados de Auth, incluindo material de autenticação armazenado pelo próprio serviço. Por isso é sensível, está fora do Git, protegido por ACL e não deve ser publicado ou anexado a tickets.

## 4. Cobertura e exclusões

### Camada de aplicação

O schema exportado cobre:

- `public`
- `private`
- `availability_private`

Foram restaurados e conferidos tabelas, dados, funções, constraints, índices, triggers, policies, grants e RLS da aplicação.

### Schemas gerenciados

O comando oficial `supabase db dump` exclui as definições dos schemas internos/gerenciados, incluindo `auth`, `storage`, `realtime`, `extensions` e `supabase_migrations`. O dump de dados, porém, incluiu linhas de `auth` e metadados de `storage` acessíveis ao CLI.

- Auth: 1 usuário e os registros relacionados foram restaurados sobre uma fundação local de Auth. Isso comprova legibilidade dos dados, mas não reconstitui nem valida integralmente o serviço GoTrue, configuração de provedores, chaves e secrets da plataforma.
- Storage: 1 bucket e 53 registros de objetos foram restaurados como metadados. Os 53 arquivos físicos não estão dentro do PostgreSQL e não foram baixados nesta fase.
- Histórico de migrations: foi registrado separadamente em `manifests/remote-migrations.json`; `supabase_migrations` não integra o dump de schema da aplicação.
- Roles: o arquivo registra apenas roles lógicas exportáveis; passwords e secrets gerenciados não são recuperados pelo backup.

## 5. Consistência

Os dumps de schema, dados e roles foram executados separadamente pelo Supabase CLI. Não houve uso de um snapshot PostgreSQL compartilhado entre os três arquivos; portanto, não se declara atomicidade global entre arquivos.

A mitigação aplicada foi:

1. pré-check remoto imediatamente antes do dump;
2. restauração completa em ambiente isolado;
3. comparação de contagens;
4. comparação de fingerprints determinísticas dos conjuntos e relações críticas;
5. reconciliação independente do ledger.

Não houve divergência nos dados críticos, o que demonstra que não ocorreu drift comercial observável durante a janela de exportação.

## 6. Estado remoto antes do backup

- 8 migrations aplicadas, terminando em `20261014114138_phase_04_4_b_3_idempotent_inventory_batches`
- migrations 05.2A, 05.2B e 05.2C.1 ausentes no remoto
- 43 produtos totais: 42 comerciais em `draft` e 1 fixture técnica arquivada
- 20 produtos Streetwear
- 96 variantes totais; 80 Streetwear
- 53 imagens cadastradas
- 82 registros de inventário; 80 Streetwear
- 1.200 unidades físicas Streetwear
- zero unidades Streetwear reservadas
- 84 movimentos totais; 80 Streetwear
- 1 batch e 80 operações idempotentes
- zero divergências entre saldo e ledger
- tabelas de pedidos/reservas da Fase 05.2 ainda inexistentes; quantidade de pedidos: zero por ausência do schema ainda não implantado

## 7. Restauração isolada

A restauração final limpa levou aproximadamente 20 segundos depois da preparação da fundação gerenciada local.

Ordem executada:

1. criação de banco PostgreSQL 17.11 vazio a partir de `template0`;
2. restauração somente da seção `pre-data` dos schemas gerenciados locais necessários;
3. criação no laboratório da PK `auth.users(id)` e da publicação `supabase_realtime`, objetos normalmente fornecidos pela plataforma;
4. restauração de `schema.sql` com `ON_ERROR_STOP=1`;
5. restauração de `data.sql` com `ON_ERROR_STOP=1`;
6. consultas de integridade e inventário de objetos;
7. geração e leitura do archive custom da aplicação.

Os logs finais não contêm `ERROR`, `FATAL` ou `WARNING`. Tentativas diagnósticas anteriores demonstraram duas dependências de plataforma — chave primária de `auth.users` e publicação `supabase_realtime` — e foram descartadas antes da restauração final limpa.

Depois da comparação e dos testes de recuperação, o banco isolado foi descartado para não manter uma segunda cópia operacional dos dados de Auth. A existência do database foi novamente consultada e retornou zero; a evidência verificável permanece nos artefatos externos.

## 8. Comparação remoto x restaurado

| Indicador | Remoto | Restaurado | Resultado |
|---|---:|---:|---|
| Produtos | 43 | 43 | igual |
| Produtos comerciais em `draft` | 42 | 42 | igual |
| Variantes | 96 | 96 | igual |
| Imagens | 53 | 53 | igual |
| Inventários | 82 | 82 | igual |
| Movimentos | 84 | 84 | igual |
| Batches | 1 | 1 | igual |
| Operações de batch | 80 | 80 | igual |
| Usuários Auth | 1 | 1 | igual |
| Buckets Storage | 1 | 1 | igual |
| Metadados de objetos Storage | 53 | 53 | igual |

As fingerprints determinísticas foram iguais para:

- produtos;
- variantes/SKUs;
- imagens e relacionamentos;
- inventário e quantidades;
- movimentos e relações do ledger;
- batch inicial;
- 80 operações idempotentes.

## 9. Inventário e ledger

- 20 modelos Streetwear: confirmado
- 80 variantes Streetwear: confirmado
- mínimo e máximo por variante: 15 unidades
- total físico: 1.200 unidades
- total reservado: zero
- movimentos Streetwear: 80
- divergências `SUM(quantity_delta) <> quantity_on_hand`: zero

O backup restaurado preserva os mesmos IDs, SKUs, saldos, relações e histórico do remoto.

## 10. Objetos, RLS e grants

Comparação entre remoto e restaurado:

- 17 funções da aplicação
- 67 constraints
- 25 índices
- 7 triggers não internos
- 11 policies
- 7 tabelas com RLS habilitada
- 55 grants de tabela relevantes para `anon`, `authenticated` e `service_role`
- 13 grants de rotinas relevantes para esses papéis

A leitura funcional confirmou zero produtos públicos ativos e zero linhas em `get_public_variant_availability()`, comportamento esperado enquanto os 42 produtos comerciais permanecem em `draft`.

## 11. Auth e Storage

### Auth

O dump de dados preservou as linhas de Auth acessíveis, mas uma recuperação real deve começar em um projeto Supabase compatível, no qual o schema, as extensões, as roles, as chaves e a configuração do serviço Auth já existam. O backup não deve ser tratado como cópia integral da configuração de identidade. Senhas de roles gerenciadas não são incluídas.

### Storage

O banco preserva bucket, caminhos e 53 metadados. Não preserva os bytes dos arquivos. A recuperação integral exige uma cópia separada dos objetos físicos com seus paths e checksums. Sem ela, um banco restaurado pode referenciar imagens inexistentes.

## 12. Backups gerenciados e PITR

A documentação oficial do Supabase informa que backups diários gerenciados são fornecidos para Pro, Team e Enterprise; projetos Free devem manter exports regulares com `supabase db dump`. PITR é um add-on para planos pagos e exige compute compatível. A disponibilidade efetiva de um backup gerenciado/PITR para este projeto não foi comprovada por uma API disponível nesta execução e não foi presumida.

Referência: https://supabase.com/docs/guides/platform/backups

## 13. Plano de recuperação

1. Declarar incidente, interromper escritas e registrar o ponto temporal desejado.
2. Confirmar project ref, região, versão PostgreSQL e ambiente de destino. Nunca restaurar primeiro sobre o projeto comercial.
3. Verificar os SHA-256 do manifesto antes de usar qualquer arquivo.
4. Preparar projeto Supabase novo/isolado ou PostgreSQL 17.11 com roles, extensões e fundação gerenciada compatíveis.
5. Restaurar roles customizadas quando aplicável; redefinir secrets/passwords fora dos dumps.
6. Restaurar `schema.sql` e depois `data.sql` com `ON_ERROR_STOP=1`, ou usar `application-verified.custom` com `pg_restore` para a camada de aplicação.
7. Reconstituir/validar o histórico de migrations usando o manifesto, sem marcar migrations artificialmente antes da confirmação do schema.
8. Restaurar os objetos físicos de Storage por processo separado, preservando paths, MIME, tamanho e checksum.
9. Validar contagens, fingerprints, IDs, SKUs, FKs, constraints, índices, triggers, functions, RLS, policies e grants.
10. Reconciliar inventário/ledger: 80 SKUs, 15 por SKU, 1.200 físicas, zero reservadas, zero mismatches.
11. Validar Auth em identidades de teste autorizadas e leitura pública do catálogo antes de qualquer corte.
12. Somente depois da aprovação, planejar janela, DNS/URLs, chaves e corte controlado.

Em falha parcial, manter o destino isolado, preservar logs, não repetir importações sem avaliar idempotência e recriar um novo banco descartável a partir dos dumps originais. Não executar rollback destrutivo automaticamente no comercial.

## 14. Limitações e riscos

1. **Storage físico:** bytes não copiados; mitigação obrigatória para recuperação integral de imagens.
2. **Serviços gerenciados:** Auth/Storage foram validados no nível de dados e dependências essenciais, não como serviços completos.
3. **Snapshot entre arquivos:** os dumps separados não compartilham snapshot; a igualdade pós-restauração mitiga o risco para o estado capturado, mas não transforma o processo em backup atomicamente global.
4. **Arquivo sensível:** `data.sql` contém material de Auth; manter a ACL, evitar nuvem pública e considerar criptografia externa/off-site antes de replicá-lo.
5. **CLI `--dry-run`:** o diagnóstico do CLI exibiu uma credencial efêmera de conexão no console transitório. O valor não foi persistido nos artefatos nem reutilizado. Evitar esse modo em futuras execuções vinculadas ou sanitizar a captura de console.
6. **Backups gerenciados/PITR:** disponibilidade não comprovada para o plano atual.

Essas limitações não impedem a restauração comprovada da camada de aplicação necessária para proteger a implantação das migrations 05.2; impedem apenas declarar recuperação integral de todos os serviços Supabase.

## 15. Regressão do repositório

- `npm test`: 62/62 aprovados
- `npm run build`: aprovado
- `git diff --check`: aprovado; somente avisos preexistentes de conversão LF/CRLF
- `.env.local`: continua ignorado pelo Git
- alterações locais preexistentes: preservadas integralmente

## 16. Conclusão

O backup comercial atualizado existe fora do repositório, possui hashes verificáveis, foi restaurado em PostgreSQL 17.11 isolado e reproduziu exatamente os dados críticos da aplicação e o ledger de 1.200 unidades. A BELLMONT está **APTA PARA SOLICITAR AUTORIZAÇÃO DE IMPLANTAÇÃO** das migrations 05.2A, 05.2B e 05.2C.1, desde que a autorização seja separada e nenhuma implantação seja iniciada automaticamente.

