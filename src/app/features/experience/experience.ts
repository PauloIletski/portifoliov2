import { publicContent } from '../../core/supabase/content';
import { ContentStatus } from '../../core/supabase/content-status';
import { Component, computed, inject, LOCALE_ID, input } from '@angular/core';
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
}
