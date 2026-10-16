import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input, numberAttribute } from '@angular/core';
import { animate } from 'motion/mini';

@Directive({
  selector: '[appMotionEnter]',
})
export class MotionEnter {
  readonly delay = input(0, {
    alias: 'motionDelay',
    transform: (value: unknown) => Math.max(0, Math.min(0.4, numberAttribute(value, 0))),
  });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (preference.matches) return;

      const delay = this.delay();
      const animation = animate(this.element.nativeElement, { opacity: [0, 1] }, {
        duration: 0.45,
        delay,
        ease: 'easeOut',
      });
      const onPreferenceChange = () => {
        if (preference.matches) animation.complete();
      };
      preference.addEventListener('change', onPreferenceChange);
      this.destroyRef.onDestroy(() => {
        preference.removeEventListener('change', onPreferenceChange);
        animation.stop();
      });
    });
  }
}
