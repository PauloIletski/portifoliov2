import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LaunchDateAdapter } from './maintenance-form';
describe('Launch date calendar parsing', () => {
  function adapter() {
    return TestBed.runInInjectionContext(() => new LaunchDateAdapter());
  }
  it('parses typed dates as day/month/year without swapping the month and day', () => {
    const date = adapter().parse('01/12/2030')!;
    expect(date.getFullYear()).toBe(2030);
    expect(date.getMonth()).toBe(11);
    expect(date.getDate()).toBe(1);
  });
  it('rejects invalid calendar dates and accepts valid leap days', () => {
    const parser = adapter();
    expect(Number.isNaN(parser.parse('31/02/2030')!.getTime())).toBe(true);
    expect(Number.isNaN(parser.parse('29/02/2030')!.getTime())).toBe(true);
    expect(parser.parse('29/02/2032')!.getDate()).toBe(29);
    expect(parser.parse('')).toBeNull();
  });
});
