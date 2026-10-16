import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EditorRow } from '../../core/supabase/models';
import { EditorState } from './editor-state';
@Component({
  selector: 'app-editor-shell',
  imports: [
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatCheckboxModule,
  ],
  templateUrl: './editor-shell.html',
  styleUrl: './editor-shell.sass',
})
export class EditorShell {
  protected readonly state = inject(EditorState);
  private readonly injector = inject(Injector);
  private readonly confirmation = viewChild('deleteConfirmation', {
    read: ElementRef,
  });
  private readonly formHeading = viewChild<ElementRef<HTMLElement>>('formHeading');
  protected openEditor(row?: EditorRow): void {
    this.state.edit(row);
    afterNextRender(() => this.formHeading()?.nativeElement.focus(), { injector: this.injector });
  }
  protected backToList(): void {
    this.state.formOpen.set(false);
    this.state.cancelDelete();
    afterNextRender(() => this.recordsHeading()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
  protected async save(): Promise<void> {
    await this.state.save();
    if (!this.state.error() && this.state.message()) this.backToList();
  }
  private trigger?: HTMLElement;
  private readonly recordsHeading = viewChild<ElementRef<HTMLElement>>('recordsHeading');
  protected requestDelete(row?: EditorRow, event?: Event): void {
    this.trigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    this.state.requestDelete(row);
    afterNextRender(() => this.confirmation()?.nativeElement.focus(), { injector: this.injector });
  }
  protected cancelDelete(): void {
    this.state.cancelDelete();
    this.trigger?.focus();
  }
  protected async confirmDeletion(): Promise<void> {
    await this.state.remove();
    if (!this.state.confirmDelete())
      afterNextRender(
        () =>
          (this.state.formOpen()
            ? this.formHeading()
            : this.recordsHeading()
          )?.nativeElement.focus(),
        {
          injector: this.injector,
        },
      );
  }
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly singular = input.required<string>();
}
