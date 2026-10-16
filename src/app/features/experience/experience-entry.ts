export interface ExperienceEntry {
  readonly id: string;
  readonly role: string;
  readonly company: string;
  readonly period: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly technologies: readonly string[];
}

// Demonstration data only. Replace with the owner's verified professional history.
export const EXPERIENCES: readonly ExperienceEntry[] = [
  {
    id: 'recent',
    role: $localize`:@@experience.recent.role:Engenheiro de software`,
    company: $localize`:@@experience.recent.company:Empresa exemplo A`,
    period: $localize`:@@experience.recent.period:2025 até o momento`,
    summary: $localize`:@@experience.recent.summary:Exemplo de atuação na evolução de aplicações web e na definição de soluções técnicas.`,
    highlights: [$localize`:@@experience.recent.highlight0:Construção de interfaces acessíveis e responsivas.`, $localize`:@@experience.recent.highlight1:Colaboração em decisões de arquitetura e revisão de código.`],
    technologies: ['Angular', 'TypeScript', 'Node.js'],
  },
  {
    id: 'frontend',
    role: $localize`:@@experience.frontend.role:Desenvolvedor front-end`,
    company: $localize`:@@experience.frontend.company:Empresa exemplo B`,
    period: $localize`:@@experience.frontend.period:2023 a 2025`,
    summary: $localize`:@@experience.frontend.summary:Exemplo de desenvolvimento de interfaces e integração com serviços de uma plataforma digital.`,
    highlights: [$localize`:@@experience.frontend.highlight0:Implementação de componentes reutilizáveis.`, $localize`:@@experience.frontend.highlight1:Integração com APIs e melhoria dos fluxos de navegação.`],
    technologies: ['Angular', 'Sass', 'REST'],
  },
  {
    id: 'junior',
    role: $localize`:@@experience.junior.role:Desenvolvedor júnior`,
    company: $localize`:@@experience.junior.company:Empresa exemplo C`,
    period: $localize`:@@experience.junior.period:2021 a 2023`,
    summary: $localize`:@@experience.junior.summary:Exemplo de início de carreira com manutenção de aplicações e desenvolvimento acompanhado por uma equipe.`,
    highlights: [$localize`:@@experience.junior.highlight0:Correção de problemas e entrega de pequenas funcionalidades.`, $localize`:@@experience.junior.highlight1:Aprendizado de versionamento, testes e boas práticas.`],
    technologies: ['JavaScript', 'HTML', 'CSS'],
  },
];
