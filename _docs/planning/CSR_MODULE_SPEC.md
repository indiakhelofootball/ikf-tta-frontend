# CSR Module — Context Analysis & Mock Flow

Source: `project_recording_pdf/` — two segments of one conversation between Speaker 1
(owner / decision-maker, "sir") and Speaker 2 (dev team). The English `.md` is a
translation of the large Hindi `.txt`; the short Hindi `.txt` is a continuation that
adds the Work Order / deliverables detail.

---

## 1. What is being asked

Build a **CSR (Corporate Social Responsibility) module** on top of the existing TTA
platform. It is **not a separate app** — it reuses TTA's trials, vendors, and resources
("origin is coming from there"). It is exposed as new routes under the same TTA app:

| Route             | Audience            | Purpose                          |
| ----------------- | ------------------- | -------------------------------- |
| `TTA/management`  | existing staff      | current operations app           |
| `TTA/csr`         | SUPER_ADMIN / ADMIN | manage CSR projects (new)        |
| `TTA/client`      | CSR client login    | read-only report dashboard (new) |

Owner's explicit instruction: **"don't make a parallel system, reuse existing
resources — just change routing."**

---

## 2. Domain model (from the recordings)

### A CSR Project contains
- Multiple **events / activities**, typically 5–6 per project:
  - Boys trial, Girls trial, General trial (reuse existing Trials)
  - Workshop (e.g. "Nari Shakti" / women's empowerment)
  - Training programmes — **defined per project**, e.g. Career Guidance training,
    Girls' Financial Literacy, 6-month coaching camp
- Activity types are **defined from the back end** (admin config), then **filled in as
  they happen**. No advance planning — same reactive pattern as trials (order arrives →
  find RP → find city → fix date → execute).
- Each project is different: **some activities are "master" (reusable templates), some
  are custom per project.**

### Each project starts from a Work Order
- Client gives a **contract + attachment** and a sanctioned amount (₹5L / ₹10L / ₹20L /
  ₹50L — variable).
- The WO carries **deliverables** that the spend is measured against.

### Reporting
- A staff member **uploads / composes a report** against the project ("a person will put
  a report in it").
- The **client logs in to view** their project's report on a dedicated dashboard.
- Client gets login only to their own project — scoped, read-only.

---

## 3. The money rule — Utilisation Certificate (critical, do not get wrong)

This was the most emphasised point.

1. **Real vendor payments stay in the existing `/payments` flow.** CSR does **not** run
   payments and does **not** display actual payment screens to the client.
2. In CSR, the spend is shown as a **manually-entered expense figure** tagged to the
   project — this feeds the **Utilisation Certificate** (the document NGOs submit to
   show how grant money was spent).
3. **Audit uniqueness:** an expense may be tagged to **exactly one** CSR project. If
   ₹10L is shown under Project A it cannot also appear under Project B — government audit
   would flag double-counting ("ek aadmi ka ek unique hi hoga").
4. The org **controls distribution across months** internally (Apr in one, May in
   another, Jun in a third) and tags accordingly — but this control stays **internal**,
   never exposed in the CSR/client section (so a client can't see a figure change).
5. Certificate is produced **at the end** of the project, not during.

**Implementation consequence:** a join table linking a payment/expense to a single CSR
project, with a uniqueness constraint, plus an internal-only tagging screen.

---

## 4. How it maps to the current codebase

| Concept                | Existing asset to reuse                                              |
| ---------------------- | ------------------------------------------------------------------- |
| Roles / permissions    | `src/auth/roles.js` — add `CSR_CLIENT` role                         |
| Routing + role gating  | `src/App.js` (`RoleBasedRoute`), copy the `/trials` block           |
| Module UI pattern      | `Page → Card → DetailView → Modal` (e.g. `src/components/trials/`)   |
| Admin-defined dropdowns| `configAPI` + `src/utils/adminStorage.js` (activity types)          |
| Trials as activities   | `src/components/trials/`, `trialsAPI`                                |
| Work Orders            | `src/components/workorders/`, `workOrderData.js`, `workOrdersAPI`    |
| Payments (stay normal) | `src/components/payments/`, `paymentRequestsAPI`, `paymentBatchesAPI`|
| Reports                | `src/components/reports/` pattern for the client dashboard          |

### New backend app `tta_backend/backend/csr/`
- `CSRProject` — name, client, status, dates, sanctioned amount
- `CSRActivity` — type (from config), linked trial (optional), dates, status, report
- `CSRWorkOrder` — contract attachment, amount, deliverables, linked to project
- `CSRExpenseTag` — links a payment/manual amount → one project (**unique per payment**)
- `CSRClientUser` — client login scoped to one project

---

## 5. Mock Flow

### 5.1 High-level system flow

```
                         ┌──────────────────────────┐
                         │        TTA platform       │
                         │  (existing trials/vendors │
                         │     /WO/payments core)    │
                         └────────────┬─────────────┘
                                      │ reuses resources
                   ┌──────────────────┼───────────────────┐
                   ▼                  ▼                   ▼
            /management           /csr                /client
          (staff ops, as-is) (SUPER_ADMIN/ADMIN)  (CSR_CLIENT login)
                                   │                     │
                                   │  publishes reports  │
                                   └─────────────────────┘
                                       (read-only view)
```

### 5.2 Admin journey — creating & running a CSR project

```
[1] Receive CSR contract from client
        │
        ▼
[2] Create CSR Project  ──────────────►  set name, client, sanctioned amount
        │
        ▼
[3] Create Work Order under project ──►  upload contract/attachment,
        │                                amount (₹5L/10L/20L/50L), deliverables
        ▼
[4] Define activities (from backend config)
        │   e.g. Boys Trial, Girls Trial, Workshop,
        │        Career Guidance, Financial Literacy (6-mo)
        │   ── some pulled from "master" templates, some custom ──
        ▼
[5] As each activity happens (reactive):
        │   link/create Trial → assign RP → city → date → execute
        ▼
[6] Staff uploads REPORT for the activity/project
        │
        ▼
[7] Publish to client  ──────────────►  becomes visible on /client dashboard
```

### 5.3 Money flow (kept separate from CSR view)

```
   NORMAL FLOW (unchanged)                 CSR / UTILISATION (internal only)
   ───────────────────────                 ─────────────────────────────────
   Vendor → Work Order →                    Internal "Tag Expense" screen
   Payment Request → Payment Batch                   │
              │                                       │  tag amount/payment
              │  actual money moves here              ▼
              └─────────────────────────►   CSRExpenseTag (project = ONE only)
                                                      │  unique constraint
                                                      ▼
                                            Utilisation Certificate
                                            (generated at project end)

   RULES:
   • Client NEVER sees the payment screen.
   • One payment/expense → exactly one CSR project (no double-count).
   • Month-wise distribution controlled internally, not shown in /csr or /client.
```

### 5.4 Client journey

```
[1] Client logs in (CSR_CLIENT, scoped to their project)
        │
        ▼
[2] Lands on /client dashboard — sees ONLY their project
        │
        ▼
[3] Views published reports + activity progress + deliverable status
        │
        ▼
[4] (No payment detail, no edit, no other projects)
```

---

## 6. Execution sequence (recommended)

1. **Mock flow first** — owner explicitly asked for a mock/flow before any build.
   (This document is step 1.)
2. Backend: new `csr` Django app + models + migrations (`tta_backend/backend/csr/`).
3. Roles: add `CSR_CLIENT` + project-scoped permissions in `roles.js` and Django.
4. Frontend `/csr` module reusing trials/vendors/WO data.
5. Internal Utilisation/expense-tagging screen with the uniqueness rule.
6. `/client` read-only report dashboard (build last).

---

## 7. Open questions to confirm with owner

1. **Reports** — auto-generated from activity/deliverable data, or fully manual upload?
   (Recording suggests manual: "a person will put a report in it.")
2. **Expense tagging** — tag *real* payments from the existing flow, or only type a
   standalone manual figure? (Affects whether `CSRExpenseTag` references a Payment row.)
3. Can one CSR client have **multiple projects**, or strictly one login per project?
4. Are "master" activity templates org-wide, or per-client?
```