import { TestBed } from '@angular/core/testing';
import { LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Auth, adminGuard } from './auth';
import { Content } from './content';
import { Connection } from './connection';
import { EditorState } from '../../features/admin/editor-state';
import { Login } from '../../features/admin/login';

describe('Content and administration HTTP integration', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'en-US' },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    try {
      http.verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });
  it('maps published API records to the current locale with their ids', async () => {
    const result = TestBed.inject(Content).list('projects');
    http.expectOne('/api/content/projects').flush([
      {
        id: 'uuid',
        translations: { 'en-US': { name: 'Project' }, 'pt-BR': { name: 'Projeto' } },
      },
    ]);
    expect(await result).toEqual([{ id: 'uuid', name: 'Project' }]);
  });
  it('reports API failures without example content', async () => {
    const result = TestBed.inject(Content).list('projects');
    http
      .expectOne('/api/content/projects')
      .flush({ message: 'offline' }, { status: 503, statusText: 'Unavailable' });
    await expect(result).rejects.toThrow('offline');
  });
  it('redirects expired sessions from protected routes', async () => {
    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    http.expectOne('/api/admin/session').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(
      TestBed.inject(Router).serializeUrl((await result) as ReturnType<Router['createUrlTree']>),
    ).toBe('/admin/login');
  });
  it('signs out accounts lacking administrator permission', async () => {
    const result = TestBed.inject(Auth).login('visitor@example.com', 'password');
    http.expectOne('/api/auth/sign-in/email').flush({});
    await vi.waitFor(() =>
      http.expectOne('/api/admin/session').flush({}, { status: 403, statusText: 'Forbidden' }),
    );
    await vi.waitFor(() => http.expectOne('/api/auth/sign-out').flush({}));
    await expect(result).rejects.toThrow('sem autorização');
  });
  it('retains credentials and stops loading after rejected login', async () => {
    const login = TestBed.runInInjectionContext(() => new Login());
    login.form.setValue({ email: 'owner@example.com', password: 'wrong' });
    const result = login.login();
    http
      .expectOne('/api/auth/sign-in/email')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await result;
    expect(login.form.controls.email.value).toBe('owner@example.com');
    expect(login.error()).toContain('inválidos');
    expect(login.busy()).toBe(false);
  });
  it('blocks incomplete publication before sending a request', async () => {
    const editor = TestBed.runInInjectionContext(() => new EditorState());
    editor.published.setValue(true);
    await editor.save();
    expect(editor.error()).toContain('dois idiomas');
    http.expectNone((request) => request.url.startsWith('/api/admin/content/'));
  });
  it('rejects unsupported and oversized files before upload', async () => {
    const editor = TestBed.runInInjectionContext(() => new EditorState());
    const input = {
      files: [new File(['svg'], 'file.svg', { type: 'image/svg+xml' })],
      value: 'file.svg',
    };
    await editor.upload({ target: input } as unknown as Event);
    expect(editor.error()).toContain('JPEG');
    input.files = [new File([new Uint8Array(5242881)], 'large.png', { type: 'image/png' })];
    await editor.upload({ target: input } as unknown as Event);
    expect(editor.error()).toContain('5 MB');
  });
  it('uses administrator endpoints for CRUD and preserves API errors', async () => {
    const result = TestBed.inject(Connection).remove('projects', 'uuid');
    const request = http.expectOne('/api/admin/content/projects/uuid');
    expect(request.request.method).toBe('DELETE');
    request.flush(
      { message: 'Registro não encontrado.' },
      { status: 404, statusText: 'Not Found' },
    );
    await expect(result).rejects.toThrow('Registro não encontrado');
  });
  it('clears authorization and returns to login when an administrator request expires', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(Auth).authorized.set(true);
    const result = TestBed.inject(Connection).list('projects', true);
    http
      .expectOne('/api/admin/content/projects')
      .flush({ message: 'Sessão expirada.' }, { status: 401, statusText: 'Unauthorized' });
    await expect(result).rejects.toThrow('Sessão expirada');
    expect(TestBed.inject(Auth).authorized()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/admin/login']);
  });
});
