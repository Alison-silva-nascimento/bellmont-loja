# BELLMONT — Fase 05.W3B.6A.1 — saneamento técnico e de segurança

Data: 2026-10-21  
Projeto: qbedfcdarmgiytlqntpf  
Escopo: auditoria remota somente leitura. Nenhum GRANT, REVOKE, DDL, Auth ou dado foi alterado.

## Função administrativa

- public.is_current_user_admin() pertence a postgres, é STABLE SECURITY DEFINER, não recebe parâmetros e define search_path vazio.
- O corpo exige auth.uid() não nulo e delega a private.is_admin().
- anon e PUBLIC não têm EXECUTE; authenticated possui EXECUTE.
- private.is_admin() também é STABLE SECURITY DEFINER, search_path vazio, exige UID não nulo e consulta private.admin_users por igualdade com o UID.
- As referências são qualificadas. Não há entrada controlada pelo chamador, SQL dinâmico ou autorização baseada em user_metadata.
- private não concede USAGE a anon. authenticated possui USAGE e EXECUTE da helper, porém esse schema não é exposto pela Data API.

O Security Advisor alerta porque uma função SECURITY DEFINER pública é executável por authenticated. O endpoint retorna somente um booleano da própria identidade e não aceita ID arbitrário; não foi encontrado caminho de escalação, BOLA ou enumeração de terceiros.

Classificação: risco potencial médio, exploração não confirmada. O RPC é necessário ao Admin atual e não deve ser alterado imediatamente antes da ativação sem migration dedicada e reteste integral. Como hardening futuro, avaliar reduzir o acesso direto à helper privada ou redesenhar o wrapper. Não trocar por SECURITY INVOKER improvisadamente, pois isso muda dependências de USAGE/EXECUTE e pode quebrar o Admin.

## Proteção contra senhas vazadas

O Security Advisor confirma a proteção desabilitada.

- Risco: conta administrativa pode usar senha presente em vazamentos conhecidos.
- Impacto: aumenta risco de tomada do Admin, mas não altera RLS nem expõe o catálogo por si só.
- Pré-requisitos: acesso de proprietário ao Dashboard, identidade Admin de teste autorizada e janela de validação.
- Procedimento futuro: habilitar Leaked Password Protection em Auth/Password Security; testar login válido, rejeição ou troca de senha comprometida, recuperação, logout e guardas Admin.
- Esta fase não modificou Auth.

Recomendação: gate de segurança antes de operar o Admin em produção, mediante autorização separada.

## Grants, RLS e Data API

- anon: SELECT em products, product_variants e product_images; nenhum grant em inventário, movimentos, pedidos ou reservas.
- authenticated: CRUD em produtos/variantes/imagens e inventário; SELECT em movimentos/pedidos/reservas. RLS restringe administração a private.is_admin() e dados do cliente ao proprietário/Admin.
- Leitura pública exige produto active; variante também precisa estar ativa.
- Teste real sob anon: zero produtos, variantes, imagens e disponibilidades enquanto os 47 comerciais estão draft.

Conforme o [changelog oficial do Supabase](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), a mudança de 30/10/2026 afeta a exposição automática de novos objetos; tabelas existentes mantêm grants. Toda migration futura deve declarar grants mínimos junto com RLS/policies.

Os default privileges diferem por owner: supabase_admin ainda possui defaults amplos, enquanto postgres está mais restrito. Não alterar defaults globalmente nesta fase; revisar owner e grants por objeto em toda migration futura.

## Exposição e segredos

- O cliente usa URL e chave publicável; nenhuma chave administrativa é necessária no navegador.
- .env.local está ignorado e não rastreado.
- Há zero atribuições sensíveis não vazias em arquivos rastreados.
- INQUIRY_ONLY é bloqueado pela função central de sacola.
- DISABLED não é normalizado como produto comercial público.
- Disponibilidade pública não contém quantidades.
- WhatsApp não chama RPC de pedido, reserva, pagamento ou estoque.
- Checkout online está desabilitado e a rota redireciona para a sacola.

## Pendências

| Item | Prioridade | Bloqueia ativação? | Autorização |
|---|---|---|---|
| Proteção contra senhas vazadas | alta | recomendado como gate Admin | alteração Auth e testes |
| Hardening de is_current_user_admin() | média | não, sem exploração confirmada | migration dedicada |
| Fonte Cloudflare = Supabase | alta | sim para catálogo remoto | variável de build e deploy |
| Grants explícitos futuros | alta após 30/10 | não para objetos existentes | cada migration futura |
| Advisors de performance | baixa/média | não | fase orientada por métricas |

## Parecer

Não foi confirmado vazamento, escrita pública ou escalação administrativa. A segurança permanece APTA COM RESSALVAS, condicionada ao gate de senha vazada e à fonte correta antes do deploy.
