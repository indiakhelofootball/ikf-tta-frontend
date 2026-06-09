# CSR Module — Functional Flow

A non-technical walkthrough of the CSR module's scope, structure, and operation.
This document describes intent and flow only. No implementation detail.

> CSR is a filtered view of a subset of TTA data, grouped under client projects.
> It is not a copy of TTA, and it is not a parallel system. Only items deliberately
> tagged into a CSR project appear inside CSR; the rest of TTA's data remains in
> TTA management.

---

## 1. System overview

```
                         ┌─────────────────────────────────────┐
                         │             TTA SYSTEM              │
                         │   (single backend, single database, │
                         │    shared trials / vendors / WOs /  │
                         │    payments)                        │
                         └──────────────────┬──────────────────┘
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                │                           │                           │
                ▼                           ▼                           ▼
        ╔═══════════════╗         ╔═══════════════╗         ╔═══════════════╗
        ║   TTA APP     ║         ║    CSR APP    ║         ║  CLIENT APP   ║
        ║  (existing)   ║         ║     (new)     ║         ║     (new)     ║
        ║───────────────║         ║───────────────║         ║───────────────║
        ║  Dashboard    ║         ║  CSR Dash     ║         ║  My Project   ║
        ║  Trials       ║         ║  Projects     ║         ║  Activities   ║
        ║  REPs         ║         ║  Contacts     ║         ║  Reports      ║
        ║  Vendors      ║         ║  Activities   ║         ║               ║
        ║  Work Orders  ║         ║  Reports      ║         ║               ║
        ║  Payments     ║         ║  Util. Cert.  ║         ║               ║
        ║  Banking      ║         ║               ║         ║               ║
        ║  Courier      ║         ║               ║         ║               ║
        ║  Reports      ║         ║               ║         ║               ║
        ║  Admin        ║         ║               ║         ║               ║
        ╚═══════════════╝         ╚═══════════════╝         ╚═══════════════╝
            Staff / ops             CSR team                 The client
        (SUPER_ADMIN,             (SUPER_ADMIN,             (CSR_CLIENT)
         ADMIN, REP)               ADMIN, CSR_OPS)
```

All three apps share the same backend and database. They are separated by route,
sidebar, and role — not by deployment. CSR consumes data and dropdowns that
originate in TTA; the client app is a read-only window into one CSR project.

---

## 2. Sidebar scope

```
   TTA APP                       CSR APP                       CLIENT APP
  ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
  │   Dashboard  │             │   Dashboard  │             │   Dashboard  │
  │   Admin      │             │   Projects   │             │   Activities │
  │   Setup      │             │   Activities │             │   Reports    │
  │   Projects   │             │   Reports    │             │              │
  │   REPs       │             │   Util. Cert │             │              │
  │   Vendors    │             │              │             │              │
  │   Work Order │             └──────────────┘             └──────────────┘
  │   Payments   │              CSR-only scope              Read-only,
  │   Banking    │              No payments tab             scoped to one
  │   Reports    │              No vendors tab              project
  │   Courier    │              No REP tab
  └──────────────┘
```

The CSR user operates entirely within the CSR app. Workshop names, training names,
and partner categories are maintained in TTA admin and surface in CSR as
pre-populated dropdowns; the CSR user picks from them without leaving the CSR app.

---

## 2a. Workshops in TTA admin

Workshops are catalog entries, not CSR-owned records. They are created and
maintained under **TTA Admin → Setup**, alongside the existing admin-managed
dropdowns (project names, seasons, vendor types, bank names, etc.).

```
   TTA ADMIN  →  SETUP
   ────────────────────────────────
   Existing entries:
     - Project names
     - Seasons
     - Vendor types
     - Bank names
     - Account types
     - Courier item categories
   New entries for CSR:
     - Workshop names
     - Training programme names
     - Workshop partner categories
       (financial, health, …)
   ────────────────────────────────
                     │
                     ▼  consumed as dropdowns
   ────────────────────────────────
   CSR APP  →  Project → Activities
     (workshop dropdown appears
      pre-populated; CSR user picks)
   ────────────────────────────────
```

**Why this placement:**

- A workshop catalog is organisation-wide reference data, not project-specific.
  The same workshop may be picked across several CSR projects.
- Catalog maintenance is an admin responsibility, not a CSR-operator
  responsibility. Putting it in TTA admin keeps the CSR app focused on project
  execution.
- The pattern matches every other admin-managed dropdown already in TTA. No new
  conventions are introduced.

The CSR app reads this catalog at runtime; it does not edit it.

---

## 3. CSR project lifecycle

```
   ╔══════════════════════════════════════════════════════════════╗
   ║                     PROJECT LIFECYCLE                        ║
   ╚══════════════════════════════════════════════════════════════╝

   STEP 1                STEP 2                  STEP 3
   ──────                ──────                  ──────
  ┌────────────┐      ┌────────────────┐     ┌──────────────────┐
  │ Client     │ ───► │ Create CSR     │ ──► │ Create Work      │
  │ signs      │      │ Project        │     │ Order            │
  │ contract   │      │ (name, amount) │     │ (contract +      │
  └────────────┘      └────────────────┘     │  attachments)    │
                                              └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ Add Contacts     │
                                              │ (client-side     │
                                              │  point-of-contact│
                                              │  roster)         │
                                              └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ Project          │
                                              │ description +    │
                                              │ supporting       │
                                              │ documents        │
                                              └──────────────────┘
                                                       │
   STEP 4                                              ▼
   ──────                                     ┌─────────────────────────────────┐
  ┌──────────────────────────────────────┐    │ Select activities from the      │
  │ Activity types (configured in        │ ◄──│ catalog for this project        │
  │ TTA admin, picked in CSR):           │    └─────────────────────────────────┘
  │  - Trial      — linked to a REP      │
  │  - Workshop   — linked to a Vendor   │     All names and categories are
  │                 in the "partner"     │     defined once in TTA admin and
  │                 category (financial, │     arrive in CSR as a dropdown.
  │                 health, …)           │
  │  - Training   — multi-month item     │
  └──────────────────────────────────────┘
                  │
                  ▼
   ╔════════════════════════════════════════════════════╗
   ║ Reactive timing                                    ║
   ║                                                    ║
   ║ Activities and payments are recorded as they       ║
   ║ occur; there is no advance schedule. This mirrors  ║
   ║ the existing trial workflow.                       ║
   ╚════════════════════════════════════════════════════╝
                  │
                  ▼
   STEP 5                                STEP 6                 STEP 7
   ──────                                ──────                 ──────
  ┌──────────────────┐                ┌─────────────┐        ┌────────────┐
  │ Activity occurs  │ ─────────────► │ Staff       │ ─────► │ Staff      │
  │ (date, location, │                │ records     │        │ uploads    │
  │  participants)   │                │ details +   │        │ report for │
  └──────────────────┘                │ outcomes    │        │ activity   │
                                      └─────────────┘        └────────────┘
                                                                    │
                                                                    ▼
                                                          ┌────────────────┐
   STEP 8                                                 │ "Visible to    │
   ──────                                                 │  client" flag  │
  ┌────────────────────┐                                  │  toggled       │
  │ Client logs in     │                                  └────────────────┘
  │ and views the      │                                          │
  │ published report   │ ◄────────────────────────────────────────┘
  └────────────────────┘
```

**Three upload surfaces** exist in a project, each serving a distinct purpose:

| Location            | Uploaded content                          |
| ------------------- | ----------------------------------------- |
| Work Order          | Contract and contract attachments         |
| Project (top level) | Description supporting documents          |
| Each activity       | Activity report (one per activity)        |

---

## 4. Money handling and audit rule

Operational payments continue to flow through TTA's normal vendor-to-payment chain.
The CSR app does not run payments and does not display them. CSR records only a
tagged expense figure for the Utilisation Certificate.

```
   ╔══════════════════════════════════════════════════════════════╗
   ║          OPERATIONAL PAYMENT vs CSR DISPLAY                  ║
   ╚══════════════════════════════════════════════════════════════╝

  ┌───────────────────────────┐         ┌────────────────────────────┐
  │   OPERATIONAL PAYMENT     │         │   CSR / CLIENT-FACING VIEW │
  │      (TTA app, unchanged) │         │   (CSR app — tagged figure)│
  ├───────────────────────────┤         ├────────────────────────────┤
  │                           │         │                            │
  │   Vendor                  │         │   "Amount allocated to     │
  │     │                     │         │    this project"           │
  │     ▼                     │         │                            │
  │   Work Order              │         │   The client does not see  │
  │     │                     │         │    payment screens, vendor │
  │     ▼                     │         │    names, or month-wise    │
  │   Payment Request         │         │    distribution.           │
  │     │                     │         │                            │
  │     ▼                     │         │                            │
  │   Payment Batch           │         │                            │
  │     │                     │         │                            │
  └─────┼─────────────────────┘         └────────────────────────────┘
        │                                            ▲
        │           ┌───────────────────┐            │
        └─────────► │ Tag to ONE CSR    │ ───────────┘
                    │ project (internal │
                    │ screen)           │
                    └───────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ Utilisation          │
                    │ Certificate          │
                    │ (generated at        │
                    │  project end)        │
                    └──────────────────────┘

   ─────────────────────────  AUDIT RULE  ────────────────────────────
   A given payment may be tagged to exactly one CSR project. The same
   amount cannot appear under two projects. This uniqueness is required
   for compliance with audit norms.
   ────────────────────────────────────────────────────────────────────
```

---

## 5. Reused, new, and out-of-scope

```
   ┌─────────────────────────────────────────────────────────────┐
   │           REUSED FROM TTA                                   │
   ├─────────────────────────────────────────────────────────────┤
   │  - Trials (boys / girls / general)                          │
   │  - REPs and city assignment                                 │
   │  - Vendors and vendor documents                             │
   │  - Workshop partners = Vendors flagged with a partner       │
   │    category (financial, health, etc.)                       │
   │  - Workshop names (admin-defined dropdown)                  │
   │  - Training programme names (admin-defined dropdown)        │
   │  - Work Order (contract, attachment, deliverables)          │
   │  - Payment flow (Vendor → WO → Request → Batch)             │
   │  - Authentication, roles, dashboard shell, layout           │
   │  - Admin-managed dropdown system                            │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │                  NEW IN CSR                                 │
   ├─────────────────────────────────────────────────────────────┤
   │  - CSR Project (client engagement wrapper)                  │
   │  - Contacts file (client-side roster per project)           │
   │  - Project description + supporting documents               │
   │  - Activity reports + "visible to client" flag              │
   │  - Utilisation Certificate / expense-tagging screen         │
   │  - CSR_CLIENT role, scoped to a single project              │
   │  - Client dashboard (read-only)                             │
   └─────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────┐
   │              OUT OF SCOPE FOR CSR                           │
   ├─────────────────────────────────────────────────────────────┤
   │  - Operational payment screens                              │
   │  - Vendor management tab                                    │
   │  - REP management tab                                       │
   │  - Banking and TDS                                          │
   │  - Courier                                                  │
   │  - Month-wise distribution exposed to client                │
   └─────────────────────────────────────────────────────────────┘
```

---

## 6. Staff and client journeys

```
   STAFF JOURNEY (CSR app)              CLIENT JOURNEY (Client app)
   ─────────────────────────            ───────────────────────────

   1. Log in (CSR_OPS / ADMIN)          1. Log in (CSR_CLIENT)
            │                                    │
            ▼                                    ▼
   2. View list of all CSR projects     2. View own project only
            │                                    │
            ▼                                    ▼
   3. Open project, navigate tabs:      3. Open project, navigate tabs:
        - Overview                            - Overview
        - Work Order                          - Activities (read-only)
        - Contacts                            - Reports (download)
        - Activities (add / link)
        - Reports (upload)
        - Utilisation Certificate
            │                                    │
            ▼                                    ▼
   4. Record activity details and       4. View newly published reports
      upload activity report               as they are released
            │
            ▼
   5. Toggle "Visible to client" ───────────► (client receives access)
            │
            ▼
   6. At project close,
      generate Utilisation Certificate
```

---

## 7. Build sequence

```
  ┌────────────────────────────────────────────────────────────────┐
  │ 1. Confirm this flow                                           │
  │                                                                │
  │ 2. Backend foundation: CSR tables and new user roles           │
  │                                                                │
  │ 3. TTA admin additions: workshop names, training names, and    │
  │    workshop-partner vendor categories (dropdown entries only)  │
  │                                                                │
  │ 4. Frontend shell: pluggable sidebar so CSR and Client apps    │
  │    can mount their own menus                                   │
  │                                                                │
  │ 5. CSR app: project list → project detail → work order →       │
  │    contacts → activity selection from the catalog              │
  │                                                                │
  │ 6. Activity reports: upload and visibility toggle              │
  │                                                                │
  │ 7. Utilisation Certificate screen (internal expense tagging)   │
  │                                                                │
  │ 8. Client app: read-only dashboard, one project per login      │
  │                                                                │
  │ 9. End-to-end validation: project → activity → report → tag    │
  │    → client view                                               │
  └────────────────────────────────────────────────────────────────┘
```

---

## 8. The CSR slice

CSR is a filtered view of TTA data, not a separate dataset. Items become visible
in CSR only when they are explicitly associated with a CSR project. Everything
else remains in TTA management and never appears in CSR.

```
   TTA universe (all organisational data)
   ┌──────────────────────────────────────────────────────┐
   │  trials  ·  REPs  ·  vendors  ·  WOs  ·  payments    │
   │                                                      │
   │     ┌────────────────────────────────────┐           │
   │     │  CSR slice                         │           │
   │     │  (items tagged into a CSR project) │           │
   │     │                                    │           │
   │     │  - selected trials                 │           │
   │     │  - selected payments               │           │
   │     │  - workshops                       │           │
   │     │  - trainings                       │           │
   │     │  - workshop partners (vendors)     │           │
   │     └────────────────────────────────────┘           │
   │                                                      │
   │   all remaining records stay in TTA management       │
   └──────────────────────────────────────────────────────┘
```

**Implications of the slice model:**

1. A trial is a TTA trial. It is shown in CSR only after being associated with a
   CSR project. Trials that are never associated remain invisible to CSR.
2. A payment, once tagged to a CSR project, cannot be tagged to another. The
   association also serves as a lock for audit purposes.
3. The CSR view never duplicates TTA data; it filters and groups what already
   exists.
