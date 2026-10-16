# Material e Motion

O projeto usa Angular Material 21 e a API JavaScript do Motion.

## Tema

### Padrão visual do projeto

A Home é a referência visual. Cores, tamanho e peso dos títulos, entrelinha,
espaçamento entre letras, margens laterais e divisórias ficam centralizados
em `src/styles/_tokens.scss`. Use os tokens `--font-display-*`,
`--page-gutter`, `--page-block-*` e `--color-border` para manter as páginas
consistentes. Os breakpoints dos tokens ajustam essas medidas no mobile.
Preserve esse padrão ao alterar comportamentos: não introduza outra paleta,
tipografia ou estilo de cartão junto de uma mudança funcional.

### Material

`src/material-theme.scss` configura Material 3 em modo escuro, com cores alinhadas
à paleta de `src/styles/_tokens.scss`. Ambos são carregados pelos estilos globais.
A tipografia usa Segoe UI com fallback sans-serif, sem fontes externas.
Ao ajustar a paleta, mantenha os tokens e o tema Material sincronizados e confira
o contraste entre cada cor e seu respectivo token `on-*`.

Importe apenas os módulos Material necessários no componente consumidor:

```ts
import { MatButtonModule } from '@angular/material/button';
// No @Component: imports: [MatButtonModule]
```

```html
<button mat-flat-button>Salvar</button>
```

O seletor PT/EN já usa `mat-button`. Novos textos devem ter marcação i18n e
tradução em `src/locale/messages.en-US.xlf`.

## Motion

`MotionEnter`, em `src/app/shared/directives/motion-enter.ts`, usa `motion/mini`
para uma entrada curta de opacidade. Importe a diretiva no componente e aplique
`appMotionEnter` ao elemento. A Home revela o bloco de texto em 450 ms e o
planeta com um intervalo de 120 ms. Use `[motionDelay]="0.12"` para configurar
o intervalo em segundos (limitado a 400 ms).

A diretiva executa depois da renderização no navegador, mantém o conteúdo
visível no SSR e quando JavaScript está desativado, respeita
`prefers-reduced-motion` e encerra a animação ao destruir o elemento.
Use animações automáticas com moderação; para novos efeitos, prefira respostas
a ações do usuário. Para sequências, gestos e transformações independentes,
use a API completa de `motion` quando necessário.

`MotionDisclosure` controla o painel mobile do menu com
`[appMotionDisclosure]="menuOpen()"`: entrada de 220 ms e saída de 160 ms.
Durante a saída, o painel permanece renderizado, mas fica `inert` e oculto
para tecnologias assistivas. Ao finalizar, recebe `hidden`. A diretiva
ignora conclusões antigas quando o menu é reaberto, mantém a navegação desktop
visível e aplica mudanças imediatas quando movimento reduzido está ativo.
O breakpoint de 1023 px deve permanecer alinhado ao Sass do header.

O componente `Planet` usa `motion/mini` para pulsar seis estrelas em ritmos
diferentes e cruzar um foguete SVG pela cena ao mouse entrar na área do planeta.
Cada entrada inicia uma passagem de 5 s, sem repetição automática nem voos sobrepostos.
`[paused]` controla a pausa das animações ambientais pela Home. A reprodução
também pausa fora da viewport e quando a aba está oculta. A preferência por
movimento reduzido interrompe os efeitos e mantém as estrelas estáticas.
O foguete fica recortado à área da ilustração para não interceptar o conteúdo.

## Timeline de experiências

A rota `/experience` usa Angular Aria 21 para expandir os pontos da timeline,
mantendo um registro aberto por vez e permitindo recolher o registro ativo.
O conteúdo é carregado ao expandir; teclado e atributos de acessibilidade
são gerenciados pelas diretivas de accordion.

Os três registros de `src/app/features/experience/experience-entry.ts` são
mocks com empresas de exemplo, não um histórico profissional real. Substitua
os dados por informações verificadas e atualize as traduções PT/EN ao publicar
experiências reais. A página usa os tokens visuais compartilhados do projeto.

Referências: [animate](https://motion.dev/docs/animate) e
[inView](https://motion.dev/docs/inview). Para estes efeitos, `motion/mini`
anima somente opacidade; a Home não oculta conteúdo em resposta ao scroll.

## Validação

Para prévia local com PT/EN, execute `npm run dev:preview` e abra
`http://localhost:8080/`. O comando aguarda o primeiro build antes de iniciar
o servidor e preserva os arquivos durante as reconstruções. Encerre o comando
com Ctrl+C antes de reiniciá-lo, para liberar a porta 8080.

Execute `npm run build` para validar tema, SSR e traduções dos dois idiomas.
O aviso de fallback dos dados regionais de `pt-BR` para `pt` é conhecido.
