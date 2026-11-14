import { publicContent } from '../../core/data/content';
import { ContentStatus } from '../../core/data/content-status';
import { Component, computed, inject, LOCALE_ID, input, linkedSignal } from '@angular/core';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Project } from './project';

@Component({
  selector: 'app-projects',
  imports: [ContentStatus, RouterLink, MatButtonModule, NgOptimizedImage, NgTemplateOutlet],
  templateUrl: './projects.html',
  styleUrl: './projects.sass',
})
export class Projects {
  readonly supplied = input<readonly Project[] | undefined>(undefined, { alias: 'projects' });
  protected readonly remote = publicContent('projects');
  protected readonly english = inject(LOCALE_ID).startsWith('en');
  readonly projects = computed(() => this.supplied() ?? this.remote.data() ?? []);
  protected readonly desktop = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 1024px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
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
