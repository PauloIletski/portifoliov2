import { Content } from './core/supabase/content';
import { Location } from '@angular/common';
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';

@Component({ template: '<p>Página de teste</p>' })
class TestPage {}

describe('App shell', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Content, useValue: { list: async () => [] } },
        provideRouter([
          { path: 'admin', component: TestPage },
          { path: 'admin/login', component: TestPage },
          { path: 'projects', component: TestPage },
        ]),
      ],
    }).compileComponents();
  });
  it('creates the app', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
  it('provides the public navigation, main outlet and footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-header nav')).not.toBeNull();
    expect(root.querySelector('main#main-content router-outlet')).not.toBeNull();
    expect(root.querySelector('app-footer')).not.toBeNull();
  });
  for (const initialPath of ['/admin', '/admin/', '/admin/login?next=projects']) {
    it(`hides public chrome on initial render at ${initialPath} before router navigation`, async () => {
      vi.spyOn(TestBed.inject(Location), 'path').mockReturnValue(initialPath);
      expect(TestBed.inject(Router).url).toBe('/');
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('app-header')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-footer')).toBeNull();
      expect(fixture.nativeElement.classList.contains('admin-layout')).toBe(true);
    });
  }
  it('replaces public pages with the active maintenance page and keeps admin reachable', async () => {
    TestBed.overrideProvider(Content, {
      useValue: {
        list: async () => [
          {
            name: 'Voltamos em breve',
            launchAt: '2030-01-01T00:00:00Z',
            technologies: ['angular'],
          },
        ],
      },
    });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-maintenance')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-footer')).toBeNull();
    await TestBed.inject(Router).navigateByUrl('/admin');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-maintenance')).toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
  it('hides the public header and footer throughout admin and restores them on public routes', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    for (const url of ['/admin', '/admin/login?next=projects']) {
      await router.navigateByUrl(url);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('app-header')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-footer')).toBeNull();
    }
    await router.navigateByUrl('/projects');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-footer')).not.toBeNull();
  });
});
