# Automated coverage for the Phase 2 frontend fixes — 2026-08-21

Fixes #10 (Trials Report stat cards) and #7 (courier delete gate) shipped with
zero coverage, so both still needed manual verification. This is the record of
putting them under test.

## The constraint that shapes everything here

CRA's Jest resolver cannot load react-router-dom v7's exports-only entry, so a
component that imports it — directly or transitively — cannot be imported in a
test at all. `TrialsReport.jsx` and `CourierManagementPage.jsx` both pull
`useNavigate` / `useGrants`. Neither can be rendered.

The pattern already in the tree (`tdsDueDate.js`, `csrContractRules.js`,
`clientTheme.js`, and `paymentAuditTotals.js` written an hour before this) is to
extract the pure logic into its own module and test that. Both fixes follow it.

A pure module alone cannot prove the *wiring* — `computeStats(rows)` and
`computeStats(filteredRows)` are the same call to the module. So each suite also
asserts against the component source text, read with `fs`, which is the only way
to see inside a file Jest cannot import. Those are the tests that actually catch
a regression of the fix itself.

## Status

- [x] #10 Trials Report — stats module + tests
- [x] #7 Courier — delete-permission module + tests
- [x] Full suite green, reverse-check per fix

## #10 — Trials Report summary cards

New: `src/components/reports/trialsReportStats.js`,
`src/components/reports/trialsReportStats.test.js` (9 tests).

`computeStats(rows)` is the four-card `useMemo` body moved out verbatim —
distinct `projectName` count, row count, and the assigned / unassigned split.
`TrialsReport.jsx` now reads `const stats = useMemo(() => computeStats(filteredRows), [filteredRows]);`
and nothing else in the file changed. The PIN-code block was left alone.

Covered: the live 2026-08-21 measurement (2 projects / 2 cities / 1 / 1 for the
full set, 1 / 1 / 1 / 0 filtered to Kota, and the two results asserted to
differ); assigned + unassigned always sums to cities; a row with no REP —
`assigned: false` and `assigned: undefined` — falls to unassigned; distinct
projects rather than rows; unnamed projects collapsing to one bucket the way
the month matrix groups them; empty input giving zeroes not NaN.

Plus three wiring tests reading `TrialsReport.jsx` as text: the call passes
`filteredRows` and never `rows`, the `useMemo` dependency array matches, and
the cards read the four `stats.*` keys.

## #7 — courier delete gate

New: `src/components/courier/courierDeletePermission.js`,
`src/components/courier/courierDeletePermission.test.js` (31 tests).

`canDeleteShipment({ isSuper, canEditCourier, status })` and
`deleteShipmentTooltip(status)`, both lifted verbatim from the JSX gate and
tooltip expression. The rule mirrors `courier/views.py:63-74`, read to confirm
it, not assumed: a super admin soft-deletes any status; everyone else gets
`400 Only Draft shipments can be deleted.`

Covered as a full matrix over the six statuses `STATUS_CONFIG` defines (Draft,
Dispatched, In Transit, Delivered, Returned, Lost): super admin true on every
one, and still true on every one with `canEditCourier: false` — the backend
checks `is_super_admin` on its own, so a module grant must not be able to take
the delete away. Non-super with edit rights: true on Draft, false on all five
non-Draft. No edit rights and not super: false everywhere. Missing/undefined
grants read as absent rather than as permission, and an unknown status is not
a loophole. Tooltip text asserted for both branches.

Plus four wiring tests over the component source: exactly ONE
`onClick={() => handleDeleteShipment(s)}` in the file (a super admin on a Draft
satisfies both the old Draft-only gate and the new one, so two buttons is the
obvious wrong fix), the gate is the shared predicate and not an inline copy,
the control sits after the Dispatched/In Transit block rather than nested in
the Draft-only one, and the status list this suite tests still matches
`STATUS_CONFIG` so a new status cannot escape the matrix.

Note the file's other `<DeleteIcon>` removes an item row inside the shipment
modal, so the shipment delete is counted by its handler, not by the icon.

## Verification

`CI=true npx react-scripts test --watchAll=false`

- Before: 16 suites, 174 tests.
- After: **18 suites, 214 tests, all passing.** +40 tests, nothing regressed.

## Reverse-check

Each fix was backed out, the suite re-run, then restored.

| Backed-out change | Result |
| --- | --- |
| `computeStats(filteredRows)` -> `computeStats(rows)` in TrialsReport.jsx | 2 failed — "stats derives from filteredRows" and "the stats useMemo depends on filteredRows" |
| `canDeleteShipment` early `if (isSuper) return true` removed | 11 failed — super admin on all five non-Draft statuses, plus all six of the without-edit-rights cases |
| delete control moved back inside the `s.status === 'Draft'` block | 2 failed — "exactly ONE delete control per row" and "sits outside the Draft-only block" |

Which tests caught what: the wiring tests carry #10 entirely — the pure
`computeStats` tests pass either way, because the module cannot see which array
the component hands it. That is the honest limit of the extraction pattern and
the reason the source-text tests exist. For #7 it splits: the predicate matrix
caught the permission half (11 failures) and the wiring tests caught the
placement half (2 failures); the tooltip tests passed either way, since the
tooltip was never the bug.

Nothing committed, nothing pushed. `PaymentAuditReport.jsx`,
`paymentAuditTotals.js` and everything under `tta_backend/` untouched —
`courier/views.py` was read only, to confirm the rule the predicate mirrors.
