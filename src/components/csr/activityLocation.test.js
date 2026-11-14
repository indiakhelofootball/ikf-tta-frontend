import { activityLocation } from './activityLocation';

test.each([
  ['city and venue', { trialCityName: 'Mumbai', location: 'Andheri Sports Complex' }, 'Mumbai · Andheri Sports Complex'],
  ['city only', { trialCityName: 'Mumbai', location: '' }, 'Mumbai'],
  ['venue only', { trialCityName: '', location: 'Andheri Sports Complex' }, 'Andheri Sports Complex'],
  ['neither', { trialCityName: '', location: '' }, '—'],
  ['neither, fields absent', {}, '—'],
  ['blank text counts as unset', { trialCityName: '  ', location: '  ' }, '—'],
  ['a venue that only repeats the city', { trialCityName: 'Mumbai', location: 'mumbai' }, 'Mumbai'],
])('%s', (_, activity, expected) => {
  expect(activityLocation(activity)).toBe(expected);
});
