// How one REP city assignment is named on the courier form.
//
// The identity of an assignment is project + REP + city, and the database
// enforces that triple as unique. The REP is already fixed by the field above
// the city picker, so within one picker an option is identified by city AND
// project. Drawing the city alone leaves two correct rows looking identical —
// 11 such pairs on production as of 2026-09-10, e.g. South Clan's Rajahmundry
// under both IKF-S6-006 and IKF-S6-008.
//
// The project has to LEAD a line of its own. Measured 2026-09-09 against the
// live payload: appending it to the city line failed 6 of the 11 pairs, because
// a narrow dropdown trims the end and five pairs share 18 leading characters
// ("IKF Scout on Wheel" vs "IKF Scout on Wheel Naari Shakti"). Using the trial
// date failed 4, because those cities run the same day under both programmes.
// The project code is the only part that always differs.

const dash = '—';

export function assignmentOptionLines(assignment) {
  if (!assignment) return { primary: '', secondary: '' };
  const { city = '', state = '', trialName = '', trialType = '' } = assignment;
  const primary = [city, state].filter(Boolean).join(', ');
  const secondary = trialName
    ? [trialName, trialType].filter(Boolean).join(' · ')
    : dash;
  return { primary, secondary };
}

// The closed field is one line, because MUI draws the chosen option's children
// inside the input and a two-line value would break the field's height. The
// code is enough there: the reader has already made the choice and only needs
// to see which one is standing.
export function assignmentSelectedLabel(assignment) {
  if (!assignment) return '';
  const { city = '', state = '', trialName = '' } = assignment;
  const place = [city, state].filter(Boolean).join(', ');
  return trialName ? `${place} · ${trialName}` : place;
}
