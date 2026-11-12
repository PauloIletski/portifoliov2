import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Auth } from './auth';

describe('Password recovery HTTP contract', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('preserves the localized callback URL', async () => {
    const result = TestBed.inject(Auth).requestPasswordReset(
      'owner@example.com',
      'https://example.com/en/admin/reset-password',
    );
    const request = http.expectOne('/api/auth/request-password-reset');
    expect(request.request.body).toEqual({
      email: 'owner@example.com',
      redirectTo: 'https://example.com/en/admin/reset-password',
    });
    request.flush({ status: true });
    await result;
  });
  it('sends the token and clears local authorization only after password reset succeeds', async () => {
    const auth = TestBed.inject(Auth);
    auth.authorized.set(true);
    const result = auth.resetPassword('new-password', 'recovery-token');
    const request = http.expectOne('/api/auth/reset-password');
    expect(request.request.body).toEqual({ token: 'recovery-token', newPassword: 'new-password' });
    request.flush({ status: true });
    await result;
    expect(auth.authorized()).toBe(false);
  });
  it('reports an invalid or expired token', async () => {
    const result = TestBed.inject(Auth).resetPassword('new-password', 'expired');
    http
      .expectOne('/api/auth/reset-password')
      .flush({}, { status: 400, statusText: 'Bad Request' });
    await expect(result).rejects.toThrow('Link inválido ou expirado');
  });
});
