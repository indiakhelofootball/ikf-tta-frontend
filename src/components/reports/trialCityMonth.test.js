import { monthOf, monthContradictsDate, UNSCHEDULED } from './trialCityMonth';

const city = (over = {}) => ({ tentativeMonth: '', tentativeDate: null, ...over });

describe('the meeting repro: the date was moved, the month was not', () => {
  // "I am changing the date, I have done it in October, but here the thing
  // doesn't change ... it came out to be 10th month but here it was 9th."
  test('a city dated October counts as October even though it still says September', () => {
    expect(monthOf(city({ tentativeMonth: 'September', tentativeDate: '2026-10-07' })))
      .toBe('October');
  });

  test('and the contradiction is reportable, so it can be repaired at source', () => {
    expect(monthContradictsDate(
      city({ tentativeMonth: 'September', tentativeDate: '2026-10-07' }))).toBe(true);
  });
});

describe('rows that are already consistent do not move', () => {
  test('month and date agreeing stays put', () => {
    expect(monthOf(city({ tentativeMonth: 'November', tentativeDate: '2026-11-15' })))
      .toBe('November');
    expect(monthContradictsDate(
      city({ tentativeMonth: 'November', tentativeDate: '2026-11-15' }))).toBe(false);
  });

  test('a month-only city keeps its month — this is the whole month-only workflow', () => {
    expect(monthOf(city({ tentativeMonth: 'July' }))).toBe('July');
    expect(monthOf(city({ tentativeMonth: 'July', tentativeDate: null }))).toBe('July');
  });

  test('a date-only city derives its month, as before', () => {
    expect(monthOf(city({ tentativeDate: '2026-03-29' }))).toBe('March');
  });

  test('neither is Unscheduled, as before', () => {
    expect(monthOf(city())).toBe(UNSCHEDULED);
    expect(monthOf(undefined)).toBe(UNSCHEDULED);
  });
});

describe('the stored month string is still normalised', () => {
  test('case and spacing are ignored', () => {
    expect(monthOf(city({ tentativeMonth: '  september ' }))).toBe('September');
  });

  test('an unrecognised value is kept, not dropped', () => {
    // Dropping it would silently empty the column for that row.
    expect(monthOf(city({ tentativeMonth: 'Q3' }))).toBe('Q3');
  });

  test('an unrecognised month never counts as a contradiction', () => {
    expect(monthContradictsDate(
      city({ tentativeMonth: 'Q3', tentativeDate: '2026-10-07' }))).toBe(true);
    expect(monthContradictsDate(city({ tentativeMonth: 'Q3' }))).toBe(false);
  });
});

describe('bad input', () => {
  test('an unparseable date falls back to the stored month', () => {
    expect(monthOf(city({ tentativeMonth: 'May', tentativeDate: 'not-a-date' })))
      .toBe('May');
  });

  test('an unparseable date with no month is Unscheduled', () => {
    expect(monthOf(city({ tentativeDate: 'not-a-date' }))).toBe(UNSCHEDULED);
  });

  test('a contradiction needs both halves to be real', () => {
    expect(monthContradictsDate(city({ tentativeDate: '2026-10-07' }))).toBe(false);
    expect(monthContradictsDate(city({ tentativeMonth: 'September' }))).toBe(false);
    expect(monthContradictsDate(undefined)).toBe(false);
  });
});
