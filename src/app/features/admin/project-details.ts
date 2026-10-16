import { ChangeDetectorRef, Component, effect, inject, input } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { decodeDetails } from '../../core/supabase/editor-schema';
type DetailForm = FormGroup<{ title: FormControl<string>; description: FormControl<string> }>;
@Component({
  selector: 'app-project-details',
  imports: [ReactiveFormsModule, MatButtonModule, MatInputModule],
  templateUrl: './project-details.html',
  styleUrl: './project-details.sass',
})
export class ProjectDetails {
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly control = input.required<FormControl<string>>();
  protected readonly details = new FormArray<DetailForm>([]);
  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      const hydrate = (value: string) => {
        this.details.clear({ emitEvent: false });
        const entries = decodeDetails(value) ?? [];
        for (const entry of entries.length ? entries : [{ title: '', description: '' }])
          this.details.push(this.group(entry), { emitEvent: false });
        this.changeDetector.markForCheck();
      };
      hydrate(control.value);
      const external = control.valueChanges.subscribe(hydrate);
      const local = this.details.valueChanges.subscribe(() => {
        control.setValue(JSON.stringify(this.details.getRawValue()), { emitEvent: false });
        control.markAsDirty();
      });
      onCleanup(() => {
        external.unsubscribe();
        local.unsubscribe();
      });
    });
  }
  private group(value = { title: '', description: '' }): DetailForm {
    return new FormGroup({
      title: new FormControl(value.title, { nonNullable: true }),
      description: new FormControl(value.description, { nonNullable: true }),
    });
  }
  protected add(): void {
    this.details.push(this.group());
  }
  protected remove(index: number): void {
    this.details.removeAt(index);
  }
}
