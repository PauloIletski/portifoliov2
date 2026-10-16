import { afterNextRender, inject, Injectable, LOCALE_ID, signal } from '@angular/core';
import { Connection } from './connection';
import { ContentKind, ContentMap, ContentRow, Locale } from './models';
@Injectable({ providedIn: 'root' })
export class Content {
  private readonly connection = inject(Connection);
  private readonly locale: Locale = inject(LOCALE_ID).startsWith('en') ? 'en-US' : 'pt-BR';
  async list<K extends ContentKind>(kind: K): Promise<readonly ContentMap[K][] | undefined> {
    const client = await this.connection.get();
    if (!client) throw new Error('Supabase não configurado.');
    const { data, error } = await client
      .from(kind as ContentKind)
      .select('*')
      .eq('published', true)
      .order('position')
      .order('id');
    if (error) throw error;
    return (data as unknown as ContentRow<ContentMap[K]>[]).map((row) => ({
      ...row.translations[this.locale],
      id: row.id,
    }));
  }
}
export function publicContent<K extends ContentKind>(kind: K) {
  const service = inject(Content);
  const data = signal<readonly ContentMap[K][] | undefined>(undefined);
  const loading = signal(true);
  const error = signal(false);
  async function reload() {
    loading.set(true);
    error.set(false);
    try {
      const records = await service.list(kind);
      data.set(records ?? []);
    } catch {
      data.set(undefined);
      error.set(true);
    } finally {
      loading.set(false);
    }
  }
  afterNextRender(() => {
    void reload();
  });
  return { data, loading, error, reload };
}
