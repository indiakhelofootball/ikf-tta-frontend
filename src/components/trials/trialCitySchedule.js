// Keeping a trial city's MONTH and DATE in step while it is being edited.
//
// The two are separate columns -- trials.TrialCity.tentative_month (a string)
// and tentative_date (a real date) -- and the Projects screen edits them through
// two separate controls that never spoke to each other. Reported on the
// 2026-09-08 call: "I am changing the date, I have done it in October, but here
// the thing doesn't change ... if we change the month then the date changes, we
// have to go to the next one."
//
// So an operator picks October, the date stays in September, and the row now
// contradicts itself. On production 8 rows are in that state.
//
// The rule, and it runs in ONE direction each way:
//
//   change the MONTH -> move the date into that month, keeping the day
//   change the DATE  -> set the month to that date's month
//
// Neither ever invents a value. Changing the month when there is no date leaves
// the date empty -- a month-only city is a legitimate thing and stays one.
// Clearing the date leaves the month alone, because "we know it is October, not
// which day" is exactly what the month field is for.
//
// Not a fix for existing rows: this stops new contradictions, it does not
// repair the 8 already stored. Those are a separate decision, because for most
// of them the DATE is the placeholder -- the bulk-add writes the 10th of the
// month, or 10 July when given no month at all, so 31 rows carry 2026-07-10 and
// a date ending in -10 cannot be assumed to be a day anyone chose.

import { MONTHS } from './trialConstants';

const pad = (n) => String(n).padStart(2, '0');

/** Number of days in a 1-indexed month, so 31 Jan -> Feb lands on the 28th/29th. */
const daysIn = (year, month1) => new Date(year, month1, 0).getDate();

/**
 * The operator picked a month. Returns the date to hold alongside it.
 *
 * @param {string} month     a MONTHS entry
 * @param {string} isoDate   the date currently in the form, 'YYYY-MM-DD' or ''
 * @returns {string} the new ISO date, or '' when there was none to move
 */
export function dateForMonth(month, isoDate) {
  const idx = MONTHS.indexOf(month);
  if (idx < 0) return isoDate || '';        // '—' selected, or something unknown
  if (!isoDate) return '';                  // month-only city stays month-only

  const parts = String(isoDate).split('-');
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const day = Number(parts[2]);
  if (!year || !day) return isoDate;

  // Clamp, so moving 31 March to February gives 28 (or 29) rather than a date
  // the browser silently rolls into the next month.
  const safeDay = Math.min(day, daysIn(year, idx + 1));
  return `${year}-${pad(idx + 1)}-${pad(safeDay)}`;
}

/**
 * The operator picked a date. Returns the month to hold alongside it.
 *
 * @param {string} isoDate     'YYYY-MM-DD' or ''
 * @param {string} currentMonth what the month field holds now
 */
export function monthForDate(isoDate, currentMonth) {
  if (!isoDate) return currentMonth || '';  // clearing a date does not clear the month
  const parts = String(isoDate).split('-');
  if (parts.length !== 3) return currentMonth || '';
  const m = Number(parts[1]);
  if (!m || m < 1 || m > 12) return currentMonth || '';
  return MONTHS[m - 1];
}
