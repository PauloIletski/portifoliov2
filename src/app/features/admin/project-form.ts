import { Component, inject } from '@angular/core';
import { EditorState } from './editor-state';
import { EditorShell } from './editor-shell';
import { EditorField } from './editor-field';
import { ProjectDetails } from './project-details';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-project-form',
  providers: [EditorState],
  imports: [
    EditorShell,
    EditorField,
    MatButtonModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    ProjectDetails,
  ],
  templateUrl: './project-form.html',
  styleUrl: './project-form.sass',
})
export class ProjectForm {
  protected readonly state = inject(EditorState);
  constructor() {
    this.state.initialize('projects');
  }
}
