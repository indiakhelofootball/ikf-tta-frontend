// What the funder portal shows of an activity (owner decision 2026-10-08):
// it must be Completed AND not switched off. A record from before the switch
// existed carries no visibleToClient, which the backend stores as true.
export function isShownToFunder(activity) {
  return activity?.status === 'Completed' && activity?.visibleToClient !== false;
}

export function funderVisibilityLabel(activity) {
  return isShownToFunder(activity) ? 'Shown to funder' : 'Hidden from funder';
}
