import { Component, computed, input } from '@angular/core';
import { ContactType } from '../../../features/contact/contact-channel';
const PATHS: Record<ContactType, string> = {
  whatsapp:
    'M21 11.5a9 9 0 0 1-13.4 7.8L3 21l1.7-4.6A9 9 0 1 1 21 11.5ZM8 7l2 3-1 1c1 2 2 3 4 4l1-1 3 2c-1 3-4 2-7 0S5 9 8 7Z',
  linkedin: 'M3 3h18v18H3ZM7 10v7m0-10v.1m4 10v-7m0 3c0-4 6-4 6 0v4',
  github:
    'M9 20v-3c-4 1-4-2-6-2m12 5v-4c0-1-.2-2-1-2 4-.5 6-2 6-5 0-1-.4-2-1-3 0-1 0-2-.5-3-2 0-3 1-4 1-2-.5-4-.5-6 0-1 0-2-1-4-1-.5 1-.5 2-.5 3-1 1-1 2-1 3 0 3 2 4.5 6 5-.8 0-1 1-1 2v4',
  instagram:
    'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm9 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm1-5h.01',
  facebook: 'M14 22V12h4l1-4h-5V6c0-2 1-3 4-3V0h-3c-4 0-5 3-5 6v2H7v4h3v10',
  youtube: 'M3 5h18v14H3Zm7 4 6 3-6 3V9Z',
  x: 'M4 3h4l12 18h-4L4 3Zm16 0L4 21',
  website: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  email: 'M3 5h18v14H3Zm0 0 9 8 9-8',
};
@Component({
  selector: 'app-contact-icon',
  host: { 'aria-hidden': 'true' },
  templateUrl: './contact-icon.html',
  styleUrl: './contact-icon.sass',
})
export class ContactIcon {
  readonly type = input.required<ContactType>();
  protected readonly path = computed(() => PATHS[this.type()]);
}
