import { describe, expect, it } from 'vitest';
import { countdownUntil } from './maintenance';
describe('Launch countdown', () => {
  it('splits the remaining time into days, hours, minutes and seconds', () => {
    const now = Date.parse('2030-01-01T00:00:00Z');
    expect(countdownUntil('2030-01-03T03:04:05Z', now)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      finished: false,
    });
  });
  it('never shows negative or invalid countdown values', () => {
    const now = Date.parse('2030-01-01T00:00:00Z');
    for (const target of ['2029-01-01T00:00:00Z', 'invalid'])
      expect(countdownUntil(target, now)).toEqual({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        finished: true,
      });
  });
});
