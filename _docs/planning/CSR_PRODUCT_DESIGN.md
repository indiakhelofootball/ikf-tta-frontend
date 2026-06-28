> **SUPERSEDED — folded into `_docs/planning/CSR_COMPLETE_REFERENCE.md` (the single source of truth). Its access model (grant-not-role) and build phases now live there. Kept for history.**

# CSR — Product Design

**Author's stance:** product design, written *after* reading the actual codebase
(`auth/`, `permissions/`, `App.js`, `accounts.User`, `workorders`) and the three CSR
source docs. Where this design refines the earlier brief, it says so and why.

**One-line product:** CSR is not a new app. It is a **filtered, role-scoped view of the
TTA data you already have**, grouped under client projects, with one new external-facing
window (the client/partner view). Login, vendors, work orders, trials, and payments are
reused unchanged.

---

## 1. The access model — your "three ways", grounded in the code

TTA already has a **two-layer access system**. Understanding it is what makes CSR cheap to
build instead of a parallel system.

| Layer | What it is | Where it lives | Role in CSR |
|---|---|---|---|
| **1. Role** | `SUPER_ADMIN / ADMIN / REP` on `User.role` | `accounts/models.py`, `auth/roles.js` | Coarse identity + legacy fallback. We add roles **only for external users**. |
| **2. Module grant** | Per-user `can_view` / `can_edit` on a module key | `permissions/registry.py` (`MODULES`), enforced by backend `enforcement.py` and frontend `GrantedRoute` / `useGrants` | The **real** access boundary. CSR for internal staff is just a **new grant key**. |

`SUPER_ADMIN` bypasses everything. Everyone else is gated by **grants**, not roles — that's
why `App.js` reads `<GrantedRoute module="trials">`, not `role === 'ADMIN'`.

### The three ways, decided

> Your phrasing: "first normal — the TTA login can do the job — and another will be for CSR only."
> That's exactly right. Here is the precise mapping.

**Login itself never forks.** One login page (`Login.jsx`), one endpoint, one JWT, one
`AuthContext`. The *only* fork is the **post-login redirect**, chosen by the user's role/grant.

| # | User type | Internal/External | How they log in | How access is granted | Lands on |
|---|---|---|---|---|---|
| **1** | **TTA + CSR staff** (ops team) | Internal | **Existing TTA login, unchanged** | **New `csr` module grant** (and `csr_certificate`). **No new role.** Reuses the entire grant system — give an existing staff user the `csr` grant and the CSR app appears in their sidebar. | `/dashboard` (and `/csr`) |
| **2** | **CSR client** (the corporate funder) | External | Same login page | **New role `CSR_CLIENT`** + a `CSRClientUser` link scoping them to **one project**, read-only. Roles fit better here than grants because the client is external, single-project, and read-only — outside the staff grant grid. | `/client` |
| **3** | **CSR partner** (workshop/REP partner — contract hidden) | External | Same login page | **New role `CSR_PARTNER`** *or* a per-row visibility flag. Sees project activities/reports but **never the contract or financials** (the §2.1 / `CSR_REC_2` rule). | `/csr` (scoped, contract fields stripped) |

**Why internal = grant, external = role (the design decision):**

- Internal CSR staff are *already TTA users*. Adding a `csr` grant means zero new auth code,
  zero new login, and admins can turn CSR on/off per person from the existing permissions grid.
  This is the literal meaning of *"the TTA login can do the job."*
- The client and partner are *external people who should see almost nothing*. They don't belong
  in the staff grant grid; they need a hard, role-based wall that scopes every query to a single
  project. This is *"another for CSR only."*

> **Refinement of the brief:** the brief proposed a `CSR_OPS` role. We **drop it** — internal CSR
> staff need a *grant*, not a role. We keep `CSR_CLIENT` and add `CSR_PARTNER` (or a flag). Fewer
> roles, more reuse.

### What we add to the registry

```
permissions/registry.py  →  MODULES += {
    'csr':             {label:'CSR Projects',        can_create:True,  can_delete:True},
    'csr_certificate': {label:'Utilisation Cert.',   can_create:True,  can_delete:False},  # audit-sensitive
}
accounts.User.ROLE_CHOICES += ('CSR_CLIENT', 'CSR_PARTNER')   # AlterField migration
```

The certificate is `can_delete:False` for the same reason TDS is — it's audit-bound.

---

## 2. Three surfaces, one system

```
                 ┌─────────────────────────────┐
                 │   ONE BACKEND · ONE DB      │
                 │ trials·vendors·WOs·payments │
                 └──────────────┬──────────────┘
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
   ┌──────────┐           ┌──────────┐           ┌──────────┐
   │ TTA app  │           │ CSR app  │           │ Client / │
   │   /      │           │  /csr    │           │ Partner  │
   │          │           │          │           │ /client  │
   │ Staff:   │           │ Staff +  │           │ External:│
   │ role +   │           │ csr grant│           │ CSR_CLIENT│
   │ grants   │           │          │           │ CSR_PARTNER│
   └──────────┘           └──────────┘           └──────────┘
   Full ops               CSR-only scope         Read-only,
   (unchanged)            no payments/vendors/    one project,
                          REP tabs                contract hidden
```

Separation is **route + sidebar + role/grant** — never deployment, never a second database
(the audit-uniqueness rule needs one DB-level constraint).

---

## 3. Personas & primary journeys

**P1 — CSR Operator (internal staff, `csr` grant).** Runs the project: creates it from a work
order, picks activities from the TTA catalog, records what happened, uploads reports, toggles
client visibility, tags expenses, and generates the certificate at the end.

**P2 — CSR Client (external, `CSR_CLIENT`).** Logs in, sees **only their project**, browses
published activities and downloads released reports. Read-only. Never sees payments, vendors,
or month-wise splits.

**P3 — CSR Partner (external, `CSR_PARTNER`).** Like the client but narrower — sees the
activities they're involved in; the **contract and all financials are stripped**.

```
OPERATOR (CSR app)                    CLIENT (Client app)
1. log in (grant: csr)                1. log in (role: CSR_CLIENT)
2. see all CSR projects               2. see own project only
3. open project → tabs:               3. open project → tabs:
     Overview · Work Order ·               Overview · Activities (read) ·
     Contacts · Activities ·               Reports (download)
     Reports · Util. Cert.
4. record activity + upload report
5. toggle "Visible to client" ──────► 4. published report appears
6. at close → Utilisation Certificate
```

---

## 4. Information architecture (screens)

**CSR app (`/csr`)** — staff with `csr` grant:

- `Dashboard` — counts: active projects, sanctioned vs tagged spend, pending reports.
- `Projects` — list → **Project Detail** with tabs: Overview · Work Order · Contacts ·
  Activities · Reports · Utilisation Certificate.
- `Activities` — add custom / link an existing TTA trial / pick a workshop or training.
- `Reports` — upload per activity; "visible to client" toggle.
- `Utilisation Certificate` — internal expense-tagging + generate at project end.

**Client app (`/client`)** — `CSR_CLIENT`, scoped to one project:

- `My Project` (overview) · `Activities` (read-only) · `Reports` (download published only).
- **White-labelled per client** — same layout for everyone, brand (logo/colours/login image)
  swapped from data. Full design in **`CSR_CLIENT_PORTAL.md`**.

**Partner view** — `CSR_PARTNER`: same as client minus the contract/financials and limited to
the partner's own activities.

**TTA Admin → Setup (existing screen, new dropdown entries):** Workshop names, Training
programme names, Workshop-partner vendor categories. *Catalog is org-wide reference data,
maintained by admins, consumed by CSR as dropdowns — never edited inside CSR.*

Frontend mechanics: make `DashboardLayout` accept a `sidebar` prop; add `CSRSidebar` and
`ClientSidebar`; add `csrAPI` / `clientAPI` blocks to `services/api.js`; mount `/csr/*` and
`/client/*` under the existing `RequireAuth` + `GrantedRoute` pattern in `App.js`.

---

## 5. Data model (new `csr` Django app)

Six tables, hung off existing TTA entities (FK targets confirmed in code):

- **`CSRProject`** — name, client_name, sanctioned_amount, dates, status,
  `OneToOneField(workorders.WorkOrder)`.
- **`CSRActivityType`** — name, `is_master` (reusable template vs custom).
- **`CSRActivity`** — FK project, FK activity_type, optional `linked_trial` FK(`trials.Trial`),
  title, date, location, status.
- **`CSRReport`** — FK project, optional FK activity, `FileField`, uploaded_by,
  `visible_to_client`.
- **`CSRExpenseTag`** — FK project, `OneToOneField(payments.PaymentRequest)` **or**
  `manual_amount` + note; DB constraint = **a payment tags to at most one project** (the audit
  lock).
- **`CSRClientUser`** — `OneToOneField(User)` ↔ one `CSRProject`; also carries partner scope.

Permissions: `IsCSRStaff` (has `csr` grant or is admin), `CSRClientScoped` (external user sees
only rows under their project, contract fields stripped for partners).

---

## 6. The money rule (the part to never get wrong)

Operational payments stay in TTA's normal chain and are **never shown** in CSR or to the client.
CSR shows only a **tagged expense figure** feeding the Utilisation Certificate. A payment tags to
**exactly one** project — enforced both by a **DB constraint** and in the API — because govt audit
flags double-counting. The certificate is generated **at project end**. Month-wise distribution
stays internal, never exposed to client or partner.

This mirrors a pattern your codebase already trusts: just as TDS records are audit-bound
(`can_delete:False`, void-not-delete), the expense tag is an **immutable-ish audit link**.

---

## 7. Build phases (MVP-first)

| Phase | Deliverable | Depends on a blocked decision? |
|---|---|---|
| **0** | Owner approves this design + the mock flow | — |
| **1** | Backend `csr` app: 6 models + migrations, wired into `INSTALLED_APPS` + urls. No logic. | No |
| **2** | Access: add `csr` / `csr_certificate` grants to registry; add `CSR_CLIENT` / `CSR_PARTNER` roles (AlterField migration); post-login redirect. | Partner = role vs flag (Q) |
| **3** | Frontend shell: pluggable `DashboardLayout` sidebar; `CSRSidebar`; `/csr` routes; `csrAPI`. | No |
| **4** | **Vertical slice:** CSR Project list → detail → WO link (Page→Card→DetailView→Modal). | No |
| **5** | Activities (custom + link trial) + workshop/training catalog in TTA admin. | No |
| **6** | Reports: upload + "visible to client" toggle. | Reports manual vs generated (Q) |
| **7** | Utilisation Certificate: tagging + uniqueness constraint (DB + API). | Tag real payment vs manual (Q) |
| **8** | Client app `/client` (read-only, one project) + partner contract-stripping. | Partner model (Q) |
| **9** | End-to-end test: project → activity from trial → report → tag payment → client view. | — |

**Recommended first commit: Phase 1** (backend skeleton) — it's the stable foundation and is
blocked by none of the open decisions.

---

## 8. Open decisions (owner must answer before the blocked phases)

1. **Expense tagging** — does it reference real `PaymentRequest` rows, or only a typed-in figure?
   (Decides `CSRExpenseTag`'s shape — Phase 7.)
2. **Partner access** — distinct role `CSR_PARTNER`, or a per-row visibility flag on the client
   view? Which partners attach — workshop partners, REPs, or a new entity? (Phase 2/8.)
3. **Reports** — manual upload (recordings lean this way), or auto-generated from activity data?
   (Phase 6.)
4. **Client ↔ projects** — one login per project, or can one client see several? (Phase 8.)
5. **Activity templates** — "master" templates org-wide, or per-client? (Phase 5.)

None of these block Phases 1, 3, 4, 5 — so we can start building real foundation today and
answer the money/role questions in parallel.

---

## 9. Why this is safe (the reuse guarantee)

Nothing in TTA changes behaviourally. We **add** a Django app, **add** two grant keys and two
role choices (an additive `AlterField`), **add** routes and a sidebar prop, and **read** existing
trials/WOs/payments through FKs. The only edits to existing files are: `INSTALLED_APPS`, root
`urls.py`, `registry.MODULES`, `User.ROLE_CHOICES`, `roles.js`, `App.js` routes, and
`DashboardLayout` (sidebar prop). Every one is additive. No existing screen, query, or payment
flow is modified.
