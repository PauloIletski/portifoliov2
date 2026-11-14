import { DOCUMENT } from '@angular/common';
import { inject, Injectable, LOCALE_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const origin = 'https://www.paulovieira.site';
const pages: Record<string, { pt: [string, string]; en: [string, string] }> = {
  '': {
    pt: ['Engenheiro de Software', 'Conheça o portfólio de Paulo Vieira: projetos, experiência e habilidades na construção de aplicações escaláveis, acessíveis e de alta performance.'],
    en: ['Software Engineer', 'Explore Paulo Vieira’s portfolio: projects, experience and skills in building scalable, accessible and high-performance applications.'],
  },
  projects: {
    pt: ['Projetos', 'Explore os projetos de Paulo Vieira, com detalhes das soluções, tecnologias utilizadas e contribuições em engenharia de software.'],
    en: ['Projects', 'Explore Paulo Vieira’s projects, including solution details, technologies and software engineering contributions.'],
  },
  experience: {
    pt: ['Experiência', 'Conheça a trajetória profissional de Paulo Vieira, suas contribuições e as tecnologias utilizadas em cada etapa da carreira.'],
    en: ['Experience', 'Discover Paulo Vieira’s career timeline, contributions and the technologies used at each stage of his professional journey.'],
  },
  about: {
    pt: ['Sobre', 'Saiba mais sobre Paulo Vieira, suas habilidades, princípios de trabalho e abordagem para construir aplicações de qualidade.'],
    en: ['About', 'Learn about Paulo Vieira, his skills, working principles and approach to building quality applications.'],
  },
  contact: {
    pt: ['Contato', 'Entre em contato com Paulo Vieira para conversar sobre projetos, oportunidades profissionais e engenharia de software.'],
    en: ['Contact', 'Contact Paulo Vieira to discuss projects, professional opportunities and software engineering.'],
  },
};

@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly english = inject(LOCALE_ID).startsWith('en');

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const path = snapshot.url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
    const page = pages[path];
    const admin = path === 'admin' || path.startsWith('admin/');
    const [label, description] = page?.[this.english ? 'en' : 'pt'] ??
      (this.english ? ['Administration', 'Portfolio administration.'] : ['Administração', 'Administração do portfólio.']);
    const title = `PV. | Paulo Vieira | ${label}`;
    const url = `${origin}${this.english ? '/en' : ''}/${path}`.replace(/\/$/, path ? '' : '/');
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: admin || !page ? 'noindex, nofollow' : 'index, follow' });
    for (const [property, content] of Object.entries({
      'og:title': title, 'og:description': description, 'og:url': url,
      'og:type': 'website', 'og:site_name': 'PV. | Paulo Vieira',
      'og:locale': this.english ? 'en_US' : 'pt_BR',
    })) this.meta.updateTag({ property, content });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.document.head.querySelectorAll('link[rel="canonical"], link[rel="alternate"][hreflang]').forEach(link => link.remove());
    if (!page || admin) return;
    this.link('canonical', url);
    this.link('alternate', `${origin}/${path}`, 'pt-BR');
    this.link('alternate', `${origin}/en/${path}`, 'en-US');
    this.link('alternate', `${origin}/${path}`, 'x-default');
  }

  private link(rel: string, href: string, language?: string): void {
    const link = this.document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (language) link.hreflang = language;
    this.document.head.appendChild(link);
  }
}
