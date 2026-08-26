# Code-level re-verification — 2026-08-21

Read-only source review, no servers touched, no live run. Covers the
still-unconfirmed modules the live-run session didn't reach: Vendors, User
Management, Work Orders, TC-ADR cross-cutting, TC-CFG-04/05. Method: open
the actual file, quote file:line, confirm or correct the doc's verdict from
`tc_sections.html` (recovered from the interrupted session's scratchpad,
`…/2231773a-438b-4a7b-8387-de75daaf27ce/scratchpad/tc_sections.html`).

## Vendors

- **TC-VEN-01 (create a vendor) — CONFIRMED should-pass.**
  `src/components/vendors/VendorModal.jsx` builds the full 22-field form,
  `validate()` (:184-200) covers PAN/GST/phone/email/IFSC/PIN formats, and
  `handleSubmit` (:202-220) posts through `onSave`. No structural blocker
  found in the create path itself.

- **TC-VEN-02 (vendor picker caps at first 15 matches) — CORRECTED: the
  defect is real but the component is dead code, unreachable from the app.**
  `src/components/vendors/VendorSearchDialog.jsx:60` does
  `return filtered.slice(0, 15);` against a pool ordered newest-first
  (`vendors/models.py:71`, `ordering = ['-created_at']`), so the cap is real
  and would strand older vendors exactly as the doc says — **if this
  component were ever rendered.** It is not: `grep -rn "VendorSearchDialog"
  src` finds it only inside its own file (the export line) — no import
  anywhere else, not even `vendors/index.js` (which exports only
  `VendorManagementPage`). The vendor picker actually used when raising a
  work order is a different component,
  `src/components/workorders/WorkOrderModal.jsx:449-469`, an `Autocomplete`
  whose `filterOptions` does `startsWith` then falls back to `includes`
  across `allVendors` with **no slice, no cap** — it searches the whole
  vendor table. Same story inside `VendorModal.jsx`'s own "Add Vendor" name
  search (:280-317) — filters `filteredVendors` with no cap either.
  Net effect: an old vendor is reachable everywhere a vendor is actually
  picked in this build. TC-VEN-02 should be reclassified — the doc's
  "known defect" is accurate about `VendorSearchDialog.jsx` in isolation but
  wrong about user-facing impact, since nothing routes to it.

- **TC-VEN-03 (status forced to Verified on every save) — CONFIRMED
  defect.** `VendorModal.jsx:202-211`, `handleSubmit`:
  ```
  const data = { ...formData, ..., status: 'Verified' };
  ```
  Unconditional — set the same way whether creating or editing, with no
  branch reading the vendor's prior status. Editing only the phone number
  (TC-VEN-03's literal scenario) silently flips status back to Verified if
  it had been anything else.

- **TC-VEN-04 (no PAN/name uniqueness) — CONFIRMED defect, both ends.**
  Frontend `validate()` (`VendorModal.jsx:184-200`) only regex-checks PAN
  format, never checks it against `vendors` prop for a duplicate. Backend:
  `vendors/models.py:40`, `pan_number = models.CharField(max_length=10)` —
  no `unique=True`, no `unique_together`. `vendors/serializers.py:99-107`,
  `validate_panNumber` only checks format
  (`re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', ...)`), no DB lookup for an
  existing row with the same value. Two vendors with the same PAN save
  cleanly on both layers.

- **FreeSolo Autocomplete silently drops a typed name without Enter —
  CONFIRMED.** `VendorModal.jsx:280-350`, the "Add Vendor" name field:
  `Autocomplete freeSolo`, `onChange` (:290-304) is the only place
  `confirmedVendorName`/`formData` get set from typed text, and MUI only
  fires `onChange` for freeSolo on Enter or an explicit option pick — there
  is no `onBlur` handler here (the `onInputChange` on this same Autocomplete
  is not wired at all; contrast the City field two components down, which
  does use `onInputChange` to commit live). Type a new name and click
  straight into the next field: `confirmedVendorName` stays `''`,
  `formActive` (:63) stays false, the whole form section stays
  `disabledSx` (:398), and Save is disabled (:598,
  `disabled={saving || !formActive}`) with no visible error explaining why.

## Work Orders

- **TC-WO-02 (project_ref is free text, no FK) — CONFIRMED, independent of
  the dead agent's DB claim.** `workorders/models.py:26`,
  `project_ref = models.CharField(max_length=255, blank=True, default='')`
  — no FK, no choices. Frontend: `WorkOrderModal.jsx:844-850`, the Project
  field is `Autocomplete freeSolo` with
  `onInputChange={(_, val) => setForm((p) => ({ ...p, projectRef: val || '' }))}`
  — every keystroke writes straight into `form.projectRef`, no validation
  against `projectOptions` before save. A typo'd or fictional project name
  saves without complaint, matching the dead agent's `'Totally Fake
  Nonexistent Project Xyz123'` DB observation via an independently-read code
  path.

- **TC-WO-03 (TDS Type box writes tds_comment, not tds_type) — CONFIRMED,
  independent of the dead agent's DB claim.** Backend:
  `workorders/models.py:46-47` —
  `tds_type = models.CharField(...)` and `tds_comment = models.CharField(...)`
  are two separate columns. Frontend: the box labelled "TDS Type / Section"
  (`WorkOrderModal.jsx:779-785`) is bound to `form.tdsComment` —
  `value={form.tdsComment}` / `onChange={(e) => set('tdsComment', e.target.value)}`
  — which round-trips to `tdsComment` in the save payload (:330,
  `tdsComment: form.tdsComment || ''`). The actual `tdsType` field is
  populated elsewhere, read-only, from the vendor's own type
  (`:328, tdsType: v.tdsType || ''`, and displayed at :933 as
  `selectedVendor.tdsType`) — the user never writes to it. Matches the dead
  agent's `tds_comment='TC-Fork-TDS-comment-test'` finding through the code
  path rather than the DB row.

- **TC-WO-04 (delete blocked when payments exist) — CONFIRMED should-pass.**
  `workorders/views.py:82-97`, `destroy()` catches `ProtectedError` from the
  DB-level FK protection and returns 409 with an explanatory message. Real
  protection, not just a UI-level gate.

- **TC-WO-05 (edit project/city after payments exist) — CONFIRMED
  should-pass.** No code path found that locks `project_ref`/`project_city`
  once `payment_requests` exist — both are plain `CharField`s updated the
  same way regardless of the WO's payment history.

## User Management (`PermissionsManagementPage.jsx` — this page's own title
is literally "User Management")

- **TC-USR-01/02 — CONFIRMED should-pass.** Create + single-module grant:
  `submitCreate` (:164-200) creates the login then lands the admin straight
  on the new user's grant grid. Dependency read-through: backend
  `permissions/registry.py:77-119`, `read_dependents()` — "a grant on a
  module also unlocks READ ... on the modules it depends on
  (enforced in ModulePermission via read_dependents(); see
  enforcement.py)" — confirms granting Payments alone gives read access to
  whatever Payments' screen needs to render (e.g. vendors), matching the
  doc's claim.

- **TC-USR-03 — CONFIRMED should-pass, and this file's own comment agrees
  with the doc's framing ("the only part of the system with a real change
  history").** `permissions/models.py:82-103`, `GrantChangeLog` — one row
  per grant save, `actor`/`actor_email`, `target`, per-module before/after,
  `source` (DIRECT vs REQUEST). Frontend Audit tab
  (`PermissionsManagementPage.jsx:708-770`) renders exactly that: actor,
  target, before → after per module, paginated.

- **TC-USR-04 (no change-log on REP/town/vendor/project tables) —
  CONFIRMED, with a scope caveat worth stating precisely.** The system does
  have one real audit trail — `GrantChangeLog` above — but it is scoped
  exclusively to permission grants (who was given/denied which module).
  `grep -rniE "history|audit|changelog|simple_history" reps/models.py
  trialcities/models.py vendors/models.py trials/models.py` returns nothing,
  and no `django-simple-history`-style app is installed anywhere in
  `INSTALLED_APPS`. There is no field anywhere in those four apps'
  `models.py` recording who last touched a row or when a value changed
  (only the generic `created_at`/`updated_at` timestamps, which don't say
  *what* changed or *who* changed it). "Who cleared a REP's address" is
  unanswerable from the DB as the doc says.

## TC-ADR cross-cutting

- **TC-ADR-05 (venue field impossible before a REP is assigned) —
  CORRECTED: was true, is now partially fixed, and the remaining gap is
  genuinely structural, not missing UI.** The doc and the stale comment in
  `TrialsReport.jsx:249-250` both say "REPModal renders no input bound to
  it, in either add or edit mode" — that is now **out of date**. The 21 Aug
  fix (visible in git status as an uncommitted change to `REPModal.jsx`)
  added a real "Ground Name" field bound to `groundLocation` in both modes:
  add mode at `REPModal.jsx:1234-1239` (`helperText="What the venue is
  called. This is the Venue column on the Trials Report"`) and edit mode via
  the shared `renderGroundSection()` at `:1516-1520`. So a venue name *can*
  now be typed through the UI. What remains structurally true: `ground_location`
  lives only on `REPCityAssignment` (`reps/models.py:90`), the REP↔trial↔city
  join row — there is no independent "venue" entity. The add-mode ground
  fields are gated by `canFillForm = isEditMode || cityInProject`
  (`REPModal.jsx:690`), meaning you fill them in as part of the same
  submit that creates the assignment — you cannot save a venue for a city
  with nobody assigned, because there is no row to attach it to until a REP
  is being assigned there. That part is a real schema constraint, not a
  missing textbox.

- **TC-ADR-06 (three tables hold "ground location") — CONFIRMED, and the
  current code's own comments already document this precisely** (worth
  reading verbatim: `TrialsReport.jsx:238-260`). The three:
  1. `REPCityAssignment.ground_location` (`reps/models.py:90`) — writable via
     serializer, now has a real UI input as of the 21 Aug fix (see TC-ADR-05
     above). **This is the one the Trials Report reads**
     (`TrialsReport.jsx:260`, `location: (assignment && assignment.groundLocation) || c.groundLocation || ''`).
  2. `TrialCity.ground_location` (`trials/models.py:112`, per-project city) —
     never written: `trials/views.py:127` (`add_city`) hardcodes
     `ground_location=data.get('groundLocation', '') or ''` at creation but
     nothing ever calls it with a value, and the update path,
     `city_detail` PATCH (`trials/views.py:163-173`), only accepts
     `region`/`tentativeMonth`/`tentativeDate`/`confirmed` — `groundLocation`
     is not in that whitelist, so it can never be edited after creation
     either. Permanently blank in this build.
  3. `TrialCityLocation.ground_location` (`trialcities/models.py:19`) — the
     standalone city catalogue behind the *removed* `/trial-cities` route
     (per the 21 Aug live-run finding on TC-TWN). Its own "Ground Location"
     field is a completely different model that nothing copies into
     `TrialCity` or `REPCityAssignment` — filling it in (on the rare path
     that still reaches it) has zero effect on the report.

## Admin dropdowns (TC-CFG-04/05)

- **TC-CFG-04 (city/town rename doesn't cascade to REP assignments) —
  CONFIRMED, and there isn't even a rename mechanism to point at.**
  `AdminPage.jsx` has no "city" or "town" category at all — its
  `OptionPanel`/`onRename` cascade wiring exists only for `project_name`
  (`:624`, routed to `configAPI.rename('project_name', ...)`),
  `service_type` and `entity_type` (`:647`, `:654`). Renaming a trial's
  city name isn't possible through the trial-city PATCH endpoint either —
  `trials/views.py:163-173` (`city_detail`) whitelists only
  `region`/`tentativeMonth`/`tentativeDate`/`confirmed`; `city_name` isn't
  patchable. The only way a city's name effectively changes is
  delete-and-recreate with a new `city_code`, which is a new row, not a
  rename — and `REPCityAssignment.city` is a **plain string copy**
  (`reps/models.py:75`), with the model's own docstring
  (`trials/models.py:124-131`, `rep_assignments_blocking_removal`) stating
  outright: "REPCityAssignment stores its city as a plain string, so
  nothing in the database stops a city being deleted out from under it."
  No FK, no cascade path exists at the schema level — this matches
  TC-ADR-08's identical claim about the same mechanism.

- **TC-CFG-05 (vendor tag not editable after creation) — the doc's verdict
  depends on which "vendor tag" is meant, and the two are opposite
  answers.**
  - The **admin-managed pre-approved vendor-name list** (`AdminPage.jsx`'s
    `VendorNamePanel`, :235-353) — the dropdown items with a
    serviceType/entityType tag used to prefill new vendors — **is fully
    editable**: `startEdit`/`handleSaveEdit` (:276-294) let you change
    `editServiceType`/`editEntityType` on an existing row and persist it.
    If TC-CFG-05 means this list, the doc's "not built" verdict is **wrong
    — CORRECTED to should-pass.**
  - The **actual saved Vendor record's own `vendorType`/`companyType`**
    (what TC-VEN-03's "wrong service type" scenario would really mean) —
    **is locked after creation.** `VendorModal.jsx:241`, the Service
    Type/Entity Type `Select` fields only render inside
    `{!isEdit && (...)}` — the search section shown for *new* vendors only.
    In edit mode neither field renders anywhere in the form, and
    `handleSubmit` (:207) computes `vendorType: isEdit ? formData.vendorType
    : searchServiceType` — in edit mode this is whatever `populateForm`
    loaded once at open, with no control to change it. If TC-CFG-05 means
    this, the doc's "not built" verdict is **CONFIRMED.**

## Summary of corrections to the original doc

1. TC-VEN-02: defect confirmed in the code, but the affected component
   (`VendorSearchDialog.jsx`) is not reachable from any screen — reclassify
   from a user-facing "known defect" to dead code with a latent bug.
2. TC-ADR-05: the doc's premise (no UI input at all) is stale — a real
   "Ground Name" field now exists in both add and edit mode as of the
   21 Aug fix. The remaining constraint (must be entered as part of
   creating/editing an assignment) is a genuine schema coupling, not a
   missing textbox.
3. TC-CFG-05: ambiguous target. The admin pre-approved vendor-name list's
   tags are editable (doc wrong for that reading); an actual vendor
   record's own type/entity tags are not (doc right for that reading).

Everything else re-verified (TC-VEN-01/03/04, the freeSolo claim, TC-WO-02/03/04/05,
TC-USR-01/02/03/04, TC-ADR-06, TC-CFG-04) matches the original doc's verdict,
now with independent file:line evidence rather than the dead agent's
unconfirmed DB claims or unchecked prose.
