import { ContactProfile } from '../../features/contact/contact-channel';
import { Project } from '../../features/projects/project';
import { ExperienceEntry } from '../../features/experience/experience-entry';
import { SkillIconName } from '../../shared/components/skill-icon/skill-icon';
export interface Profile {
  name: string;
  role: string;
  description: string;
  descriptionMore: string;
  principles: { title: string; description: string }[];
}
export interface Skill {
  name: string;
  group: 'interfaces' | 'services' | 'collaboration';
  icon: SkillIconName;
}
export interface MaintenanceContent {
  name: string;
  launchAt: string;
  technologies: (typeof MAINTENANCE_TECHNOLOGIES)[number][];
}
export interface ContentMap {
  maintenance: MaintenanceContent;
  contacts: ContactProfile;
  projects: Project;
  experiences: ExperienceEntry;
  profiles: Profile;
  skills: Skill;
}
export type ContentKind = keyof ContentMap;
export type Locale = 'pt-BR' | 'en-US';
export interface ContentRow<T> {
  id: string;
  position: number;
  published: boolean;
  translations: Record<Locale, T>;
}
export type { Database, Json } from './database.types';

export interface EditorRow {
  id: string;
  position: number;
  published: boolean;
  translations: Record<string, Record<string, unknown>>;
}

export const MAINTENANCE_TECHNOLOGIES = [
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
] as const;
export const TECHNOLOGY_LABELS: Record<(typeof MAINTENANCE_TECHNOLOGIES)[number], string> = {
  angular: 'Angular',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  sass: 'Sass',
  material: 'Angular Material',
  supabase: 'Supabase',
  motion: 'Motion',
  node: 'Node.js',
  api: 'APIs REST',
  git: 'Git',
};
