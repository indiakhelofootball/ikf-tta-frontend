// Summary-card figures for the Trials Report.
//
// Extracted from TrialsReport.jsx so it can be tested: that component imports
// react-router-dom, which CRA's Jest resolver cannot load, so anything left
// inside it is untestable. Same reason paymentAuditTotals.js, tdsDueDate.js and
// csrContractRules.js are separate modules.
//
// This is the "summary cards ignore the filters" report. The four cards were a
// useMemo over `rows` while the table, the month matrix and both exports read
// `filteredRows`. Measured live: filtering to "Kota" narrowed the table from 2
// projects to 1 and the matrix followed, while the cards stayed at 2/2/1/1.

// One row per (trial, city). `assigned` is already computed on the row as
// "this trial city has at least one REP", so a row with no REP falls to
// unassigned without this having to re-derive the join.
export const computeStats = (rows) => ({
  projects: new Set(rows.map((r) => r.projectName)).size,
  cities: rows.length,
  assigned: rows.filter((r) => r.assigned).length,
  unassigned: rows.filter((r) => !r.assigned).length,
});
