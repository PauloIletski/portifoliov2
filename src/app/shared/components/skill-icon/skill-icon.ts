import { Component, computed, input } from '@angular/core';

const ICONS = {
  supabase: { path: 'M13 2 3 14h8l-1 8L21 10h-8l1-8Z' },
  motion: { path: 'M3 17 9 7h4L7 17H3Zm7 0 6-10h5l-6 10h-5Z' },
  angular: { path: 'M12 2 3 6l1.5 12L12 22l7.5-4L21 6 12 2ZM7.5 17 12 6l4.5 11M9 13h6' },
  typescript: { path: 'M4 3h16v18H4Z', mark: 'TS' },
  javascript: { path: 'M4 3h16v18H4Z', mark: 'JS' },
  code: { path: 'm8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18' },
  sass: { path: 'M4 3h16v18H4Z', mark: 'S' },
  material: { path: 'm12 2 10 6-10 6L2 8l10-6Zm-10 10 10 6 10-6M2 16l10 6 10-6' },
  node: { path: 'm12 2 9 5v10l-9 5-9-5V7l9-5Z', mark: 'N' },
  api: { path: 'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4' },
  git: {
    path: 'M6 6v12m0-6h7a5 5 0 0 0 5-5M6 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM18 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  },
  testing: { path: 'M21 12a9 9 0 1 1-5-8M8 11l4 4 9-11' },
  accessibility: { path: 'M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 8l9 2 9-2M12 10v6m0 0-5 6m5-6 5 6' },
  responsive: { path: 'M14 17H2V3h20v8M7 17v4m-4 0h8m5-10h6v11h-6Z' },
  communication: { path: 'M3 3h18v14H9l-6 4V3Zm4 5h10M7 12h6' },
  problem: { path: 'M9 18h6m-6 4h6M8 14a7 7 0 1 1 8 0l-1 4H9l-1-4Z' },
  documentation: { path: 'M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v16' },
  review: { path: 'm7 4-5 5 5 5m6-10 5 5-5 5m-3 4 4 4 8-8' },
  learning: { path: 'm12 3 10 5-10 5L2 8l10-5Zm-6 8v6c4 3 8 3 12 0v-6m4-3v10' },
} satisfies Record<string, { readonly path: string; readonly mark?: string }>;

export type SkillIconName = keyof typeof ICONS;

@Component({
  selector: 'app-skill-icon',
  host: { 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path [attr.d]="icon().path" />
      @if (mark(); as label) {
        <text
          x="12"
          y="15"
          text-anchor="middle"
          fill="currentColor"
          stroke="none"
          font-size="8"
          font-weight="700"
        >
          {{ label }}
        </text>
      }
    </svg>
  `,
  styles: `
    :host
      display: inline-flex
      flex: 0 0 22px
      width: 22px
      height: 22px
      color: var(--color-accent)
    svg
      display: block
      width: 100%
      height: 100%
  `,
})
export class SkillIcon {
  readonly name = input.required<SkillIconName>();
  protected readonly icon = computed(() => ICONS[this.name()]);
  protected readonly mark = computed(() => {
    const icon = this.icon();
    return 'mark' in icon ? icon.mark : undefined;
  });
}
