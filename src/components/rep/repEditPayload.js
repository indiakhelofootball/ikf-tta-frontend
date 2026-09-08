// What the EDIT screen sends when Save is pressed.
//
// Extracted so the rule can be unit-tested: REPModal.jsx imports MUI and
// react-router-dom and cannot be imported under Jest in this repo. Same reason
// ./repMergePayload sits beside it for the add screen.
//
// TWO RULES, BOTH ABOUT THE SAME BOUNDARY
//
// 1. ADDING A CITY IS NOT AN ORG EDIT, even from this screen.
//
//    The edit screen carries an "Assign New Trial" panel, so a city can be added
//    here. That goes through repAPI.addAssignment -- the city layer, correct.
//    But Save then PUT the whole org unconditionally, so adding a city rewrote
//    every org field.
//
//    Normally the values round-trip from the record and the content is
//    unchanged, which is why this was invisible. It is still a write:
//    `updated_at` moves, and anything the server normalises lands for real --
//    `validate_phone` strips to ten digits, so a stored "+91 98765 43210" comes
//    back as "9876543210" on a save where the operator only added a city.
//
//    So the org is PUT only when an org field actually changed.
//
// 2. REMOVING A LOGO OR MoU HAS TO REACH THE SERVER.
//
//    The trash icons cleared local preview state and nothing else. Save then
//    omitted the field -- correct behaviour for "no new file chosen", and the
//    reason a logo survives an ordinary edit -- so the stored file stayed. The
//    operator watched it disappear and it came back on reload: a silent no-op,
//    the same shape as the payment statuses that reported success and saved
//    nothing.
//
//    A removal is now an explicit blank, which the server honours on this path
//    (`_submitted_attrs` keys off payload presence, so a sent '' clears).
//    A blank is only ever sent when the operator actually pressed remove; an
//    untouched attachment is still omitted and still preserved.

// Compare the form against the record as it was loaded. Booleans and strings
// only -- every orgData field is one or the other.
export function orgDiffers(current, baseline) {
  const a = current || {};
  const b = baseline || {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? '') !== (b[k] ?? '')) return true;
  }
  return false;
}

/**
 * The body for PUT /reps/<id>/, or null when there is nothing to write.
 *
 * @param {object}  orgData    the form
 * @param {object}  baseline   orgData as it was seeded from the record
 * @param {object}  files      { mouDocument, mouDocumentPreview, repLogo, repLogoPreview }
 * @param {object}  cleared    { mou, logo } -- the operator pressed remove
 */
export function buildEditModePayload(orgData, baseline, files = {}, cleared = {}) {
  const { mouDocument, mouDocumentPreview, repLogo, repLogoPreview } = files;
  const mouCleared = !!cleared.mou && !mouDocument;
  const logoCleared = !!cleared.logo && !repLogo;

  const touched = orgDiffers(orgData, baseline)
    || !!mouDocument || !!repLogo || mouCleared || logoCleared;

  // Nothing about the org changed. Any city work on this screen has already been
  // saved through its own endpoint, so there is no reason to write the row that
  // every other city assignment reads.
  if (!touched) return null;

  const payload = { ...(orgData || {}) };

  // A new file replaces; a removal blanks; an untouched attachment is omitted so
  // the stored value is preserved.
  if (mouDocument) {
    payload.mouDocumentName = mouDocument.name;
    payload.mouDocumentUrl = mouDocumentPreview;
  } else if (mouCleared) {
    payload.mouDocumentName = '';
    payload.mouDocumentUrl = '';
  }

  if (repLogo) {
    payload.repLogoName = repLogo.name;
    payload.repLogoUrl = repLogoPreview;
  } else if (logoCleared) {
    payload.repLogoName = '';
    payload.repLogoUrl = '';
  }

  return payload;
}
