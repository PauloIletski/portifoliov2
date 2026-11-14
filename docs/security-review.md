# Revisão de segurança — 14/11/2026

## Resultado

Uma vulnerabilidade de alta confiança e severidade alta identificada e corrigida localmente. Dependências de produção sem alertas na auditoria após a correção. Revisão do código local; não é certificação de segurança nem teste de intrusão em produção. Exige novo deploy para que a correção alcance o site.

## Correção aplicada

- Lockfile atualizado sem `--force` e sem troca da versão principal do Angular: `body-parser` 2.4.0 e `qs` 6.17.1.
- Parser JSON com `inflate: false`; corpos comprimidos rejeitados com 415 e mensagem controlada.
- Testes HTTP reais em loopback cobrem gzip com e sem bytes adicionais, JSON inválido, limite de 4 MB, origem ausente/externa e tentativa de consultar coleções privadas ou passar operadores NoSQL. Cada requisição de corpo inválido é seguida de nova chamada para confirmar disponibilidade.
- `npm audit --omit=dev`: zero vulnerabilidades. Auditoria incluindo ferramentas: 16 alertas moderados remanescentes em cadeias `glob`/`minimatch` do Angular CLI. Não foi aplicado o downgrade incompatível proposto pelo `npm audit fix --force`.
- `npm run api:check` e build PT/EN aprovados. Suíte padrão: dez testes aprovados, integração opcional ignorada nessa execução.
- Pesquisa nos artefatos do navegador não encontrou os segredos backend configurados no `.env` local. O teste não imprime seus valores.
- Execução adicional com `TEST_MONGODB=true`: onze testes aprovados, sem ignorados, em banco Atlas temporário com nome aleatório, removido ao final. Cobertura de autorização, rascunhos, CRUD, tokens de upload, recuperação com Resend interceptado no teste, expiração/reutilização de tokens, revogação de sessões e importação retomável. Nenhum e-mail real enviado.
- Novo teste confirmou 429 e armazenamento de limites no banco mesmo alternando cabeçalhos de IP enviados pelo cliente. Isso valida a sobrescrita local; o proxy real da Vercel continua pendente de validação publicada.

## VULN-001 — Negação de serviço sem autenticação (Alta, corrigida)

- Local: `server/app.ts:61`; dependência fixada em `package-lock.json:4901`.
- Evidência: Express 5.3.0 carrega `body-parser` 2.3.0; `express.json({ limit: '4mb' })` mantém a descompressão habilitada e executa antes de `requireAdmin` (linha 72).
- Entrada controlada pelo atacante: corpo JSON comprimido e cabeçalho `Content-Encoding`. Um frame comprimido válido seguido de bytes adicionais pode produzir uma exceção não capturada e encerrar o processo Node.
- O middleware de origem não elimina este caminho: clientes HTTP fora do navegador podem enviar o Origin esperado; GET também passa pelo parser sem essa verificação. Não é necessário possuir sessão.
- Impacto: indisponibilidade da instância da API, com possibilidade de interrupções repetidas. O frontend estático pode continuar disponível, mas conteúdo e autenticação dependem da API.
- Correção: atualizar a dependência transitiva para `body-parser >= 2.4.0`. Como mitigação, desabilitar a descompressão com `inflate: false` se corpos comprimidos não forem necessários. Confirmar resposta de erro adequada para codificação não suportada e verificar continuidade do processo após requisição malformada.
- Fonte: https://github.com/advisories/GHSA-27r3-jxmh-p828 (CVE-2026-111181).
- Confiança: alta, pela versão instalada, configuração e caminho de execução. O crash não foi disparado nesta revisão.

## Proteções verificadas no código

- CRUD e autorização de uploads estão sob middleware que exige sessão Better Auth e vínculo na coleção `administrators`.
- Cadastro público desativado; recuperação usa tokens do Better Auth e revoga sessões após redefinição.
- Redirecionamento da recuperação passa pela validação de origem do Better Auth instalado.
- Limites de autenticação habilitados com armazenamento em banco; IP local sobrescrito pelo servidor.
- Categorias, UUIDs e payloads passam por validação Zod estrita; consultas públicas fixam `published: true`.
- Upload autorizado limita tipos a JPEG/PNG/WebP, tamanho a 5 MB e caminho conhecido.
- Não foram encontrados usos de bypass de sanitização Angular ou execução de comandos com entrada HTTP nos caminhos revisados.
- `.env` ignorado pelo Git; a pesquisa de padrões de credenciais não encontrou chaves reais nos arquivos pesquisados. Não foi auditado todo o histórico Git.

## Dependências e limites de evidência

- `npm audit --omit=dev`: dois alertas, um alto (`body-parser`) e um moderado (`qs`).
- `qs` 6.16.0: alerta GHSA-6pq8-jhm2-2vcw exige `qs.stringify` com `arrayFormat: 'comma'` e objeto controlado pelo atacante. Esse caminho não foi encontrado na aplicação; não contado como vulnerabilidade explorável confirmada. Atualização recomendada para 6.16.1 ou posterior.
- Auditoria completa incluindo ferramentas: 28 alertas (6 altos e 22 moderados), com cadeias transitivas. Esses números representam pacotes sinalizados, não 28 exploits confirmados no site.
- `npm run api:check`: aprovado.
- `npm run test:api`: cinco testes aprovados; uma suíte de integração Atlas ignorada porque `TEST_MONGODB` não estava habilitado. Login real, rate limit, tokens, cookies e isolamento de dados não foram revalidados em execução integrada nesta revisão.

## Precisa de verificação no ambiente publicado

- Confirmar que a senha temporária anteriormente solicitada foi substituída. Não foi tentado login com ela.
- Confirmar atributos Secure/HttpOnly/SameSite dos cookies em HTTPS e limite de tentativas com o IP real da Vercel, incluindo resistência a cabeçalhos de IP forjados.
- Revisar regras de rede e privilégios do usuário Atlas, separação preview/produção e escopo dos tokens Blob/Resend. Configurações de nuvem não foram acessadas.
- Confirmar ausência de segredos nos artefatos publicados. Nos artefatos locais e na recuperação em ambiente isolado, as verificações já passaram.

Nenhum teste de carga, tentativa de derrubar o serviço publicado ou alteração de dados de produção foi realizado. A seção de dependências acima registra a auditoria inicial; a seção de correção registra o estado atual.
