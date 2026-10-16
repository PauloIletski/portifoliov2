import { contactHref, contactLabel, decodeChannels } from '../contact/contact-channel';
import { EditorRow as Row } from '../../core/supabase/models';
import { afterNextRender, Injectable, inject, signal } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { Connection } from '../../core/supabase/connection';
import { ContentKind, Json, Locale, MAINTENANCE_TECHNOLOGIES } from '../../core/supabase/models';
import {
  decodeDetails,
  decodeField,
  encodeField,
  fields,
  groups,
  icons,
} from '../../core/supabase/editor-schema';
@Injectable()
export class EditorState {
  private readonly connection = inject(Connection);
  readonly kind = signal<ContentKind>('projects');
  readonly rows = signal<Row[]>([]);
  readonly formOpen = signal(false);
  readonly selected = signal<string | undefined>(undefined);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly confirmDelete = signal(false);
  readonly deletionTarget = signal<Row | undefined>(undefined);
  readonly locales: readonly Locale[] = ['pt-BR', 'en-US'];
  readonly icons = icons;
  readonly groups = groups;
  readonly fields = fields;
  readonly form = new FormRecord<FormControl<string>>({});
  readonly position = new FormControl(0, { nonNullable: true });
  readonly published = new FormControl(false, { nonNullable: true });
  private image?: { src: string; width: number; height: number };

  constructor() {
    this.edit();
    this.formOpen.set(false);
  }
  private async client() {
    const client = await this.connection.get();
    if (!client) throw new Error('Supabase não configurado.');
    return client;
  }
  async load() {
    this.busy.set(true);
    this.error.set('');
    try {
      const { data, error } = await (
        await this.client()
      )
        .from(this.kind())
        .select('*')
        .order('position')
        .order('id');
      if (error) throw error;
      const rows = data as unknown as Row[];
      this.showRows(rows);
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
  private showRows(rows: Row[]) {
    this.rows.set(rows);
  }
  initialize(kind: ContentKind) {
    this.kind.set(kind);
    this.rows.set([]);
    this.edit();
    this.formOpen.set(false);
    afterNextRender(() => {
      void this.load();
    });
  }
  control(locale: Locale, key: string): FormControl<string> {
    return this.form.controls[locale + ':' + key];
  }
  edit(row?: Row) {
    this.formOpen.set(true);
    this.selected.set(row?.id);
    this.error.set('');
    this.message.set('');
    this.confirmDelete.set(false);
    this.deletionTarget.set(undefined);
    for (const key of Object.keys(this.form.controls)) this.form.removeControl(key);
    for (const locale of this.locales)
      for (const field of fields[this.kind()]) {
        const value =
          field.key === 'imageAlt'
            ? (row?.translations[locale]?.['image'] as { alt?: string } | undefined)?.alt
            : row?.translations[locale]?.[field.key];
        this.form.addControl(
          locale + ':' + field.key,
          new FormControl(
            (this.kind() === 'projects' && field.key === 'details') || field.key === 'channels'
              ? JSON.stringify(value ?? [])
              : encodeField(value),
            { nonNullable: true },
          ),
        );
      }
    if (this.kind() === 'contacts' && !row) {
      this.control('pt-BR', 'name').setValue('Contato');
      this.control('en-US', 'name').setValue('Contact');
    }
    this.form.markAsPristine();
    this.position.setValue(
      row?.position ?? Math.max(-1, ...this.rows().map((row) => row.position)) + 1,
    );
    this.published.setValue(this.kind() === 'contacts' ? true : (row?.published ?? false));
    this.image = row?.translations['pt-BR']?.['image'] as typeof this.image;
  }
  contactVisible(row: Row): boolean {
    const channels = row.translations['pt-BR']?.['channels'];
    return row.published && Array.isArray(channels) && channels[0]?.visible === true;
  }
  label(row: Row) {
    const value = row.translations['pt-BR'];
    if (this.kind() === 'contacts') {
      const channels = decodeChannels(JSON.stringify(value?.['channels'] ?? []));
      const channel = channels?.[0];
      if (channel)
        return `${contactLabel(channel.type)} · ${channel.value || 'Preencher endereço'}`;
    }
    return String(value?.['name'] ?? value?.['role'] ?? row.id);
  }
  private fail(e: unknown) {
    this.error.set(
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String(e.message)
          : 'Não foi possível concluir.',
    );
  }
  async save() {
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise os campos inválidos antes de salvar.');
      return;
    }
    const translations: Record<string, Record<string, unknown>> = {};
    for (const locale of this.locales) {
      const payload: Record<string, unknown> = {};
      for (const field of fields[this.kind()]) {
        const value = this.form.controls[locale + ':' + field.key].value.trim();
        if (this.published.value && !field.optional && !value) {
          this.error.set('Preencha os dois idiomas antes de publicar.');
          return;
        }
        if (this.kind() === 'maintenance') {
          if (
            field.key === 'launchAt' &&
            value &&
            (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
              !Number.isFinite(Date.parse(value)))
          ) {
            this.error.set('Informe uma data de lançamento válida.');
            return;
          }
          if (
            field.key === 'technologies' &&
            value
              .split('\n')
              .filter(Boolean)
              .some((icon) => !(MAINTENANCE_TECHNOLOGIES as readonly string[]).includes(icon))
          ) {
            this.error.set('Selecione tecnologias da lista.');
            return;
          }
        }
        if (
          field.type === 'channels' &&
          (!decodeChannels(value) ||
            (this.kind() === 'contacts' &&
              (decodeChannels(value)?.length !== 1 || !contactHref(decodeChannels(value)![0]))))
        ) {
          this.error.set(
            'Confira os contatos: WhatsApp precisa do código do país e DDD; redes precisam de uma URL HTTP(S) válida; e-mail precisa de um endereço válido.',
          );
          return;
        }
        if (field.type === 'details') {
          const details = decodeDetails(value);
          if (
            !details ||
            (this.published.value &&
              (!details.length || details.some((detail) => !detail.title || !detail.description)))
          ) {
            this.error.set(
              'Preencha o título e a descrição de cada detalhe nos dois idiomas antes de publicar.',
            );
            return;
          }
        }
        if (field.type === 'url' && value && !/^(\/(?!\/)|https?:\/\/)/i.test(value)) {
          this.error.set('Use uma rota iniciada por / ou URL HTTP(S).');
          return;
        }
        if (field.key !== 'imageAlt') payload[field.key] = decodeField(field, value);
      }
      if (this.kind() === 'projects' && this.image) {
        const alt = this.form.controls[locale + ':imageAlt'].value.trim();
        if (this.published.value && !alt) {
          this.error.set('Descreva a imagem nos dois idiomas.');
          return;
        }
        payload['image'] = { ...this.image, alt };
      }
      if (this.kind() === 'contacts') {
        const channel = decodeChannels(this.control(locale, 'channels').value)![0];
        payload['name'] = contactLabel(channel.type, locale === 'en-US');
      }
      translations[locale] = payload;
    }
    if (!Number.isInteger(this.position.value) || this.position.value < 0) {
      this.error.set('A ordem deve ser um número inteiro positivo ou zero.');
      return;
    }
    this.busy.set(true);
    try {
      const client = await this.client();
      const payload = {
        translations: translations as NonNullable<Json>,
        position: this.position.value,
        published: this.published.value,
      };
      const query = this.selected()
        ? client.from(this.kind()).update(payload).eq('id', this.selected()!)
        : client.from(this.kind()).insert(payload);
      const { data, error } = await query.select().single();
      if (error) throw error;
      this.selected.set(data.id);

      const saved: Row = { ...payload, ...data } as Row;
      const rows = this.rows().filter((row) => row.id !== saved.id);
      this.showRows(
        [...rows, saved].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
      );
      this.form.markAsPristine();
      this.message.set('Conteúdo salvo.');
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
  requestDelete(row?: Row): void {
    const target = row ?? this.rows().find((item) => item.id === this.selected());
    if (this.busy() || !target) return;
    this.deletionTarget.set(target);
    this.confirmDelete.set(true);
  }
  cancelDelete(): void {
    this.confirmDelete.set(false);
    this.deletionTarget.set(undefined);
  }
  async remove() {
    const removedId = this.deletionTarget()?.id ?? this.selected();
    if (!removedId || this.busy()) return;
    this.error.set('');
    this.message.set('');
    this.busy.set(true);
    try {
      const { data, error } = await (
        await this.client()
      )
        .from(this.kind())
        .delete()
        .eq('id', removedId)
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id !== removedId)
        throw new Error('O registro não foi excluído. Recarregue a listagem e tente novamente.');
      const rows = this.rows().filter((row) => row.id !== removedId);
      if (this.selected() === removedId) {
        this.edit();
        this.formOpen.set(false);
      }
      this.cancelDelete();
      this.showRows(rows);
      this.message.set('Conteúdo excluído.');
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
    }
  }
  imagePreview() {
    return this.image?.src;
  }
  clearImage() {
    this.image = undefined;
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.error.set('Envie JPEG, PNG ou WebP de até 5 MB.');
      input.value = '';
      return;
    }
    this.busy.set(true);
    try {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width,
        height = bitmap.height;
      bitmap.close();
      const client = await this.client();
      const path =
        crypto.randomUUID() +
        '.' +
        { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const { error } = await client.storage
        .from('portfolio-images')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      // Replaced images are retained: they may still be referenced by another published item.

      this.image = {
        src: client.storage.from('portfolio-images').getPublicUrl(path).data.publicUrl,
        width,
        height,
      };
      this.message.set('Imagem enviada. Salve o projeto para aplicar.');
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }
}
