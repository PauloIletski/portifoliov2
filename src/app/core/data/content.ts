import { afterNextRender, inject, Injectable, LOCALE_ID, signal } from '@angular/core';
import { Connection } from './connection';
import { ContentKind, ContentMap, ContentRow, Locale } from './models';
@Injectable({ providedIn: 'root' })
export class Content {
  private readonly connection = inject(Connection);
  private readonly locale: Locale = inject(LOCALE_ID).startsWith('en') ? 'en-US' : 'pt-BR';
  async list<K extends ContentKind>(kind: K): Promise<readonly ContentMap[K][] | undefined> {
    const data = await this.connection.list(kind);
    return (data as unknown as ContentRow<ContentMap[K]>[]).map((row) => ({
      ...localizedContent(row.translations['pt-BR'], row.translations[this.locale]),
      id: row.id,
    }));
  }
}
function localizedContent<T>(portuguese: T, translated: T): T {
  if (typeof translated === 'string') return (translated.trim() ? translated : portuguese) as T;
  if (Array.isArray(translated)) return (translated.length ? translated : portuguese) as T;
  if (translated && typeof translated === 'object' && portuguese && typeof portuguese === 'object') {
    return Object.fromEntries(
      Object.entries(portuguese).map(([key, value]) => [
        key,
        localizedContent(value, (translated as Record<string, unknown>)[key]),
      ]),
    ) as T;
  }
  return translated ?? portuguese;
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
