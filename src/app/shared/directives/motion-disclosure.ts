import {
  DestroyRef, Directive, ElementRef, afterNextRender,
  effect, inject, input, signal, untracked,
} from '@angular/core';
import { animate } from 'motion/mini';

/** Keeps a mobile disclosure rendered during its fade-out, but immediately inert. */
@Directive({
  selector: '[appMotionDisclosure]',
  host: {
    '[hidden]': 'hidden()',
    '[class.is-leaving]': 'leaving()',
    '[attr.inert]': 'mobile() && !open() ? "" : null',
    '[attr.aria-hidden]': 'mobile() && !open() ? "true" : null',
  },
})
export class MotionDisclosure {
  readonly open = input.required<boolean>({ alias: 'appMotionDisclosure' });
  protected readonly hidden = signal(false);
  protected readonly leaving = signal(false);
  protected readonly mobile = signal(false);
  private readonly ready = signal(false);
  private readonly reduced = signal(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private animation: ReturnType<typeof animate> | undefined;
  private version = 0;
  private previousOpen = false;

  constructor() {
    effect(() => {
      if (!this.ready()) return;
      const open = this.open();
      const mobile = this.mobile();
      const reduced = this.reduced();
      untracked(() => this.transition(open, mobile, reduced));
    });

    afterNextRender(() => {
      const mobile = window.matchMedia('(max-width: 1023px)');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const sync = () => {
        this.mobile.set(mobile.matches);
        this.reduced.set(reduced.matches);
      };
      sync();
      this.ready.set(true);
      mobile.addEventListener('change', sync);
      reduced.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => {
        ++this.version;
        this.animation?.stop();
        mobile.removeEventListener('change', sync);
        reduced.removeEventListener('change', sync);
      });
    });
  }

  private transition(open: boolean, mobile: boolean, reduced: boolean): void {
    const version = ++this.version;
    this.animation?.stop();
    this.animation = undefined;
    const element = this.element.nativeElement;
    const wasOpen = this.previousOpen;
    this.previousOpen = open && mobile;

    if (!mobile || reduced || (!open && !wasOpen && !this.leaving())) {
      this.hidden.set(mobile && !open);
      this.leaving.set(false);
      element.style.removeProperty('opacity');
      return;
    }

    this.hidden.set(false);
    this.leaving.set(!open);
    this.animation = animate(element, {
      opacity: open ? [0, 1] : 0,
    }, { duration: open ? 0.22 : 0.16, ease: open ? 'easeOut' : 'easeIn' });

    void this.animation.then(() => {
      if (version !== this.version || this.destroyRef.destroyed) return;
      this.hidden.set(!open);
      this.leaving.set(false);
      element.style.removeProperty('opacity');
      this.animation = undefined;
    });
  }
}
