import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Connection } from '../../core/data/connection';
import { EditorRow } from '../../core/data/models';
import { EditorState } from './editor-state';

describe('Editor CRUD reflects saved records', () => {
  let records: EditorRow[];
  let next: number;
  let failReads: boolean;
  let failDelete: boolean;
  beforeEach(() => {
    records = [];
    next = 1;
    failReads = false;
    failDelete = false;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Connection,
          useValue: {
            list: async () => {
              if (failReads) throw new Error('Read failed');
              return structuredClone(records);
            },
            save: async (_kind: string, payload: Omit<EditorRow, 'id'>, selected?: string) => {
              const id = selected ?? 'row-' + next++;
              const row = { id, ...payload };
              records = [...records.filter((record) => record.id !== id), row];
              return structuredClone(row);
            },
            remove: async (_kind: string, id: string) => {
              if (failDelete || !records.some((record) => record.id === id))
                throw new Error('Registro não excluído');
              records = records.filter((record) => record.id !== id);
              return { id };
            },
          },
        },
      ],
    });
  });
  function state() {
    return TestBed.runInInjectionContext(() => {
      const editor = new EditorState();
      editor.initialize('contacts');
      return editor;
    });
  }
  function fill(editor: EditorState, value: string, type = 'email', visible = true) {
    for (const locale of editor.locales)
      editor.control(locale, 'channels').setValue(JSON.stringify([{ type, value, visible }]));
  }
  it('creates multiple contacts, updates one and deletes only the selected record', async () => {
    const editor = state();
    fill(editor, 'first@example.com');
    await editor.save();
    const first = editor.selected()!;
    editor.edit();
    fill(editor, 'https://linkedin.com/in/second', 'linkedin');
    await editor.save();
    const second = editor.selected()!;
    expect(records).toHaveLength(2);
    expect(editor.rows()).toHaveLength(2);
    expect(editor.label(editor.rows()[0])).toContain('first@example.com');
    expect(editor.label(editor.rows()[1])).toContain('linkedin.com');
    editor.edit(editor.rows().find((row) => row.id === first));
    fill(editor, 'updated@example.com', 'email', false);
    await editor.save();
    expect(records).toHaveLength(2);
    expect(editor.contactVisible(editor.rows().find((row) => row.id === first)!)).toBe(false);
    expect(editor.label(editor.rows().find((row) => row.id === second)!)).toContain('second');
    await editor.remove();
    expect(records.map((row) => row.id)).toEqual([second]);
    expect(editor.rows().map((row) => row.id)).toEqual([second]);
    expect(editor.selected()).toBeUndefined();
  });
  it('keeps a confirmed insert in the list without depending on another successful read', async () => {
    const editor = state();
    failReads = true;
    fill(editor, 'saved@example.com');
    await editor.save();
    expect(editor.message()).toContain('salvo');
    expect(editor.rows()[0].id).toBe('row-1');
  });
  it('does not report success or remove a row when the database rejects deletion', async () => {
    const editor = state();
    fill(editor, 'keep@example.com');
    await editor.save();
    const id = editor.selected();
    failDelete = true;
    await editor.remove();
    expect(editor.error()).toContain('não excluído');
    expect(editor.selected()).toBe(id);
    expect(editor.rows()).toHaveLength(1);
    expect(editor.message()).not.toContain('excluído');
  });
  it('rejects a multi-channel payload and incomplete contacts instead of saving a collection as one item', async () => {
    const editor = state();
    await editor.save();
    expect(records).toHaveLength(0);
    for (const locale of editor.locales)
      editor
        .control(locale, 'channels')
        .setValue(
          '[{"type":"email","value":"one@example.com","visible":true},{"type":"email","value":"two@example.com","visible":true}]',
        );
    await editor.save();
    expect(records).toHaveLength(0);
  });
  it('deletes a record chosen from the list without changing the other open form', async () => {
    const editor = state();
    fill(editor, 'first@example.com');
    await editor.save();
    const first = editor.selected();
    editor.edit();
    fill(editor, 'second@example.com');
    await editor.save();
    const second = editor.selected();
    editor
      .control('pt-BR', 'channels')
      .setValue('[{"type":"email","value":"unsaved@example.com","visible":true}]');
    editor.requestDelete(editor.rows().find((row) => row.id === first));
    expect(editor.deletionTarget()?.id).toBe(first);
    expect(editor.selected()).toBe(second);
    await editor.remove();
    expect(editor.selected()).toBe(second);
    expect(editor.rows().map((row) => row.id)).toEqual([second]);
    expect(editor.control('pt-BR', 'channels').value).toContain('unsaved@example.com');
    expect(editor.confirmDelete()).toBe(false);
  });
  it('canceling list deletion leaves both records untouched', async () => {
    const editor = state();
    fill(editor, 'first@example.com');
    await editor.save();
    editor.requestDelete(editor.rows()[0]);
    editor.cancelDelete();
    expect(editor.confirmDelete()).toBe(false);
    expect(records).toHaveLength(1);
    expect(editor.deletionTarget()).toBeUndefined();
  });
  it('keeps empty results and the last deletion empty without generating examples', async () => {
    const editor = state();
    await editor.load();
    expect(editor.rows()).toEqual([]);
    fill(editor, 'only@example.com');
    await editor.save();
    editor.requestDelete(editor.rows()[0]);
    await editor.remove();
    expect(editor.rows()).toEqual([]);
    await editor.load();
    expect(editor.rows()).toEqual([]);
  });
  it('keeps confirmed records and reports errors when a later load fails', async () => {
    const editor = state();
    fill(editor, 'saved@example.com');
    await editor.save();
    failReads = true;
    await editor.load();
    expect(editor.error()).toContain('Read failed');
    expect(editor.rows()).toHaveLength(1);
    expect(editor.rows()[0].id).toBe('row-1');
  });
});
