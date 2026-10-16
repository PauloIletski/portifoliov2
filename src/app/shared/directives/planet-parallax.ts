import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';
import { animate } from 'motion/mini';

@Directive({
  selector: '[appPlanetParallax]',
  host: {
    '(pointermove)': 'onPointerMove($event)',
    '(pointerleave)': 'reset()',
    '(pointercancel)': 'reset()',
  },
})
export class PlanetParallax {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly animations = new Map<HTMLElement, ReturnType<typeof animate>>();
  private layers: { element: HTMLElement; depth: number }[] = [];
  private enabled = false;
  private frame: number | undefined;

  constructor() {
    afterNextRender(() => {
      const preference = window.matchMedia('(prefers-reduced-motion: no-preference) and (pointer: fine)');
      this.layers = Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('[data-depth]'))
        .map(element => ({ element, depth: Number(element.dataset['depth']) }));
      const updatePreference = () => {
        this.enabled = preference.matches;
        if (!this.enabled) this.resetImmediately();
      };
      updatePreference();
      preference.addEventListener('change', updatePreference);
      this.destroyRef.onDestroy(() => {
        preference.removeEventListener('change', updatePreference);
        this.resetImmediately();
      });
    });
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.enabled || event.pointerType !== 'mouse') return;
    this.cancelFrame();
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      const bounds = this.element.nativeElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      this.move(x, y);
    });
  }

  protected reset(): void {
    this.cancelFrame();
    if (this.enabled) this.move(0, 0);
  }

  private move(x: number, y: number): void {
    for (const layer of this.layers) {
      this.animations.get(layer.element)?.stop();
      this.animations.set(layer.element, animate(layer.element, {
        transform: `translate3d(${x * layer.depth * 22}px, ${y * layer.depth * 18}px, 0)`,
      }, { duration: 0.6, ease: 'easeOut' }));
    }
  }

  private cancelFrame(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }

  private resetImmediately(): void {
    this.cancelFrame();
    for (const animation of this.animations.values()) animation.stop();
    this.animations.clear();
    for (const layer of this.layers) layer.element.style.removeProperty('transform');
  }
}
