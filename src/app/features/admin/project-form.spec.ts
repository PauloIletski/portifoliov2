import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Connection } from '../../core/supabase/connection';
import { decodeDetails, encodeField, fields } from '../../core/supabase/editor-schema';
import { PROJECTS } from '../projects/project';
import { EditorState } from './editor-state';
import { ProjectDetails } from './project-details';

describe('Project registration', () => {
  const insert = vi.fn();
  const single = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    const result = { select: () => ({ single }), insert, order: vi.fn() };
    result.order.mockReturnValueOnce(result).mockResolvedValueOnce({ data: [], error: null });
    insert.mockReturnValue(result);
    single.mockResolvedValue({ data: { id: 'created-project' }, error: null });
    TestBed.configureTestingModule({
      providers: [{ provide: Connection, useValue: { get: async () => ({ from: () => result }) } }],
    });
  });
  function fill(state: EditorState) {
    for (const locale of state.locales)
      for (const field of fields.projects) {
        const value = (PROJECTS[0] as unknown as Record<string, unknown>)[field.key];
        state
          .control(locale, field.key)
          .setValue(field.key === 'details' ? JSON.stringify(value) : encodeField(value));
      }
    state.control('en-US', 'name').setValue('Personal portfolio');
  }
  it('creates a project using all fields displayed by the public mock', async () => {
    const state = TestBed.runInInjectionContext(() => new EditorState());
    fill(state);
    state.published.setValue(true);
    await state.save();
    const payload = insert.mock.calls[0][0];
    expect(payload.published).toBe(true);
    expect(payload.translations['pt-BR'].name).toBe(PROJECTS[0].name);
    expect(payload.translations['en-US'].name).toBe('Personal portfolio');
    expect(payload.translations['pt-BR'].details).toEqual(PROJECTS[0].details);
    expect(payload.translations['pt-BR'].technologies).toEqual(PROJECTS[0].technologies);
    expect(payload.translations['pt-BR'].demoRoute).toBe(PROJECTS[0].demoRoute);
    expect(state.selected()).toBe('created-project');
  });
  it('blocks publication with an incomplete detail and keeps the entered fields', async () => {
    const state = TestBed.runInInjectionContext(() => new EditorState());
    fill(state);
    state.published.setValue(true);
    state.control('en-US', 'details').setValue('[{"title":"Feature","description":""}]');
    await state.save();
    expect(insert).not.toHaveBeenCalled();
    expect(state.error()).toContain('título e a descrição');
    expect(state.control('pt-BR', 'name').value).toBe(PROJECTS[0].name);
  });
  it('preserves fields after a failed insert and allows an incomplete draft', async () => {
    const state = TestBed.runInInjectionContext(() => new EditorState());
    state.control('pt-BR', 'name').setValue('Novo projeto');
    single.mockResolvedValue({ data: null, error: { message: 'Falha de rede' } });
    await state.save();
    expect(insert).toHaveBeenCalled();
    expect(state.error()).toBe('Falha de rede');
    expect(state.control('pt-BR', 'name').value).toBe('Novo projeto');
  });
  it('edits structured details without losing pipes or line breaks', async () => {
    const control = new FormControl(
      JSON.stringify([
        { title: 'Angular | Material', description: 'Primeira linha\nSegunda linha' },
      ]),
      { nonNullable: true },
    );
    const fixture = TestBed.createComponent(ProjectDetails);
    fixture.componentRef.setInput('control', control);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('input')?.value).toBe('Angular | Material');
    expect(root.querySelector('textarea')?.value).toContain('\n');
    const add = Array.from(root.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Adicionar detalhe'),
    )!;
    add.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('fieldset')).toHaveLength(2);
    Array.from(root.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Remover detalhe 2'))!
      .click();
    await fixture.whenStable();
    expect(decodeDetails(control.value)).toEqual([
      { title: 'Angular | Material', description: 'Primeira linha\nSegunda linha' },
    ]);
    control.setValue('Outro título | Outra descrição');
    await fixture.whenStable();
    expect(root.querySelector('input')?.value).toBe('Outro título');
  });
});
