import { Component, inject } from '@angular/core';
import { EditorState } from './editor-state';
import { EditorShell } from './editor-shell';
import { EditorField } from './editor-field';
@Component({
  selector: 'app-profile-form',
  providers: [EditorState],
  imports: [EditorShell, EditorField],
  templateUrl: './profile-form.html',
  styleUrl: './profile-form.sass',
})
export class ProfileForm {
  protected readonly state = inject(EditorState);
  constructor() {
    this.state.initialize('profiles');
  }
}
