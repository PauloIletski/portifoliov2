import { decodeChannels } from '../../features/contact/contact-channel';
import { ContentKind } from './models';
export interface Field {
  key: string;
  label: string;
  type?: 'lines' | 'details' | 'number' | 'icon' | 'group' | 'url' | 'channels';
  optional?: boolean;
}
export const fields: Record<ContentKind, readonly Field[]> = {
  maintenance: [
    { key: 'channels', label: 'Redes sociais', type: 'channels', optional: true },
    { key: 'name', label: 'Frase' },
    { key: 'launchAt', label: 'Lançamento' },
    { key: 'technologies', label: 'Tecnologias', type: 'lines' },
  ],
  contacts: [
    { key: 'name', label: 'Contato' },
    { key: 'channels', label: 'Canais', type: 'channels', optional: true },
  ],
  projects: [
    { key: 'name', label: 'Nome' },
    { key: 'author', label: 'Autor' },
    { key: 'mark', label: 'Sigla' },
    { key: 'category', label: 'Categoria' },
    { key: 'summary', label: 'Resumo' },
    { key: 'technologies', label: 'Tecnologias (uma por linha)', type: 'lines' },
    { key: 'collectionStack', label: 'Stack da coleção' },
    { key: 'demoRoute', label: 'Link da demonstração', type: 'url' },
    { key: 'demoLabel', label: 'Texto do link' },
    { key: 'detailsTitle', label: 'Título dos detalhes' },
    { key: 'details', label: 'Detalhes (título | descrição, um por linha)', type: 'details' },
    { key: 'imageAlt', label: 'Descrição da imagem', optional: true },
  ],
  experiences: [
    { key: 'role', label: 'Cargo' },
    { key: 'company', label: 'Empresa' },
    { key: 'period', label: 'Período' },
    { key: 'summary', label: 'Resumo' },
    { key: 'highlights', label: 'Atividades (uma por linha)', type: 'lines' },
    { key: 'technologies', label: 'Tecnologias (uma por linha)', type: 'lines' },
  ],
  profiles: [
    { key: 'name', label: 'Nome' },
    { key: 'role', label: 'Cargo' },
    { key: 'description', label: 'Descrição' },
    { key: 'descriptionMore', label: 'Complemento' },
    {
      key: 'principles',
      label: 'Como trabalho (título | descrição, um por linha)',
      type: 'details',
    },
  ],
  skills: [
    { key: 'name', label: 'Habilidade' },
    { key: 'group', label: 'Grupo', type: 'group' },
    { key: 'icon', label: 'Ícone', type: 'icon' },
  ],
};
export const icons = [
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
];
export const groups = ['interfaces', 'services', 'collaboration'];
export function encodeField(value: unknown): string {
  if (Array.isArray(value))
    return value
      .map((item) =>
        typeof item === 'object' && item !== null
          ? `${item.title} | ${item.description}`
          : String(item),
      )
      .join('\n');
  return typeof value === 'string' ? value : '';
}
export interface ProjectDetail {
  title: string;
  description: string;
}
// Existing records use lines; the dedicated project form keeps structured details as JSON.
export function decodeDetails(value: string): ProjectDetail[] | undefined {
  if (!value.trim()) return [];
  if (value.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed)) return undefined;
      const result: ProjectDetail[] = [];
      for (const item of parsed) {
        if (
          typeof item !== 'object' ||
          item === null ||
          !('title' in item) ||
          !('description' in item) ||
          typeof item.title !== 'string' ||
          typeof item.description !== 'string'
        )
          return undefined;
        result.push({ title: item.title.trim(), description: item.description.trim() });
      }
      return result;
    } catch {
      return undefined;
    }
  }
  const result: ProjectDetail[] = [];
  for (const line of value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)) {
    const split = line.indexOf('|');
    if (split < 0) return undefined;
    result.push({ title: line.slice(0, split).trim(), description: line.slice(split + 1).trim() });
  }
  return result;
}
export function decodeField(field: Field, value: string): unknown {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (field.type === 'lines') return lines;
  if (field.type === 'details') return decodeDetails(value) ?? [];
  if (field.type === 'channels') return decodeChannels(value) ?? [];
  return value.trim();
}
