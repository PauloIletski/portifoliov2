import { Location } from '@angular/common';
import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { animate } from 'motion/mini';

@Directive({ selector: '[appRouteSlide]' })
export class RouteSlide {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      let path = this.location.path().split(/[?#]/)[0] || '/';
      let animation: ReturnType<typeof animate> | undefined;
      const subscription = this.router.events.subscribe((event) => {
        if (!(event instanceof NavigationEnd)) return;
        const nextPath = event.urlAfterRedirects.split(/[?#]/)[0];
        if (path === nextPath) return;
        path = nextPath;
        animation?.complete();
        if (preference.matches) return;
        animation = animate(
          this.element.nativeElement,
          {
            transform: ['translateX(24px)', 'translateX(0px)'],
          },
          { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
        );
      });
      const onPreferenceChange = () => {
        if (preference.matches) animation?.complete();
      };
      preference.addEventListener('change', onPreferenceChange);
      this.destroyRef.onDestroy(() => {
        subscription.unsubscribe();
        preference.removeEventListener('change', onPreferenceChange);
        animation?.stop();
      });
    });
  }
}
