# FIX_REVIEW — adversarial review of the 2026-08-21 fix wave

Read-only review. No file was modified except this one. No git write commands were run.
`trials/serializers.py` / `trials/tests.py` were read, not edited — another agent owns them.

Severity key: **HIGH** = wrong money / data loss / blocks real work · **MED** = wrong figure or
half-state a user will act on · **LOW** = cosmetic, or a scope/style note.

---

## F1 — N3 opens a route that bypasses BOTH money guards (HIGH)

`tta_backend/backend/payments/serializers.py:261-312`

`PaymentRequest.STATUS_CHOICES` is `Draft / Sent to Accounts / Payment Done / Payment Bounced`
(`payments/models.py:23-28`). The widened condition therefore adds exactly one new reachable
transition: **Bounced → Draft**. The two guards (`bounce_resolved`, retry-exists) are nested under
`if new_status in ('Payment Done', 'Sent to Accounts')` at :264, so **Bounced → Draft skips both**
and still executes `TDSRecord...update(voided=False)` at :312.

Concretely, with a bounce that was already Resolved (`bounce_resolved=True`, frozen history per the
Resolve flow):

1. `PATCH /api/payment-requests/{id}/ {"status": "Draft"}` → 200. The `bounce_resolved` guard never
   runs. The TDS record is un-voided.
2. That record is now `voided=False`, so it re-enters `/api/tds/`, `reports/views.py:_tds()`, and
   `mark_deposited` (which N2 filters on `voided=False`). A deduction for a payment that was
   settled outside the system is now reported to the tax authority.

Same bypass for the retry guard:

1. PR-A (30 000) bounces. Retry PR-B (30 000) is raised on the same WO slot — PR-B books its own
   active TDS record.
2. `PATCH PR-A {"status": "Draft"}` → 200, no guard, PR-A's record un-voids.
3. Two active TDS records now exist for one disbursement — **exactly vector 1/2 that
   `test_04_FIX_vector1...` and `test_05_FIX_vector2...` assert are closed.** The void-on-bounce fix
   is reopened through the Draft door.

N2's own justification in `payments/views.py:277-281` ("a voided record belongs to a bounced payment
request, so no money left the account") is contradicted by N3 un-voiding records for payments that
have not been made.

### F1b — the Draft exit leaves a half-restored state that is not otherwise producible (HIGH)

`serializers.py:149-170` adds `paid_gross_amount` on create **unconditionally, regardless of
status**. So the system invariant is: any non-bounced PR (Draft included) = gross booked **and** TDS
active; bounced = gross reversed **and** TDS voided. The Draft exit restores only half of it.

The comment at :256-260 argues Draft-with-active-TDS is a normal state — true, but Draft-with-active-
TDS-and-*no*-gross-booked is not. The consequence is a second duplicate route:

1. PR 30 000 on a 30 000 WO bounces → `paid_gross_amount = 0`, TDS voided.
2. `PATCH {"status": "Draft"}` → TDS active again, `paid_gross_amount` still 0.
3. The WO now shows 30 000 remaining, so `validate()` (`serializers.py:141-145`) happily accepts a
   **new** 30 000 PR, which books a **second** active TDS record.
4. Move the parked PR back to Payment Done: `old_status` is now `Draft`, not `Payment Bounced`, so
   neither the gross re-add nor either guard runs. Result: a `Payment Done` PR with an active TDS
   record and zero gross booked against the WO, alongside a live duplicate.

`test_14_N3_draft_exit_does_not_re_add_gross` **asserts this half-state as correct**
(`test_tds_flow_map.py:230-243`). It is a test that locks in the divergence.

**Fix direction (not applied):** either move `bounce_resolved` + retry-exists outside the inner `if`
so every exit is guarded, or restore the whole state on the Draft exit (un-void **and** re-add
gross), or leave the Draft exit alone and instead un-void at the point a PR next reaches a paid
status. The current shape is the only one of the three that is inconsistent.

### What N3 got right

- The gross re-add is still reachable only from `new_status in ('Payment Done', 'Sent to Accounts')`
  — byte-for-byte the old condition. No new transition reaches it.
- `new_status` is `validated_data.get('status')`, so a PATCH that omits `status` is `None` and the
  `and new_status` clause correctly skips the whole block.
- Both guards `raise serializers.ValidationError` inside `with transaction.atomic()` (:221) and
  before the un-void at :312, so a blocked `Payment Done` un-bounce genuinely leaves gross **and**
  `voided` untouched. `test_13` verifies this and would fail with the fix backed out. Correct.

---

## F2 — N2 (`mark_deposited`) is correct (no finding)

`payments/views.py:277-286`. `voided=False` now matches `get_queryset()` and `reports/views.py:64`.
`test_15` asserts the voided record stays `Pending` with `deposited_date` NULL and would fail
without the change. Correct as written — its only weakness is that F1 changes *which* records are
voided.

---

## F3 — #1a rejects legitimately distinct cities that share a name (HIGH, will block real work)

`tta_backend/backend/trials/views.py:126-134`

The new twin check is on **name only** — `trial.cities.filter(city_name__iexact=city_name)` — with
no `state` term. India has many same-named cities in different states: Aurangabad (MH / BR),
Bilaspur (CG / HP), Hamirpur (UP / HP), Pratapgarh (UP / RJ), Jamalpur, Rampur…

Input: a project already holding `Aurangabad / Maharashtra`; operator adds
`{cityCode: 'IKF-BR-AUR-001', cityName: 'Aurangabad', state: 'Bihar'}`.
Result: `400 — "Aurangabad is already in this project as IKF-MH-AUR-001."` The trial cannot hold
both. There is no override.

This also contradicts the layer directly above it: `ProjectDashboard.jsx:296-302` de-duplicates the
bulk-add list on **cityName + state**, deliberately allowing the same name under two states. The two
layers now disagree, and the backend is the stricter one.

**Minimum change:** add `state__iexact=state` to the twin filter (and to #1b's `twin_survives`
filter, for symmetry).

---

## F4 — #1a is a check-then-create with no constraint, and the UI adds in parallel (MED)

`trials/views.py:126-140` + `src/components/trials/ProjectDashboard.jsx:320`

`await Promise.all(toAdd.map(cityData => trialsAPI.addCity(id, cityData)))` fires every bulk row
concurrently. The twin check is a plain SELECT followed by a `TrialCity.objects.create()` with no
transaction and no DB uniqueness on `(trial, city_name)`. Two concurrent requests carrying the same
name both read "no twin" and both insert. The duplicate #1a exists to prevent is still creatable
from the product's own bulk-add screen.

Secondary: on a 400 from any single row, `Promise.all` rejects, some rows are already committed, and
the toast is `err.message || 'Some cities failed to add'` — the operator is not told which rows
landed. `loadTrial()` at :331 does at least refresh.

---

## F5 — #1a and #1b normalise differently from the stored value (MED)

`trials/views.py:126-127` and `:180-183` vs `trials/models.py:136-150`

`rep_assignments_blocking_removal` normalises with `.strip().lower()` on **both** sides. The two new
checks compare a `.strip()`ed input against the **raw stored** column via `__iexact` — no `TRIM` on
the DB side. `add_city` stores `data.get('cityName', '')` **unstripped** (`:140`).

Input sequence:
1. `POST cityName="Kota"` → stored `"Kota"`.
2. `POST cityName=" Kota"` (leading space, different code) → the guard compares `"Kota"` against the
   stored `"Kota"`… and stores `" Kota"` unstripped. Wait — this one *is* caught. The failure is the
   reverse order:
   `POST cityName=" Kota"` first → stored `" Kota"`; then `POST cityName="Kota"` → the twin filter
   `city_name__iexact='Kota'` does **not** match the stored `" Kota"` → **201, duplicate created.**
3. REP is assigned to `"Kota"`. Delete the `"Kota"` row: `twin_survives` filters `iexact 'Kota'`,
   which again does not match `" Kota"` → falls through to the blocking helper, which *does* strip →
   `409` forever. **The exact "duplicate city can never be deleted" symptom #1b was written to
   fix, still reproducible.**

Root cause is that the guards do not strip the stored side while the helper does. Either strip on
write, or compare through the same normaliser the helper uses.

---

## F6 — the DELETE path and the bulk PUT path disagree (MED — state is in flight)

`trials/views.py:168-184` has the `twin_survives` relaxation; `trials/serializers.py:230-245`
(as read at review time) still calls `rep_assignments_blocking_removal(instance, doomed)` with no
twin logic and has no duplicate-name rejection on the add side.

So as the code currently stands: `DELETE /trials/{id}/cities/{code}/` removes a duplicate, but the
project-edit PUT that omits the same code still returns 400. The new `DuplicateCityBulkUpdateTests`
in `trials/tests.py` (`test_a_duplicate_can_be_dropped_by_omission`,
`test_two_new_cities_sharing_a_name_are_refused`, …) **assert behaviour that is not in
serializers.py yet** and will fail against the file as read.

Flagged as *in flight*, not as a defect — the serializer is the file another agent is editing. It
does need to land, and when it does, F3 and F5 apply to it identically.

## F6b — a surviving twin silently re-points the assignment at a different row (LOW/MED)

`trials/views.py:180-184`. `twin_survives` proves only that *a* row with that name remains — not
that it is the row the assignment described. Trial holds `Kota / KOT-001` (ground "Mittal ground",
March date) and `Kota / KOT-999` (different date). Delete KOT-001: allowed, because KOT-999
survives. The REP assignment's ground address is now joined, by name, to a city row with a different
schedule. Nothing is orphaned — `find_orphans()` is clean, which is what the tests check — but the
address now describes the wrong row. Unavoidable while the reference is free text
(`.ai/schema-integrity.md`); worth stating rather than implying the delete is lossless.

---

## F7 — #17 makes the Payment Audit totals stop reconciling (MED)

`src/components/reports/PaymentAuditReport.jsx:53-66`

`computeTotals` now excludes bounced rows from `acc.tds` but keeps them in `acc.gross` and
`acc.net`. Those three numbers are rendered side by side (`:644`, `:648`, `:652`), written into the
Excel totals row (`:374`) and into the export summary line (`:332`).

Input: one bounced PR, gross 30 000, TDS 600, net 29 400.
Output: `Gross 30,000 · TDS 0 · Net 29,400`. **Gross − TDS ≠ Net.** An accountant reading the totals
strip, the table total row, or the exported workbook sees a footing error. The old behaviour was
consistent-but-overstated; the new one is understated-and-inconsistent.

Either exclude bounced rows from all three figures, or keep TDS as booked and add a separate
"active TDS" line. Excluding one of three is the one option that cannot be reconciled.

### Does the `status === 'Payment Bounced'` rule match the backend `voided` flag?

Checked against every reachable state:

| PR state | backend `voided` | frontend excludes? | agrees |
|---|---|---|---|
| never bounced | False | no | yes |
| bounced | True | yes | yes |
| bounced → resolved (`bounce_resolved`) | True (resolve does not touch it — `test_bounce_resolve.py:97-99`) | yes (status stays `Payment Bounced`) | yes |
| bounced → un-bounced to Payment Done | False | no | yes |
| bounced → Draft (the F1 route) | False | no | yes |

The rule does agree — with one caveat: **legacy rows**. `void_bounced_tds` is a management command;
any production `Payment Bounced` PR whose record was never voided is included by
`reports/views.py:_tds()` but excluded by the frontend rule, so the two TDS figures served to the
same screen disagree. Confirm the command has been run on prod before trusting either number.

---

## F8 — #7 courier delete gating is correct (no finding)

`src/components/courier/CourierManagementPage.jsx:934-945` vs `tta_backend/backend/courier/views.py:63-70`.

Backend: `if shipment.status != Draft and not is_super_admin(user): 400`. Frontend:
`isSuper || (canEditCourier && s.status === 'Draft')`. Exact mirror.

Control count per row, verified by reading the whole action cell (`:873-948`): the old Draft-only
delete at :898 was removed and the new block sits after the `Delivered` branch but **inside** the
`viewingDeleted ? … : (<>…</>)` false branch (`:885`, `:946`). So — Draft / Dispatched / In Transit /
Delivered / Returned / Lost: exactly one delete icon; **Deleted view: none** (Restore only). Correct.

Pre-existing, not introduced today: the backend gate is `module_permission('courier')` with no
view-vs-edit distinction, so a read-only courier user could still `DELETE` a Draft directly against
the API. The frontend is stricter than the backend here, which is the safe direction.

---

## F9 — #8 `_reread()` is correct (no finding)

`tta_backend/backend/reps/views.py:99-110`. Diagnosis is right: `get_object()` comes off
`get_queryset()` (`:19-21`), which prefetches `city_assignments`; the cache is populated before the
write and `serializer.save()` operates on a separately-fetched instance, so the old response echoed
pre-write data. `_reread` re-fetches with the same prefetches. `get_queryset()` adds no annotations
(`:22-48`), so nothing is lost by not routing through it. `manage_assignment` uses `partial=True`
(`:145`), so the PUT is safe.

The four new tests in `reps/tests.py` all fail with the fix backed out (the cached list would show
the old address / the missing add / the deleted row). None assert the bug.

---

## F10 — scope creep: changes outside the stated fix list (LOW–MED, flag before commit)

None of these were in the brief's change list. They may all be wanted; they should not ship
unannounced, per `feedback_no_unflagged_collateral_changes`.

1. `trials/views.py:141-148` — `ground_location` is now read from the request body instead of
   hardcoded `''`. Nothing sends it, so it is inert today, but it changes what the endpoint accepts
   and it touches the venue-ownership question that
   `project_venue_ownership_decision_2026_08_21` decided should be solved on the **REP** ground
   section, not here.
2. `src/components/rep/REPModal.jsx:614, 1233-1240, 1515-1520` — a new **Ground Name** input in both
   ground sections. This is a feature, not a fix. It is wired correctly (`reps/serializers.py:40-41`
   exposes `groundLocation` → `ground_location`, `partial=True` on the PUT), and it is what the
   venue decision asked for — but it is new UI arriving inside a defect-fix wave.
3. `src/components/trials/TrialManagementPage.jsx:48-70` — full pagination sweep of `trialsAPI.getAll`.
   Real bug, real fix, but unrelated to #1a/#1b. Two notes: the loop is sequential (N round-trips at
   100/page), and if a project is created between pages the offset window shifts, which can
   duplicate one row and silently drop another. The `batch.length === 0` break prevents a spin.
4. `src/components/reports/TrialsReport.jsx:95-107` — `addressOf` switched from substring to
   word-boundary matching. Correct (`norm('Rajkota').includes('kota')` was the bug), and
   `\p{L}\p{N}` with the `u` flag handles Devanagari. Unrelated to #10.
5. `src/utils/csv.js:27-36` and `src/utils/reportExcel.js:188-203` — new throwing shape guards.
   Verified safe: every `csvBlob` caller (`BankManagementPage:141`, `PaymentAuditReport:314`,
   `TrialSpendReport:236`, `TrialsReport:384`, `VendorAuditReport:299`) passes uniform-width rows,
   and an empty `rows` yields `width = 0` with `findIndex` returning `-1`, so no spurious throw.

---

## F11 — the deliberate behaviours were NOT touched (verified clean)

- **Courier `snap_*` frozen snapshots** — no `snap_` field appears anywhere in either repo's diff.
- **Courier address re-reads live in flight, freezes at terminal status** — `courier/views.py` is
  unmodified today; the only courier change is the frontend delete button.
- **The `groundPinCode || pinCode` fallback in `TrialsReport.jsx:180-187`** — the restore is
  justified and the comment's claim checks out: `REPModal.jsx:1188` and `:1487` are both the
  "Trial Ground Location" section heading, and both PIN inputs under them (`:1201`, `:1497`) bind
  `pinCode`. `groundPinCode` exists in the form state (`:93`, `:231`) but **no input writes it**.
  Removing the fallback would blank the PIN on every row that has one. Keeping it is right.
- **`no-rep-status`** — the VendorModal change is vendor status, not REP. `status: isEdit ?
  (vendor?.status || 'Verified') : 'Verified'` (`VendorModal.jsx:210`) is correct: the modal has no
  status control, so the old unconditional `'Verified'` silently re-verified any vendor whose bank
  details were edited.

---

## F12 — smaller notes

- `PaymentManagementPage.jsx:328-338` — `paymentRequestsAPI.patch` **does** exist
  (`src/services/api.js:740-745`), so the PUT→PATCH switch works. Removing the fake `(offline)`
  success toast is a clear improvement: the old code told the user a rejected save had succeeded.
  The N3 guard messages do reach the toast, via `api.js:67-74`, but as
  `"non_field_errors: A replacement payment already exists…"` — the DRF key is not stripped. Cosmetic.
- `PaymentRequestModal.jsx:695, 703, 845` — the three N6 strings now match the void-on-bounce
  behaviour. Accurate. One residual: the bold lead-in on `:845` still reads **"TDS already
  deducted"** before the sentence that says the deduction was cancelled — a reader who scans only
  the bold text takes away the opposite of the message.
- `TrialsReport.jsx:225` (`projectName` `'—'` → `''`) and `:481`/`:568` (`{p || '—'}`) — correct
  separation of data from display; both the matrix key and the Set key behave identically to before.
- `TrialsReport.jsx:335-343` (#10) — stats now derive from `filteredRows`, matching the table, the
  month matrix and the exports. Correct, and it would visibly regress if backed out.
