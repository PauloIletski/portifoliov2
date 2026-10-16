import { ChangeDetectorRef, Component, effect, inject, input } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  CONTACT_TYPES,
  ContactChannel,
  ContactType,
  contactLabel,
  decodeChannels,
} from '../contact/contact-channel';
type SocialForm = FormGroup<{
  type: FormControl<ContactType>;
  value: FormControl<string>;
  visible: FormControl<boolean>;
}>;
@Component({
  selector: 'app-maintenance-socials',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './maintenance-socials.html',
  styleUrl: './maintenance-socials.sass',
})
export class MaintenanceSocials {
  readonly control = input.required<FormControl<string>>();
  readonly translation = input.required<FormControl<string>>();
  protected readonly channels = new FormArray<SocialForm>([]);
  protected readonly types = CONTACT_TYPES;
  protected readonly label = contactLabel;
  private readonly changeDetector = inject(ChangeDetectorRef);
  constructor() {
    effect((cleanup) => {
      const control = this.control();
      const translation = this.translation();
      const hydrate = (value: string) => {
        this.channels.clear({ emitEvent: false });
        for (const channel of decodeChannels(value) ?? [])
          this.channels.push(this.group(channel), { emitEvent: false });
        this.changeDetector.markForCheck();
      };
      hydrate(control.value);
      const external = control.valueChanges.subscribe(hydrate);
      const local = this.channels.valueChanges.subscribe(() => {
        const value = JSON.stringify(this.channels.getRawValue());
        control.setValue(value, { emitEvent: false });
        translation.setValue(value, { emitEvent: false });
        control.markAsDirty();
        translation.markAsDirty();
      });
      cleanup(() => {
        external.unsubscribe();
        local.unsubscribe();
      });
    });
  }
  protected add(): void {
    this.channels.push(this.group({ type: 'linkedin', value: '', visible: true }));
  }
  protected remove(index: number): void {
    this.channels.removeAt(index);
  }
  private group(channel: ContactChannel): SocialForm {
    return new FormGroup({
      type: new FormControl(channel.type, { nonNullable: true }),
      value: new FormControl(channel.value, { nonNullable: true }),
      visible: new FormControl(channel.visible, { nonNullable: true }),
    });
  }
}
