/**
 * TDS statutory deposit deadline.
 *
 * Client requirement (transcript 2026-03-06, quoted in _docs/requirements/README.md):
 *   "the amount you deduct between 1 to 30, you have to deposit within 1 to 7 days
 *    of the next month"
 *
 * TDS deducted in month M is due on the 7th of M+1 — derived from the record's own
 * deduction month, never from today. The previous code computed one shared due date
 * from `new Date()`, so a record deducted months ago rendered as not-yet-due.
 *
 * TDSRecord.month arrives from the API in Django display form ("Mar 2026"), not ISO.
 */

import {
  parseTDSMonth,
  tdsDueDate,
  daysUntilTDSDue,
  buildTDSDueInfo,
} from './tdsDueDate';

describe('parseTDSMonth', () => {
  it('parses the display form the API actually sends', () => {
    expect(parseTDSMonth('Mar 2026')).toEqual({ year: 2026, monthIndex: 2 });
    expect(parseTDSMonth('Dec 2026')).toEqual({ year: 2026, monthIndex: 11 });
    expect(parseTDSMonth('Jan 2027')).toEqual({ year: 2027, monthIndex: 0 });
  });

  it('tolerates whitespace, case and full month names', () => {
    expect(parseTDSMonth('  jul 2026 ')).toEqual({ year: 2026, monthIndex: 6 });
    expect(parseTDSMonth('September 2026')).toEqual({ year: 2026, monthIndex: 8 });
  });

  it('returns null for anything it cannot read rather than guessing', () => {
    expect(parseTDSMonth('2026-03')).toBeNull();
    expect(parseTDSMonth('Xyz 2026')).toBeNull();
    expect(parseTDSMonth('')).toBeNull();
    expect(parseTDSMonth(null)).toBeNull();
    expect(parseTDSMonth(undefined)).toBeNull();
    expect(parseTDSMonth(202603)).toBeNull();
  });
});

describe('tdsDueDate — 7th of the month after deduction', () => {
  it('uses the record month, not today', () => {
    const due = tdsDueDate('Jul 2026');
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(7); // August
    expect(due.getDate()).toBe(7);
  });

  it('rolls December over into January of the following year', () => {
    const due = tdsDueDate('Dec 2026');
    expect(due.getFullYear()).toBe(2027);
    expect(due.getMonth()).toBe(0); // January
    expect(due.getDate()).toBe(7);
  });

  it('rolls November into December without changing the year', () => {
    const due = tdsDueDate('Nov 2026');
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(11);
    expect(due.getDate()).toBe(7);
  });

  it('returns null for an unparseable month', () => {
    expect(tdsDueDate('not a month')).toBeNull();
  });
});

describe('daysUntilTDSDue', () => {
  const AUG_13_2026 = new Date(2026, 7, 13);

  it('is positive for the current deduction month', () => {
    // Deducted Aug 2026, due 7 Sep 2026 — 25 days away on 13 Aug.
    expect(daysUntilTDSDue('Aug 2026', AUG_13_2026)).toBe(25);
  });

  it('is negative for a previous month whose deadline has passed', () => {
    // Deducted Jul 2026, due 7 Aug 2026 — six days overdue on 13 Aug.
    // The old shared-date code showed this as "7 September, 25 days remaining".
    expect(daysUntilTDSDue('Jul 2026', AUG_13_2026)).toBe(-6);
  });

  it('is zero on the deadline day itself — the 7th is still on time', () => {
    expect(daysUntilTDSDue('Jul 2026', new Date(2026, 7, 7))).toBe(0);
  });

  it('turns negative the day after the deadline', () => {
    expect(daysUntilTDSDue('Jul 2026', new Date(2026, 7, 8))).toBe(-1);
  });

  it('handles the December to January rollover across the year boundary', () => {
    // Deducted Dec 2026, due 7 Jan 2027.
    expect(daysUntilTDSDue('Dec 2026', new Date(2026, 11, 31))).toBe(7);
    expect(daysUntilTDSDue('Dec 2026', new Date(2027, 0, 7))).toBe(0);
    expect(daysUntilTDSDue('Dec 2026', new Date(2027, 0, 20))).toBe(-13);
  });

  it('ignores the time of day', () => {
    const lateOnDeadline = new Date(2026, 7, 7, 23, 59, 59);
    expect(daysUntilTDSDue('Jul 2026', lateOnDeadline)).toBe(0);
  });

  it('returns null for an unparseable month', () => {
    expect(daysUntilTDSDue('2026-07', AUG_13_2026)).toBeNull();
  });
});

describe('buildTDSDueInfo', () => {
  const AUG_13_2026 = new Date(2026, 7, 13);

  it('gives each pending month its own deadline', () => {
    const info = buildTDSDueInfo(['Aug 2026', 'Jul 2026'], AUG_13_2026);
    const byMonth = Object.fromEntries(info.map((i) => [i.month, i]));

    expect(byMonth['Jul 2026'].overdue).toBe(true);
    expect(byMonth['Jul 2026'].days).toBe(-6);
    expect(byMonth['Jul 2026'].dueStr).toMatch(/7 August 2026/);

    expect(byMonth['Aug 2026'].overdue).toBe(false);
    expect(byMonth['Aug 2026'].days).toBe(25);
    expect(byMonth['Aug 2026'].dueStr).toMatch(/7 September 2026/);
  });

  it('sorts oldest deadline first so overdue months lead', () => {
    const info = buildTDSDueInfo(['Aug 2026', 'Jun 2026', 'Jul 2026'], AUG_13_2026);
    expect(info.map((i) => i.month)).toEqual(['Jun 2026', 'Jul 2026', 'Aug 2026']);
  });

  it('sorts a December month before the following January', () => {
    const info = buildTDSDueInfo(['Jan 2027', 'Dec 2026'], new Date(2027, 1, 1));
    expect(info.map((i) => i.month)).toEqual(['Dec 2026', 'Jan 2027']);
    expect(info[0].dueStr).toMatch(/7 January 2027/);
    expect(info[1].dueStr).toMatch(/7 February 2027/);
  });

  it('keeps unparseable months visible, pushed to the end and never marked overdue', () => {
    const info = buildTDSDueInfo(['garbage', 'Jul 2026'], AUG_13_2026);
    expect(info.map((i) => i.month)).toEqual(['Jul 2026', 'garbage']);
    expect(info[1].due).toBeNull();
    expect(info[1].days).toBeNull();
    expect(info[1].overdue).toBe(false);
    expect(info[1].dueStr).toBe('—');
  });

  it('returns an empty list when nothing is pending', () => {
    expect(buildTDSDueInfo([], AUG_13_2026)).toEqual([]);
  });
});
