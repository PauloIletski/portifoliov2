import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Connection } from './connection';
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly connection = inject(Connection);
  private readonly router = inject(Router);
  readonly authorized = signal(false);
  private subscribed = false;
  async check(): Promise<boolean> {
    const client = await this.connection.get();
    if (!client) return false;
    if (!this.subscribed) {
      this.subscribed = true;
      client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          this.authorized.set(false);
          void this.router.navigate(['/admin/login']);
        }
      });
    }
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) {
      this.authorized.set(false);
      return false;
    }
    const { data, error: accessError } = await client
      .from('administrators')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    this.authorized.set(!accessError && !!data);
    return this.authorized();
  }
  async login(email: string, password: string) {
    const client = await this.connection.get();
    if (!client) throw new Error('Configure o Supabase antes de acessar o painel.');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error('E-mail ou senha inválidos.');
    if (!(await this.check())) {
      await client.auth.signOut();
      throw new Error('Conta sem autorização para administrar.');
    }
  }
  async logout() {
    const client = await this.connection.get();
    await client?.auth.signOut({ scope: 'local' });
    this.authorized.set(false);
    await this.router.navigate(['/admin/login']);
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
