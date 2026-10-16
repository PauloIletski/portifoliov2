import { Component, computed, inject, LOCALE_ID } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { publicContent } from '../../core/supabase/content';
import { ContentStatus } from '../../core/supabase/content-status';
import { MotionEnter } from '../../shared/directives/motion-enter';
import { ContactIcon } from '../../shared/components/contact-icon/contact-icon';
import { contactHref, contactLabel } from './contact-channel';
@Component({
  selector: 'app-contact',
  imports: [MatButtonModule, ContentStatus, MotionEnter, ContactIcon],
  templateUrl: './contact.html',
  styleUrl: './contact.sass',
})
export class Contact {
  protected readonly remote = publicContent('contacts');
  protected readonly english = inject(LOCALE_ID).startsWith('en');
  protected readonly channels = computed(() =>
    (this.remote.data() ?? [])
      .flatMap((record) => record.channels)
      .filter((channel) => channel.visible && contactHref(channel))
      .map((channel) => ({
        ...channel,
        href: contactHref(channel)!,
        label: contactLabel(channel.type, this.english),
      })),
  );
}
