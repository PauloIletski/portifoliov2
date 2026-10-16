import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  LOCALE_ID,
  signal,
} from '@angular/core';
import { MaintenanceContent, TECHNOLOGY_LABELS } from '../core/supabase/models';
import { SkillIcon } from '../shared/components/skill-icon/skill-icon';
export function countdownUntil(target: string, now: number) {
  const milliseconds = Date.parse(target) - now;
  const total = Number.isFinite(milliseconds) ? Math.max(0, Math.ceil(milliseconds / 1000)) : 0;
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
    finished: total === 0,
  };
}
@Component({
  selector: 'app-maintenance',
  imports: [SkillIcon],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.sass',
})
export class Maintenance {
  protected readonly technologyLabels = TECHNOLOGY_LABELS;
  readonly content = input.required<MaintenanceContent>();
  protected readonly english = inject(LOCALE_ID).startsWith('en');
  private readonly now = signal(0);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly countdown = computed(() =>
    this.now() ? countdownUntil(this.content().launchAt, this.now()) : undefined,
  );
  constructor() {
    afterNextRender(() => {
      this.now.set(Date.now());
      const timer = setInterval(() => this.now.set(Date.now()), 1000);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}
