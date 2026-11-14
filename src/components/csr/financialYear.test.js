import { fyOf, fyOptions } from './financialYear';

test('the Indian financial year turns on 1 April', () => {
  expect(fyOf('2025-12-02')).toBe('2025-26');
  expect(fyOf('2026-03-31')).toBe('2025-26');
  expect(fyOf('2026-04-01')).toBe('2026-27');
  expect(fyOf('1999-04-01')).toBe('1999-00');
  expect(fyOf('')).toBe('');
  expect(fyOf('not a date')).toBe('');
});

test('options run three years before the anchor and two after', () => {
  expect(fyOptions('2026-03-31')).toEqual(['2022-23', '2023-24', '2024-25', '2025-26', '2026-27', '2027-28']);
});

test('with no start date the options centre on today', () => {
  expect(fyOptions('', '', new Date(2026, 10, 14))).toEqual(
    ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28', '2028-29'],
  );
});

test('a held value outside the window is kept', () => {
  expect(fyOptions('2026-05-01', '2019-20')[0]).toBe('2019-20');
  expect(fyOptions('2026-05-01', '2026-27')).toHaveLength(6);
});
