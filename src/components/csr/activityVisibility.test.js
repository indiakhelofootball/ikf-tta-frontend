import { isShownToFunder, funderVisibilityLabel } from './activityVisibility';

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
