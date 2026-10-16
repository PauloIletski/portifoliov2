import { TestBed } from '@angular/core/testing';
import { LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Connection } from './connection';
import { Auth, adminGuard } from './auth';
import { Content } from './content';
import { EditorState } from '../../features/admin/editor-state';
import { Login } from '../../features/admin/login';

describe('Supabase integration', () => {
  const error = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), maybeSingle: vi.fn() };
  const sdk = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    storage: { from: vi.fn() },
  };
  beforeEach(() => {
    vi.resetAllMocks();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    sdk.from.mockReturnValue(query);
    sdk.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
    sdk.auth.signInWithPassword.mockResolvedValue({ error: null });
    sdk.auth.signOut.mockResolvedValue({ error: null });
    query.maybeSingle.mockResolvedValue({ data: { user_id: 'owner' }, error: null });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: LOCALE_ID, useValue: 'en-US' },
        { provide: Connection, useValue: { get: vi.fn().mockResolvedValue(sdk) } },
      ],
    });
  });
  it('maps published records to the current locale and preserves the database id', async () => {
    query.order.mockReturnValueOnce(query).mockResolvedValueOnce({
      data: [
        {
          id: 'project-id',
          translations: { 'en-US': { name: 'Project' }, 'pt-BR': { name: 'Projeto' } },
        },
      ],
      error: null,
    });
    expect(await TestBed.inject(Content).list('projects')).toEqual([
      { id: 'project-id', name: 'Project' },
    ]);
    expect(query.eq).toHaveBeenCalledWith('published', true);
  });
  it('propagates network failures instead of falling back to mocks', async () => {
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: null, error: new Error('offline') });
    await expect(TestBed.inject(Content).list('projects')).rejects.toThrow('offline');
  });
  it('reports missing configuration instead of using mock mode', async () => {
    TestBed.overrideProvider(Connection, {
      useValue: { get: vi.fn().mockResolvedValue(undefined) },
    });
    await expect(TestBed.inject(Content).list('projects')).rejects.toThrow(
      'Supabase não configurado',
    );
  });
  it('rejects invalid login', async () => {
    sdk.auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid credentials') });
    await expect(TestBed.inject(Auth).login('owner@example.com', 'wrong')).rejects.toThrow(
      'E-mail ou senha inválidos',
    );
  });
  it('signs out a valid user without administration permission', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(TestBed.inject(Auth).login('visitor@example.com', 'password')).rejects.toThrow(
      'sem autorização',
    );
    expect(sdk.auth.signOut).toHaveBeenCalled();
  });
  it('clears access when the session expires', async () => {
    const auth = TestBed.inject(Auth);
    expect(await auth.check()).toBe(true);
    sdk.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    expect(await auth.check()).toBe(false);
    expect(auth.authorized()).toBe(false);
  });
  it('redirects an expired session from the protected route', async () => {
    sdk.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    const result = await TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/admin/login',
    );
  });
  it('clears authorization on logout', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const auth = TestBed.inject(Auth);
    await auth.check();
    await auth.logout();
    expect(auth.authorized()).toBe(false);
  });
  it('blocks publication with missing translations without sending a request', async () => {
    const editor = TestBed.runInInjectionContext(() => new EditorState());
    editor.published.setValue(true);
    await editor.save();
    expect(editor.error()).toContain('dois idiomas');
    expect(sdk.from).not.toHaveBeenCalled();
  });
  it('rejects invalid uploads before contacting Storage', async () => {
    const editor = TestBed.runInInjectionContext(() => new EditorState());
    const input = {
      files: [new File(['svg'], 'image.svg', { type: 'image/svg+xml' })],
      value: 'image.svg',
    };
    await editor.upload({ target: input } as unknown as Event);
    expect(editor.error()).toContain('JPEG');
    expect(sdk.storage.from).not.toHaveBeenCalled();
    input.files = [new File([new Uint8Array(5242881)], 'large.png', { type: 'image/png' })];
    await editor.upload({ target: input } as unknown as Event);
    expect(editor.error()).toContain('5 MB');
  });
  it('retains credentials after a login failure', async () => {
    sdk.auth.signInWithPassword.mockResolvedValue({ error: new Error('offline') });
    const login = TestBed.runInInjectionContext(() => new Login());
    login.form.setValue({ email: 'owner@example.com', password: 'wrong' });
    await login.login();
    expect(login.form.controls.email.value).toBe('owner@example.com');
    expect(login.busy()).toBe(false);
  });
});
