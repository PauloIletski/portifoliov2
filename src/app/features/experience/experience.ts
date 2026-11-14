import { publicContent } from '../../core/data/content';
import { ContentStatus } from '../../core/data/content-status';
import { Component, computed, inject, LOCALE_ID, input, linkedSignal } from '@angular/core';
import {
  AccordionContent,
  AccordionGroup,
  AccordionPanel,
  AccordionTrigger,
} from '@angular/aria/accordion';
import { MotionEnter } from '../../shared/directives/motion-enter';
import { ExperienceEntry } from './experience-entry';

@Component({
  selector: 'app-experience',
  imports: [
    ContentStatus,
    AccordionContent,
    AccordionGroup,
    AccordionPanel,
    AccordionTrigger,
    MotionEnter,
  ],
  templateUrl: './experience.html',
  styleUrl: './experience.sass',
})
export class Experience {
  readonly supplied = input<readonly ExperienceEntry[] | undefined>(undefined, {
    alias: 'experiences',
  });
  protected readonly remote = publicContent('experiences');
  protected readonly english = inject(LOCALE_ID).startsWith('en');
  readonly experiences = computed(() => this.supplied() ?? this.remote.data() ?? []);
  readonly selectedId = linkedSignal<readonly ExperienceEntry[], string | undefined>({
    source: this.experiences,
    computation: (entries, previous) =>
      entries.find((entry) => entry.id === previous?.value)?.id ?? entries[0]?.id,
  });
  protected expand(id: string, expanded: boolean): void {
    if (expanded) this.selectedId.set(id);
    else if (this.selectedId() === id) this.selectedId.set(undefined);
  }
}
