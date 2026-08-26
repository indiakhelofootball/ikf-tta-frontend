# Silent-save audit — 2026-08-21

Scope: every `.update()` / `.updateAssignment()` / `.setUserPermissions()` call site in `src/`, cross-referenced against `src/services/api.js` method definitions (PUT vs PATCH) and the matching Django serializer's required fields. Read-only audit, no code changed.

## Method inventory — `src/services/api.js`

| API | `update` verb | `patch` exists | Notes |
|---|---|---|---|
| `trialsAPI` | PUT (261) | yes (268) | `update` has **no caller anywhere in `src/`** — dead code, confirmed by grep. Every screen uses `.patch`. |
| `repAPI` | PUT (333) | no | `updateAssignment` also PUT (356), no patch variant |
| `trialCitiesAPI` | PUT (393) | no | Page is unreachable — see below |
| `vendorsAPI` | PUT (452) | yes (461), plus `updateBankDetails` PATCH (471) | |
| `permissionsAPI` | `setUserPermissions` PUT (508) | n/a | Documented as a full-replace by design |
| `paymentsAPI` | PUT (594) | no | No call site found anywhere in `src/` — dead code |
| `configAPI` | PUT (630) | no | No call site found in components (checked `adminStorage.js`/config screens — none call `configAPI.update`) |
| `workOrdersAPI` | PUT (690) | no | |
| `paymentRequestsAPI` | PUT (733) | yes (740) | **The confirmed live bug** |
| `courierAPI` | **PATCH** (832) | n/a | Already correct — not PUT |
| `csrCrud` factory (projects/activities/reports/workOrders/deliverables/expenseTags/clientUsers/contacts/branding) | PUT (912) | no | |

## Confirmed bug (already live-verified, restated for completeness)

`src/components/payments/PaymentManagementPage.jsx:328-338`, `handlePaymentUpdate` — calls `paymentRequestsAPI.update(prId, updates)` (api.js:733, PUT) with a genuinely partial `updates` object (e.g. `{status: 'Payment Bounced'}`). `payments/serializers.py:28` `PaymentRequestSerializer` declares `workOrderId`, `vendorId`, `grossAmount`, `invoiceDate` with no `required=False`/`default` — all required on a non-partial validation. `payments/views.py` `PaymentRequestViewSet` (line 48) does **not** override `update()`, so it runs DRF's default `ModelViewSet.update`, which is non-partial on PUT. Result: 400, caught by the bare `catch` at line 333, applied to local React state only, `showToast('Payment request updated (offline)')`.

`handlePaymentDelete` (`:340-350`) has the identical swallow-and-lie shape for deletes.

**Severity: confirmed identical bug.**

## Second occurrence found — same UX pattern, different mechanism

`src/components/bank/BankManagementPage.jsx:231-252`, `markTDSDeposited` — calls `tdsAPI.markDeposited(month)` (api.js:795), which is a **POST**, not a PUT/PATCH update. Backend: `payments/views.py:268-283` `mark_deposited` — the only way it 400s is `if not month`, which the caller (`markTDSDeposited(month)`) always supplies from a UI-selected value. The catch block (`:242-250`) swallows any failure, mutates `tdsRecords` locally, and shows `"TDS for ${month} marked as deposited (offline)"` — worded as soft-success exactly like the payments bug.

This is **not the partial-PUT bug** — there is no serializer required-field mismatch here, and in practice `month` is never missing from this call site, so the failure path is close to unreachable under normal use (network drop, 500, expired-session-mid-request). But it is the same swallow-and-lie *pattern*: a real failure (whatever triggers it) becomes a false "(offline)" success toast with no logged error, and the local TDS record would silently diverge from the DB exactly like the payments case did.

**Severity: same shape but different root cause — not the identical bug, but the same misleading catch-and-lie pattern; low likelihood of triggering because the request body sent is always complete.**

`BankManagementPage.jsx` is otherwise clean: `markDone` (:180), `markBounced` (:194), `handleBounceEdit` (:210-222), `handleStatusCorrection` (:257-268) all correctly use `paymentRequestsAPI.patch()` and surface real errors via `showToast(..., 'error')` with `console.error`. No other swallow found in this file.

## Every other `.update()` call site — checked, not applicable

All of the following show the real error message on failure (`showToast(error.message, 'error')` or equivalent) and do **not** mutate local state or claim success in the catch block — so even where the payload happens to be partial, the user is never lied to:

- `src/components/rep/REPManagementPage.jsx:204` — `repAPI.update(editingREP.id, repData)`. `repData` comes from the full edit form (`REPModal`'s `onSave`), a complete object. Error surfaced at `:212-214`.
- `src/components/workorders/WorkOrderManagementPage.jsx:285` — `workOrdersAPI.update(editingWO.id, data)`, full form payload, error surfaced at `:294-295`.
- `src/components/vendors/VendorManagementPage.jsx:151` — `vendorsAPI.update(vendorId, vendorData)`, full form payload, error surfaced at `:160-162`.
- `src/components/rep/REPModal.jsx:491` and `:671` — `repAPI.updateAssignment(...)`, spreads `...editAssignmentData` (the full assignment object being edited) plus courier fields; even if this were partial, `reps/views.py:131` `manage_assignment` explicitly constructs `REPCityAssignmentSerializer(assignment, data=request.data, partial=True)` regardless of HTTP verb — the backend forces partial handling on this one PUT route by design, so a partial body cannot 400 here. Errors are surfaced via `setFileError(error.message ...)` at `:681` (and REPModal's other catch).
- `src/components/permissions/PermissionsManagementPage.jsx:241` — `permissionsAPI.setUserPermissions(selectedUser.id, grants)` sends the full `grants` state object (a full-replace by explicit design, per the api.js comment). Error surfaced at `:249-250`.
- `src/components/courier/CourierManagementPage.jsx:619` — `courierAPI.update(editingId, { notes: fNotes, items: fItems })` — the payload genuinely is partial, but `courierAPI.update` itself sends **PATCH** (api.js:832-836), not PUT, so DRF partial semantics apply correctly. Error surfaced at `:630-631`.
- `src/components/csr/CSRProjectManagementPage.jsx:117`, `CSRBrandingPage.jsx:74`, `CSRProjectDetailPage.jsx:104/139/174`, `CSRContractManagementPage.jsx:86/149` — all `csrAPI.<resource>.update(id, body)` where `body` is `{...payload, projectId/workOrderId: ...}`, i.e. the complete form payload plus an id, not a partial patch. All surface `notify(e.message || 'Save failed.', 'error')` on failure; the contract/deliverable pages additionally map field-level 400s into `serverErrors` for the form.
- `src/components/trialCities/TrialCitiesPage.jsx:154` and `:236` — `trialCitiesAPI.update(...)`. `:154` passes `cityData` (full modal form state); `:236` (`handleReverifyCity`) explicitly spreads `...city` (the complete existing record) plus one new field, so genuinely complete. Both catch blocks show real errors and re-throw/keep the modal open — no swallow. **Additionally, this entire page is unreachable**: `src/App.js:22` comments `// TrialCitiesPage removed — city management merged into trial creation/edit flows`, confirmed live in the parallel test run (direct nav to `/trial-cities` bounces to `/dashboard`). Not applicable regardless of payload shape.

`trialsAPI.update` and `paymentsAPI.update` (both PUT) have **zero callers** anywhere in `src/` — confirmed by grep across `.js`/`.jsx`. Dead code, no blast radius. `configAPI.update` likewise has no call site in any component.

## Verdict

The confirmed silent-failure defect — a partial-object PUT rejected by a required-fields serializer, swallowed by an empty catch, and reported to the user as a success — is real in exactly **one place**: `paymentRequestsAPI.update` as called from `PaymentManagementPage.handlePaymentUpdate` and `handlePaymentDelete`, which is the entire write surface for payment-request status transitions and deletes outside the Banking screen (TC-PAY-03 through TC-PAY-08). It is not a systemic pattern across the API layer: every other resource's `update()` call site either sends a genuinely complete payload, is routed through a PATCH endpoint, is backed by a view that forces partial handling regardless of verb, or has no caller at all. The one additional swallow-and-lie catch block found (`BankManagementPage.markTDSDeposited`) shares the misleading-toast pattern but not the partial-PUT mechanism, and its failure path is effectively unreachable under normal use since the request body it sends is always complete. Net blast radius: one page, two handlers (update + delete), not a codebase-wide defect.
