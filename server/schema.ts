import { z } from 'zod';

export const kinds = [
  'projects',
  'experiences',
  'profiles',
  'skills',
  'contacts',
  'maintenance',
] as const;
export const kindSchema = z.enum(kinds);
export type Kind = z.infer<typeof kindSchema>;
export const uuidSchema = z.uuid();
const text = z.string();
const httpUrl = z.url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
});
const detail = z.object({ title: text, description: text }).strict();
const channel = z
  .object({
    type: z.enum([
      'whatsapp',
      'linkedin',
      'github',
      'instagram',
      'facebook',
      'youtube',
      'x',
      'website',
      'email',
    ]),
    value: text,
    visible: z.boolean(),
  })
  .strict()
  .refine((value) => {
    const address = value.value.trim();
    if (!value.visible && !address) return true;
    if (value.type === 'email') return /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(address);
    if (value.type === 'whatsapp')
      return /^\+?[\d\s().-]+$/.test(address) && /^[1-9]\d{7,14}$/.test(address.replace(/\D/g, ''));
    return httpUrl.safeParse(address).success;
  }, 'Contato inválido.');
const image = z
  .object({ src: httpUrl, width: z.number().positive(), height: z.number().positive(), alt: text })
  .strict();
const icons = [
  'angular',
  'typescript',
  'javascript',
  'code',
  'sass',
  'material',
  'node',
  'api',
  'git',
  'testing',
  'accessibility',
  'responsive',
  'communication',
  'problem',
  'documentation',
  'review',
  'learning',
] as const;
const maintenanceTechnologies = [
  'angular',
  'typescript',
  'javascript',
  'sass',
  'material',
  'supabase',
  'motion',
  'node',
  'api',
  'git',
  'mongodb',
] as const;
const date = text.refine(
  (value) =>
    value === '' ||
    z.iso.datetime({ offset: true }).safeParse(value).success,
  'Data inválida.',
);
const schemas = {
  projects: z
    .object({
      name: text,
      author: text,
      mark: text,
      category: text,
      summary: text,
      technologies: z.array(text),
      collectionStack: text,
      demoRoute: text.refine((value) => !value || /^(\/(?!\/)|https?:\/\/)/i.test(value)),
      demoLabel: text,
      detailsTitle: text,
      details: z.array(detail),
      showPreview: z.boolean().optional(),
      image: image.optional(),
    })
    .strict(),
  experiences: z
    .object({
      role: text,
      company: text,
      period: text,
      summary: text,
      highlights: z.array(text),
      technologies: z.array(text),
    })
    .strict(),
  profiles: z
    .object({
      name: text,
      role: text,
      description: text,
      descriptionMore: text,
      principles: z.array(detail),
    })
    .strict(),
  skills: z
    .object({
      name: text,
      group: z.enum(['', 'interfaces', 'services', 'collaboration']),
      icon: z.enum(['', ...icons]),
    })
    .strict(),
  contacts: z.object({ name: text, channels: z.array(channel).length(1) }).strict(),
  maintenance: z
    .object({
      name: text,
      launchAt: date,
      technologies: z.array(z.enum(maintenanceTechnologies)),
      channels: z.array(channel).optional(),
    })
    .strict(),
};
export interface Payload {
  position: number;
  published: boolean;
  translations: Record<'pt-BR' | 'en-US', Record<string, unknown>>;
}
export interface ContentDocument extends Payload {
  _id: string;
  singleton?: true;
}

function complete(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.every(complete);
  if (value && typeof value === 'object') return Object.values(value).every(complete);
  return true;
}

export function payloadSchema(kind: Kind) {
  const translation = schemas[kind];
  return z
    .object({
      position: z.number().int().nonnegative(),
      published: z.boolean(),
      translations: z.object({ 'pt-BR': translation, 'en-US': translation }).strict(),
    })
    .strict()
    .superRefine((row, context) => {
      for (const locale of ['pt-BR', 'en-US'] as const) {
        const payload = row.translations[locale] as Record<string, unknown>;
        // Channels may be hidden or empty; their own schema validates addresses.
        const { channels, ...required } = payload;
        if (row.published && locale === 'pt-BR' && !complete(required))
          context.addIssue({
            code: 'custom',
            message: `Preencha os campos obrigatórios em ${locale}.`,
          });
      }
      if (kind === 'maintenance') {
        const pt = row.translations['pt-BR'] as Record<string, unknown>;
        const en = row.translations['en-US'] as Record<string, unknown>;
        for (const key of ['launchAt', 'technologies', 'channels']) {
          if (JSON.stringify(pt[key]) !== JSON.stringify(en[key]))
            context.addIssue({
              code: 'custom',
              message: `${key} deve ser igual nos dois idiomas.`,
            });
        }
      }
    });
}

export function parsePayload(kind: Kind, value: unknown): Payload {
  return payloadSchema(kind).parse(value) as Payload;
}
export function toRow(document: ContentDocument) {
  const { _id, singleton, ...payload } = document;
  return { id: _id, ...payload };
}
