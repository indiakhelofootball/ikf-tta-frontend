# Pass 6.2 — Four-states coverage

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** which screens have no error or empty state?

## Answer

**Success and empty are well covered. Error is the missing state — and where it
exists, it is almost always a toast that disappears rather than a state the screen
holds.**

Across **31 screens**:

| State | Screens with it | |
|---|---:|---|
| Success | 31 / 31 | 100 % |
| **Empty** | **23 / 31** | 74 % |
| **Loading** | **20 / 31** | 65 % |
| **Error — held in the UI** | **8 / 31** | **26 %** |
| Error — transient toast only | 16 / 31 | 52 % |
| **No error signal at all** | **7 / 31** | **23 %** |

This is **much better than a typical vibe-coded UI**, which ships success only.
The gap is narrow and specific: an error is announced and then forgotten, so a
screen that failed to load is indistinguishable from a screen with no data — which
is Pass 4.1 seen from the user's side.

---

## The table

| Screen | Loading | Empty | Error (held) | Toast |
|---|:--:|:--:|:--:|:--:|
| `admin/AdminPage` | · | ✓ | ✓ | · |
| `bank/BankManagementPage` | · | ✓ | ✓ | ✓ |
| `client/ClientPortalPage` | ✓ | ✓ | ✓ | · |
| `courier/CourierManagementPage` | ✓ | ✓ | ✓ | · |
| `csr/CSRActivityTypesPage` | ✓ | ✓ | · | ✓ |
| `csr/CSRBrandingPage` | ✓ | ✓ | ✓ | ✓ |
| `csr/CSRClientsPage` | ✓ | ✓ | ✓ | ✓ |
| `csr/CSRProjectDetailPage` | ✓ | ✓ | · | ✓ |
| **`csr/CSRProjectDetailView`** | · | · | · | · |
| `csr/CSRProjectManagementPage` | ✓ | ✓ | · | ✓ |
| **`dashboard/DashboardHome`** | ✓ | · | · | · |
| `payments/PaymentManagementPage` | · | ✓ | · | ✓ |
| `permissions/PermissionsManagementPage` | ✓ | ✓ | · | ✓ |
| `permissions/RequestAccessPage` | ✓ | ✓ | · | ✓ |
| **`profile/ProfilePage`** | · | · | · | ✓ |
| **`rep/REPDetailView`** | · | · | · | · |
| `rep/REPManagementPage` | ✓ | ✓ | ✓ | ✓ |
| `reports/PaymentAuditReport` | ✓ | ✓ | · | ✓ |
| **`reports/ReportsHub`** | · | · | · | · |
| `reports/SocialMediaReport` | ✓ | ✓ | · | ✓ |
| `reports/TrialSpendReport` | ✓ | ✓ | · | ✓ |
| `reports/TrialsReport` | ✓ | ✓ | · | ✓ |
| `reports/VendorAuditReport` | ✓ | ✓ | · | ✓ |
| `trialCities/TrialCitiesPage` | ✓ | ✓ | ✓ | ✓ |
| `trials/ProjectDashboard` | ✓ | ✓ | · | ✓ |
| **`trials/TrialDetailView`** | · | · | · | · |
| `trials/TrialManagementPage` | ✓ | ✓ | · | ✓ |
| **`vendors/VendorDetailView`** | · | · | · | · |
| `vendors/VendorManagementPage` | ✓ | ✓ | · | ✓ |
| **`workorders/WorkOrderDetailView`** | · | · | · | · |
| `workorders/WorkOrderManagementPage` | · | ✓ | · | ✓ |

---

## Findings

### F-1 · The four reports have no error state — and they are the ones that fail — **HIGH**

`PaymentAuditReport`, `VendorAuditReport`, `TrialSpendReport`, `TrialsReport`,
`SocialMediaReport` all have loading and empty states, and a toast on failure.
**None holds an error state.**

Cross-reference Pass 4.3: these are the endpoints shipping **18 MB and 5 MB**
against a 100-second Cloudflare timeout. They are, by a wide margin, **the most
likely requests in the application to fail** — and the failure renders as:

1. spinner
2. toast appears
3. toast auto-dismisses after a few seconds
4. **an empty report table, indistinguishable from "no data for this period"**

If the user looked away during step 3, there is nothing left on screen to tell
them the report did not load. `SocialMediaReport.jsx:312` is the exact case:
`.catch(() => showToast('Failed to load REPs', 'error'))` — no state is set, so the
component keeps rendering its initial empty array forever.

**The screens most likely to fail have the least durable failure reporting.**

### F-2 · Seven screens have no error signal of any kind — **MEDIUM**

`CSRProjectDetailView` · `REPDetailView` · `TrialDetailView` · `VendorDetailView` ·
`WorkOrderDetailView` · `ReportsHub` · `DashboardHome`

Five are **detail views** — mostly presentational, receiving an object as a prop,
so "no error state" is arguably correct. But `WorkOrderDetailView.jsx:25` does
fetch, and does `.catch(() => setFullWO(null))` (Pass 4.1) — rendering a blank
panel with no explanation.

**`DashboardHome` is the one to fix.** It is the first screen after login and
fetches from up to five endpoints in parallel (`DashboardHome.jsx:44–49`). It has a
loading state and **no empty state and no error state**, so a failed dashboard load
shows zeros. Combined with Pass 4.3 (`repAPI.getAll()` with no limit → ~7.5 MB on
every dashboard load), this is a slow request whose failure renders as "you have
no data".

`ReportsHub` is a static card list and needs nothing.

### F-3 · Eleven screens have no loading state — **MEDIUM**

Notably **`PaymentManagementPage`**, **`BankManagementPage`**, and
**`WorkOrderManagementPage`** — the three busiest operational screens, and per Pass
4.3 three of the heaviest (each pulls ~5 MB of vendors).

Without a loading state the render sequence is: empty table → (seconds) → populated
table. During that gap the screen is **actively lying** — it says there are no
payments, no work orders, no pending bank items. A user who acts on that gap
reaches a wrong conclusion, and there is no visual cue that anything is in flight.

`PaymentManagementPage` does thread a `{ silent: true }` flag through
`fetchPayments` specifically to *suppress* a loading indicator on focus refetch —
so the concept exists in the code; the initial load just never got one.

### F-4 · Error state is a toast, so it is not a state — **MEDIUM (the pattern)**

16 of 31 screens report errors **only** via `showToast`/`setToast`. A toast is an
event, not a state: it fires once, auto-dismisses, and leaves the UI in whatever
(usually empty) condition it was already in.

The consequence is the thesis of this whole audit's Tier 4: **after the toast
fades, "failed" and "empty" are the same screen.** An inline empty-state that reads
*"Couldn't load payments — Retry"* instead of *"No payments yet"* would close the
gap on every one of those 16, and would be the visible half of the Pass 4.1 fix.

---

## What is done well

- **23 of 31 screens have a real empty state**, and several distinguish *kinds* of
  empty. `VendorManagementPage.jsx:384` is the best example in the codebase:

  ```jsx
  {vendors.length === 0 ? 'No vendors yet' : 'No vendors match your filters'}
  ```

  That is exactly the right instinct — it separates *empty source* from *empty
  filter*. **Extend it one step further to *empty because it failed*, and Tier 4's
  user-facing symptom is gone.**

- `ClientPortalPage` — the external funder surface — has all of loading, empty and
  a held error state. The screen shown to people outside the organisation is the
  most complete one in the app. That is the right priority.

- `courier/CourierManagementPage`, `csr/CSRBrandingPage`, `csr/CSRClientsPage`,
  `rep/REPManagementPage`, `trialCities/TrialCitiesPage` all have four-state
  coverage.

- An `ErrorBoundary` exists (`src/components/error/`) with `errorLogger.js`, so an
  uncaught render exception does not produce a white screen.

---

## ✓ Pass complete

- **Do I have a number?** 31 screens: 100 % success, 74 % empty, 65 % loading,
  **26 % held error**, 23 % with no error signal at all.
- **Have I seen one with my own eyes?** Yes — `SocialMediaReport.jsx:310–312` and
  `VendorManagementPage.jsx:384` read directly as the worst and best cases.
- **Do I know what the user experiences?** Yes — a report that failed and a report
  with no data look identical five seconds after the toast fades.

**This pass is Tier 6 and should stay last — except for one item.** F-1 (the five
report screens) is where the UI gap and the Tier 4 payload problem intersect, and
it is a small change: hold the error in state, render *"Couldn't load — Retry"* in
place of the empty table. Do that alongside the Pass 4.1 fix, not as separate work.
