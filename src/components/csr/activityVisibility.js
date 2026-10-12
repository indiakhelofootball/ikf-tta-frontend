// What the funder portal shows of an activity (owner decision D-016,
// 2026-10-12): any activity, Planned or Completed, unless its switch is off.
// A record from before the switch existed carries no visibleToClient, which
// the backend stores as true.
export function isShownToFunder(activity) {
  return Boolean(activity) && activity.visibleToClient !== false;
}

export function funderVisibilityLabel(activity) {
  return isShownToFunder(activity) ? 'Shown to funder' : 'Hidden from funder';
}
