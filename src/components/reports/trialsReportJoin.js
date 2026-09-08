// How the Trials Report attaches a REP city assignment to a row of the table.
//
// Extracted from TrialsReport.jsx so the rule can be unit-tested, the same
// reason trialsReportStats.js and paymentAuditTotals.js live beside it.
//
// THE BUG THIS EXISTS TO CLOSE
//
// The join key was `${trialId}||${city}`. State was never in it, while the
// backend's identity rule for a trial city is name + state (`city_identity`,
// trials/models.py) and `add_city` deliberately permits Aurangabad/Maharashtra
// and Aurangabad/Bihar inside one project. When it does, both report rows
// resolved to the same map entry and the Bihar row printed Maharashtra's REP,
// address, map link and PIN. Confidently, with no sign anything was wrong.
//
// WHY THIS IS NOT SIMPLY `key + state`
//
// Adding state to the key unconditionally would have been the one-line fix and
// would have blanked live data: an assignment whose state is empty, or spelled
// differently from the trial city's, stops matching and its address disappears
// from the report. Addresses going missing from this exact column is the
// complaint the report has been carrying for months.
//
// So state DISAMBIGUATES rather than keys:
//
//   1. an exact (trial, city, state) match wins;
//   2. failing that, a (trial, city) match is used wherever the project lists
//      that city name once — which is every row on every project that has no
//      duplicate city name at all;
//   3. where it IS ambiguous and the state does not match, nothing is returned.
//      The row shows no address instead of another state's address, and the
//      assignment surfaces in the orphan list, which is visible and repairable.
//
// Rule 2 is what keeps every currently-working row working: with no same-named
// city there is nothing to confuse, so a blank or misspelt state costs nothing.

export const norm = (s) => (s || '').trim().toLowerCase();

const looseKey = (trialId, city) => `${trialId}||${norm(city)}`;
const exactKey = (trialId, city, state) => `${trialId}||${norm(city)}||${norm(state)}`;

const emptyEntry = () => ({
  reps: [], physicalAddress: '', googleMapLink: '',
  groundLocation: '', groundPinCode: '',
});

// First non-empty value wins, matching the previous behaviour: a second REP on
// the same city adds a name, not a competing address.
const absorb = (entry, rep, a) => {
  entry.reps.push(rep.repName);
  if (!entry.physicalAddress && a.physicalAddress) entry.physicalAddress = a.physicalAddress;
  if (!entry.googleMapLink && a.googleMapLink) entry.googleMapLink = a.googleMapLink;
  if (!entry.groundLocation && a.groundLocation) entry.groundLocation = a.groundLocation;
  // Prefer groundPinCode, fall back to pinCode. Both PIN inputs on the REP form
  // sit under the "Trial Ground Location" heading and write pinCode
  // (REPModal.jsx:1487 heading, :1497 and :1201 inputs); nothing anywhere writes
  // groundPinCode. So pinCode IS the ground PIN the operator typed -- 51
  // assignments carry it, 0 carry groundPinCode. Dropping the fallback blanks
  // the PIN on every row that has one, with no UI to restore it.
  if (!entry.groundPinCode && (a.groundPinCode || a.pinCode)) {
    entry.groundPinCode = a.groundPinCode || a.pinCode;
  }
};

/**
 * Build the lookup used by both the table and the orphan list.
 *
 * @param {Array} trials  as returned by the report endpoint (assignedCities carries state)
 * @param {Array} reps    as returned by the report endpoint (cityAssignments carries state)
 */
export function buildCityAssignmentIndex(trials, reps) {
  // A (trial, city) pair is ambiguous when, and ONLY when, the project lists
  // that city name more than once. That is the single situation in which a
  // name-only match can attach one city's REP and address to another's row.
  //
  // Assignments disagreeing about the state is NOT ambiguity, and treating it as
  // ambiguity was a defect in the first version of this file. Measured: one
  // project listing one Kota, with REP A on state "Rajasthan" and REP B on
  // "RAJ" -- ordinary data-entry variance -- split into two buckets. The row
  // kept only REP A, lost REP B's name AND its address, and reported B as an
  // orphan. That is the "address missing from the Trial Report" complaint,
  // reintroduced by the code meant to fix it. With one city of that name on the
  // project there is nothing to confuse, so every assignment for it belongs to
  // that row however its state is spelt.
  const trialNameCounts = new Map();
  const knownExact = new Set();
  const knownLoose = new Set();

  (trials || []).forEach((t) => {
    (t.assignedCities || []).forEach((c) => {
      const lk = looseKey(t.id, c.cityName);
      trialNameCounts.set(lk, (trialNameCounts.get(lk) || 0) + 1);
      knownExact.add(exactKey(t.id, c.cityName, c.state));
      knownLoose.add(lk);
    });
  });

  const ambiguous = new Set();
  trialNameCounts.forEach((count, lk) => { if (count > 1) ambiguous.add(lk); });

  const byExact = new Map();
  const byLoose = new Map();
  (reps || []).forEach((r) => {
    (r.cityAssignments || []).forEach((a) => {
      const ek = exactKey(a.trialId, a.city, a.state);
      const lk = looseKey(a.trialId, a.city);
      if (!byExact.has(ek)) byExact.set(ek, emptyEntry());
      if (!byLoose.has(lk)) byLoose.set(lk, emptyEntry());
      absorb(byExact.get(ek), r, a);
      absorb(byLoose.get(lk), r, a);
    });
  });

  return { byExact, byLoose, ambiguous, knownExact, knownLoose };
}

/** The assignment for one row of the table, or undefined.
 *
 * Order matters, and getting it wrong was the second half of the same defect.
 * Preferring an exact state match FIRST split a single city's REPs across two
 * buckets whenever their states were spelt differently: the row kept the REP
 * whose spelling happened to match the trial city and silently dropped the
 * other one's name and address.
 *
 * So the name-only bucket -- which merges every assignment for the city, exactly
 * as the report always did -- is used unless the project genuinely lists that
 * city name twice. Only then does the state have to match, because only then is
 * there another row for the data to land on by mistake.
 */
export function resolveAssignment(index, trialId, city, state) {
  const lk = looseKey(trialId, city);
  if (!index.ambiguous.has(lk)) return index.byLoose.get(lk);
  return index.byExact.get(exactKey(trialId, city, state));
}

/**
 * True when the trial still lists the city this assignment points at, under the
 * same resolution rules. Anything else is an orphan: its address reaches no row.
 */
export function assignmentIsReachable(index, assignment) {
  const { trialId, city, state } = assignment;
  if (index.knownExact.has(exactKey(trialId, city, state))) return true;
  const lk = looseKey(trialId, city);
  if (index.ambiguous.has(lk)) return false;
  return index.knownLoose.has(lk);
}
