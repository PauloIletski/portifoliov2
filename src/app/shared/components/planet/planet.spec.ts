import { TestBed } from '@angular/core/testing';
import { animate } from 'motion/mini';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Planet } from './planet';

vi.mock('motion/mini', () => ({
  animate: vi.fn(() => ({ play: vi.fn(), pause: vi.fn(), stop: vi.fn(), then: vi.fn(() => Promise.resolve()) })),
}));

describe('Planet ambient motion', () => {
  let visibility: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
  let preferenceChange: (() => void) | undefined;
  let preference: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
  const disconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    visibility = undefined;
    preferenceChange = undefined;
    preference = {
      matches: false,
      addEventListener: vi.fn((_event: string, callback: () => void) => { preferenceChange = callback; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => preference));
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { visibility = callback; }
      observe = vi.fn();
      disconnect = disconnect;
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('starts only on screen and pauses/resumes without recreating the animations', async () => {
    const fixture = TestBed.createComponent(Planet);
    await fixture.whenStable();
    expect(animate).not.toHaveBeenCalled();
    visibility?.([{ isIntersecting: true }]);
    await fixture.whenStable();
    expect(animate).toHaveBeenCalledTimes(6);
    const controls = vi.mocked(animate).mock.results.map(result => result.value);
    fixture.componentRef.setInput('paused', true);
    await fixture.whenStable();
    expect(controls.every(control => control.pause.mock.calls.length > 0)).toBe(true);
    fixture.componentRef.setInput('paused', false);
    await fixture.whenStable();
    expect(animate).toHaveBeenCalledTimes(6);
    expect(controls.every(control => control.play.mock.calls.length >= 2)).toBe(true);
    visibility?.([{ isIntersecting: false }]);
    await fixture.whenStable();
    expect(controls.every(control => control.pause.mock.calls.length >= 2)).toBe(true);
    fixture.destroy();
    expect(controls.every(control => control.stop.mock.calls.length > 0)).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });

  it('launches one rocket only on mouse entry, with no overlapping flights', async () => {
    const fixture = TestBed.createComponent(Planet);
    await fixture.whenStable();
    visibility?.([{ isIntersecting: true }]);
    await fixture.whenStable();
    const enter = (pointerType: string) => {
      const event = new Event('pointerenter');
      Object.assign(event, { pointerType });
      fixture.nativeElement.dispatchEvent(event);
    };
    enter('touch');
    expect(animate).toHaveBeenCalledTimes(6);
    enter('mouse');
    expect(animate).toHaveBeenCalledTimes(7);
    expect(animate).toHaveBeenLastCalledWith(expect.any(HTMLElement), expect.any(Object), {
      duration: 5, ease: 'linear',
    });
    enter('mouse');
    expect(animate).toHaveBeenCalledTimes(7);
    const flight = vi.mocked(animate).mock.results[6].value;
    fixture.componentRef.setInput('paused', true);
    await fixture.whenStable();
    expect(flight.pause).toHaveBeenCalled();
    fixture.destroy();
    expect(flight.stop).toHaveBeenCalled();
  });

  it('does not start motion when reduced motion is preferred', async () => {
    preference.matches = true;
    const fixture = TestBed.createComponent(Planet);
    await fixture.whenStable();
    visibility?.([{ isIntersecting: true }]);
    await fixture.whenStable();
    expect(animate).not.toHaveBeenCalled();
  });

  it('stops ambient motion when the preference changes during playback', async () => {
    const fixture = TestBed.createComponent(Planet);
    await fixture.whenStable();
    visibility?.([{ isIntersecting: true }]);
    await fixture.whenStable();
    const controls = vi.mocked(animate).mock.results.map(result => result.value);
    preference.matches = true;
    preferenceChange?.();
    await fixture.whenStable();
    expect(controls.every(control => control.stop.mock.calls.length > 0)).toBe(true);
    fixture.destroy();
    expect(preference.removeEventListener).toHaveBeenCalled();
  });
});
