// Which REP does a shipment belong to?
//
// Extracted from CourierManagementPage.jsx for the usual reason (that component
// cannot be imported in a test), and for a specific one.
//
// `Shipment.assignment` is declared `on_delete=SET_NULL` (courier/models.py:52),
// so deleting or rebuilding a REP's city assignment silently orphans every
// shipment pointing at it. Both lookups in the page resolved the REP *through*
// that link:
//
//     for (const r of reps) {
//       if ((r.cityAssignments || []).some(a => a.id === s.assignmentId)) ...
//
// With `assignmentId` null nothing matches, so the REP field opens blank and
// handleDownload prints the slip with no logo — while the logo sits untouched
// in the database. Re-uploading it cannot help, because the path from shipment
// to logo is broken at the first step, not the last. Measured on production
// 2026-09-05: 8 of 45 shipments are in that state, the oldest from 7 May, and
// every one of their REPs still exists and still holds its logo.
//
// The shipment already carries `snapRepName`, a snapshot of the org's name
// taken when it was created, and `rep_name` is unique on the model. So when the
// link is gone the name still identifies the org.
//
// The link WINS whenever it resolves: it is the precise answer, it survives a
// rename, and it distinguishes two assignments of the same org. The name is
// only consulted when the link yields nothing, and a blank name matches
// nothing rather than matching the first org with a blank name.
export function findRepForShipment(reps, shipment) {
  if (!Array.isArray(reps) || !shipment) return null;

  for (const r of reps) {
    if ((r.cityAssignments || []).some(a => a.id === shipment.assignmentId)) {
      return r;
    }
  }

  const snapped = (shipment.snapRepName || '').trim().toLowerCase();
  if (!snapped) return null;

  return reps.find(r => (r.repName || '').trim().toLowerCase() === snapped) || null;
}

// The two things the page asks for, so neither caller repeats the fallback.
export function findRepIdForShipment(reps, shipment) {
  const rep = findRepForShipment(reps, shipment);
  return rep ? rep.id : '';
}

// The REP list no longer carries repLogoUrl — it was 17.44 MB of base64 across
// 66 rows, on a page that displays no logo at all (measured 2026-09-07). The
// slip fetches the ONE logo it needs from /reps/<id>/logo/ at print time, so
// this returns what is needed to address it rather than the bytes themselves.
//
// `updatedAt` is part of the answer, not a bonus: it versions the URL, so a
// replaced logo is fetched fresh instead of served from cache.
//
// Returns null when the REP cannot be resolved, or when it has no logo — both
// mean "print without a logo", which is what the slip already did.
export function findRepLogoRefForShipment(reps, shipment) {
  const rep = findRepForShipment(reps, shipment);
  if (!rep || !rep.hasLogo) return null;
  return { id: rep.id, updatedAt: rep.updatedAt };
}
