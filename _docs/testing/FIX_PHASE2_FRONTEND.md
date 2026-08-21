# Phase 2 — frontend fixes, 2026-08-21

Scope: three files only.
- `src/components/reports/PaymentAuditReport.jsx` (#17)
- `src/components/reports/TrialsReport.jsx` (#10 + stale comment)
- `src/components/courier/CourierManagementPage.jsx` (#7)

No commits. No backend. Progress appended per fix as it lands.

## Status

- [x] #17 Payment Audit — bounced TDS excluded from totals
- [ ] #10 Trials Report — summary cards from filteredRows
- [ ] stale Venue comment corrected
- [ ] #7 Courier — super admin delete on any status
- [ ] `npm test -- --watchAll=false` green (165 baseline)

## #17 — Payment Audit double-counted bounced TDS

`src/components/reports/PaymentAuditReport.jsx`

Backend `reports/views.py:61-64` already serves TDS records with
`voided=False`; the screen never used that. `computeTotals` summed
`p.tdsAmount` over every payment request in the filtered view, bounced ones
included, so a bounce that is later re-raised counted twice.

Change: added `isBouncedPayment` (status === 'Payment Bounced') and made the
TDS accumulator in `computeTotals` skip those rows. Gross and Net keep the
as-booked row values — only TDS was double counted, and only TDS moved.

`computeTotals` is the single source for the totals strip, the table TOTAL
row and the Excel totals row, so all three follow from the one edit. Per-row
TDS cells and the per-row export column still show what was booked on that
request; only the cumulative figures changed.

## #10 / TC-RPT-04 — Trials Report summary cards ignored the filters

`src/components/reports/TrialsReport.jsx`

`stats` (PROJECTS / TRIAL CITIES / ASSIGNED / UNASSIGNED) was a `useMemo` over
`rows` while the table, the month matrix and the exports all read
`filteredRows`. Filtering to "Kota" narrowed the table 2 projects -> 1 and the
matrix followed; the cards stayed 2/2/1/1.

Change: `stats` now derives from `filteredRows` (dependency array updated to
match). Nothing else moved — the filter logic itself is untouched.

## Stale Venue comment (same file, was ~246-259)

The comment claimed the Venue column could never fill because both
`groundLocation` sources are unwritable. Verified both claims are now false:

- `tta_backend/backend/trials/views.py:133` — `add_city` stores
  `ground_location=data.get('groundLocation', '') or ''`, no longer hardcoded.
- `src/components/rep/REPModal.jsx:1234-1238` — a "Ground Name" input bound to
  `assignmentData.groundLocation`, helper text naming the Trials Report.

Comment rewritten to describe the real state: the REP city assignment is the
live source, `TrialCity.ground_location` is a fallback nothing sends yet, the
trialcities catalogue is still a different model, and a blank cell now means
nobody typed a Ground Name. The code the comment describes is unchanged.

NOT touched: the `groundPinCode || pinCode` fallback block and its comment
(~175-187), per instruction.

## #7 / TC-CUR-06 — super admin could not delete a dispatched shipment

`src/components/courier/CourierManagementPage.jsx`

The delete IconButton lived inside the `s.status === 'Draft'` block and was
gated on `canEditCourier`, so no delete existed on Dispatched / In Transit /
Delivered / Returned rows for anyone, super admin included — even though the
backend already supports it: `courier/views.py:63-74` soft-deletes any status
for a super admin and refuses non-Draft for everyone else, with the restore
endpoint and the Deleted view (already super-admin-only, line 785) behind it.

Change: removed the delete control from the Draft-only block and rendered one
delete control per row, after the status blocks, gated
`isSuper || (canEditCourier && s.status === 'Draft')`. That mirrors the
backend rule exactly and keeps exactly one delete button on a row (a super
admin viewing a Draft would otherwise have seen two).

Confirm behaviour unchanged: it still calls the existing
`handleDeleteShipment`, which already had both confirm strings — the draft
wording and the non-draft "Delete shipment X (Status)? ... archived, can be
restored" wording. No new `window.confirm` chain was introduced.
Tooltip is "Delete draft" on a Draft, "Delete shipment (Status) — super admin"
otherwise. The Deleted view branch (PDF + Restore) is untouched.

## Verification

`CI=true npx react-scripts test --watchAll=false` (plain `npm test --
--watchAll=false` hung under the background runner) —
**15 suites, 165 tests, all passing.** Same as the 165 baseline; no suite
covers these three screens directly, so the run proves no regression rather
than proving the fixes.

Diff is confined to the three files. Nothing committed, nothing pushed, no
backend file touched — backend was read only, to confirm the endpoints and
gates the frontend now relies on.
