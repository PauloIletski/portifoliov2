import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { animate } from 'motion/mini';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanetParallax } from './planet-parallax';

vi.mock('motion/mini', () => ({
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));

@Component({
  imports: [PlanetParallax],
  template: '<section appPlanetParallax><div data-depth="1"></div></section>',
})
class Scene {}

describe('PlanetParallax', () => {
  let mediaChange: (() => void) | undefined;
  let frame: FrameRequestCallback | undefined;
  let preference: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mediaChange = undefined;
    frame = undefined;
    preference = {
      matches: true,
      addEventListener: vi.fn((_event: string, listener: () => void) => { mediaChange = listener; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn(() => preference));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn(() => { frame = undefined; }));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  async function scene() {
    const fixture = TestBed.createComponent(Scene);
    await fixture.whenStable();
    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 400, 400));
    return { fixture, section };
  }

  function move(section: HTMLElement, pointerType = 'mouse', clientX = 400) {
    const event = new Event('pointermove');
    Object.assign(event, { pointerType, clientX, clientY: 400 });
    section.dispatchEvent(event);
    frame?.(0);
  }

  it('bounds mouse movement and returns to center on pointer leave', async () => {
    const { section } = await scene();
    move(section, 'mouse', 10000);
    expect(animate).toHaveBeenLastCalledWith(expect.any(HTMLElement), {
      transform: 'translate3d(22px, 18px, 0)',
    }, expect.any(Object));
    section.dispatchEvent(new Event('pointerleave'));
    expect(animate).toHaveBeenLastCalledWith(expect.any(HTMLElement), {
      transform: 'translate3d(0px, 0px, 0)',
    }, expect.any(Object));
  });

  it('does not animate touch or a reduced-motion/coarse-pointer preference', async () => {
    preference.matches = false;
    const { section } = await scene();
    move(section);
    expect(animate).not.toHaveBeenCalled();
    preference.matches = true;
    mediaChange?.();
    move(section, 'touch');
    expect(animate).not.toHaveBeenCalled();
  });

  it('stops active motion on preference changes and removes listeners on destruction', async () => {
    const { section, fixture } = await scene();
    move(section);
    const animation = vi.mocked(animate).mock.results[0].value;
    preference.matches = false;
    mediaChange?.();
    expect(animation.stop).toHaveBeenCalled();
    fixture.destroy();
    expect(preference.removeEventListener).toHaveBeenCalledWith('change', mediaChange);
  });
});
