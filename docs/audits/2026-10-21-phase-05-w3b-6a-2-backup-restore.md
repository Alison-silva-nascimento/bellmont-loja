# BELLMONT — 05.W3B.6A.2 — backup e restauração

Data: 2026-10-21  
Projeto: `qbedfcdarmgiytlqntpf` — BELLMONT E-commerce — `sa-east-1`  
Classificação: **BACKUP VALIDADO COM RESSALVAS DE PLATAFORMA**

## Backup produzido

Diretório externo ao Git: `C:\DEV PARTICULAR\BELLMONT BACKUPS\2026-10-21-pre-w3b6b`.

| Arquivo | Bytes | SHA-256 |
|---|---:|---|
| `dumps/roles.sql` | 370 | `168A95A9C745AF5ED4679751F90419AC9DC434240A213B03E32A06D5664C2308` |
| `dumps/schema.sql` | 116.105 | `802D9264B11AF7BA31302AD3F6F32079BCB8AE02446933ECBEA0965910E6FF3F` |
| `dumps/data.sql` | 154.924 | `66B38F5803C2E468A66E7D3B15115ABB936386D7725B96ABBFCB116DFC3AB22C` |
| `dumps/application-verified.custom` | 189.756 | `FDDDD513130F1DFC0F4C37A56F13BE67B54D99950F15289236F5CD88664DA47E` |

Ferramentas: Supabase CLI 2.119.0, Docker 29.8.2, PostgreSQL remoto/local 17.11. Os dumps oficiais foram executados com `--role-only`, schema restrito a `public,private,availability_private` e dados com `--data-only --use-copy`. Credenciais não foram gravadas no relatório.

## Restauração comprovada

O conjunto foi restaurado no database local descartável `bellmont_restore_w3b6a2_20261021`, dentro do container PostgreSQL local. Schema e dados foram executados com `ON_ERROR_STOP=1`. A primeira tentativa, ainda sem carga de dados, parou porque uma policy da fundação referenciava `private`; o log foi preservado e o database incompleto foi removido. A repetição usou somente a fundação gerenciada `pre-data` e concluiu sem erro.

Contagens restauradas: 48 produtos totais, 47 comerciais em `draft`, 96 variantes totais/94 comerciais, 58 imagens totais/57 comerciais, 1.200 físicas comerciais, zero reservadas, 80 movimentos comerciais, zero pedidos e zero reservas. As fingerprints MD5 de produtos, variantes, imagens, inventário e movimentos coincidiram com o remoto.

O database descartável e os arquivos temporários do container foram removidos; a verificação final retornou zero databases com esse nome.

## Storage

Foram baixados, por URLs públicas oficiais e somente leitura, 57/57 objetos comerciais do bucket `product-images`, totalizando 89.303.001 bytes. Paths, MIME, tamanho e SHA-256 estão em `validation/storage-files-sha256.csv`; o SHA-256 desse manifesto é `33632DF8F1DF553B4B8A000D3E6953759F57B55F089EF92EFA31C73949D3E41A`.

Os cinco hashes Fitness coincidem com a evidência W3B.5E: IF-01 `C7BD17F8…`, IF-02 `7C968EFD…`, IF-03 `0281D694…`, IF-04 `C3206BF6…`, IF-05 `2D7B8173…`. Não houve upload, exclusão ou sobrescrita remota.

## Limitações

- O dump não recria secrets, chaves, providers e configurações operacionais gerenciadas de Auth/Storage.
- O projeto Free não oferece download de backup gerenciado; a documentação oficial recomenda `supabase db dump` e backup off-site.
- Os dumps separados não formam snapshot global único; leituras pré/pós, restauração e fingerprints mitigaram esse limite.
- Os bytes do Storage foram preservados separadamente do dump PostgreSQL.

Referências: https://supabase.com/docs/guides/platform/backups e https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

