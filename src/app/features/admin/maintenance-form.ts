import { MaintenanceSocials } from './maintenance-socials';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import {
  DateAdapter,
  NativeDateAdapter,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MAINTENANCE_TECHNOLOGIES, TECHNOLOGY_LABELS } from '../../core/supabase/models';
import { Component, effect, inject, Injectable } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { EditorState } from './editor-state';
import { EditorShell } from './editor-shell';
import { EditorField } from './editor-field';
import { SkillIcon } from '../../shared/components/skill-icon/skill-icon';
@Injectable()
export class LaunchDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value !== 'string') return super.parse(value);
    if (!value.trim()) return null;
    const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    if (!parts) return new Date(NaN);
    const [, day, month, year] = parts.map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : new Date(NaN);
  }
}
@Component({
  selector: 'app-maintenance-form',
  providers: [
    EditorState,
    provideNativeDateAdapter(),
    { provide: DateAdapter, useClass: LaunchDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
  ],
  imports: [
    MaintenanceSocials,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatTimepickerModule,
    EditorShell,
    EditorField,
    MatCheckboxModule,
    MatInputModule,
    SkillIcon,
  ],
  templateUrl: './maintenance-form.html',
  styleUrl: './maintenance-form.sass',
})
export class MaintenanceForm {
  protected readonly state = inject(EditorState);
  protected readonly technologyOptions = MAINTENANCE_TECHNOLOGIES;
  protected readonly technologyLabels = TECHNOLOGY_LABELS;
  protected readonly launchDate = new FormControl<Date | null>(null);
  protected readonly launchTime = new FormControl<Date | null>(null);
  constructor() {
    this.state.initialize('maintenance');
    this.state.form.addValidators(() =>
      this.launchDate.invalid || this.launchTime.invalid ? { launchDateTime: true } : null,
    );
    effect(() => {
      this.state.formOpen();
      this.state.selected();
      const date = new Date(this.state.control('pt-BR', 'launchAt').value);
      const value = Number.isFinite(date.getTime()) ? date : null;
      this.launchDate.setValue(value, { emitEvent: false });
      this.launchTime.setValue(value ? new Date(value) : null, { emitEvent: false });
    });
    this.launchDate.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncDateTime());
    this.launchTime.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncDateTime());
  }
  private syncDateTime(): void {
    const date = this.launchDate.value;
    const time = this.launchTime.value;
    let iso = '';
    if (date && time && !this.launchDate.invalid && !this.launchTime.invalid) {
      const combined = new Date(date);
      combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
      iso = combined.toISOString();
    }
    for (const locale of this.state.locales) this.state.control(locale, 'launchAt').setValue(iso);
    this.state.form.markAsDirty();
    this.state.form.updateValueAndValidity({ emitEvent: false });
  }
  protected hasTechnology(icon: string): boolean {
    return this.state.control('pt-BR', 'technologies').value.split('\n').includes(icon);
  }
  protected toggleTechnology(icon: string, checked: boolean): void {
    const selected = new Set(
      this.state.control('pt-BR', 'technologies').value.split('\n').filter(Boolean),
    );
    if (checked) selected.add(icon);
    else selected.delete(icon);
    for (const locale of this.state.locales)
      this.state.control(locale, 'technologies').setValue([...selected].join('\n'));
    this.state.form.markAsDirty();
  }
}
