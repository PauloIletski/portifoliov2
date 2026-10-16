# Benchmark da vitrine de projetos — v1

Pesquisa realizada em 14/10/2026. Escopo: definir a apresentação dos projetos
do portfólio de Paulo Vieira. Esta é uma proposta de design, não uma
implementação nem um teste com usuários.

## Referências

| Referência | Padrão observado | Aplicação ao portfólio |
| --- | --- | --- |
| [Apple App Store](https://apps.apple.com/us/iphone/today) | Destaques editoriais e coleções de aplicativos | Um projeto principal com captura real da interface e uma apresentação curta |
| [Raycast Store](https://www.raycast.com/store) | Destaques separados do catálogo; nome, descrição e ação por extensão | Identidade de cada projeto e acesso claro à demonstração e ao estudo de caso |
| [Vercel Templates](https://vercel.com/templates) | Busca e exploração por frameworks e casos de uso | Categorias baseadas no problema resolvido; tecnologias como informação complementar |
| [W3C: Carousels](https://www.w3.org/WAI/tutorials/carousels/) | Orientação sobre teclado, foco, anúncios e pausa; ressalva sobre descoberta do conteúdo | Carrossel manual e opcional, com acesso à coleção completa |

## Comparação das alternativas

Avaliação editorial para este portfólio; não representa métricas das referências.

| Alternativa | Vantagem | Custo ou limitação | Adequação à v1 |
| --- | --- | --- | --- |
| Carrossel como única vitrine | Dá espaço para capturas grandes | Exige interação para descobrir os demais projetos e controles acessíveis | Menor |
| Catálogo inspirado em app store | Facilita comparar projetos e entender o que cada um faz | Precisa de capturas e descrições bem preparadas | Maior |
| Destaque editorial + catálogo | Cria hierarquia e mantém os outros projetos visíveis | Exige escolher um projeto principal | Recomendada |

## Proposta recomendada

Na rota `/projects`, abrir com um projeto principal e seguir com todos os
projetos. Usar a lógica de descoberta de uma app store, com conteúdo de
portfólio: problema, contribuição, demonstração e decisões técnicas.

Desktop:

```text
Projetos
Uma frase sobre o tipo de solução que você constrói.

[Captura grande do projeto principal] [Nome e finalidade]
[                                   ] [Sua contribuição]
[                                   ] [Ver projeto] [Abrir demonstração]

Todos os projetos
[Captura A]           [Captura B]           [Captura C]
Nome e finalidade     Nome e finalidade     Nome e finalidade
Tecnologias           Tecnologias           Tecnologias
Ver projeto           Ver projeto           Ver projeto
```

Mobile: destaque empilhado, seguido de uma coluna de projetos. Não depender
de arrastar para descobrir conteúdo. Se houver uma prévia de projetos na
Home, ela pode usar uma faixa horizontal manual com parte do próximo item
visível, botões anterior/próximo e link “Ver todos os projetos”.

## Direção visual

- Base azul profunda `#0b1020`; superfície `#172238`; texto `#f5f7fa`;
  apoio `#b5c1d4`; ação `#477bff`; detalhe `#22c6ae`.
- Segoe UI, já presente no projeto. Títulos alinhados à esquerda e descrições
  curtas; informações técnicas subordinadas à finalidade do produto.
- Capturas reais como elemento principal. Manter proporção consistente de
  16:10 no catálogo e preservar a interface sem cortes que ocultem conteúdo.
- Diferenciar o destaque dos itens de catálogo por escala e composição.
  A personalidade vem dos produtos apresentados e da identidade azul já
  estabelecida no portfólio. O tema espacial permanece na Home.
- Motion em transições curtas de opacidade acionadas pela interação;
  respeitar movimento reduzido. Evitar reprodução automática do carrossel.

## Conteúdo necessário por projeto

Nome, resumo em uma frase, problema resolvido, contribuição pessoal,
tecnologias, captura real e texto alternativo. Adicionar demonstração,
repositório e resultados somente quando disponíveis e verificáveis.
Se o código for privado, explicar o contexto no estudo de caso.

## Escopo da v1

1. Selecionar de três a seis projetos reais e um destaque.
2. Criar catálogo responsivo e página de detalhe por projeto, com URL própria.
3. Usar botões Material, dados tipados e textos PT/EN.
4. Verificar teclado, foco visível, contraste e nomes acessíveis dos links.
5. Adicionar filtros somente se existirem categorias úteis com conteúdo
   suficiente. Busca, avaliações e contagens de downloads não são necessárias
   para esta coleção inicial.

No estado atual do repositório, a página de projetos contém apenas um
placeholder e não há capturas em `public`. A implementação depende da seleção
dos projetos e dos respectivos materiais. Nenhum projeto ou resultado foi
inventado para esta proposta.
