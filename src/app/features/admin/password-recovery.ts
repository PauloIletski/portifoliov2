import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../core/data/auth';

@Component({
  selector: 'app-password-recovery',
  imports: [ReactiveFormsModule, MatButtonModule, MatInputModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: './login.sass',
})
export class PasswordRecovery {
  private readonly auth = inject(Auth);
  private readonly document = inject(DOCUMENT);
  readonly reset = inject(ActivatedRoute).snapshot.data['reset'] === true;
  readonly busy = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  readonly form = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: this.reset ? [] : [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: this.reset
          ? [Validators.required, Validators.minLength(8), Validators.maxLength(128)]
          : [],
      }),
      confirmation: new FormControl('', {
        nonNullable: true,
        validators: this.reset ? [Validators.required] : [],
      }),
    },
    {
      validators: (control) =>
        this.reset && control.get('password')?.value !== control.get('confirmation')?.value
          ? { mismatch: true }
          : null,
    },
  );

  constructor() {
    afterNextRender(() => {
      void this.initialize();
    });
  }

  private async initialize(): Promise<void> {
    try {
      if (this.reset) {
        const fragment = new URLSearchParams(this.document.location.hash.slice(1));
        if (
          fragment.has('error') ||
          new URLSearchParams(this.document.location.search).has('error')
        ) {
          throw new Error('Link inválido ou expirado. Solicite um novo link.');
        }
        if (!new URLSearchParams(this.document.location.search).get('token')) {
          throw new Error('Link inválido ou expirado. Solicite um novo link.');
        }
      }
      this.ready.set(true);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível validar o link.');
    }
  }

  async submit(): Promise<void> {
    if (!this.ready() || this.busy() || this.success()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.document
        .querySelector<HTMLInputElement>('input.ng-invalid, input[formControlName="confirmation"]')
        ?.focus();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const value = this.form.getRawValue();
      if (this.reset) {
        await this.auth.resetPassword(
          value.password,
          new URLSearchParams(this.document.location.search).get('token') || '',
        );
        this.form.reset();
      } else {
        await this.auth.requestPasswordReset(
          value.email.trim(),
          new URL('admin/reset-password', this.document.baseURI).href,
        );
      }
      this.success.set(true);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
