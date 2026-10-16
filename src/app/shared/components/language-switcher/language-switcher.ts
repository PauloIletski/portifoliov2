import { Component, LOCALE_ID, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-language-switcher',
  imports: [MatButtonModule],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.sass',
})
export class LanguageSwitcher {
  private readonly locale = inject(LOCALE_ID);
  private readonly router = inject(Router);

  protected readonly isEnglish = this.locale.startsWith('en');

  protected get ptUrl(): string {
    return this.router.url;
  }

  protected get enUrl(): string {
    return `/en${this.router.url}`;
  }
}
