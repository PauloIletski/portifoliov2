import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly authorized = signal(false);
  async check(): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.http.get<{ authorized: boolean }>('/api/admin/session'),
      );
      this.authorized.set(result.authorized);
    } catch {
      this.authorized.set(false);
    }
    return this.authorized();
  }
  async login(email: string, password: string): Promise<void> {
    await this.post('/api/auth/sign-in/email', { email, password }, 'E-mail ou senha inválidos.');
    if (!(await this.check())) {
      await this.post('/api/auth/sign-out', {});
      throw new Error('Conta sem autorização para administrar.');
    }
  }
  async logout(): Promise<void> {
    await this.post('/api/auth/sign-out', {});
    await this.expireSession();
  }
  async expireSession(): Promise<void> {
    this.authorized.set(false);
    await this.router.navigate(['/admin/login']);
  }
  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    await this.post('/api/auth/request-password-reset', { email, redirectTo });
  }
  async resetPassword(password: string, token: string): Promise<void> {
    await this.post(
      '/api/auth/reset-password',
      { newPassword: password, token },
      'Link inválido ou expirado. Solicite um novo link.',
    );
    this.authorized.set(false);
  }
  private async post(
    url: string,
    body: unknown,
    fallback = 'Não foi possível concluir. Tente novamente.',
  ): Promise<void> {
    try {
      await firstValueFrom(this.http.post(url, body));
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500))
        throw new Error('Serviço indisponível. Tente novamente.');
      throw new Error(
        error instanceof HttpErrorResponse && error.status === 429
          ? 'Muitas tentativas. Aguarde e tente novamente.'
          : fallback,
      );
    }
  }
}
export const adminGuard: CanActivateFn = async () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  const auth = inject(Auth);
  const router = inject(Router);
  try {
    return (await auth.check()) || router.createUrlTree(['/admin/login']);
  } catch {
    return router.createUrlTree(['/admin/login']);
  }
};
