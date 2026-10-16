import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Auth } from '../../core/supabase/auth';
@Component({
  selector: 'app-admin-login',
  imports: [MatProgressSpinnerModule, ReactiveFormsModule, MatButtonModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.sass',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  async login() {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const value = this.form.getRawValue();
      await this.auth.login(value.email, value.password);
      await this.router.navigate(['/admin']);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      this.busy.set(false);
    }
  }
}
