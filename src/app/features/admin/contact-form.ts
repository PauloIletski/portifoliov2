import { Component, inject } from '@angular/core';
import { EditorState } from './editor-state';
import { EditorShell } from './editor-shell';
import { ContactFields } from './contact-fields';
@Component({
  selector: 'app-contact-form',
  providers: [EditorState],
  imports: [EditorShell, ContactFields],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.sass',
})
export class ContactForm {
  protected readonly state = inject(EditorState);
  constructor() {
    this.state.initialize('contacts');
  }
}
