import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { animate } from 'motion/mini';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionDisclosure } from './motion-disclosure';

const { completions } = vi.hoisted(() => ({ completions: [] as (() => void)[] }));
vi.mock('motion/mini', () => ({
  animate: vi.fn(() => ({
    stop: vi.fn(),
    then: (complete: () => void) => { completions.push(complete); return Promise.resolve(); },
  })),
}));

@Component({
  imports: [MotionDisclosure],
  template: '<div [appMotionDisclosure]="open()"><a href="/">Home</a></div>',
})
class DisclosureScene {
  readonly open = signal(false);
}

describe('MotionDisclosure', () => {
  let mobile: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
  let reduced: typeof mobile;
  const changes: (() => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    completions.length = 0;
    changes.length = 0;
    const media = (matches: boolean) => ({
      matches,
      addEventListener: vi.fn((_event: string, listener: () => void) => changes.push(listener)),
      removeEventListener: vi.fn(),
    });
    mobile = media(true);
    reduced = media(false);
    vi.stubGlobal('matchMedia', vi.fn((query: string) => query.includes('max-width') ? mobile : reduced));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  async function scene() {
    const fixture = TestBed.createComponent(DisclosureScene);
    await fixture.whenStable();
    const panel: HTMLElement = fixture.nativeElement.querySelector('div');
    return { fixture, panel, open: fixture.componentInstance.open };
  }

  it('makes closing links inert immediately and hides the panel only after fade-out', async () => {
    const { fixture, panel, open } = await scene();
    expect(panel.hidden).toBe(true);
    open.set(true);
    await fixture.whenStable();
    expect(panel.hidden).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(false);
    completions[0]();
    await fixture.whenStable();
    open.set(false);
    await fixture.whenStable();
    expect(panel.hidden).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.classList.contains('is-leaving')).toBe(true);
    completions[1]();
    await fixture.whenStable();
    expect(panel.hidden).toBe(true);
  });

  it('ignores a stale close completion after a rapid reopen', async () => {
    const { fixture, panel, open } = await scene();
    open.set(true);
    await fixture.whenStable();
    open.set(false);
    await fixture.whenStable();
    const close = completions[1];
    open.set(true);
    await fixture.whenStable();
    close();
    await fixture.whenStable();
    expect(panel.hidden).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(false);
  });

  it('skips motion for reduced-motion and keeps desktop navigation visible', async () => {
    reduced.matches = true;
    const { fixture, panel, open } = await scene();
    open.set(true);
    await fixture.whenStable();
    open.set(false);
    await fixture.whenStable();
    expect(panel.hidden).toBe(true);
    expect(animate).not.toHaveBeenCalled();
    mobile.matches = false;
    changes[0]();
    await fixture.whenStable();
    expect(panel.hidden).toBe(false);
    expect(panel.hasAttribute('inert')).toBe(false);
    fixture.destroy();
    expect(mobile.removeEventListener).toHaveBeenCalled();
    expect(reduced.removeEventListener).toHaveBeenCalled();
  });
});
