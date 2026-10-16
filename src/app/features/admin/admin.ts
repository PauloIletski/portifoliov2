import { MaintenanceForm } from './maintenance-form';
import { ContactForm } from './contact-form';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Auth } from '../../core/supabase/auth';
import { ContentKind } from '../../core/supabase/models';
import { ProjectForm } from './project-form';
import { ExperienceForm } from './experience-form';
import { ProfileForm } from './profile-form';
import { SkillForm } from './skill-form';
@Component({
  selector: 'app-admin',
  imports: [
    MaintenanceForm,
    ContactForm,
    MatButtonModule,
    ProjectForm,
    ExperienceForm,
    ProfileForm,
    SkillForm,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.sass',
})
export class Admin {
  protected readonly auth = inject(Auth);
  private readonly injector = inject(Injector);
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('sectionContent');
  protected readonly visited = signal<readonly ContentKind[]>(['projects']);
  protected readonly section = signal<ContentKind>('projects');
  protected selectSection(kind: ContentKind): void {
    if (this.section() === kind) return;
    this.visited.update((areas) => (areas.includes(kind) ? areas : [...areas, kind]));
    this.section.set(kind);
    afterNextRender(
      {
        read: () => {
          const content = this.content().nativeElement;
          content.focus({ preventScroll: true });
          content.scrollIntoView({ block: 'start', behavior: 'instant' });
        },
      },
      { injector: this.injector },
    );
  }
  protected readonly sections: readonly { id: ContentKind; label: string; description: string }[] =
    [
      { id: 'projects', label: 'Projetos', description: 'Coleção e destaques' },
      { id: 'experiences', label: 'Experiências', description: 'Trajetória profissional' },
      { id: 'profiles', label: 'Perfil', description: 'Sobre e forma de trabalhar' },
      { id: 'skills', label: 'Habilidades', description: 'Tecnologias e práticas' },
      { id: 'contacts', label: 'Contato', description: 'Canais e redes sociais' },
      { id: 'maintenance', label: 'Tapume', description: 'Lançamento do portfólio' },
    ];
}
