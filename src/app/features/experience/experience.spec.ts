import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Content } from '../../core/supabase/content';
import { Experience } from './experience';
import { EXPERIENCES } from './experience-entry';

// Angular Aria handles pointerdown; reproduce the pointer sequence of a real click.
function press(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0 }));
  element.click();
}

describe('Experience timeline', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Content, useValue: { list: () => Promise.resolve(EXPERIENCES) } }],
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('shows three labeled mock entries and loads details when clicking a point', async () => {
    const fixture = TestBed.createComponent(Experience);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.timeline-trigger');
    expect(buttons.length).toBe(3);
    expect(root.textContent).toContain('Empresa exemplo A');
    expect(root.querySelector('.entry-content')).toBeNull();
    press(buttons[0].querySelector<HTMLElement>('.timeline-point')!);
    await fixture.whenStable();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.entry-summary')?.textContent).toBe(EXPERIENCES[0].summary);
    const panelId = buttons[0].getAttribute('aria-controls');
    expect(root.querySelector(`[id="${panelId}"]`)?.hasAttribute('inert')).toBe(false);
  });

  it('allows only one expanded entry and can collapse the active one', async () => {
    const fixture = TestBed.createComponent(Experience);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.timeline-trigger');
    press(buttons[0]);
    await fixture.whenStable();
    press(buttons[1]);
    await fixture.whenStable();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.entry-summary')?.textContent).toBe(EXPERIENCES[1].summary);
    press(buttons[1]);
    await fixture.whenStable();
    expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelectorAll('.timeline-panel:not([inert])').length).toBe(0);
  });

  it('supports keyboard navigation between milestones', async () => {
    const fixture = TestBed.createComponent(Experience);
    await fixture.whenStable();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.timeline-trigger',
    );
    buttons[0].focus();
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(buttons[1]);
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
  });
});
