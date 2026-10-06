# Fase 04.2C.1 — arquitetura de imagens

## Decisões

- Bucket `product-images`, público apenas para entrega de mídia comercial.
- Upload, listagem administrativa, alteração e exclusão exigem sessão `authenticated` e `private.is_admin()`.
- Caminho canônico: `products/{product_id}/{crypto.randomUUID()}.{extensão-validada}`.
- A tabela `public.product_images` guarda `storage_path`, nunca binário nem URL absoluta.
- Limite: 5 MiB por objeto; MIME types: JPEG, PNG e WebP.
- Galeria: no máximo 8 registros por produto, com ordem determinística por `sort_order, id`.
- Há no máximo uma imagem principal por produto, mesmo quando a imagem referencia uma variante.

## Fluxo futuro de upload

O frontend 04.2C.2 deverá validar tamanho, MIME declarado e extensão, gerar o nome com
`crypto.randomUUID()`, enviar com `upsert: false` e só depois inserir o metadado em
`product_images`. Se a inserção do metadado falhar, deverá remover o objeto recém-enviado
como compensação.

O limite de MIME do bucket usa o tipo informado no upload e não comprova, sozinho, os
magic bytes do arquivo. Para validação forte de conteúdo será necessária inspeção no
cliente e, caso o risco comercial justifique, uma Edge Function ou pipeline de imagem.

## Fluxo futuro de exclusão

Banco e Storage não compartilham uma transação. Para manter o catálogo consistente, a UI
deverá excluir primeiro o registro de `product_images` e depois o objeto. Se a segunda
etapa falhar, o objeto fica órfão mas não aparece no catálogo; a operação deve ser marcada
para retry/limpeza. O inverso poderia deixar um registro público apontando para arquivo
inexistente. Ao excluir a principal, o banco promove a primeira restante por
`sort_order, id`.

## Limites e riscos restantes

- Não existe FK suportada entre `product_images.storage_path` e `storage.objects`; o fluxo
  compensatório é obrigatório.
- Um bucket público permite download para quem conhece a URL. Escrita e listagem continuam
  protegidas pelas policies de `storage.objects`.
- Admins são operadores globais e podem gerenciar imagens de qualquer produto. A UI deve
  sempre conferir o `product_id` do path antes de solicitar uma exclusão.
- Nenhuma foto real, objeto ou metadado comercial é criado por esta fase.
