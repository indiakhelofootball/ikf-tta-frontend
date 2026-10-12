import {
  isShownToFunder, funderVisibilityLabel, localToday, isDatePassed, defaultStatusFor,
  activityFormFunderLine, reportFormFunderLine, needsDatePassedPrompt, activityStatusPillClass,
} from './activityVisibility';

// Owner decision D-016: the funder sees every activity, Planned or Completed,
// whose switch is on.
test('any activity whose switch is on reaches the funder, Planned or Completed', () => {
  expect(isShownToFunder({ status: 'Completed', visibleToClient: true })).toBe(true);
  expect(isShownToFunder({ status: 'Completed', visibleToClient: false })).toBe(false);
  expect(isShownToFunder({ status: 'Planned', visibleToClient: true })).toBe(true);
  expect(isShownToFunder({ status: 'Planned', visibleToClient: false })).toBe(false);
});

test('a record from before the switch existed follows the stored default, visible', () => {
  expect(isShownToFunder({ status: 'Completed' })).toBe(true);
  expect(isShownToFunder({ status: 'Planned' })).toBe(true);
  expect(isShownToFunder(null)).toBe(false);
});

test('the label names the outcome', () => {
  expect(funderVisibilityLabel({ status: 'Completed', visibleToClient: true })).toBe('Shown to funder');
  expect(funderVisibilityLabel({ status: 'Completed', visibleToClient: false })).toBe('Hidden from funder');
  expect(funderVisibilityLabel({ status: 'Planned', visibleToClient: true })).toBe('Shown to funder');
  expect(funderVisibilityLabel({ status: 'Planned', visibleToClient: false })).toBe('Hidden from funder');
});

// D-018 (contract D018_CONTRACT.md): Cancelled, and Planned with the date
// passed (the server's needsUpdate), are held back from the funder.
test('Cancelled is hidden from the funder whatever the switch says', () => {
  expect(isShownToFunder({ status: 'Cancelled', visibleToClient: true })).toBe(false);
  expect(isShownToFunder({ status: 'Cancelled' })).toBe(false);
  expect(funderVisibilityLabel({ status: 'Cancelled', visibleToClient: true })).toBe('Hidden from funder');
});

test('a Planned activity the server marks date-passed is hidden; not marked, shown', () => {
  expect(isShownToFunder({ status: 'Planned', visibleToClient: true, needsUpdate: true })).toBe(false);
  expect(isShownToFunder({ status: 'Planned', visibleToClient: true, needsUpdate: false })).toBe(true);
  expect(funderVisibilityLabel({ status: 'Planned', visibleToClient: true, needsUpdate: true }))
    .toBe('Hidden from funder');
  // needsUpdate only ever means something on Planned.
  expect(isShownToFunder({ status: 'Completed', visibleToClient: true, needsUpdate: true })).toBe(true);
});

test('localToday is the local calendar day, not the UTC one', () => {
  expect(localToday(new Date(2026, 9, 12, 0, 30))).toBe('2026-10-12');
  expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});

describe('date passed: Planned and the last day is before today', () => {
  const today = '2026-10-12';
  test.each([
    ['start yesterday', { startDate: '2026-10-11' }, true],
    ['start today', { startDate: '2026-10-12' }, false],
    ['start tomorrow', { startDate: '2026-10-13' }, false],
    ['ended yesterday', { startDate: '2026-10-01', endDate: '2026-10-11' }, true],
    ['ends today', { startDate: '2026-10-01', endDate: '2026-10-12' }, false],
    ['no date', {}, false],
  ])('Planned, %s', (_, dates, expected) => {
    expect(isDatePassed({ status: 'Planned', ...dates }, today)).toBe(expected);
  });
  test('never for Completed or Cancelled', () => {
    expect(isDatePassed({ status: 'Completed', startDate: '2026-10-11' }, today)).toBe(false);
    expect(isDatePassed({ status: 'Cancelled', startDate: '2026-10-11' }, today)).toBe(false);
  });
});

test('default status: a future start is Planned; today, the past or no date is Completed', () => {
  const today = '2026-10-12';
  expect(defaultStatusFor('2026-10-13', today)).toBe('Planned');
  expect(defaultStatusFor('2026-10-12', today)).toBe('Completed');
  expect(defaultStatusFor('2026-10-11', today)).toBe('Completed');
  expect(defaultStatusFor('', today)).toBe('Completed');
});

test('the activity form line', () => {
  const today = '2026-10-12';
  const f = (over) => ({ visibleToClient: true, status: 'Completed', startDate: '', endDate: '', ...over });
  expect(activityFormFunderLine(f({}), today)).toBe('The funder will see this');
  expect(activityFormFunderLine(f({ visibleToClient: false }), today)).toBe('Hidden from the funder');
  expect(activityFormFunderLine(f({ status: 'Cancelled' }), today)).toBe('Hidden from the funder');
  expect(activityFormFunderLine(f({ status: 'Planned', startDate: '2026-10-11' }), today)).toBe('Hidden from the funder');
  expect(activityFormFunderLine(f({ status: 'Planned', startDate: '2026-10-12' }), today)).toBe('The funder will see this');
  expect(activityFormFunderLine(f({ status: 'Planned', startDate: '2026-10-13' }), today)).toBe('The funder will see this');
});

test('the report form line follows the switch only', () => {
  expect(reportFormFunderLine({ visibleToClient: true })).toBe('The funder will see this');
  expect(reportFormFunderLine({ visibleToClient: false })).toBe('Hidden from the funder');
});

test('the date-passed prompt is for Planned rows the server flags, nothing else', () => {
  expect(needsDatePassedPrompt({ status: 'Planned', needsUpdate: true })).toBe(true);
  expect(needsDatePassedPrompt({ status: 'Planned', needsUpdate: false })).toBe(false);
  expect(needsDatePassedPrompt({ status: 'Planned' })).toBe(false);
  expect(needsDatePassedPrompt({ status: 'Completed', needsUpdate: true })).toBe(false);
  expect(needsDatePassedPrompt({ status: 'Cancelled', needsUpdate: true })).toBe(false);
  expect(needsDatePassedPrompt(null)).toBe(false);
});

test('status pills: Planned waits, Cancelled is plain, Completed is the neutral chip', () => {
  expect(activityStatusPillClass('Planned')).toBe('wait');
  expect(activityStatusPillClass('Cancelled')).toBe('plain');
  expect(activityStatusPillClass('Completed')).toBe('closed');
});
