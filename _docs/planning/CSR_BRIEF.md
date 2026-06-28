> **SUPERSEDED — see `_docs/planning/CSR_COMPLETE_REFERENCE.md` (the single source of truth). Kept for history.**

# CSR Module — Consolidated Brief

**Single source of truth** for the CSR module. Merges `CSR_MODULE_SPEC.md` (owner intent
from the call recordings), `CSR_IMPLEMENTATION.md` (technical plan — most detailed, treated
as authoritative), and `CSR_VISUAL_FLOW.md` (functional walkthrough). Where the three
drifted, this brief reconciles them and flags it.

**Status:** Planning only — owner sign-off pending. **No code exists.** There is no `csr`
Django app and no `/csr` routes. The `CSR` strings in the live codebase
(`trialType: 'CSR'`, `'CSR Project Trial'` in `CityModal.jsx`, `TrialCitiesPage.jsx`,
`SocialMediaReport.test.jsx`) are an existing **trial-category label**, unrelated to this
module.

---

## 1. What it is — and the one rule

A **Corporate Social Responsibility module on top of TTA**, not a separate system. Owner's
explicit instruction: *"don't make a parallel system, reuse existing resources — just change
routing."* It consumes TTA's trials, vendors, work orders, REPs, and payments; it adds only
new routes, two roles, and a handful of new tables.

---

## 2. Three apps, one codebase, one database

| App | Route prefix | Sidebar | Roles |
|---|---|---|---|
| TTA management (existing) | `/` | `Sidebar` | SUPER_ADMIN, ADMIN, REP |
| CSR (new) | `/csr/*` | `CSRSidebar` | SUPER_ADMIN, ADMIN, CSR_OPS |
| Client (new) | `/client/*` | `ClientSidebar` | CSR_CLIENT |

One React build, one Django backend, one MariaDB. Separation is by **route + sidebar + role
scoping**, never by deployment or separate DBs. Single DB is required because: cross-DB joins
aren't possible, the Utilisation-Certificate uniqueness rule needs a DB-level constraint, and
"TTA as origin" requires direct FK access into trials/workorders/payments.

### 2.1 Inside CSR: two managed views + restricted partner access

*(Recovered from `CSR_REC_2`, which the original transcription lost entirely — see Appendix A.
Treat as owner intent to confirm, not settled design.)*

The CSR side is itself **two views over the same project data**:

1. **Internal/ops view** — managed by the IKF team (`CSR_OPS`). Full control: configures the
   project, activities, reports, and the expense tagging that feeds the Utilisation Certificate.
2. **Client view** — managed by the **CSR client** (`CSR_CLIENT`, the corporate funder who
   gives the grant). The client has full access to *their own* project and controls what is
   surfaced/published to them.

On top of that, a CSR project can have **multiple partners** (the owner referenced them as
"partners" — likely the workshop/REP-style partners). Partners get a **read view of the
project, but the contract must be hidden from them.** This is the same "bifurcate the CSR view /
don't show the financial side" instruction from `CSR_REC_1`, where the owner compares the client
to an auditor who should only see their own slice.

**Implication for the role/permission model:** the simple two-role split (`CSR_OPS` /
`CSR_CLIENT`) is not enough — there is at least a **third, partner-scoped visibility level**
where the contract (and financials) are withheld. Whether this is a distinct role or a per-row
visibility flag is an open question (see §8).

---

## 3. Domain model

- **CSR Project** — name, client, sanctioned amount (₹5L / ₹10L / ₹20L / ₹50L, variable),
  start/end dates, status; starts from a **Work Order** (OneToOne) carrying the contract,
  attachment, and deliverables the spend is measured against.
- **Activities** — typically 5–6 per project: boys / girls / general trials (reuse existing
  Trials), workshops (e.g. "Nari Shakti"), and training programmes (e.g. Career Guidance,
  Girls' Financial Literacy, 6-month coaching). Activity types are **admin-defined**; some
  are **master** (reusable templates), some **custom** per project.
- **Reactive timing** — activities and payments are recorded as they occur; no advance
  schedule (mirrors the existing trial workflow: order → RP → city → date → execute).
- **Reports** — staff upload a report per activity (and project-level supporting docs), then
  flip a **"visible to client"** flag to publish.
- **Contacts** — a client-side point-of-contact roster per project.

---

## 4. The money rule — Utilisation Certificate (critical, do not get wrong)

1. Real vendor payments stay in the **existing `/payments` flow**. CSR does **not** run
   payments and **never** shows payment screens, vendor names, or month-wise splits to the
   client.
2. CSR shows a **manually-tagged expense figure** per project, which feeds the **Utilisation
   Certificate** (the document NGOs submit to prove how grant money was spent).
3. **Audit uniqueness:** a payment/expense may be tagged to **exactly one** CSR project. The
   same amount cannot appear under two projects (govt audit flags double-counting). Enforced
   **both** DB-side (constraint) and API-side.
4. Month-wise distribution is controlled **internally only**, never exposed in `/csr` or
   `/client`.
5. The certificate is generated **at project end**, not during.

---

## 5. Reused / New / Out-of-scope

**Reused from TTA:** trials (boys/girls/general), REPs + city assignment, vendors (workshop
"partners" = vendors flagged with a partner category, e.g. financial/health), workshop &
training names (admin dropdowns), work orders, the payment chain (Vendor → WO → Request →
Batch), auth/roles/dashboard shell/layout, and the admin-managed dropdown system.

**New in CSR:** CSR Project wrapper, contacts roster, project description + supporting docs,
activity reports + "visible to client" flag, the Utilisation-Certificate / expense-tagging
screen, the `CSR_CLIENT` role, and the read-only client dashboard.

**Out of scope:** operational payment screens, vendor tab, REP tab, banking/TDS, courier, and
exposing month-wise distribution to the client.

---

## 6. Planned backend — new `csr/` Django app

Models (final names to verify against existing apps before coding):
- `CSRProject` — name, client_name, sanctioned_amount, dates, status, `OneToOneField(WorkOrder)`.
- `CSRActivityType` — name, `is_master` (reusable across projects vs custom).
- `CSRActivity` — FK project, FK activity_type, optional `linked_trial` FK(Trial), title,
  dates, status.
- `CSRReport` — FK project, optional FK activity, `FileField`, uploaded_by, `visible_to_client`.
- `CSRExpenseTag` — FK project, `OneToOneField(payment)` **or** manual_amount/note, tagged_by;
  constraint that exactly one of payment/manual is set; **payment unique across projects**.
- `CSRClientUser` — `OneToOneField(User)` ↔ one project.

Permissions: `IsCSROps` (SUPER_ADMIN/ADMIN/CSR_OPS), `CSRClientScoped` (CSR_CLIENT sees only
rows under their project). Wire `api/csr/` and `api/client/` into URLs/settings.

Frontend mirrors the `trials/` module pattern (Page → Card → DetailView → Modal); make
`DashboardLayout` take a `sidebar` prop; add `csrAPI` + `clientAPI` blocks to `services/api.js`
that also import the existing `trialsAPI`/`workOrdersAPI`/`vendorsAPI`/`paymentRequestsAPI`.

**Workshop/training catalog placement:** maintained in **TTA Admin → Setup** (org-wide
reference data, like project names/seasons), surfaced in CSR as pre-populated dropdowns. The
CSR app reads this catalog at runtime; it does not edit it.

---

## 7. Build sequence (recommended)

1. Owner sign-off on the mock/flow (this brief + the source docs).
2. Backend: `csr` app + models + migrations (no business logic yet).
3. Roles + permissions: add `CSR_OPS`, `CSR_CLIENT`; wire into `accounts.User`.
4. Frontend shell: pluggable `DashboardLayout` sidebar; add `CSRSidebar`, `ClientSidebar`.
5. TTA admin additions: workshop names, training names, workshop-partner vendor categories.
6. CSR app: project list → detail → WO link → contacts → activity selection from catalog.
7. Activities: create custom + link existing trial.
8. Reports: upload + "visible to client" toggle.
9. Utilisation Certificate: manual tag + payment-link tag, uniqueness enforced DB + API.
10. Client app: `/client` read-only dashboard, one project per login.
11. End-to-end: project → activity from existing trial → upload report → tag a real payment →
    log in as client → verify visibility.

---

## 8. Open questions — owner must answer before build

1. **Reports** — auto-generated from activity/deliverable data, or fully manual upload?
   (Recordings lean manual: "a person will put a report in it.")
2. **Expense tagging** — tag *real* payments from the existing flow, or only a standalone
   manual figure? (Decides whether `CSRExpenseTag` references a Payment row.)
3. Can one CSR client have **multiple projects**, or strictly **one login per project**?
4. Are "master" activity templates **org-wide** or **per-client**?
5. **Partner access (from §2.1):** is the contract-hidden "partner" view a **distinct role**
   (e.g. `CSR_PARTNER`), or a **per-row visibility flag** on the existing client view? And which
   partners attach to a project — workshop partners, REPs, or a new partner entity?

Technical checks before coding: exact payments model name (`PaymentRequest` vs `Payment` vs
`PaymentBatch`), how `accounts.User` stores role (field vs Django groups), and the existing
`FileField`/media-serving convention for report uploads.

---

## 9. Doc-drift notes (reconciled here)

- **Roles:** the spec mentions only `CSR_CLIENT`; the implementation doc adds `CSR_OPS`. This
  brief uses **both** (`CSR_OPS` for internal CSR staff, `CSR_CLIENT` for the external client).
- **Contacts tab:** present in the visual flow, absent in the spec. Included here as a
  project-level contacts roster (New-in-CSR).
- **"Separate app" wording:** the spec says "not a separate app"; the implementation doc says
  "a separate app, same anatomy." Both mean the same thing — same codebase/DB/shell, separate
  routes+sidebar+roles. No parallel system.

**Source docs:** `CSR_MODULE_SPEC.md`, `CSR_IMPLEMENTATION.md`, `CSR_VISUAL_FLOW.md`
(all in `_docs/planning/`).

---

## Appendix A — Transcription corrections (2026-06-27)

The original audio transcripts (Whisper `small` model) were re-run on the `large-v3` model with
hallucination filtering. The cleaner transcripts **confirmed the bulk of this brief** but
changed a few things worth recording:

- **`CSR_REC_2` was recovered.** The `small` run produced only `CSR CSR CSR…` (a repetition
  loop) and was treated as noise. `large-v3` recovered its real content: the **two-module
  structure** and **partner view with the contract hidden**, now captured in §2.1. This is the
  one substantive addition to the brief.
- **Dev time, not funding.** `CSR_REC_1`'s "1.5–2 weeks" is the **CSR development estimate**
  ("how long will CSR be in your coding"), not a funding timeline. Earlier notes that read it as
  funding duration were wrong.
- **Payment-flow wording (`03-06`):** "remove the **PAN** from REP management" (not "pen"), and
  the owner's explicit decision that the **TDS-type field lives on the work order, not the
  vendor**. The "**TDS deducted once a month**" rule — the premise behind the TDS double-booking
  fix — is confirmed verbatim.

**Caveats:** `large-v3` still mis-renders "custom(ized)" as "customers" (this brief's "custom"
is correct) and may have turned "courier" into "career" in the intro clip — given TTA has a
courier module, "courier" is plausibly the intended word. Every clip also ends in **hallucinated
filler** (YouTube-style outros, a "rich beggar / bowl" monologue, "Elizabeth Banks" lines);
Whisper invents these over trailing silence — they are **not spoken content** and were ignored.
