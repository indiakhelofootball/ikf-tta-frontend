# CSR — Architecture & Risk Boundary

**Scope:** where CSR's code lives, and — more importantly — the security guardrails that the
placement does **not** give you for free. This is a compliance product whose job is to *hide*
financial data from external parties, so the risk boundary is the point of the doc.

Companion to `CSR_COMPLETE_REFERENCE.md` (the what) and `CSR_CLIENT_PORTAL.md` (the white-label
client portal). This doc is the **how it's structured + how it must be guarded.**

---

## 1. Placement (endorsed)

- **Two repos stay two repos.** `ikf-tta-frontend` (React) and `ikf-tta-backend` (Django,
  modular monolith). No third repo for CSR.
- **Backend:** one new `csr/` Django app (the 13th module). It owns all CSR data and serves
  **both** audiences via two URL roots: `/api/csr/` (org) and `/api/client/` (client).
- **Frontend:** two new module folders — `components/csr/` (internal org app, `/csr`) and
  `components/client/` (external white-label portal, `/client`).
- Separation is by **route + sidebar + grant/role**, on one build, one backend, one MariaDB.

This is the correct, low-cost structure. **But the next section is the part that actually keeps
the client's data safe — and the placement alone does not provide it.**

---

## 2. The correction that drives everything below

Earlier framing said: *"one backend module serves both because the difference is permission +
scope, not separate code."* **That is wrong, and dangerous here.**

What the permission layer actually does (`permissions/enforcement.py`, verified):

```
ModulePermission.has_permission():  verb + module  ->  grant
   GET    -> can_view
   POST   -> can_edit + can_create
   PATCH  -> can_edit
   DELETE -> can_edit + can_delete
```

- It is **verb-level + module-level** gating only.
- It implements `has_permission` **only** — **no `has_object_permission`, so NO row scoping.**
- It returns allow/deny for the whole request — it **never touches which fields a serializer
  returns or which rows a queryset includes.**

CSR's protection requirement — *no vendor names, no payment internals, no contract, no
month-wise splits, and only your-own-project rows* — is **entirely field-level and row-level.**
Your permission layer does **none** of that. Therefore:

> **"Different gated views" must mean different CODE for the client surface — not the org code
> with a role conditional.** The verb-level gate cannot enforce the field/row protection CSR
> exists to provide.

---

## 3. Guardrails (mandatory for the client surface)

### G1 — Separate client serializers, allowlist not strip-out
Do **not** reuse the org viewset/serializer with `if role == CLIENT: strip(...)`. A single missed
strip ships a vendor name or a payment row to a corporate funder — the exact failure this product
exists to prevent. Instead:
- **Physically separate `client` serializers** that **opt fields IN by explicit allowlist** (a
  field absent from the allowlist can never leak; a strip-list leaks whatever you forget to add).
- **Separate client viewsets**, never the org viewset with a flag.

### G2 — `CSRClientScoped`: a new, fail-closed, row-scoped permission class
Clients use a **role**, not a grant, so the client endpoints will **not** use `ModulePermission`.
They need a new `CSRClientScoped` class. This is fresh fail-open surface, so it must:
- **Fail closed** — no resolvable client→project link = deny (mirror `ModulePermission`'s
  "no grant = denied, misconfig = denied" discipline).
- **Enforce row scoping** the existing class never did — every queryset filtered to the caller's
  **one** project (`has_object_permission` *and* `get_queryset` scoping; never rely on the URL).
- Strip contract/financial fields for partners (see `CSR_COMPLETE_REFERENCE.md` §7).

### G3 — Split the client build (it's information disclosure, not aesthetics)
One React build means the **corporate client's browser downloads the compiled JS of your entire
internal TTA + CSR-org app** — component logic, internal API shapes, business rules. Route-gating
protects *data*, not *code*. For an external/white-label party that is **information disclosure**,
not a deploy-convenience question. So:
- Reframe the `/client` build split from "later, for deploy independence" to a **security/IP
  decision** that ranks **above "premature."**
- The client portal is the **one piece with a clean API boundary** (it only calls `/api/client/`),
  so it is also the **only** part that splits cleanly — making this both necessary and feasible.
- Verdict: maybe not literal day-1 MVP, but decided and scheduled deliberately, not deferred by
  default.

### G4 — Auth precondition (hard blocker for the client portal)
External funders authenticate against the **same `accounts.User` store as `SUPER_ADMIN`**.
Architecturally fine — but prod reality (per project memory) is **weak shared passwords and no
self-serve change-password UI.** You **cannot** onboard an external corporate client onto an auth
system with no password rotation. **Fixing self-serve password change + rotation is a precondition
for the client portal, not a nice-to-have.** *(Note: the "weak shared passwords / no change-password
UI" state is recorded in project memory and should be re-verified against current prod before
onboarding — it is the precondition either way.)*

---

## 4. The one-way dependency rule — honestly, it's discipline not a constraint

`csr` may import `trials` / `workorders` / `payments`; they must never import `csr`. This keeps CSR
cleanly removable. **But Django apps import each other freely — nothing enforces this.** It is a
**convention you maintain** (and can lint for), not a guarantee the framework gives you. State it,
review for it, don't assume it.

---

## 5. Net

The **placement is right** (2 repos, one `csr` app, two frontend folders). The **danger** is
treating internal-full-access and external-read-only as the same code with different gates: your
gate is **verb-level**, the protection CSR needs is **field/row-level**, and those must be
**separate code**. G1 and G3 are why the client portal seam matters more than a happy-path plan
implies; G2 and G4 are the new fail-open surface and the hard auth precondition. Build the org side
first (lower risk); treat the client surface as a security boundary with its own serializers,
its own fail-closed scoped permission, its own build, and a fixed auth story.

---

## 6. Invariant registry — the rules enforced structurally, proven by tests

Each invariant is pushed into a place the framework guarantees (DB constraint, allowlist
serializer, fail-closed permission, lint), **not** a code path someone must remember. Each is
proven by a failing-then-passing test, not by prose. These four are the spine; the phase sheet
below references them.

| ID | Invariant | Made structural by | Proof test |
|---|---|---|---|
| **INV-AUDIT** | One payment tags **at most one** project | DB `unique` on `CSRExpenseTag.payment` **and** an API check | tag a `PaymentRequest` to project A, then attempt project B → rejected at DB and API |
| **INV-LEAK** | A `/api/client/` response **never** contains a vendor name, payment internal, contract, or month-wise field | **Allowlist** client serializer (field absent ⇒ can't leak) | assert the serialized client payload's keys are a subset of the allowlist; no financial key present |
| **INV-SCOPE** | A client/partner sees **only their own project's** rows; partner also loses contract/financials | `CSRClientScoped` — `get_queryset` + `has_object_permission`, **fail closed** | client A requests client B's project id → 404/403; partner payload has contract stripped |
| **INV-DEP** | `csr` imports core; core **never** imports `csr` | Lint rule (discipline — Django won't enforce it) | grep/import-linter: no `from csr` inside non-csr apps |

---

## 7. Phased build sheet (deliverable · invariant proven · gate)

Sequence rule: **decision-independent foundation → thin vertical slice → org app → the risky
external boundary last**, each with its proof. Gate legend:

- 🟢 **code-ready** — blocked by nothing; build now.
- 🟡 **owner-decision** — needs an owner answer before this phase (see `CSR_COMPLETE_REFERENCE.md` §14).
- 🔴 **precondition** — a hard external blocker that must be cleared first, regardless of code.

| Phase | Deliverable | Invariant proven here | Gate |
|---|---|---|---|
| **0** | Owner signs off on this doc + the flow | — | 🟡 owner sign-off (this doc) |
| **1** | Backend `csr` app: 6 models + `0001` migration, wired into `INSTALLED_APPS` + urls. **No logic.** | migration applies; all FKs (`WorkOrder`/`Trial`/`PaymentRequest`) resolve | 🟢 code-ready |
| **2** | Access: add `csr` + `csr_certificate` **grants** to `registry.MODULES`. (Roles `CSR_CLIENT`/`CSR_PARTNER` deferred — they're external and partner-shape is unresolved.) | staff with `csr` grant passes `ModulePermission` on `/api/csr`; without → 403 | 🟢 grants ready · 🟡 roles wait on partner-model Q |
| **3** | Frontend org shell: pluggable `DashboardLayout` sidebar, `CSRSidebar`, `/csr` routes, `csrAPI` | `csr`-grant user sees `/csr` in sidebar; non-grant → `/unauthorized` | 🟢 code-ready |
| **4** | Org vertical slice: Project list → detail → WO link (Page→Card→DetailView→Modal) | `CSRProject` ↔ `WorkOrder` OneToOne enforced | 🟢 code-ready |
| **5** | Activities (custom + link existing `Trial`) + workshop/training catalog in TTA admin | activity links a real `Trial`; catalog reads from `config` dropdowns | 🟢 buildable (default) · 🟡 master = org-wide vs per-client |
| **6** | Reports: upload + `visible_to_client` toggle | report hidden by default; toggle flips visibility | 🟡 reports manual vs generated |
| **7** | Utilisation Certificate: expense tagging + uniqueness; generate at project end | **INV-AUDIT** (DB + API) | 🟡 tag real `PaymentRequest` vs typed figure |
| **8** | **Client/partner surface** (the risky boundary): G1 allowlist serializers, G2 `CSRClientScoped`, G3 split build, white-label | **INV-LEAK** + **INV-SCOPE** | 🔴 G4 auth precondition · 🟡 partner = role vs flag |
| **9** | End-to-end proof: project → activity from trial → tag a real payment → log in as client → assert payment **invisible** + audit uniqueness | **INV-LEAK** + **INV-AUDIT** together, as the acceptance test | 🟢 once 8 done |

**Recommended first commit once Phase 0 clears: Phase 1.** It is the stable foundation, fully
reversible, and blocked by none of the open owner questions. `INV-DEP` is enforced from Phase 1
onward (lint), so the one-way dependency never silently inverts.

---

## 8. Current status

- **Phase 0 — NOT cleared.** Owner sign-off pending; this doc is the artifact to sign off on.
- **No CSR code exists** — no `csr` app, no `/csr` or `/client` routes. Planning only.
- Substrate verified (2026-06-28): FK targets `workorders.WorkOrder` / `trials.Trial` /
  `payments.PaymentRequest` all exist; `User.role` is a `CharField(choices)` not Django groups
  (so the deferred roles are an `AlterField`); URL convention is `path('api/', include('<app>.urls'))`.
- Until Phase 0 clears, the next action is **not** code — it is an owner decision on this doc and
  on the §14 open questions that gate Phases 5–8.

---

## 9. Build progress & findings (updated 2026-06-28)

Built ahead of formal Phase 0 sign-off, at the owner's direction — but strictly the
**decision-independent, org-side** scope. The external/client surface (Phase 8) remains unbuilt
and gated. Branches: backend `csr-foundation`, frontend `csr-foundation` (both local, unpushed).

**Done & validated** (Django 3.2.25 venv: `check` clean, 9 csr tests pass; frontend eslint + build + 1 component test):
- Phase 1 models + migrations; Phase 2 grants (`csr`, `csr_certificate`).
- Org API: projects, activity-types, activities, reports, expense-tags, client-users — gated by
  `ModulePermission`; `?project=` filtering; `PageNumberPagination` (page_size 100, `limit` param).
- Org frontend: Projects list + tabbed detail (Overview / Activities / Reports) with CRUD.
- Tests: INV-AUDIT (DB + serializer), permission wall (no-grant → 403, grant → 200, super bypass),
  project filtering, **INV-DEP** (a test scans core apps for any reverse `import csr` — replaces the
  "discipline only" gap with an enforced check).

**Findings that corrected the plan:**
- **INV-AUDIT / MariaDB caveat.** The model `CheckConstraint` (payment XOR manual) is **not
  enforced on production MariaDB 10.1.x** — CHECK is parsed-but-ignored before MariaDB 10.2.1. The
  `OneToOne` uniqueness (one payment → one project) *is* enforced (unique index). The XOR is held by
  `CSRExpenseTagSerializer.validate()` at the app layer. So INV-AUDIT = DB(uniqueness) + app(XOR)
  on 10.1, fully DB-level only on ≥10.2.1.
- **No FileField in this codebase.** Every attachment is an external-link `TextField`
  (`mou_document_url`, `rep_logo_url`); there is no `MEDIA_ROOT`. `CSRReport` was corrected from a
  `FileField` to `file_name` + `file_url` to match. Do not introduce server-side uploads without
  first adding media config.

**Operational step before CSR is usable in prod:**
- **Grant seeding.** New modules start with no grant rows, so only `SUPER_ADMIN` sees CSR. Run
  `python manage.py backfill_permissions` (gives every ADMIN the `csr`/`csr_certificate` grants;
  REP excluded) **or** assign grants per-user in User Management. The permissions grid is
  data-driven from the registry, so `csr` appears there automatically.

**Still gated (unchanged):** roles `CSR_CLIENT`/`CSR_PARTNER` (partner model), activity-type catalog
UI (master org-wide vs per-client — blocks the Activities tab from being usable), Utilisation
Certificate generator + expense UI (expense model), Phase 8 client/partner surface + white-label
portal (G4 auth precondition), Phase 9 leak/audit acceptance test.
