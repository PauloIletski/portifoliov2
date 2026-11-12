# MongoDB Atlas e administração

O Angular publica páginas estáticas PT/EN e consulta uma API Express em `/api`. O backend usa MongoDB Atlas, Better Auth, Vercel Blob e Resend. Os dados continuam sendo carregados no navegador após a hidratação. O build funciona sem acesso aos serviços externos.

## Desenvolvimento no Windows

Use Node.js 24 LTS e PowerShell. Copie as variáveis de `.env.example` para seu `.env`, preservando os valores locais existentes. `MONGODB_URI` aceita os placeholders `<db_username>` e `<db_password>` com os valores em `MONGODB_USERNAME` e `MONGODB_PASSWORD`. O banco padrão é `portfoliov2`, controlado por `MONGODB_DATABASE`.

```powershell
npm.cmd ci
npm.cmd run db:setup
npm.cmd start
```

`npm.cmd start` executa a API em `127.0.0.1:8080` e o Angular em `localhost:4200`, com proxy para `/api`. Defina `BETTER_AUTH_URL=http://localhost:4200` ao abrir esse endereço. Para usar `http://127.0.0.1:4200`, configure exatamente essa origem. A API valida a origem das requisições de escrita e o Better Auth valida os redirecionamentos.

`npm.cmd run dev` gera os dois idiomas e inicia watch e preview em `http://127.0.0.1:8080`, com inglês em `/en/`. Nesse fluxo use `BETTER_AUTH_URL=http://127.0.0.1:8080`. `npm.cmd run preview` serve um build existente junto com a API. `PORT` altera a porta do preview/API; o proxy do Angular usa a porta 8080.

A configuração `.npmrc` usa `legacy-peer-deps` porque o npm tenta resolver integrações opcionais de outros frameworks do Better Auth contra o Vite do Angular. As dependências de execução adicionadas estão fixadas no lockfile. Use `npm.cmd ci` para reproduzir a instalação.

Os overrides limitados ao SDK Blob e à configuração CLI da Vercel selecionam versões corrigidas de Undici e Zod dentro das respectivas versões principais.

## API e permissões

- `GET /api/content/:kind` retorna registros publicados, ordenados por `position` e UUID.
- `GET /api/admin/session` verifica sessão e autorização administrativa.
- `GET` e `POST /api/admin/content/:kind` listam todos os registros e criam conteúdo.
- `PUT` e `DELETE /api/admin/content/:kind/:id` editam e excluem um registro pelo UUID.
- `/api/auth/*` trata login, logout e redefinição de senha com Better Auth.
- `POST /api/admin/uploads` autoriza uploads diretos para Blob. Aceita somente eventos de geração de token do SDK, com JPEG, PNG ou WebP de até 5 MB.

As categorias são `projects`, `experiences`, `profiles`, `skills`, `contacts` e `maintenance`. A API rejeita categorias e campos desconhecidos. O UUID fica em `_id` no Atlas e em `id` nas respostas. Perfil, tapume e autorização administrativa têm cadastro único. O backend valida estrutura bilíngue, publicação, URLs, imagens, canais e configuração sincronizada do tapume. Rascunhos aceitam campos obrigatórios vazios conforme os contratos anteriores.

Os retornos usam 400 para entrada inválida, 401 para sessão ausente, 403 para falta de autorização ou origem inválida, 404 para registro inexistente, 409 para duplicidade, 413 para corpo excessivo e 503 para indisponibilidade ou pausa de edição. Respostas da API usam `Cache-Control: no-store`.

O cadastro público está desabilitado. As sessões são armazenadas no Atlas e identificadas por cookies. Limites de tentativas também usam o banco. Na Vercel, o endereço do cliente vem de `x-vercel-forwarded-for`. No servidor local, um cabeçalho interno é sobrescrito a partir do socket da conexão.

## Exportação e transferência

Os comandos carregam `.env` local e recebem um diretório de exportação. Armazene o diretório em `tmp/` ou fora do repositório, pois ele contém rascunhos e a identificação do administrador.

1. Pause as edições na origem durante a exportação final. Obtenha uma chave administrativa do Supabase e configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` apenas no ambiente local da exportação.
2. Exporte os registros completos e todos os objetos de `portfolio-images`, incluindo arquivos sem referências.

```powershell
npm.cmd run db:export -- ./tmp/migration
npm.cmd run db:validate -- ./tmp/migration
```

O resultado contém `snapshot.json` e `assets/`, com contagens, UUIDs e hashes SHA-256 de conteúdo e arquivos. A exportação exige acesso aos rascunhos e ao cadastro administrativo. Uma chave publicável é insuficiente. O snapshot só é finalizado após o download completo dos arquivos. A validação verifica cada registro contra os contratos atuais.

3. Configure `BLOB_READ_WRITE_TOKEN` e escolha um banco de preview separado, por exemplo `MONGODB_DATABASE=portfoliov2_preview`, com Blob próprio. Depois importe e confira.

```powershell
npm.cmd run db:import -- ./tmp/migration
npm.cmd run db:verify -- ./tmp/migration
```

Os uploads de migração usam caminhos determinísticos por hash. `migration_assets` registra as URLs e `migration_records` registra a origem e o conteúdo importado. A execução pode ser repetida após interrupção. Alterações da origem podem atualizar documentos que ainda coincidam com a última versão importada. Edições ou exclusões feitas no destino geram conflito. Registros extras também fazem a conferência final falhar e precisam ser reconciliados antes da virada. O mapeamento local das URLs fica em `mapping-<banco>.json`.

Os comandos não excluem dados da origem. O importador troca referências Supabase pelas URLs Blob nos dois idiomas e rejeita referências Storage sem arquivo exportado. URLs externas permanecem como estão.

4. Configure Better Auth e Resend com remetente verificado. `BETTER_AUTH_SECRET` deve ter pelo menos 32 caracteres aleatórios. Provisione o administrador identificado no snapshot.

```powershell
npm.cmd run admin:provision -- ./tmp/migration
```

A conta recebe uma senha aleatória que não é exibida nem persistida em arquivos, e um link para definir sua senha pelo Resend. Repetir o comando para o mesmo administrador solicita outro link. Um administrador diferente ou usuário pré-existente sem autorização interrompe o provisionamento para revisão. A senha nova exige 8 a 128 caracteres. A redefinição revoga as sessões. As sessões e a senha anteriores do Supabase são substituídas pelo novo fluxo.

## Publicação e retorno

A configuração Vercel serve `dist/portfoliov2/browser` e encaminha `/api/*` para `api/index.ts` no runtime Node. As rotas PT/EN são prerenderizadas. Configure `MONGODB_DATABASE`, credenciais Atlas, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, Resend e Blob como variáveis do servidor. `BETTER_AUTH_URL` deve usar a origem HTTPS do deployment. Separe banco, Blob e segredos de preview e produção e escolha uma região da função próxima ao cluster Atlas.

Antes da publicação de produção, valide o preview com cópia completa da origem. Pause edições, faça uma nova exportação, importe no destino de produção e execute `db:verify`. Use `ADMIN_READ_ONLY=true` durante a conferência do destino. Verifique leitura pública, idiomas, login, redefinição de senha, CRUD e upload antes de liberar edições.

Mantenha o deployment anterior e o Supabase disponíveis durante a validação. Se não houve escrita após a importação, o retorno usa o deployment anterior e a origem preservada. Após escritas no Atlas, pause novamente, exporte o estado atual e reconcilie alterações e arquivos antes de retornar. O rollback de deployment isoladamente não transporta essas alterações. A desativação definitiva do Supabase deve ocorrer após a validação da transferência.

## Verificação local

```powershell
npm.cmd run api:check
npm.cmd run test:api
npm.cmd test -- --watch=false
npm.cmd run build
```

Os testes de integração usam um banco temporário `portfoliov2_test_<identificador>` e o excluem ao final. Eles exigem permissões para criar e remover esse banco no cluster configurado. Resend é interceptado nesse teste, sem envio real de e-mail.

```powershell
$env:TEST_MONGODB = 'true'
node --env-file=.env --import tsx --test --test-timeout=90000 server/integration.test.ts
Remove-Item Env:TEST_MONGODB
```

Monitore `mongo.pool.created`, `mongo.connection.created`, `mongo.pool.checkout.failed` e `api.request` nos logs. O último registra status e duração por rota, sem query strings, tokens ou senhas. Compare criação de conexões e falhas de checkout com conexões atuais no Atlas e latência da API antes de ajustar o pool. Um `MongoClient` é reutilizado por instância e novas tentativas são permitidas após falha de conexão. O cliente é fechado no encerramento dos comandos administrativos.

Os arquivos em `supabase/` documentam o schema anterior. Os scripts em `supabase/legacy/` são material histórico e dependem do ambiente anterior. A aplicação migrada não instala o SDK Supabase nem publica `supabase-config.json`.

### Evidência local em 12/11/2026

- Instalação limpa no Windows, checagem de tipos da API e build PT/EN aprovados. O build apresenta avisos de locale `pt-BR` e CommonJS do SDK Blob.
- Última execução Angular com 72 testes aprovados. As duas falhas de animação observadas anteriormente não se reproduziram nessa execução.
- Cinco testes de validação/exportação e dez resultados de integração no Atlas aprovados. Os bancos temporários de integração foram removidos.
- Login, recuperação e formulário de nova senha verificados no navegador com Axe sem violações nos estados conferidos. O proxy de desenvolvimento respondeu à leitura pública da API.
- Varredura dos arquivos JavaScript publicados sem credenciais locais embutidas.

O envio de e-mail foi interceptado nos testes, e a autorização Blob foi exercitada com token de teste. Upload e entrega reais, exportação da origem e publicação Vercel aguardam configuração externa, conforme o escopo local definido para esta etapa.
