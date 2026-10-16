import { publicContent } from '../../core/supabase/content';
import { ContentStatus } from '../../core/supabase/content-status';
import { Component, inject, LOCALE_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MotionEnter } from '../../shared/directives/motion-enter';
import { SkillIcon } from '../../shared/components/skill-icon/skill-icon';

@Component({
  selector: 'app-about',
  imports: [ContentStatus, RouterLink, MatButtonModule, MotionEnter, SkillIcon],
  templateUrl: './about.html',
  styleUrl: './about.sass',
})
export class About {
  protected readonly profile = publicContent('profiles');
  protected readonly skills = publicContent('skills');
  protected readonly english = inject(LOCALE_ID).startsWith('en');
  protected readonly groups = ['interfaces', 'services', 'collaboration'] as const;
  protected groupTitle(group: string) {
    return this.english
      ? ({
          interfaces: 'Interfaces',
          services: 'Services and quality',
          collaboration: 'Collaboration',
        }[group] ?? group)
      : ({
          interfaces: 'Interfaces',
          services: 'Serviços e qualidade',
          collaboration: 'Colaboração',
        }[group] ?? group);
  }
}
