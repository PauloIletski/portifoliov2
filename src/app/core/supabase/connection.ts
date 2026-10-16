import { Injectable, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './models';
@Injectable({ providedIn: 'root' })
export class Connection {
  readonly configured = signal(false);
  private client?: SupabaseClient<Database>;
  private pending?: Promise<SupabaseClient<Database> | undefined>;
  get(): Promise<SupabaseClient<Database> | undefined> {
    return (this.pending ??= this.initialize().catch((error) => {
      this.pending = undefined;
      throw error;
    }));
  }
  private async initialize(): Promise<SupabaseClient<Database> | undefined> {
    const response = await fetch(new URL('supabase-config.json', document.baseURI));
    if (!response.ok) throw new Error('Não foi possível carregar a configuração do Supabase.');
    const config: { url?: string; publishableKey?: string } = await response.json();
    if (!config.url && !config.publishableKey) return undefined;
    if (!config.url || !config.publishableKey?.startsWith('sb_publishable_'))
      throw new Error('Configure a URL e a chave publicável do Supabase.');
    const { createClient } = await import('@supabase/supabase-js');
    this.client = createClient<Database>(config.url, config.publishableKey);
    this.configured.set(true);
    return this.client;
  }
}
