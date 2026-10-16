import {
  Component, DestroyRef, ElementRef, afterNextRender,
  effect, inject, input, signal, untracked,
} from '@angular/core';
import { animate } from 'motion/mini';

@Component({
  selector: 'app-planet',
  host: {
    'aria-hidden': 'true',
    '(pointerenter)': 'launchRocket($event)',
  },
  imports: [],
  templateUrl: './planet.html',
  styleUrl: './planet.sass',
})
export class Planet {
  readonly paused = input(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ready = signal(false);
  private readonly visible = signal(false);
  private readonly reduced = signal(true);
  private readonly pageVisible = signal(true);
  private rocketAnimation: ReturnType<typeof animate> | undefined;
  private animations: ReturnType<typeof animate>[] = [];

  constructor() {
    effect(() => {
      const ready = this.ready();
      const reduced = this.reduced();
      const playing = this.visible() && this.pageVisible() && !this.paused();
      untracked(() => {
        if (!ready) return;
        if (reduced) {
          this.stop();
          return;
        }
        if (!this.animations.length && playing) this.start();
        for (const animation of [...this.animations, ...(this.rocketAnimation ? [this.rocketAnimation] : [])]) {
          if (playing) animation.play();
          else animation.pause();
        }
      });
    });

    afterNextRender(() => {
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      const syncPreference = () => this.reduced.set(preference.matches);
      const syncVisibility = () => this.pageVisible.set(!document.hidden);
      syncPreference();
      syncVisibility();
      preference.addEventListener('change', syncPreference);
      document.addEventListener('visibilitychange', syncVisibility);
      const observer = new IntersectionObserver(entries => {
        this.visible.set(entries.some(entry => entry.isIntersecting));
      });
      observer.observe(this.element.nativeElement);
      this.ready.set(true);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        preference.removeEventListener('change', syncPreference);
        document.removeEventListener('visibilitychange', syncVisibility);
        this.stop();
      });
    });
  }

  private start(): void {
    const stars = this.element.nativeElement.querySelectorAll<HTMLElement>('.star');
    stars.forEach((star, index) => {
      this.animations.push(animate(star, { opacity: [0.25, 0.9, 0.25] }, {
        duration: 3.8 + index * 0.45,
        delay: index * 0.35,
        repeat: Infinity,
        ease: 'easeInOut',
      }));
    });
  }

  protected launchRocket(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !this.ready() || this.reduced()
      || this.paused() || !this.pageVisible() || this.rocketAnimation) return;
    const rocket = this.element.nativeElement.querySelector<HTMLElement>('.rocket-track');
    if (!rocket) return;
    const animation = animate(rocket, {
      transform: [
        'translate(-12%, 78%)', 'translate(18%, 58%)',
        'translate(58%, 36%)', 'translate(105%, 10%)',
      ],
      opacity: [0, 1, 1, 0],
    }, { duration: 5, ease: 'linear' });
    this.rocketAnimation = animation;
    void animation.then(() => {
      if (this.rocketAnimation !== animation) return;
      this.rocketAnimation = undefined;
      rocket.style.removeProperty('opacity');
      rocket.style.removeProperty('transform');
    });
  }

  private stop(): void {
    this.rocketAnimation?.stop();
    this.rocketAnimation = undefined;
    for (const animation of this.animations) animation.stop();
    this.animations = [];
    for (const element of this.element.nativeElement.querySelectorAll<HTMLElement>('.star, .rocket-track')) {
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    }
  }
}
