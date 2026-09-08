import { dateForMonth, monthForDate } from './trialCitySchedule';

describe('the reported behaviour: picking a month leaves the date behind', () => {
  // "I am changing the date, I have done it in October, but here the thing
  // doesn't change ... if we change the month then the date changes."
  test('picking October moves a September date into October, same day', () => {
    expect(dateForMonth('October', '2026-09-07')).toBe('2026-10-07');
  });

  test('picking a date sets the month to match', () => {
    expect(monthForDate('2026-10-07', 'September')).toBe('October');
  });

  test('after either edit the two agree', () => {
    const d = dateForMonth('October', '2026-09-07');
    expect(monthForDate(d, 'September')).toBe('October');
  });
});

describe('a month-only city stays month-only', () => {
  test('picking a month with no date does not invent one', () => {
    expect(dateForMonth('July', '')).toBe('');
    expect(dateForMonth('July', null)).toBe('');
  });

  test('clearing the date leaves the month alone', () => {
    // "October, day unknown" is exactly what the month field is for.
    expect(monthForDate('', 'October')).toBe('October');
    expect(monthForDate(null, 'October')).toBe('October');
  });

  test('selecting the blank month leaves the date alone', () => {
    expect(dateForMonth('', '2026-09-07')).toBe('2026-09-07');
  });
});

describe('short months do not roll over', () => {
  test('31 March moved to February lands on the 28th, not 3 March', () => {
    expect(dateForMonth('February', '2026-03-31')).toBe('2026-02-28');
  });

  test('leap year gives the 29th', () => {
    expect(dateForMonth('February', '2028-03-31')).toBe('2028-02-29');
  });

  test('31 October moved to November lands on the 30th', () => {
    expect(dateForMonth('November', '2026-10-31')).toBe('2026-11-30');
  });

  test('a day that fits is untouched', () => {
    expect(dateForMonth('February', '2026-03-10')).toBe('2026-02-10');
  });
});

describe('bad input changes nothing', () => {
  test('an unknown month leaves the date as it was', () => {
    expect(dateForMonth('Smarch', '2026-09-07')).toBe('2026-09-07');
  });

  test('a malformed date is returned unchanged', () => {
    expect(dateForMonth('October', 'not-a-date')).toBe('not-a-date');
    expect(dateForMonth('October', '2026-09')).toBe('2026-09');
  });

  test('a malformed date keeps the current month', () => {
    expect(monthForDate('not-a-date', 'September')).toBe('September');
    expect(monthForDate('2026-13-01', 'September')).toBe('September');
  });

  test('January and December, the boundaries', () => {
    expect(monthForDate('2026-01-15', '')).toBe('January');
    expect(monthForDate('2026-12-15', '')).toBe('December');
    expect(dateForMonth('January', '2026-12-15')).toBe('2026-01-15');
  });
});
