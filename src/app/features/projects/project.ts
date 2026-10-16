export interface Project {
  readonly id: string;
  readonly name: string;
  readonly author: string;
  readonly mark: string;
  readonly category: string;
  readonly summary: string;
  readonly technologies: readonly string[];
  readonly collectionStack: string;
  readonly demoRoute: string;
  readonly demoLabel: string;
  readonly detailsTitle: string;
  readonly details: readonly { readonly title: string; readonly description: string }[];
  readonly image?: { readonly src: string; readonly width: number; readonly height: number; readonly alt: string };
}

export const PROJECTS: readonly Project[] = [{
  id: 'portfolio', name: $localize`:@@projects.portfolio:Portfólio pessoal`,
  author: 'Paulo Vieira', mark: 'PV', category: $localize`:@@projects.category:Aplicação web`,
  summary: $localize`:@@projects.summary:Uma experiência para apresentar meu trabalho, com navegação acessível, dois idiomas e uma cena espacial interativa.`,
  technologies: ['Angular 21', 'TypeScript', 'Material', 'Motion'], collectionStack: 'Angular / TypeScript',
  demoRoute: '/', demoLabel: $localize`:@@projects.explore:Explorar o portfólio`,
  detailsTitle: $localize`:@@projects.inside:Por dentro do portfólio`,
  details: [
    { title: $localize`:@@projects.interfaceTitle:Uma base consistente`, description: $localize`:@@projects.interfaceText:Componentes Angular, tema Material personalizado e layouts que se adaptam do celular ao desktop.` },
    { title: $localize`:@@projects.motionTitle:Movimento com intenção`, description: $localize`:@@projects.motionText:Planeta em camadas, estrelas e um foguete acionado pelo mouse. As animações respeitam a preferência por movimento reduzido.` },
    { title: $localize`:@@projects.languagesTitle:Duas formas de explorar`, description: $localize`:@@projects.languagesText:Versões em português e inglês, com páginas pré-renderizadas e atenção à navegação por teclado.` },
  ],
}];
