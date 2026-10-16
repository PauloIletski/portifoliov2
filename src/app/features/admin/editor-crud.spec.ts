import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Connection } from '../../core/supabase/connection';
import { EditorRow } from '../../core/supabase/models';
import { EditorState } from './editor-state';

describe('Editor CRUD reflects saved records', () => {
  let records: EditorRow[];
  let next: number;
  let failReads: boolean;
  let failDelete: boolean;
  class Query {
    private operation = 'read';
    private payload: Partial<EditorRow> = {};
    private id = '';
    select() {
      return this;
    }
    order() {
      return this;
    }
    eq(_key: string, id: string) {
      this.id = id;
      return this;
    }
    insert(payload: Partial<EditorRow>) {
      this.operation = 'insert';
      this.payload = payload;
      return this;
    }
    update(payload: Partial<EditorRow>) {
      this.operation = 'update';
      this.payload = payload;
      return this;
    }
    delete() {
      this.operation = 'delete';
      return this;
    }
    then(resolve: (value: { data: EditorRow[]; error: Error | null }) => unknown) {
      return Promise.resolve({
        data: structuredClone(records),
        error: failReads ? new Error('Read failed') : null,
      }).then(resolve);
    }
    async single() {
      if (this.operation === 'delete') {
        const found = records.find((record) => record.id === this.id);
        if (!found || failDelete) return { data: null, error: new Error('Registro não excluído') };
        records = records.filter((record) => record.id !== this.id);
        return { data: { id: found.id }, error: null };
      }
      const id = this.operation === 'insert' ? 'row-' + next++ : this.id;
      const row = { id, ...this.payload } as EditorRow;
      records = [...records.filter((record) => record.id !== id), row];
      return { data: structuredClone(row), error: null };
    }
  }
  beforeEach(() => {
    records = [];
    next = 1;
    failReads = false;
    failDelete = false;
    TestBed.configureTestingModule({
      providers: [
        { provide: Connection, useValue: { get: async () => ({ from: () => new Query() }) } },
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
