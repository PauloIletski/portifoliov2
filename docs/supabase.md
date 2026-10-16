# Supabase e administração

A integração usa Supabase Auth, Postgres e Storage. O layout público permanece o mesmo. Os dados são buscados no navegador após a hidratação, sem conexão com o banco durante o build. O HTML estático contém a estrutura e o estado de carregamento; o conteúdo remoto só aparece após a consulta no navegador e não faz parte do HTML inicial para SEO.

## Configuração do projeto hospedado

1. Crie um projeto em https://supabase.com/dashboard. Guarde a senha do banco fora do repositório.
2. Em Authentication, desative novos cadastros públicos. Crie manualmente um usuário com e-mail e senha e marque o e-mail como confirmado.
3. Execute `npx supabase login`, depois `npx supabase link --project-ref SEU_PROJECT_REF` e `npx supabase db push`. Revise o projeto selecionado antes de aplicar migrations. A CLI está instalada como dependência de desenvolvimento.
4. O seed não é aplicado automaticamente por `db push`. Para carregar os exemplos em um projeto novo, execute o conteúdo de `supabase/seed.sql` no SQL Editor uma única vez. Ele contém projetos, perfil, habilidades e três experiências explicitamente fictícias. Não execute novamente em um banco já preenchido.
5. Autorize a conta pelo SQL Editor, substituindo o UUID pelo id do usuário em Authentication:

```sql
insert into public.administrators (user_id) values ('UUID_DO_USUARIO');
```

A tabela aceita somente um administrador. Para substituí-lo, remova a autorização anterior e cadastre a nova via SQL Editor. Usuários comuns não podem alterar essa tabela. O guard do Angular ajuda a navegação; RLS é a barreira efetiva de acesso.

6. Copie `.env.example` para `.env` e configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Use a chave `sb_publishable_...` do painel Connect/API Keys. **Nunca use `service_role` ou uma chave secreta no frontend.** A URL e a chave publicável serão visíveis no navegador.
7. Execute `npm run supabase:config` para atualizar a configuração sem reconstruir, ou `npm start` / `npm run build`, que fazem isso automaticamente. Acesse `/admin/login` (ou `/en/admin/login`). O painel operacional está em português em ambas as versões.

O script lê `.env` e variáveis do ambiente de build, gera `public/supabase-config.json` e o Angular o copia para cada versão localizada. Ao publicar uma configuração diferente sem build, atualize `supabase-config.json` tanto na raiz quanto em `/en/`. Não aplique cache prolongado a esse arquivo.

O site não usa mocks como fallback. Durante a consulta, mostra carregamento; uma resposta vazia mostra o estado vazio. Falhas, configuração ausente, parcial ou inválida mostram erro e opção de tentar novamente. Somente registros publicados retornados pelo banco são exibidos.

## Conteúdo e painel

O admin usa um painel lateral com Projetos, Experiências, Perfil e Habilidades. Cada área possui seu próprio componente de formulário e uma instância local de `EditorState`; os campos e a seleção não são compartilhados entre áreas. A listagem, publicação e ações comuns ficam em `EditorShell`. Cada categoria inicia na listagem; **Adicionar** abre um formulário vazio e clicar no registro abre a edição. **Voltar à listagem** fecha o formulário. Salvar com sucesso retorna à lista; erros mantêm o formulário aberto e os campos preenchidos. A navegação lateral ocupa toda a altura da tela e fica compacta no mobile; apenas a área dos formulários tem rolagem. Áreas visitadas ficam preservadas durante a sessão do painel; ao retornar, os campos e a seleção permanecem. A área inativa fica oculta e fora da navegação por teclado. A troca leva o foco e a rolagem ao início do conteúdo ativo. Recarregar a página ainda descarta alterações não salvas.

- Projetos, experiências, perfil e habilidades possuem `position`, `published` e `translations` com `pt-BR` e `en-US`. Os UUIDs pertencem ao banco; os adaptadores preservam os contratos dos componentes públicos.
- O formulário aceita rascunhos com campos vazios. Para publicar, preencha os campos obrigatórios e as listas nos dois idiomas. As constraints do banco também validam esses dados, URLs e identificadores de ícones/grupos.
- Listas de tecnologias e atividades usam uma entrada por linha. No cadastro de projetos, cada detalhe tem campos próprios de título e descrição, com ações para adicionar/remover. Os princípios do perfil usam `Título | Descrição`, uma entrada por linha. Os registros de projetos existentes continuam compatíveis com o formulário.
- Ordenação usa o campo “Ordem”; empates são resolvidos pelo UUID. Existe apenas um registro de perfil.
- Imagens aceitam JPEG, PNG e WebP até 5 MB, com descrição alternativa nos dois idiomas. O bucket `portfolio-images` é público: não envie material privado nem imagens de rascunhos confidenciais. Somente o administrador pode enviar, substituir ou excluir objetos.
- Substituir uma imagem ou excluir um projeto não remove arquivos do Storage, pois podem ter outras referências. Arquivos enviados sem salvar podem ficar sem referência; a limpeza é manual no Dashboard nesta versão.
- Exclusão de registro exige confirmação. Falhas de gravação preservam os campos preenchidos. Publicação e alterações aparecem na próxima abertura da página ou tentativa de carregamento, sem Realtime.
- Recuperação de senha é feita pelo Dashboard. Não há cadastro público, gerenciamento de usuários ou formulário de contato nesta versão.

## Desenvolvimento local e tipos

Com Docker em execução:

```sh
npx supabase start
npx supabase db reset --local
npx supabase gen types typescript --local --schema public > src/app/core/supabase/database.types.ts
```

`db reset --local` apaga exclusivamente o banco de desenvolvimento local e recria migrations e seed. Nunca use reset em produção. Obtenha a URL e chave publicável local com `npx supabase status`; não copie a chave secreta para `.env`. Crie e autorize uma conta local antes de testar o painel.

Os tipos de transporte são gerados do schema; `models.ts` define os contratos de domínio dos payloads bilíngues. Após mudar migrations, regenere os tipos, execute os testes e faça build. Para parar os containers: `npx supabase stop`.

## Hospedagem estática

O build gera as páginas públicas e entradas `/admin/` e `/admin/login/` em PT/EN. Configure a hospedagem para servir `index.html` dos diretórios e, quando necessário, fazer fallback para `/index.html` e `/en/index.html`, preservando o prefixo de idioma. Não reescreva arquivos JSON/JS/CSS existentes. O servidor Python de preview atende os diretórios gerados; não oferece fallback genérico para futuras rotas.

## Verificação

Execute `npm test -- --watch=false` e `npm run build -- --output-path /tmp/portfoliov2-supabase-build`. O roteiro `scripts/verify-supabase.mjs` usa um Supabase **local descartável** para validar diretamente pela API leitura pública, rascunhos, bloqueio de escrita, autenticação, publicação bilíngue e upload. Não o execute em produção.

Referências: [API Keys](https://supabase.com/docs/guides/getting-started/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control).

### Validação realizada nesta implementação

- Build de produção PT/EN com 14 rotas e suíte de 30 testes aprovados.
- Migration e seed executados em Postgres 17 descartável; `supabase/tests/content.sql` confirmou RLS, publicação bilíngue e CRUD administrativo. As interfaces `auth` e `storage` desse teste foram mínimas; isso não valida os serviços Supabase Auth/Storage.
- Analisador de segurança da CLI executado nesse banco, sem problemas encontrados.
- Tipos gerados pela CLI a partir desse schema. Regenere com `--linked` após conectar o projeto hospedado.
- Chromium: páginas públicas/login em PT/EN e editores administrativos com API simulada; checagens de teclado, larguras mobile e AXE AA.
- O download das imagens para o stack Supabase completo não foi concluído. Os testes HTTP reais de Auth e Storage permanecem pendentes; execute `node scripts/verify-supabase.mjs` quando o stack local estiver disponível.

Para repetir a verificação SQL no Supabase local: `npx supabase db query --local --file supabase/tests/content.sql`. Use um banco de desenvolvimento sem administrador cadastrado: o teste cria uma autorização temporária e faz rollback ao terminar.

O admin exibe apenas registros retornados pelo banco. Consultas vazias mostram uma listagem vazia para iniciar um cadastro. Sem conexão ou em falhas, mostra o erro com opção de recarregar e preserva registros já carregados e campos preenchidos. Não há exemplos automáticos no painel. Salvar exige conexão e autorização reais.

## Contatos

A área **Contato** gerencia um registro por endereço ou número. Use **Adicionar contato** para cadastrar vários itens; cada um pode ser editado, excluído e exibido individualmente pelo toggle **Exibir este contato no site**. Endereços e toggles são compartilhados entre PT/EN. Há suporte a WhatsApp, LinkedIn, GitHub, Instagram, Facebook, YouTube, X, site e e-mail, com ícones SVG locais.

Para WhatsApp, informe país, DDD e número; o site gera `https://wa.me/` com os dígitos normalizados. Redes sociais exigem URLs HTTP(S); e-mail gera `mailto:`. Não são enviados e-mails pelo site.

O site reúne todos os contatos publicados e mostra os que estão com o toggle ativo. Quando todos os registros retornados estão ocultos, mostra a ausência de canais. Consultas vazias mostram ausência de canais; falhas mostram erro e opção de tentar novamente, sem contatos de exemplo.

Aplique as migrations com `npx supabase db push`. A migration `20261014214813_contact_channels.sql` cria a tabela e as políticas. A migration `20261014220411_individual_contacts.sql` separa os canais existentes em registros individuais, preserva o UUID do primeiro canal preenchido e remove placeholders vazios. Os toggles controlam a apresentação; não são campos para armazenar dados privados.

Todas as áreas exibem **Excluir** junto de cada registro salvo. A confirmação identifica o item e permite cancelar. Excluir outro registro preserva os campos do formulário em edição. A listagem só muda após a confirmação da operação pelo banco; falhas mantêm os registros e os campos preenchidos. O perfil continua sendo um cadastro único.

As rotas `/admin` e `/admin/login`, em ambos os idiomas, não exibem o menu público nem o rodapé. A navegação lateral administrativa continua disponível.

## Tapume de lançamento

Aplique `20261016014654_maintenance_page.sql` com `npx supabase db push` antes de usar a área **Tapume** no admin. Há um único cadastro, sem conteúdo fictício ou ativação automática. Cadastre a frase em PT/EN, a data/hora do lançamento e as tecnologias utilizadas. **Ativar tapume no site** exige os dois idiomas, data válida e pelo menos uma tecnologia. Desmarque a opção e salve para restaurar o portfólio.

O horário do formulário segue o fuso do dispositivo; a data é salva em ISO com fuso e compartilhada entre os idiomas. O contador atualiza a cada segundo e para em zero, exibindo uma mensagem de preparação. Chegar à data não desativa o tapume: a liberação permanece sob controle do administrador.

O tapume substitui as páginas públicas, menu e rodapé, mantendo `/admin` e `/admin/login` acessíveis. A configuração é consultada após a hidratação; durante a consulta inicial, aparece um spinner para evitar mostrar o portfólio antes de saber se está em manutenção. Ao sair do admin para o site, a configuração é consultada novamente. Novas visitas carregam a configuração salva; abas já abertas não recebem atualizações em tempo real.

Se a consulta do tapume falhar, o portfólio permanece acessível. Esta tela é um controle de apresentação, não uma barreira de segurança para os dados publicados. O HTML prerenderizado contém o carregamento inicial, não os textos remotos. As políticas RLS permitem leitura pública somente do tapume ativo e reservam as alterações ao administrador autorizado.

Verificação SQL: execute `supabase/tests/maintenance.sql` em um banco de desenvolvimento isolado. O teste verifica leitura de rascunhos, ativação, validação bilíngue, data, cadastro único e proibição de escrita para visitantes. Ele faz rollback ao terminar.

### Redes sociais no tapume

No formulário **Tapume**, use **Botões de redes e contato → Adicionar rede**. Cada botão possui rede/tipo, endereço e opção **Exibir no tapume**. É possível incluir vários itens, editar seus destinos e remover os que não serão usados. Os endereços e a visibilidade são compartilhados entre PT/EN; os rótulos são traduzidos automaticamente. Redes sociais usam URLs HTTP(S), WhatsApp gera `wa.me` e e-mail gera `mailto:`. As alterações são persistidas ao salvar o tapume.

Aplique também `20261016021730_maintenance_social_links.sql` com `npx supabase db push`. A migration mantém tapumes antigos válidos e adiciona a validação dos links no banco, inclusive em chamadas diretas à API. A tabela e suas políticas RLS permanecem as mesmas. Os botões do tapume têm cadastro próprio na configuração do lançamento.
