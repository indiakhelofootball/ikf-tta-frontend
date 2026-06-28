# CSR Module — Complete Reference

**The single, authoritative document for the CSR module.** It consolidates the earlier planning
docs (`CSR_BRIEF.md`, `CSR_MODULE_SPEC.md`, `CSR_IMPLEMENTATION.md`, `CSR_VISUAL_FLOW.md`), the
code-grounded access model from `CSR_PRODUCT_DESIGN.md`, and the verified call-recording evidence
into one reference. The multi-client white-label client portal has its own referenced sub-spec,
`CSR_CLIENT_PORTAL.md` (§10.5). Where the source docs drifted, this one reconciles and flags it.

> **Access-model correction (2026-06-27):** earlier docs (and an earlier version of this one)
> modelled internal CSR staff as a **`CSR_OPS` role**. That is **wrong** against the codebase:
> TTA gates access by **per-module grant** (`App.js` uses `<GrantedRoute module="...">`, backed by
> `permissions/registry.py`), not by role. Internal CSR is therefore a **`csr` module grant**, not
> a role. Only the **external** client/partner are roles. This document now reflects that; §8/§9/§17
> are corrected.

**Status:** Planning only — **owner sign-off pending. No code exists.** There is no `csr`
Django app and no `/csr` routes yet. The `CSR` strings already in the live codebase
(`trialType: 'CSR'`, `'CSR Project Trial'` in `CityModal.jsx`, `TrialCitiesPage.jsx`,
`SocialMediaReport.test.jsx`) are an existing **trial-category label** and are unrelated to
this module.

**How to read this:**
- **Part 1 — Overview** is plain-language and for the owner / non-technical reviewers.
- **Part 2 — Technical spec** is for engineering.
- **Part 3 — Evidence & open questions** shows where each claim comes from and what still
  needs an owner decision before build.

Last updated: 2026-06-27.

---
---

# PART 1 — OVERVIEW (for the owner)

## 1. What this module solves

TTA is the internal operations platform — trials, vendors, work orders, payments, couriers.
There is currently **no structured way to show a corporate CSR client how their project is being
delivered without exposing the operational and financial internals** (vendor names, payment
batches, month-wise splits, TDS).

The CSR module creates a **filtered, role-gated window** onto TTA's existing data so that:

- The IKF team can manage CSR project delivery — log activities, upload reports, generate the
  utilisation certificate — without leaving TTA's data behind.
- The corporate **client** gets a clean, read-only view of *their own* project's activities and
  published reports — and nothing else.
- All real payments and vendor details stay inside TTA and are **never** surfaced to the client.

## 2. The one rule

> *"Don't make a parallel system. Reuse existing resources — just change the routing."* — owner

CSR is a **filtered view of TTA data, not a second system.** It reuses TTA's trials, vendors,
work orders, REPs, and payments. It adds only: new routes, new roles, and a handful of new
tables. An item appears in CSR **only when it is deliberately tagged into a CSR project.**

## 3. Three apps, one backend

All three apps share one React build, one Django backend, one MariaDB database. They are
separated by **route + sidebar + role**, never by deployment.

| App | Who uses it | Sees |
|---|---|---|
| **TTA** (existing) | Staff / ops | Everything — trials, REPs, vendors, work orders, payments, banking, courier, reports, admin |
| **CSR** (new) | CSR team (internal) | Projects, activities, reports, utilisation certificate — no vendor/payment internals |
| **Client** (new) | The corporate funder | Read-only: their own project's activities and published reports only |

Workshop names, training names, and partner categories are maintained once in **TTA Admin →
Setup** and appear in the CSR app as pre-filled dropdowns.

## 4. Project lifecycle

The first three steps set the project up; steps 4–7 repeat for each activity.

| Step | Action | Result |
|---|---|---|
| 1. Contract signed | Client signs; CSR team creates the project. | Project record + sanctioned amount |
| 2. Work Order | Staff creates the WO, uploads the contract + attachments. | WO linked to project; contract stored |
| 3. Contacts | Client-side point-of-contact roster added. | Contact list per project |
| 4. Activity selected | Staff picks an activity type (Trial / Workshop / Training). | Activity linked to project |
| 5. Activity occurs | Date, location, participants recorded **after** the event. | Activity log entry |
| 6. Report uploaded | Staff uploads one report per activity. | Report stored, hidden by default |
| 7. Client view | "Visible to client" toggled on. | Client can now see that report |

At project close, the **Utilisation Certificate** is generated from the tagged expenses.

**Timing is reactive, not scheduled.** Activities are recorded as they happen — there is no
advance plan filled in up front. This mirrors the existing trial flow (order → REP → city →
date → execute).

## 5. The money rule — Utilisation Certificate (critical)

This is the part most easily got wrong.

1. **Real payments stay in TTA's existing `/payments` flow.** CSR does not run payments and
   never shows payment screens, vendor names, or month-wise splits to the client.
2. CSR shows a **manually-tagged expense figure** per project. That figure feeds the
   **Utilisation Certificate** — the document NGOs submit to prove how grant money was spent.
3. **Audit uniqueness rule:** a given payment/expense may be tagged to **exactly one** CSR
   project. The same rupee amount cannot appear under two projects, because a government audit
   flags double-counting. *("When the government audits, they cannot show it twice — one
   payment will always be unique.")*
4. Month-wise distribution is controlled **internally only**, never exposed in the CSR or client
   views.
5. The certificate is generated **at project end**, not during.

## 6. User journeys

**CSR staff (internal):** log in to CSR app → see all CSR projects → open a project → move
through its tabs (Overview, Work Order, Contacts, Activities, Reports, Utilisation Certificate)
→ record activity details and upload reports → flip "visible to client" when a report is ready
→ generate the certificate at close.

**Client (corporate funder):** log in to client app → see **their own project only** →
Overview, Activities (read-only), Reports (download) → see new reports as the CSR team publishes
them.

## 7. Partner access — TO CONFIRM (low-confidence source)

The recordings reference a **third audience beyond the client: "partners."** The owner's
instruction was that partners *"get a view of the project, but the contract must be hidden from
them"* — described as *"bifurcate the CSR view / don't show the financial side."*

This is **not yet settled design.** It comes from the single recording (`CSR_REC_2`) that the
original transcription lost entirely, plus a corroborating but ambiguous line in `CSR_REC_1`.
Two things must be clarified with the owner before it is built (see §14, Q5):

- Is "partner" a **distinct login/role**, or just a **more-restricted version of the client
  view** (some rows/fields hidden)?
- **What is "RETF"?** The recording calls them *"RETF partners"* — an unidentified term. It may
  be an organisation, a partner category, or a transcription error. Confirm before modelling.

The rest of this document does **not** assume partner access exists; it is tracked purely as an
open question so it is not lost.

---
---

# PART 2 — TECHNICAL SPEC (for engineering)

## 8. Architecture, routing, roles

TTA has a **two-layer access model**: a coarse `User.role` (`SUPER_ADMIN/ADMIN/REP`) and the real
boundary — **per-user module grants** (`permissions/registry.py` + `UserModulePermission`, enforced
by `GrantedRoute`/`useGrants` and backend `enforcement.py`). `SUPER_ADMIN` bypasses; everyone else
is gated by grants. CSR plugs into this — it does **not** add a staff role.

| App | Route prefix | Sidebar component | Who gets in | Mechanism |
|---|---|---|---|---|
| TTA management (existing) | `/` | `Sidebar` | Staff | existing role + grants |
| CSR (new) | `/csr/*` | `CSRSidebar` | Internal CSR staff | **new `csr` module grant** (+ `csr_certificate` for the money actions). **No new role.** |
| Client (new) | `/client/*` | `ClientSidebar` | External corporate funder | **new `CSR_CLIENT` role** + `CSRClientUser` project scoping, read-only |

**Why internal = grant, external = role:** internal CSR staff are already TTA users — a `csr` grant
turns the app on per-person from the existing permissions grid, zero new auth. The client/partner are
external, single-project, read-only people who don't belong in the staff grant grid, so they get a
hard role-based wall scoped to one project. **Login never forks** — one login endpoint/token; only the
post-login redirect differs by role/grant. (Partner access — a possible third tier — is still
to-confirm; see §7 and §14 Q5.)

One React build, one Django backend, one MariaDB. Separation is by **route + sidebar + grant/role
scoping**, never deployment. A **single database is required** because: cross-DB joins aren't possible;
the Utilisation-Certificate uniqueness rule needs a DB-level constraint; and "TTA as origin" needs
direct FK access into trials / workorders / payments.

**Registry additions:** `csr` (`can_create`/`can_delete` true) and `csr_certificate`
(`can_delete:false`, audit-sensitive like `tds`) in `permissions/registry.py`; `CSR_CLIENT`
(and a to-confirm `CSR_PARTNER`) added to `User.ROLE_CHOICES` via an additive `AlterField`.

## 9. Domain model — new `csr/` Django app

Final names to be verified against existing apps before coding.

| Model | Fields / purpose |
|---|---|
| `CSRProject` | name, client_name, sanctioned_amount (₹5L/10L/20L/50L, variable), start/end dates, status, `OneToOneField(WorkOrder)` carrying the contract + attachments |
| `CSRActivityType` | name, `is_master` (reusable template vs custom-per-project) |
| `CSRActivity` | FK project, FK activity_type, optional `linked_trial` FK(Trial), title, dates, status |
| `CSRReport` | FK project, optional FK activity, `FileField`, uploaded_by, `visible_to_client` |
| `CSRExpenseTag` | FK project; `OneToOneField(payment)` **or** manual_amount/note; tagged_by; constraint that exactly one of payment/manual is set; **payment unique across all projects** |
| `CSRClientUser` | `OneToOneField(User)` ↔ one project |

**Permissions:** `IsCSRStaff` — has the **`csr` grant** (or is SUPER_ADMIN), enforced server-side via
the same `ModulePermission`/`enforcement.py` path as every other module (NOT a `CSR_OPS` role); the
certificate/expense-tag endpoints additionally require the `csr_certificate` grant. `CSRClientScoped`
— a `CSR_CLIENT` (or partner) sees only rows under their own project, with contract/financial fields
stripped for partners. Wire `api/csr/` and `api/client/` into URLs and settings.

> ⚠️ **Security boundary — see `CSR_ARCHITECTURE.md` (mandatory).** `ModulePermission` is
> **verb-level only** (it gates GET/POST/DELETE by grant); it does **not** do field-level or
> row-level scoping. CSR's "hide financials / own-project-only" rule is entirely field/row-level,
> so the client surface needs **separate code, not the org code with a role flag**: (G1) separate
> client serializers with an explicit field **allowlist**, (G2) a new `CSRClientScoped` permission
> that **fails closed and row-scopes to one project**, (G3) a **separate client build** (a shared
> build ships your internal app's JS to external clients = information disclosure), and (G4) a
> **self-serve password-rotation** auth fix before onboarding any external client.

**Activities** — typically 5–6 per project: boys / girls / general trials (reuse existing
`Trial`), workshops (e.g. "Nari Shakti"), training programmes (e.g. Career Guidance, Girls'
Financial Literacy, 6-month coaching). Some activity types are **master** (reusable templates),
some **custom** per project.

## 10. Frontend structure

- Mirror the existing `trials/` module pattern: **Page → Card → DetailView → Modal.**
- Make `DashboardLayout` accept a `sidebar` prop so CSR and Client apps mount their own menus
  alongside TTA's.
- Add `csrAPI` + `clientAPI` blocks to `services/api.js`; they reuse the existing
  `trialsAPI` / `workOrdersAPI` / `vendorsAPI` / `paymentRequestsAPI`.
- **Catalog placement:** workshop/training names live in **TTA Admin → Setup** (org-wide
  reference data, like project names/seasons). CSR reads them as dropdowns at runtime; it does
  not edit them.

## 10.5 White-label client portal (sub-spec: `CSR_CLIENT_PORTAL.md`)

Many clients, **same layout, brand swapped per client** — *structure is code, brand is data.* Built
once; each new client is a **branding record**, not new code. Grounded in the codebase: styling
already runs through a single MUI `ThemeProvider` (`index.js` + `styles/muiTheme.js`), `Login.jsx`
logic is brand-agnostic, and `reps` already store a per-entity logo (`rep_logo_url`/`rep_logo_link`).

- **`CSRClientBranding`** record: `slug`, `display_name`, `logo_url`, `login_image_url`,
  `primary_color`, `secondary_color`. Adding a client = one row.
- The `/client/*` tree is wrapped in a per-client `ThemeProvider` built at runtime from that record
  (inherit base `muiTheme`, override only the palette) — every element re-colours automatically.
- **Login reused, re-skinned:** extract a shared `<LoginForm />` from `Login.jsx`; render it at
  `/client/:slug/login` under the client theme + logo. A **public** `GET /api/client/branding/<slug>/`
  serves logo+colours before auth so the login screen itself is branded. Same auth engine throughout.

Full detail (data model, theming code, entry flow, build phases C1–C7, flagged decisions) lives in
`CSR_CLIENT_PORTAL.md`.

## 11. Reused / New / Out-of-scope

**Reused from TTA:** trials (boys/girls/general); REPs + city assignment; vendors (workshop
"partners" = vendors flagged with a partner category, e.g. financial/health); workshop &
training names (admin dropdowns); work orders; the payment chain (Vendor → WO → Request →
Batch); auth / roles / dashboard shell / layout; the admin-managed dropdown system.

**New in CSR:** CSR Project wrapper; contacts roster; project description + supporting docs;
activity reports + "visible to client" flag; the Utilisation-Certificate / expense-tagging
screen; the `CSR_CLIENT` role; the read-only client dashboard.

**Out of scope:** operational payment screens; vendor tab; REP tab; banking / TDS; courier;
exposing month-wise distribution to the client.

## 12. Build sequence

1. Owner sign-off on the flow (this document + source docs).
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

## 13. Technical pre-checks before coding

- Exact payments model name (`PaymentRequest` vs `Payment` vs `PaymentBatch`).
- How `accounts.User` stores role (a field vs Django groups).
- The existing `FileField` / media-serving convention for report uploads.

---
---

# PART 3 — EVIDENCE & OPEN QUESTIONS

## 14. Open questions — owner must answer before build

1. **Reports** — auto-generated from activity/deliverable data, or fully manual upload?
   (Recordings lean manual: *"a person will put a report in it."*)
2. **Expense tagging** — tag *real* payments from the existing flow, or only a standalone
   manual figure? (Decides whether `CSRExpenseTag` references a Payment row.)
3. Can one CSR client have **multiple projects**, or strictly **one login per project**?
4. Are "master" activity templates **org-wide** or **per-client**?
5. **Partner access (§7):** is the contract-hidden "partner" view a **distinct role**
   (e.g. `CSR_PARTNER`) or a **per-row visibility flag** on the client view? And **what is
   "RETF"** / which partners attach to a project — workshop partners, REPs, or a new entity?
6. **Training report cadence:** trials and workshops are point-in-time (one report each), but
   trainings run for months. Does the one-upload model become (a) multiple uploads per training,
   (b) each month a separate activity, or (c) a distinct training report cadence?
7. **"Visible to client" gate:** should the toggle require a report upload to exist first, so a
   client never sees an activity row with no content behind it?
8. **Reactive vs sequential:** is activity recording purely reactive (logged as it happens) or
   does the UI drive a structured workflow? They build differently.

## 15. Source recordings — what each established

All transcribed from owner call recordings (Whisper `large-v3`, re-run from an earlier `small`
pass). See §16 for transcription caveats.

| Recording | Establishes |
|---|---|
| `CSR_REC_1` | "Bifurcate the CSR view"; don't show financials to everyone (incl. the partner); the "1.5 weeks" figure is **CSR development time**, not funding. |
| `CSR_REC_2` | **The two managed views + the partner view with the contract hidden** (§7). The original transcription lost this recording entirely. |
| `WhatsApp 05-22 7.26` / `05-23 09.14.09` | Work order with attachment/contract; sanction tiers ₹5/10/20/50 lakh; CSR project carries both a trial and a plan; client must be shown online. |
| `WhatsApp 05-22 7.27` / `05-23 09.14.10` | 5–6 activities (boys/girls/general trials, workshops, trainings); master vs custom templates; separate client dashboard/login; **utilisation-certificate uniqueness** rule; "not a parallel system — change the routing." |
| `WhatsApp 03-06` | TTA-side (not CSR): remove **PAN** from REP management; TDS-type field belongs on the **work order**, not the vendor; **TDS deducted once a month**. |
| `WhatsApp 05-16` | TTA-side: payment-report filtering/sorting and dashboard tiles. Not CSR. |

## 16. Transcription corrections & caveats

- **`CSR_REC_2` was recovered.** The earlier `small` run produced only `CSR CSR CSR…` (a
  repetition loop) and was discarded as noise. `large-v3` recovered its real content — the
  two-view structure and the contract-hidden partner view. This is the one substantive addition
  the re-transcription produced, and it remains **low-confidence / to-confirm** (§7).
- **Dev time, not funding.** `CSR_REC_1`'s "1.5–2 weeks" is the development estimate
  (*"how long will CSR be in your coding"*), not a funding timeline.
- **"RETF" is unresolved.** `CSR_REC_2` says *"RETF partners"* — an unidentified term. Do not
  model partners until it is clarified (§14, Q5).
- **Known mis-renders:** `large-v3` writes "custom(ized)" as "customers" (this doc's "custom" is
  correct), and may have turned "courier" into "career" in one intro clip.
- **Hallucinated tails — ignore.** Every clip ends in invented filler (YouTube-style outros, a
  "rich beggar / bowl" monologue, "Elizabeth Banks" lines). Whisper fabricates these over
  trailing silence; they are **not spoken content.** The re-sent duplicate clips
  (03.43.xx / 04.47.13) are byte-identical in real content and add nothing.

## 17. Doc-drift notes (reconciled here)

- **Roles vs grants (RESOLVED against code):** the spec mentioned only `CSR_CLIENT`; the
  implementation doc and an earlier version of this reference invented a `CSR_OPS` **role**. The
  codebase gates by **module grant**, not role (`App.js` → `<GrantedRoute module="...">`), so the
  correct model is: internal CSR = a **`csr` grant** (no role), external client = **`CSR_CLIENT`
  role**. `CSR_OPS` is dropped everywhere in this doc (§8, §9). This is the one contradiction that
  was spread across the older docs; it is now deleted, not carried forward.
- **Contacts tab:** present in the visual flow, absent from the spec. Included here as a
  project-level contacts roster (New-in-CSR).
- **"Separate app" wording:** the spec says "not a separate app"; the implementation doc says "a
  separate app, same anatomy." Both mean the same thing — same codebase / DB / shell, separate
  routes + sidebar + roles. No parallel system.
- **"Two modules" interpretation:** `CSR_REC_2`'s "two modules" is read here as the internal CSR
  view + the client view (the CSR and Client apps). It could instead mean two sub-views within
  the CSR app. Confirm with the owner if it affects the build.

## 18. Glossary

| Term | Meaning |
|---|---|
| TTA | The core ops platform (existing). All backend data originates here. |
| CSR app | New filtered view for the internal CSR team to manage delivery. |
| Client app | New read-only view for the corporate client, scoped to one project. |
| CSR Project | The client-engagement wrapper — groups activities, contacts, WO, reports. |
| Activity | A discrete delivery event: Trial, Workshop, or Training. |
| REP | Regional Engagement Person — a TTA-managed field resource linked to trials. |
| Work Order (WO) | TTA record holding the contract, attachments, and deliverables. |
| Utilisation Certificate | Compliance document generated at project close, showing expense allocation. |
| "Visible to client" flag | Per-report toggle controlling whether the client can see it. |
| Partner | A third audience (to-confirm) who gets a project view with the contract hidden. |
| RETF | Unidentified term from `CSR_REC_2` (*"RETF partners"*) — clarify before modelling. |

## 19. Document map (so the sprawl doesn't return)

- **THIS doc (`CSR_COMPLETE_REFERENCE.md`) is the single source of truth.** Start here.
- **`CSR_CLIENT_PORTAL.md`** — **active sub-spec**, referenced from §10.5 (white-label detail). Not
  superseded.
- **`CSR_ARCHITECTURE.md`** — **active sub-spec & risk boundary** (code placement + the G1–G4
  security guardrails for the client surface). Read before building the client side. Not superseded.
- **Superseded — historical only, do not edit or cite for current decisions:** `CSR_BRIEF.md`,
  `CSR_MODULE_SPEC.md`, `CSR_IMPLEMENTATION.md`, `CSR_VISUAL_FLOW.md`, and `CSR_PRODUCT_DESIGN.md`
  (its correct access model + build phases are folded into §8/§9/§12 here). `CSR_VISUAL_FLOW.pdf`
  and `CSR_Module_Design_Review.docx` are point-in-time exports.
- **Raw evidence:** the transcripts in `D:\CSR\transcrip[t\transcripts (1)` and the audio in `D:\CSR`.

Each of the five superseded markdown docs should carry a one-line banner at its top:
`> SUPERSEDED — see _docs/planning/CSR_COMPLETE_REFERENCE.md. Kept for history.`
