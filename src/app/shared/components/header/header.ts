import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { MotionDisclosure } from '../../directives/motion-disclosure';

declare const $localize: (messageParts: TemplateStringsArray, ...expressions: unknown[]) => string;

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, LanguageSwitcher, MotionDisclosure],
  templateUrl: './header.html',
  styleUrl: './header.sass',
})
export class Header {
  protected readonly menuOpen = signal(false);

  protected closeWithEscape(event: Event, toggle: { focus(): void }): void {
    if (!this.menuOpen()) return;
    event.preventDefault();
    this.menuOpen.set(false);
    toggle.focus();
  }

  protected readonly navigation = [
    {
      label: $localize`:@@nav.home:Início`,
      path: '/',
    },
    {
      label: $localize`:@@nav.projects:Projetos`,
      path: '/projects',
    },
    {
      label: $localize`:@@nav.experience:Experiência`,
      path: '/experience',
    },
    {
      label: $localize`:@@nav.about:Sobre`,
      path: '/about',
    },
    {
      label: $localize`:@@nav.contact:Contato`,
      path: '/contact',
    },
  ] as const;
}
