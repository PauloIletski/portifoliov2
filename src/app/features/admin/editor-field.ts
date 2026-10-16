import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
@Component({
  selector: 'app-editor-field',
  imports: [ReactiveFormsModule, MatInputModule, MatSelectModule],
  templateUrl: './editor-field.html',
  styleUrl: './editor-field.sass',
})
export class EditorField {
  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly hint = input('');
  readonly multiline = input(false);
  readonly options = input<readonly string[]>([]);
}
