import { formatDate, formatRange, formatCount, formatRupees } from './clientFormat';

describe('formatDate', () => {
  it('writes a calendar day as day, short month, year', () => {
    expect(formatDate('2026-10-08')).toBe('8 Oct 2026');
    expect(formatDate('2027-03-31')).toBe('31 Mar 2027');
  });

  it('spells September with three letters, unlike ICU en-IN', () => {
    expect(formatDate('2026-09-08')).toBe('8 Sep 2026');
  });

  it('does not shift a date-only value to the previous day', () => {
    // new Date('2026-04-01') is UTC midnight; west of Greenwich that is 31 Mar.
    // Node on Windows ignores TZ, so the reader's calendar is moved five hours
    // west by hand — otherwise this passes in India whatever the code does.
    const west = (get) => function shifted() {
      return new Date(this.getTime() - 5 * 3600 * 1000)[get]();
    };
    const spies = [
      ['getDate', 'getUTCDate'], ['getMonth', 'getUTCMonth'], ['getFullYear', 'getUTCFullYear'],
    ].map(([local, utc]) => jest.spyOn(Date.prototype, local).mockImplementation(west(utc)));
    try {
      expect(formatDate('2026-04-01')).toBe('1 Apr 2026');
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
  });

  it('writes a timestamp on the reader calendar', () => {
    const ts = '2026-10-08T07:05:25.027649Z';
    const d = new Date(ts);
    expect(formatDate(ts)).toBe(`${d.getDate()} Oct 2026`);
    expect(formatDate(ts)).not.toMatch(/T|Z|:/);
  });

  it('returns empty for blank or unreadable input, never "Invalid Date"', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('not a date')).toBe('');
    expect(formatDate('2026-13-01')).toBe('');
  });
});

describe('formatRange', () => {
  it('joins both ends with an en dash', () => {
    expect(formatRange('2026-04-01', '2027-03-31')).toBe('1 Apr 2026 – 31 Mar 2027');
  });

  it('says which side a one-sided range has', () => {
    expect(formatRange('2026-04-01', null)).toBe('From 1 Apr 2026');
    expect(formatRange(null, '2027-03-31')).toBe('Until 31 Mar 2027');
    expect(formatRange(null, null)).toBe('');
  });

  it('collapses a single-day range to one date', () => {
    expect(formatRange('2026-10-08', '2026-10-08')).toBe('8 Oct 2026');
  });
});

describe('formatCount', () => {
  it('groups in lakhs and crores', () => {
    expect(formatCount(37500000)).toBe('3,75,00,000');
    expect(formatCount(921000)).toBe('9,21,000');
  });

  it('shows 0 for nothing, not a dash', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(null)).toBe('0');
    expect(formatCount(undefined)).toBe('0');
  });
});

describe('formatRupees', () => {
  it('drops paise when there are none', () => {
    expect(formatRupees(921000)).toBe('₹9,21,000');
    expect(formatRupees('921000.00')).toBe('₹9,21,000');
  });

  it('shows exactly two places when there are paise', () => {
    expect(formatRupees(1234.5)).toBe('₹1,234.50');
    expect(formatRupees('1234.05')).toBe('₹1,234.05');
  });

  it('reads blank as zero rupees', () => {
    expect(formatRupees(null)).toBe('₹0');
  });
});
