import { Component, inject } from '@angular/core';
import { EditorState } from './editor-state';
import { EditorShell } from './editor-shell';
import { EditorField } from './editor-field';
@Component({
  selector: 'app-skill-form',
  providers: [EditorState],
  imports: [EditorShell, EditorField],
  templateUrl: './skill-form.html',
  styleUrl: './skill-form.sass',
})
export class SkillForm {
  protected readonly state = inject(EditorState);
  constructor() {
    this.state.initialize('skills');
  }
}
