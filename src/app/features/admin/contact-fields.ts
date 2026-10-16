import { ChangeDetectorRef, Component, effect, inject, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
type ChannelForm = FormGroup<{
  type: FormControl<ContactType>;
  value: FormControl<string>;
  visible: FormControl<boolean>;
}>;
@Component({
  selector: 'app-contact-fields',
  imports: [ReactiveFormsModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  templateUrl: './contact-fields.html',
  styleUrl: './contact-fields.sass',
})
export class ContactFields {
  readonly control = input.required<FormControl<string>>();
  readonly translation = input.required<FormControl<string>>();
  protected readonly types = CONTACT_TYPES;
  protected readonly label = contactLabel;
  protected readonly channel = this.group({ type: 'whatsapp', value: '', visible: false });
  private readonly changeDetector = inject(ChangeDetectorRef);
  constructor() {
    effect((cleanup) => {
      const control = this.control(),
        translation = this.translation();
      const hydrate = (value: string) => {
        this.channel.reset(
          decodeChannels(value)?.[0] ?? { type: 'whatsapp', value: '', visible: false },
          { emitEvent: false },
        );
        this.changeDetector.markForCheck();
      };
      hydrate(control.value);
      const external = control.valueChanges.subscribe(hydrate);
      const local = this.channel.valueChanges.subscribe(() => {
        const value = JSON.stringify([this.channel.getRawValue()]);
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
  private group(channel: ContactChannel): ChannelForm {
    return new FormGroup({
      type: new FormControl(channel.type, { nonNullable: true }),
      value: new FormControl(channel.value, { nonNullable: true }),
      visible: new FormControl(channel.visible, { nonNullable: true }),
    });
  }
}
