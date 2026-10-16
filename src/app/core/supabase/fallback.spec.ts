import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Content } from './content';
import { Connection } from './connection';
import { Projects } from '../../features/projects/projects';
import { Experience } from '../../features/experience/experience';
import { About } from '../../features/about/about';
import { PROJECTS } from '../../features/projects/project';
import { EditorState } from '../../features/admin/editor-state';

describe('Remote content states', () => {
  const list = vi.fn();
  beforeEach(() => {
    list.mockReset();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Content, useValue: { list } },
        { provide: Connection, useValue: { get: async () => undefined } },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  for (const scenario of ['unconfigured', 'empty', 'failed'] as const) {
    it(`does not display example content when ${scenario}`, async () => {
      if (scenario === 'failed') list.mockRejectedValue(new Error('offline'));
      else list.mockResolvedValue(scenario === 'empty' ? [] : undefined);
      const projects = TestBed.createComponent(Projects);
      const experience = TestBed.createComponent(Experience);
      const about = TestBed.createComponent(About);
      await projects.whenStable();
      await experience.whenStable();
      await about.whenStable();
      expect(projects.nativeElement.querySelector('#featured-title')).toBeNull();
      expect(experience.nativeElement.querySelectorAll('.timeline-trigger')).toHaveLength(0);
      expect(about.nativeElement.querySelector('#profile-title')).toBeNull();
      expect(about.nativeElement.querySelectorAll('app-skill-icon')).toHaveLength(0);
    });
  }
  it('shows loading without mock content and then displays fetched records', async () => {
    let resolve!: (value: readonly (typeof PROJECTS)[number][]) => void;
    list.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#featured-title')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role=status]')).not.toBeNull();
    resolve([{ ...PROJECTS[0], id: 'remote', name: 'Projeto real' }]);
    await Promise.resolve();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#featured-title')?.textContent).toBe(
      'Projeto real',
    );
  });
  it('recovers from an error through the retry action', async () => {
    list
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([{ ...PROJECTS[0], id: 'remote', name: 'Projeto recuperado' }]);
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector(
      'app-content-status button',
    ) as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#featured-title')?.textContent).toBe(
      'Projeto recuperado',
    );
  });
  it('keeps the admin empty when unconfigured instead of offering examples', async () => {
    const state = TestBed.runInInjectionContext(() => new EditorState());
    expect(state.rows()).toEqual([]);
    await state.load();
    expect(state.rows()).toEqual([]);
    expect(state.error()).toContain('não configurado');
    expect(state.control('pt-BR', 'name').value).toBe('');
    expect(state.control('en-US', 'name').value).toBe('');
  });
});
