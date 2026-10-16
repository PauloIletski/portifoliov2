import { publicContent } from './core/supabase/content';
import { ContentStatus } from './core/supabase/content-status';
import { Maintenance } from './features/maintenance';
import { RouteSlide } from './shared/directives/route-slide';
import { Location } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, inject, LOCALE_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, RouteSlide, ContentStatus, Maintenance],
  templateUrl: './app.html',
  styleUrl: './app.sass',
  host: {
    '[class.admin-layout]': 'isAdmin()',
    '[class.maintenance-layout]': '!isAdmin() && (maintenance.loading() || !!activeMaintenance())',
  },
})
export class App {
  protected readonly english = inject(LOCALE_ID).startsWith('en');
  protected readonly maintenance = publicContent('maintenance');
  protected readonly activeMaintenance = computed(() => this.maintenance.data()?.[0]);
  private readonly destroyRef = inject(DestroyRef);
  constructor() {
    afterNextRender(() => {
      let wasAdmin = this.isAdmin();
      const subscription = this.router.events.subscribe((event) => {
        if (!(event instanceof NavigationEnd)) return;
        const admin = /^\/admin(?:\/|$)/.test(event.urlAfterRedirects.split(/[?#]/)[0]);
        if (wasAdmin && !admin) void this.maintenance.reload();
        wasAdmin = admin;
      });
      this.destroyRef.onDestroy(() => subscription.unsubscribe());
    });
  }
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.location.path() || this.router.url },
  );
  protected readonly isAdmin = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    return path === '/admin' || path.startsWith('/admin/');
  });
}
