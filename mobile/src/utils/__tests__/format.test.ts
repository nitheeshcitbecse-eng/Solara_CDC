import {
  ageFrom,
  firstNameOf,
  formatDuration,
  formatPhone,
  formatRupees,
  initialsOf,
  maskAadhaar,
  normalizeMultiline,
  normalizeText,
  relativeTime,
  toE164,
} from '../format';

describe('format utils', () => {
  it('formats rupees with Indian digit grouping', () => {
    expect(formatRupees(18000)).toBe('₹18,000');
    expect(formatRupees(125000)).toBe('₹1,25,000');
    expect(formatRupees(450.4)).toBe('₹450');
  });

  it('converts and displays Indian phone numbers', () => {
    expect(toE164('98765 43210')).toBe('+919876543210');
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
    expect(formatPhone(null)).toBe('');
  });

  it('masks Aadhaar to the last four digits only', () => {
    expect(maskAadhaar('1234')).toBe('XXXX XXXX 1234');
    expect(maskAadhaar(null)).toBe('XXXX XXXX XXXX');
    expect(maskAadhaar('12345')).toBe('XXXX XXXX XXXX');
  });

  it('greets by first name only', () => {
    expect(firstNameOf('Prasina Selvam')).toBe('Prasina');
    expect(firstNameOf('  Arun   Kumar ')).toBe('Arun');
    expect(firstNameOf(null)).toBe('');
    expect(initialsOf('Prasina Selvam')).toBe('PS');
    expect(initialsOf('Arun')).toBe('A');
  });

  it('formats durations as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(61.7)).toBe('1:01');
  });

  it('computes age with birthday precision', () => {
    const today = new Date(2026, 9, 3); // 3 Oct 2026
    expect(ageFrom('2008-10-03', today)).toBe(18);
    expect(ageFrom('2008-10-04', today)).toBe(17);
    expect(ageFrom('1996-05-14', today)).toBe(30);
  });

  it('buckets relative times', () => {
    const now = Date.parse('2026-10-03T12:00:00Z');
    expect(relativeTime('2026-10-03T11:59:30Z', now)).toEqual({ unit: 'now' });
    expect(relativeTime('2026-10-03T11:15:00Z', now)).toEqual({ unit: 'minutes', count: 45 });
    expect(relativeTime('2026-10-03T07:00:00Z', now)).toEqual({ unit: 'hours', count: 5 });
    expect(relativeTime('2026-10-01T12:00:00Z', now)).toEqual({ unit: 'days', count: 2 });
    expect(relativeTime('2026-09-01T12:00:00Z', now)).toEqual({ unit: 'date' });
  });

  it('normalises free text before sending', () => {
    expect(normalizeText('  Home   cook  ')).toBe('Home cook');
    expect(normalizeMultiline(' Hello  there \n\n\n\n Thanks ')).toBe('Hello there\n\nThanks');
  });
});
