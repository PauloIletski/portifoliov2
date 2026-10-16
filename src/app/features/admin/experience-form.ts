import { Component, inject } from '@angular/core';
import { EditorState } from './editor-state';
import { EditorShell } from './editor-shell';
import { EditorField } from './editor-field';
@Component({
  selector: 'app-experience-form',
  providers: [EditorState],
  imports: [EditorShell, EditorField],
  templateUrl: './experience-form.html',
  styleUrl: './experience-form.sass',
})
export class ExperienceForm {
  protected readonly state = inject(EditorState);
  constructor() {
    this.state.initialize('experiences');
  }
}
