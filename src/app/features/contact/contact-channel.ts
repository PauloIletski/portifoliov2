export const CONTACT_TYPES = [
  'whatsapp',
  'linkedin',
  'github',
  'instagram',
  'facebook',
  'youtube',
  'x',
  'website',
  'email',
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];
export interface ContactChannel {
  type: ContactType;
  value: string;
  visible: boolean;
}
export interface ContactProfile {
  name: string;
  channels: readonly ContactChannel[];
}
export function contactLabel(type: ContactType, english = false): string {
  return {
    whatsapp: 'WhatsApp',
    linkedin: 'LinkedIn',
    github: 'GitHub',
    instagram: 'Instagram',
    facebook: 'Facebook',
    youtube: 'YouTube',
    x: 'X',
    website: english ? 'Website' : 'Site',
    email: 'E-mail',
  }[type];
}
export function contactHref(channel: ContactChannel): string | undefined {
  const value = channel.value.trim();
  if (channel.type === 'whatsapp') {
    if (!/^\+?[\d\s().-]+$/.test(value)) return undefined;
    const digits = value.replace(/\D/g, '');
    return /^[1-9]\d{7,14}$/.test(digits) ? 'https://wa.me/' + digits : undefined;
  }
  if (channel.type === 'email')
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[?&#]/.test(value)
      ? 'mailto:' + value
      : undefined;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
export function decodeChannels(value: string): ContactChannel[] | undefined {
  try {
    const data: unknown = JSON.parse(value || '[]');
    if (!Array.isArray(data)) return undefined;
    const result: ContactChannel[] = [];
    for (const item of data) {
      if (
        typeof item !== 'object' ||
        item === null ||
        !('type' in item) ||
        !CONTACT_TYPES.includes(item.type) ||
        typeof item.value !== 'string' ||
        typeof item.visible !== 'boolean'
      )
        return undefined;
      const channel: ContactChannel = {
        type: item.type,
        value: item.value.trim(),
        visible: item.visible,
      };
      if ((channel.visible || channel.value) && !contactHref(channel)) return undefined;
      result.push(channel);
    }
    return result;
  } catch {
    return undefined;
  }
}
export const CONTACT_MOCK: ContactProfile = {
  name: 'Contato',
  channels: [
    { type: 'email', value: 'contato@example.com', visible: true },
    { type: 'website', value: 'https://example.com', visible: true },
    { type: 'whatsapp', value: '', visible: false },
    { type: 'linkedin', value: '', visible: false },
  ],
};
