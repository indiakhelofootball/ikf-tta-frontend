import { isShownToFunder, funderVisibilityLabel } from './activityVisibility';

test('only a Completed activity that is not switched off reaches the funder', () => {
  expect(isShownToFunder({ status: 'Completed', visibleToClient: true })).toBe(true);
  expect(isShownToFunder({ status: 'Completed', visibleToClient: false })).toBe(false);
  expect(isShownToFunder({ status: 'Planned', visibleToClient: true })).toBe(false);
  expect(isShownToFunder({ status: 'Planned', visibleToClient: false })).toBe(false);
});

test('a record from before the switch existed follows the stored default, visible', () => {
  expect(isShownToFunder({ status: 'Completed' })).toBe(true);
  expect(isShownToFunder({ status: 'Planned' })).toBe(false);
  expect(isShownToFunder(null)).toBe(false);
});

test('the label names the outcome', () => {
  expect(funderVisibilityLabel({ status: 'Completed', visibleToClient: true })).toBe('Shown to funder');
  expect(funderVisibilityLabel({ status: 'Completed', visibleToClient: false })).toBe('Hidden from funder');
});
