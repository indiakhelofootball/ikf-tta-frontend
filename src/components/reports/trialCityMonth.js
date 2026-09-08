// Which month a trial city belongs to, for the Trials Report month matrix and
// the summary cards.
//
// Extracted so the rule can be unit-tested: TrialsReport.jsx imports
// react-router-dom and cannot be imported under Jest in this repo. Same reason
// trialsReportStats.js and trialsReportJoin.js sit beside it.
//
// THE BUG THIS CLOSES
//
// `trials.TrialCity` stores the month and the date as TWO INDEPENDENT COLUMNS --
// `tentative_month` (a CharField) and `tentative_date` (a DateField) -- and
// nothing keeps them in step. `trials/views.py:425-427` writes each from its own
// payload key, and the Projects screen edits them through two separate controls:
// a month dropdown and a date picker, neither of which touches the other.
//
// So moving a trial from September to 7 October leaves the month reading
// "September". Demonstrated live in the 2026-09-08 meeting: "I am changing the
// date, I have done it in October, but here the thing doesn't change ... it came
// out to be 10th month but here it was 9th."
//
// This function used to trust the month string and fall back to the date only
// when the month was blank, so a row like that was counted under September. That
// is the "upper analysis numbers are wrong" complaint: 21 trials counted by hand
// in September against 15 on the report.
//
// THE RULE
//
// A date is a fact about when the trial runs. A month is a coarse bucket for a
// city that has not been given a date yet. So:
//
//   1. a parseable date decides the month;
//   2. with no date, the stored month decides -- unchanged, and that is what
//      keeps every month-only row exactly where it is today;
//   3. with neither, the city is Unscheduled.
//
// Rows whose month and date already agree -- the ordinary case -- are unchanged
// either way. Only rows that contradict themselves move, and they move to what
// the date says.

import { MONTHS } from '../trials/trialConstants';

export const UNSCHEDULED = 'Unscheduled';

const norm = (s) => (s || '').trim().toLowerCase();

// The stored string, normalised to a known MONTHS entry where possible. It may
// arrive as a full name or already short, and an unrecognised value is kept
// as-is rather than discarded -- dropping it would silently empty the column.
const storedMonth = (value) => {
  if (!value) return null;
  const known = MONTHS.find((m) => norm(m) === norm(value));
  return known || value;
};

const monthFromDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d) ? null : MONTHS[d.getMonth()];
};

export function monthOf(city) {
  const c = city || {};
  return monthFromDate(c.tentativeDate)
    || storedMonth(c.tentativeMonth)
    || UNSCHEDULED;
}

/**
 * True when a city carries a date and a month that disagree.
 *
 * Not used for counting -- the report counts by date regardless. This exists so
 * the contradiction can be surfaced and repaired at source, because the Projects
 * screen still shows the stale month beside the real date.
 */
export function monthContradictsDate(city) {
  const c = city || {};
  const fromDate = monthFromDate(c.tentativeDate);
  const stored = storedMonth(c.tentativeMonth);
  if (!fromDate || !stored) return false;
  return norm(fromDate) !== norm(stored);
}
