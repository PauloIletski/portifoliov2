import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Connection } from '../../core/supabase/connection';
import { Admin } from './admin';
import { EditorState } from './editor-state';
import { ProjectForm } from './project-form';
import { SkillForm } from './skill-form';
import { ProfileForm } from './profile-form';

describe('Admin sections', () => {
  const from = vi.fn();
  beforeEach(() => {
    if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    from.mockReset();
    from.mockImplementation((kind: string) => {
      const rows =
        kind === 'profiles'
          ? [
              {
                id: 'profile-id',
                position: 0,
                published: false,
                translations: { 'pt-BR': { name: 'Paulo' }, 'en-US': { name: 'Paulo' } },
              },
            ]
          : [];
      const query = { select: () => query, order: vi.fn() };
      query.order.mockReturnValueOnce(query).mockResolvedValueOnce({ data: rows, error: null });
      return query;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Connection, useValue: { get: async () => ({ from }) } },
      ],
    });
  });
  afterEach(() => vi.restoreAllMocks());
  it('shows only the selected form and marks the active sidebar section', async () => {
    const fixture = TestBed.createComponent(Admin);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.section-link');
    expect(root.querySelectorAll('form:not([hidden])')).toHaveLength(0);
    expect(root.querySelector('app-project-form')).not.toBeNull();
    expect(buttons[0].getAttribute('aria-current')).toBe('page');
    buttons[1].click();
    await fixture.whenStable();
    expect(
      root.querySelector('app-project-form')?.closest('.area-panel')?.hasAttribute('hidden'),
    ).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.section-content'));
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'instant',
    });
    expect(root.querySelector('app-experience-form')).not.toBeNull();
    expect(root.querySelectorAll('.area-panel:not([hidden]) form:not([hidden])')).toHaveLength(0);
    expect(buttons[1].getAttribute('aria-current')).toBe('page');
    expect(from).toHaveBeenCalledWith('experiences');
  }, 20000);
  it('keeps controls and record selection isolated between areas', async () => {
    const fixture = TestBed.createComponent(Admin);
    await fixture.whenStable();
    const projects = fixture.debugElement
      .query(By.directive(ProjectForm))
      .injector.get(EditorState);
    projects.control('pt-BR', 'name').setValue('Projeto em edição');
    projects.selected.set('project-id');
    fixture.nativeElement.querySelectorAll('.section-link')[3].click();
    await fixture.whenStable();
    const skills = fixture.debugElement.query(By.directive(SkillForm)).injector.get(EditorState);
    expect(skills).not.toBe(projects);
    expect(skills.selected()).toBeUndefined();
    expect(skills.control('pt-BR', 'name').value).toBe('');
    expect(skills.form.controls['pt-BR:company']).toBeUndefined();
    expect(skills.form.controls['pt-BR:group']).toBeDefined();
    expect(from).toHaveBeenCalledWith('skills');
    fixture.nativeElement.querySelectorAll('.section-link')[0].click();
    await fixture.whenStable();
    const restored = fixture.debugElement
      .query(By.directive(ProjectForm))
      .injector.get(EditorState);
    expect(restored).toBe(projects);
    expect(restored.control('pt-BR', 'name').value).toBe('Projeto em edição');
    expect(restored.selected()).toBe('project-id');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.area-panel:not([hidden]) form:not([hidden])')).toHaveLength(0);
    expect(
      root.querySelector('app-skill-form')?.closest('.area-panel')?.hasAttribute('inert'),
    ).toBe(true);
    const ids = Array.from(root.querySelectorAll('[id]')).map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('opens the existing profile and prevents creating a duplicate', async () => {
    const fixture = TestBed.createComponent(Admin);
    await fixture.whenStable();
    fixture.nativeElement.querySelectorAll('.section-link')[2].click();
    await fixture.whenStable();
    const profile = fixture.debugElement.query(By.directive(ProfileForm)).injector.get(EditorState);
    await profile.load();
    await fixture.whenStable();
    expect(profile.selected()).toBeUndefined();
    fixture.nativeElement.querySelector('.area-panel:not([hidden]) .record-open').click();
    await fixture.whenStable();
    expect(profile.selected()).toBe('profile-id');
    expect(profile.control('pt-BR', 'name').value).toBe('Paulo');
    const create = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Criar cadastro'));
    expect(create?.disabled).toBe(true);
  });
});
