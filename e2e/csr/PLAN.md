# CSR Operator — End-to-End Test Plan

**Scope:** the **internal CSR operator** flow only (the `/csr` org app). The external
client/funder portal (`/client`) is explicitly out of scope per request.

**Under test:** the `csr-foundation` build (both repos). The operator is a staff user holding
the `csr` module grant (and `csr_certificate` for expense/utilisation). Login is the normal TTA
login; the fork is only the post-login destination.

**Actor / credentials** (from `seed_csr_demo`):
`csr.admin@example.com` / `Demo-Pass-2026` — role `ADMIN`, grants `csr` + `csr_certificate`.

---

## 1. Environment & preconditions

| Piece | Value |
|---|---|
| Backend | Django on `http://localhost:8000`, run on SQLite for the test DB |
| Frontend | React app on `http://localhost:3000`, `REACT_APP_API_URL=http://localhost:8000/api` |
| Seed | `python manage.py migrate` -> `python manage.py seed_csr_demo` |
| Branch | `csr-foundation` (frontend + backend) |

Seed is idempotent and prints the credentials + flow. It creates activity types
(`Trial` master, `Training Programme`), so the operator test can reuse them or create its own.

---

## 2. Flow map (screens -> routes -> key controls)

| # | Screen | Route | Key controls (real labels) |
|---|---|---|---|
| 1 | Login | `/login` | `Email Address`, `Password`, **Sign In** |
| 2 | CSR Projects (list) | `/csr` | heading **CSR Projects**, search `Search by project or client...`, **Add** (+) |
| 3 | New/Edit Project modal | - | title **New CSR Project**; `Project Name`, `Client / Funder`, `Sanctioned Amount`, `Start Date`, `End Date`, `Status`, `Description`, `Work Order (optional)`; **Cancel/Save** |
| 4 | Activity Types (admin) | `/csr/activity-types` | heading **CSR Activity Types**, `New activity type`, `Master` checkbox, **Add** |
| 5 | Project Detail | `/csr/:id` | **Back**, project name (h5), tabs **Overview** / **Utilisation**, **Add Contact**, **Add Activity**, **Add Report**, **Generate Certificate** |
| 6 | New Activity modal | - | title **New Activity**; `Title`, `Activity Type`, `Date`, `Location`, `Start (multi-month)`, `End (multi-month)`, `Status`, `Linked Trial (optional)` |
| 7 | New Report modal | - | title **New Report**; `Report Name`, `Document Link`, `Activity (optional)`, `Visible to client` |
| 8 | New Contact modal | - | title **New Contact**; `Name`, `Designation`, `Email`, `Phone` |
| 9 | Tag an Expense modal | - | title **Tag an Expense**; `Payment`, `Amount`, `Note (optional)` |
| 10 | Utilisation tab / Certificate | `/csr/:id` (Utilisation) | **Utilisation Certificate**, **Generate Certificate**, computed total |

Note: no `data-testid` anywhere in the CSR components - selectors are **role + accessible label +
text**, which is more robust to refactors anyway.

---

## 3. Scenarios (the operator journey, from zero)

### S1 - Authenticate as operator
1. Go to `/login`, fill `Email Address` + `Password`, submit.
2. **Assert:** redirected away from `/login` (lands on dashboard).
3. Navigate to `/csr`. **Assert:** heading **CSR Projects** visible (grant works).

### S2 - Create a CSR project (the "begin")
1. On `/csr`, click **Add** -> **New CSR Project** dialog opens.
2. Fill `Project Name` = `E2E Test Project <timestamp>`, `Client / Funder` = `E2E Funder`,
   `Sanctioned Amount` = `500000`, `Start/End Date`, `Status` = `Active`, `Description`.
3. Save. **Assert:** dialog closes and the new project appears in the list (search by its name).

### S3 - Ensure an activity type exists (admin catalog)
1. Go to `/csr/activity-types`. **Assert:** heading **CSR Activity Types**.
2. Add `E2E Workshop` (leave Master unchecked) via `New activity type` + **Add**.
3. **Assert:** the new type appears in the list.

### S4 - Open the project detail
1. From `/csr`, open the project created in S2.
2. **Assert:** detail shows the project name and the **Overview** / **Utilisation** tabs,
   plus **Add Contact / Add Activity / Add Report** actions.

### S5 - Add an activity
1. **Add Activity** -> **New Activity** dialog.
2. `Title` = `Career Guidance Camp`, `Activity Type` = `E2E Workshop` (or seeded `Trial`),
   `Location` = `Bhilai`, `Status` = `Completed`; optionally set multi-month Start/End.
3. Save. **Assert:** the activity row appears under the project.

### S6 - Add a report (visibility toggle)
1. **Add Report** -> **New Report** dialog.
2. `Report Name` = `May Progress Report`, `Document Link` = `https://example.com/report.pdf`,
   link `Activity (optional)` to the S5 activity, toggle **Visible to client** ON.
3. Save. **Assert:** report appears; visibility state reflected.

### S7 - Add a contact
1. **Add Contact** -> **New Contact**.
2. `Name` = `Priya Sharma`, `Designation` = `Programme Lead`, `Email`, `Phone`.
3. Save. **Assert:** contact appears.

### S8 - Tag an expense (csr_certificate grant)
1. Open **Tag an Expense**.
2. Use the **manual** path: `Amount` = `250000`, `Note` = `Training delivery - Q1`
   (leave `Payment` empty - the XOR rule requires exactly one source).
3. Save. **Assert:** the tag appears with amount 2,50,000.
   *Negative:* setting **both** Payment and Amount is rejected ("exactly one funding source").

### S9 - Generate the Utilisation Certificate
1. Switch to the **Utilisation** tab -> **Generate Certificate**.
2. **Assert:** certificate shows `Sanctioned` = 5,00,000, `Total Utilised` = 2,50,000,
   and a line item for the manual expense. (Totals are server-summed, so this proves the
   backend aggregation, not a browser sum.)

### S10 - List integrity
1. Return to `/csr`. **Assert:** the E2E project is present with correct client/amount.

---

## 4. Assertions philosophy

- Prefer **user-visible truth** (text on screen) over network internals, but also assert on the
  certificate total because it is the audit-critical, server-authoritative value.
- Each create step asserts the item **renders back** (round-trips through the API + reload).
- One **negative** assertion each for the two guardrails that define this module:
  the `csr` grant boundary (S1) and the expense XOR rule (S8).

## 5. Out of scope (by request)

Client portal (`/client`, `/client/:slug/login`), white-label branding as seen by the funder,
and the read-only data-isolation checks. Those belong to a separate **client** suite.

## 6. Deliverables

- `tests/csr-operator.spec.js` - the Playwright suite implementing S1-S10.
- `playwright.config.js` - base URL, retries, trace/screenshot on failure.
- `scripts/bootstrap.sh` - stand up BE (sqlite) + FE from `csr-foundation`, seed, then run.
- Artifacts on run: HTML report + screenshots/trace per step in `playwright-report/`.
