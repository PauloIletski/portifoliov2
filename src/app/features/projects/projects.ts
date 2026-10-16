import { publicContent } from '../../core/supabase/content';
import { ContentStatus } from '../../core/supabase/content-status';
import { Component, computed, inject, LOCALE_ID, input, linkedSignal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MotionEnter } from '../../shared/directives/motion-enter';
import { Project } from './project';

@Component({
  selector: 'app-projects',
  imports: [ContentStatus, RouterLink, MatButtonModule, MotionEnter, NgOptimizedImage],
  templateUrl: './projects.html',
  styleUrl: './projects.sass',
})
export class Projects {
  readonly supplied = input<readonly Project[] | undefined>(undefined, { alias: 'projects' });
  protected readonly remote = publicContent('projects');
  protected readonly english = inject(LOCALE_ID).startsWith('en');
  readonly projects = computed(() => this.supplied() ?? this.remote.data() ?? []);
  protected readonly selectedProject = linkedSignal<readonly Project[], Project | undefined>({
    source: this.projects,
    computation: (projects, previous) =>
      projects.find((project) => project.id === previous?.value?.id) ?? projects[0],
  });

  protected selectProject(event: Event, id: string): void {
    event.preventDefault();
    const project = this.projects().find((item) => item.id === id);
    if (project) this.selectedProject.set(project);
  }
}
