# Administração — autenticação e primeiro acesso

## Configuração local do frontend

Crie `.env.local` a partir de `.env.example` e preencha somente os dois valores
públicos abaixo:

```dotenv
VITE_SUPABASE_URL=https://qbedfcdarmgiytlqntpf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=COLE_A_PUBLISHABLE_KEY_DO_DASHBOARD
```

A publishable key está em **Supabase Dashboard → Project Settings → API Keys**.
Não usar `service_role`, secret key, senha do banco ou connection string. O
arquivo `.env.local` já está ignorado pelo Git.

## Criar o primeiro usuário administrativo

1. Abra **Supabase Dashboard → Authentication → Users**.
2. Use **Add user → Create new user**.
3. Informe o email administrativo real e uma senha forte, sem registrar a senha
   em código, migration ou documentação.
4. Confirme o email pelo fluxo apropriado ou marque-o como confirmado somente
   se essa for a decisão operacional consciente.
5. Copie o UUID do usuário criado.
6. No SQL Editor, substitua somente `UUID_REAL_DO_USUARIO` e execute:

```sql
begin;

insert into private.admin_users (user_id)
select id
from auth.users
where id = 'UUID_REAL_DO_USUARIO'::uuid
on conflict (user_id) do nothing;

commit;
```

7. Confira que o comando inseriu uma linha. Não autorize por email, metadata ou
   flags no frontend.

## Criar usuário não-admin para teste

Crie outro usuário em **Authentication → Users**, mas não insira seu UUID em
`private.admin_users`. O login deve funcionar e `#/admin` deve exibir **Acesso
não autorizado**.

## Roteiro de validação

### Sem sessão

1. Abra `http://127.0.0.1:5173/#/admin` em janela anônima.
2. Confirme que somente o login aparece.
3. Atualize com F5 e confirme que o Dashboard nunca pisca na tela.

### Não-admin

1. Entre com o usuário de teste não autorizado.
2. Confirme a tela **Acesso não autorizado**.
3. Atualize com F5 e confirme que o acesso continua negado.
4. Clique em **Sair**, atualize novamente e confirme o retorno ao login.

### Admin

1. Entre com o usuário cujo UUID está na allowlist.
2. Confirme o Dashboard e o email autenticado no cabeçalho.
3. Atualize com F5: a sessão deve ser restaurada e a autorização revalidada antes
   de exibir o Dashboard.
4. Clique em **Sair** e confirme o retorno ao login.
5. Atualize novamente e confirme que permanece deslogado.

Nenhum desses passos exige ou permite uma `service_role` no navegador.
