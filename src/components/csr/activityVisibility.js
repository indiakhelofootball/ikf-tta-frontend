// What the funder portal shows of an activity (owner decisions D-016, D-018):
// any activity whose switch is on, except a Cancelled one and a Planned one
// whose date has passed — that one is held back until staff say whether it
// happened. A record from before the switch existed carries no
// visibleToClient, which the backend stores as true.
//
// For a saved record "date passed" is the server's needsUpdate flag, never
// recomputed here. The form has no saved flag yet, so it passes its own.
export function isShownToFunder(activity) {
  if (!activity) return false;
  if (activity.visibleToClient === false) return false;
  if (activity.status === 'Cancelled') return false;
  if (activity.status === 'Planned' && activity.needsUpdate === true) return false;
  return true;
}

export function funderVisibilityLabel(activity) {
  return isShownToFunder(activity) ? 'Shown to funder' : 'Hidden from funder';
}

// Today as the yyyy-mm-dd string a date input holds, in the browser's own
// timezone. toISOString() would give the UTC day, which in India is
// yesterday until 05:30.
export function localToday(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// The same rule the server applies: Planned, and its last day (end if set,
// else start) is before today. No date is never "passed".
export function isDatePassed({ status, startDate, endDate }, today) {
  const last = endDate || startDate;
  return status === 'Planned' && Boolean(last) && last < today;
}

// The status a new activity starts on until the user picks one: a future
// start is Planned; today, the past, or no date is Completed.
export function defaultStatusFor(startDate, today) {
  return startDate && startDate > today ? 'Planned' : 'Completed';
}

// The line beside Save on the activity form, read from what is on the form.
export function activityFormFunderLine(form, today) {
  const shown = isShownToFunder({
    visibleToClient: form.visibleToClient,
    status: form.status,
    needsUpdate: isDatePassed(form, today),
  });
  return shown ? 'The funder will see this' : 'Hidden from the funder';
}

export function reportFormFunderLine(form) {
  return form.visibleToClient ? 'The funder will see this' : 'Hidden from the funder';
}

// A Planned activity whose date has passed asks staff what became of it.
export function needsDatePassedPrompt(activity) {
  return Boolean(activity) && activity.status === 'Planned' && activity.needsUpdate === true;
}

// Planned is ochre ("waiting on you"); Cancelled drops the dot so it does not
// read as one more finished activity; anything else is the neutral chip.
export function activityStatusPillClass(status) {
  if (status === 'Planned') return 'wait';
  if (status === 'Cancelled') return 'plain';
  return 'closed';
}
