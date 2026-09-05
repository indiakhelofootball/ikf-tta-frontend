// Which organisations are missing the documents this report exists to hand out.
//
// The Social Media Report is a bulk-download tool: select organisations, get
// their logo and MoU as auto-named files. So a missing logo is not cosmetic —
// it is the deliverable absent.
//
// The screen already showed "N/A" on the row, and the bulk download already
// counted files ("Downloaded 12 file(s) from 10 REP(s)"). Neither told anyone
// WHICH organisations had nothing to give, and finding out meant scrolling 64
// rows. So "never uploaded" and "the system lost it" looked identical, and a
// gap in the paperwork read as a bug in the app — which is how one missing
// logo turned into a fortnight of "the logo keeps disappearing".
//
// These are pure functions so the counts can be tested without the component,
// which pulls in the whole MUI tree.

export const MISSING_LOGO = 'missing-logo';
export const MISSING_MOU = 'missing-mou';

// A stored file is a non-empty string. Treat whitespace as absent: a column
// holding ' ' is not a document, and the backend stores '' for "none".
const has = (value) => typeof value === 'string' && value.trim() !== '';

export const hasLogo = (rep) => has(rep && rep.repLogoUrl);
export const hasMou = (rep) => has(rep && rep.mouDocumentUrl);

export function countDocumentGaps(reps) {
  const list = Array.isArray(reps) ? reps : [];
  return {
    missingLogo: list.filter(r => !hasLogo(r)).length,
    missingMou: list.filter(r => !hasMou(r)).length,
    total: list.length,
  };
}

export function filterByGap(reps, gap) {
  const list = Array.isArray(reps) ? reps : [];
  if (gap === MISSING_LOGO) return list.filter(r => !hasLogo(r));
  if (gap === MISSING_MOU) return list.filter(r => !hasMou(r));
  return list;
}

// What a bulk download could not include, named. `max` keeps the message
// readable when most of the roster is missing an MoU — 46 of 64 on production
// at the time of writing.
export function describeSkipped(selectedReps, max = 4) {
  const list = Array.isArray(selectedReps) ? selectedReps : [];
  const noLogo = list.filter(r => !hasLogo(r)).map(r => r.repName || 'Unnamed');
  const noMou = list.filter(r => !hasMou(r)).map(r => r.repName || 'Unnamed');

  const phrase = (names, what) => {
    if (names.length === 0) return '';
    const shown = names.slice(0, max).join(', ');
    const rest = names.length > max ? `, +${names.length - max} more` : '';
    return `${names.length} had no ${what}: ${shown}${rest}`;
  };

  return [phrase(noLogo, 'logo'), phrase(noMou, 'MoU')].filter(Boolean).join('. ');
}
