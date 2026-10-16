import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Connection } from '../../core/supabase/connection';
import { EditorShell } from './editor-shell';
import { EditorState } from './editor-state';

describe('Record list deletion', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EditorState, { provide: Connection, useValue: { get: vi.fn() } }],
    });
  });
  async function setup() {
    const state = TestBed.inject(EditorState);
    state.kind.set('skills');
    state.rows.set([
      { id: 'one', position: 0, published: true, translations: { 'pt-BR': { name: 'Angular' } } },
      {
        id: 'two',
        position: 1,
        published: false,
        translations: { 'pt-BR': { name: 'TypeScript' } },
      },
    ]);
    state.edit(state.rows()[1]);
    state.formOpen.set(false);
    const fixture = TestBed.createComponent(EditorShell);
    fixture.componentRef.setInput('title', 'Habilidades');
    fixture.componentRef.setInput('description', 'Gerencie suas habilidades');
    fixture.componentRef.setInput('singular', 'habilidade');
    await fixture.whenStable();
    return { state, fixture, root: fixture.nativeElement as HTMLElement };
  }
  it('confirms the clicked row without selecting it and cancellation restores focus', async () => {
    const { state, fixture, root } = await setup();
    const remove = root.querySelector<HTMLButtonElement>(
      '[aria-label="Excluir habilidade: Angular"]',
    )!;
    expect(remove).not.toBeNull();
    remove.click();
    await fixture.whenStable();
    expect(state.selected()).toBe('two');
    expect(state.deletionTarget()?.id).toBe('one');
    const confirmation = root.querySelector('.confirmation')!;
    expect(confirmation.textContent).toContain('Angular');
    const buttons = confirmation.querySelectorAll<HTMLButtonElement>('button');
    expect(document.activeElement).toBe(buttons[0]);
    buttons[1].click();
    await fixture.whenStable();
    expect(root.querySelector('.confirmation')).toBeNull();
    expect(document.activeElement).toBe(remove);
    expect(state.rows()).toHaveLength(2);
  });
  it('disables row actions while processing and shows an empty list without examples', async () => {
    const { state, fixture, root } = await setup();
    state.busy.set(true);
    await fixture.whenStable();
    expect(
      [...root.querySelectorAll<HTMLButtonElement>('.record-collection button')].every(
        (b) => b.disabled,
      ),
    ).toBe(true);
    state.busy.set(false);
    state.rows.set([]);
    await fixture.whenStable();
    expect(root.querySelectorAll('.delete-record')).toHaveLength(0);
    expect(root.textContent).toContain('Nenhum item na listagem');
    expect(root.textContent).not.toContain('Exemplos');
  });
  it('opens a blank form from Add and opens the selected record for editing', async () => {
    const { state, fixture, root } = await setup();
    expect(root.querySelector('form')?.hasAttribute('hidden')).toBe(true);
    root.querySelector<HTMLButtonElement>('.collection-heading button')!.click();
    await fixture.whenStable();
    expect(state.formOpen()).toBe(true);
    expect(state.selected()).toBeUndefined();
    expect(state.control('pt-BR', 'name').value).toBe('');
    expect(root.querySelector('.record-collection')?.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('form')?.hasAttribute('hidden')).toBe(false);
    root.querySelector<HTMLButtonElement>('form > button')!.click();
    await fixture.whenStable();
    expect(state.formOpen()).toBe(false);
    root.querySelector<HTMLButtonElement>('.record-open')!.click();
    await fixture.whenStable();
    expect(state.formOpen()).toBe(true);
    expect(state.selected()).toBe('one');
    expect(state.control('pt-BR', 'name').value).toBe('Angular');
    expect(document.activeElement).toBe(root.querySelector('form h3'));
  });
});
