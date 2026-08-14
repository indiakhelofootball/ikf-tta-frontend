# CSR — UI/UX review

**What this is:** the interface review I had not done. Every CSR and client-portal component read
end to end, plus the layout shell and the theme. Assessed for validation, error/empty/loading
states, destructive actions, copy, contrast, responsiveness and consistency.

**Standing correction first**, because it changes something I already told you — see §0.

---

## 0. A correction to my earlier report

I claimed (finding **D3**, and defect **#5** on the flow chart) that *"a report can be published with
a blank URL, so the funder sees a row with nothing to open."*

**That is wrong at the UI level.** `CSRReportModal.jsx:34` validates it:

```js
if (!form.fileUrl.trim()) next.fileUrl = 'Paste the document link';
```

An operator cannot save a report without a link. The backend still permits it
(`fileUrl` is `allow_blank=True`), so the hole is real but only reachable through the API, Django
admin, or a data import — not through the product. I inferred an operator-facing defect from a
serializer flag without opening the form. **The finding drops from "operator-facing bug" to
"backend permits what the UI forbids"** — worth closing, not worth ranking.

This is the third finding of mine that only survived because I hadn't read the interface. It is the
direct answer to your question: no, I had not analysed the UI/UX, and it cost accuracy.

---

## 1. The headline: white-label branding produces unreadable buttons

This is the most serious UI defect in the module, and it sits in the one part of the product that
received real design attention.

`clientTheme.js` swaps the funder's brand colour into the palette:

```js
primary: { ...muiTheme.palette.primary, main: brand.primaryColor }
```

The spread is the bug. It carries the **base theme's `contrastText` across unchanged.** The base
theme is amber, so `primary.contrastText` is `#111827` (near-black) and
`secondary.contrastText` is `#FFFFFF` (white). Those are correct *for amber and green*. They are
inherited verbatim by every funder, whatever colour they chose.

Measured WCAG contrast of button label against button fill:

| Brand primary | Inherited label | Ratio | |
|---|---|---|---|
| `#0B5FFF` — **the branding form's own placeholder** | `#111827` | **3.46 : 1** | fails AA |
| `#1A2B5C` corporate navy | `#111827` | **1.30 : 1** | effectively invisible |
| `#8B0000` deep red | `#111827` | **1.77 : 1** | fails |
| `#4A3AA7` purple | `#111827` | **2.07 : 1** | fails |

| Brand secondary | Inherited label | Ratio | |
|---|---|---|---|
| `#22C55E` — **the form's own placeholder** | `#FFFFFF` | **2.28 : 1** | fails (also fails in the base theme) |
| `#FDE68A` light gold | `#FFFFFF` | **1.25 : 1** | invisible |
| `#E5E7EB` light grey | `#FFFFFF` | **1.24 : 1** | invisible |

Two things make this worse than a normal contrast bug:

- **The form's own placeholder values trigger it.** An admin who follows the hint text `#0B5FFF`
  ships a failing button.
- **Dark corporate blues and reds are the most likely brand colours a funder will give you** — and
  they are the worst cases.

Compounding it, `CSRBrandingPage.jsx:148-149` takes the colours as **free text** with no colour
picker, no hex validation and no contrast check. `validate()` covers `projectId`, `slug` and
`displayName` only. Type `blue`, `#GGG`, or nothing at all and it saves.

The fix is to stop spreading — MUI computes `contrastText` itself when the key is absent — plus a
contrast check in the branding form. But the important part is the principle: **the one feature
whose entire promise is "it will look like your brand" has no check that the result is legible.**

---

## 2. Form and validation audit — all six modals

| Modal | Required fields | What is *not* validated |
|---|---|---|
| **Project** | name, client, amount | amount accepts **negatives** (`Number.isNaN` only — `-500000` saves); no end-after-start check; no max length on any field |
| **Activity** | title, activity type | no start/end ordering check; `date` and `start/end` can both be set at once with no rule for which wins; location unbounded |
| **Report** | name, URL ✅ | **URL format never checked** — `"asdf"` saves as a document link and renders as a dead link to the funder |
| **Contact** | name | **email has no `type="email"` and no format check**; phone unvalidated — this is the roster you use to reach the funder |
| **Expense tag** | payment *or* amount | manual amount accepts negatives; already-tagged payments are **not filtered out** of the picker, so the only way to discover a conflict is to submit and hit the 500 |
| **Branding** | project, slug, name | colours, logo URL, login-image URL — all free text, none validated |

Two patterns across the set:

- **Nothing that accepts a URL validates that it is a URL** — report links, logo, login image. Every
  one of these renders to an external audience.
- **Errors are placed on the wrong control in two places.** `ClientChangePasswordDialog` binds its
  single `error` string to the *third* field, so *"New password must be at least 8 characters"*
  appears under **"Confirm new password"**. `CSRContactModal` does the same with its single error.

---

## 3. Empty, loading and error states

**The best empty state in the module** is `CSRActivityModal`: when no activity types exist it
disables the select, disables Save, and says *"No activity types defined yet — add them in the
catalog first."* That is exactly right — it names the blocker and the fix. It is also the only
place that does this.

Everywhere else:

- **Search-empty and data-empty share one message.** `CSRProjectManagementPage:129` renders
  *"No CSR projects yet."* both when you have none and when your search matched none. Search "zzz"
  in a list of forty projects and the app tells you the list is empty.
- **The five detail tabs each say "No X yet."** and nothing else. A brand-new project — which is
  what an operator sees on every first visit — is five dead ends with no next action offered. There
  is no "Add the first activity" affordance in the empty state, though the button exists above it.
- **The funder's empty state is the weakest of all.** *"No activities published yet."* to an
  external executive who has just logged in for the first time, with no indication of whether that
  means *nothing has happened yet*, *nothing has been approved yet*, or *something is broken*.
- **Loading is a bare spinner** in every case — no skeletons, no layout reservation, so the page
  jumps when data lands.
- **Failures are toasts that vanish after 4 seconds** and leave the screen in its empty state, so a
  load failure and a genuinely empty list look identical five seconds later.

---

## 4. Destructive actions

Every delete in CSR uses `window.confirm()` — the raw browser dialog — while every other dialog in
the app is MUI. Five instances: project, activity, report, contact, expense tag, activity type.

Beyond the visual inconsistency:

- **Delete sits immediately beside Edit**, same size, same default colour, no red, on
  `CSRProjectCard` (four icon buttons in a row) and in every list row. One mis-click apart.
- **Only the project confirm warns about consequence** (*"This cannot be undone"*). Deleting a
  project cascades to its activities, reports, contacts and expense tags — the confirm does not say
  so, and does not say how many.
- **Three deletes can return a 500.** `CSRActivityType`, `WorkOrder` and `PaymentRequest` are all
  referenced with `on_delete=PROTECT`, and there is **no `ProtectedError` handling anywhere in the
  csr app**. Deleting an activity type that is in use, or a work order linked to a CSR project,
  raises `ProtectedError` → unhandled 500 → the toast shows a generic failure instead of *"3
  activities use this type."*
- **And the expense-tag delete cannot succeed at all** for any non-super user (the registry forbids
  it) — covered in the earlier report as E1.

---

## 5. The funder's experience — the user with no training and no support

This is the surface that matters most and got the least behavioural attention.

- **There is no password reset.** The portal has a change-password dialog, reachable only *after*
  logging in. A funder who forgets their password has no route back — no "forgot password" link on
  `ClientLogin`, no email flow. Their only recourse is to phone IKF. For an external corporate user
  who signs in perhaps twice a year, forgetting is the *expected* case, not the edge case.
- **A wrong or stale portal link fails silently.** `ClientLogin` catches a branding lookup failure
  and sets `brand = null`, so an unrecognised slug renders a generic unbranded "CSR Portal" login
  with no explanation. The funder cannot tell whether they have the wrong link or the branding is
  simply missing.
- **Changing the password now signs out their other sessions** (added in the 13 Aug work) and the
  dialog does not say so.
- **No email address is shown anywhere** in the portal — no "questions? contact…". The funder has
  no in-product route to a human.
- **They are never told a report exists.** Publishing is silent; they have to log in and check.
- **The portal has zero responsive handling.** Not one `xs:` breakpoint across `ClientPortalPage`,
  `ClientLogin` or `ClientChangePasswordDialog`, and the portal renders outside `DashboardLayout`
  so it does not inherit the shell's breakpoints either. The AppBar carries a title plus
  *"Change password"* and *"Sign out"* buttons with no collapse. A corporate executive opening a
  link on a phone is the single most likely way this portal is ever used.

For comparison, the internal components do carry some responsive intent — `xs:`/`sm:` props appear
in 8 of the 12 CSR components, and the shell CSS has breakpoints at 1280, 768 and 480px.
**The care ran out exactly at the boundary where the external user starts.**

---

## 6. Consistency

- Six modals, four different validation idioms: an `errors` object keyed by field (Project,
  Activity, Report, Branding), a single `error` string (Contact, ChangePassword), a single `error`
  reused for two unrelated fields (ExpenseTag), and one modal that disables Save on a precondition
  (Activity).
- Save buttons are labelled **"Save"** in five modals and **"Tag"** in the expense modal.
- Cancel is **"Cancel"** everywhere and **"Close"** in ChangePassword.
- `CSRProjectDetailPage` and `CSRProjectCard` both render the project overview, via the same
  `CSRProjectDetailView` — that one is done well.
- The page header reads **"Dashboard"** on every CSR screen, because `pageTitles` in
  `DashboardLayout.jsx` never got the routes. Twelve-plus routes are affected, not just CSR.

---

## 7. What is actually good

Not a courtesy section — these are decisions worth keeping:

- **The activity-type empty state** (§3) is the single best interaction in the module.
- **The Utilisation tab's exclusion warning** — *"2 tagged expenses are not counted — the payment has
  not completed"* — names the count, the cause, and shows the excluded rows with their status
  instead of silently shrinking the total. That is a genuinely well-designed money UI.
- **`useRefetchOnFocus`** on the project list: come back to the tab, the data is current.
- **The multi-month date fields** carry a helper explaining *why* they exist (*"for programmes that
  run over months, e.g. a 6-month training"*) — the requirement is written into the form.
- **The client allowlist** means the portal cannot leak by omission — a UI safety property, not just
  a backend one.
- **Sidebar absence as a scope boundary** (no Payments/Vendors/REP tabs in CSR) remains the sharpest
  IA decision in the project.

---

## 8. Ranked

| # | Finding | Why it ranks here |
|---|---|---|
| 1 | **White-label contrast** — brand colours inherit the wrong `contrastText`; the form's own placeholders fail | The feature's whole promise is legibility in someone else's colours; it ships unreadable buttons to your most visible external audience |
| 2 | **No password reset for the funder** | An external user with no support channel, signing in twice a year, has no way back in |
| 3 | **Funder portal has no responsive handling at all** | The most likely device for the most important external user |
| 4 | **PROTECT deletes return unhandled 500s** (activity type, work order, payment) | Same defect class as the duplicate-tag 500 — a correct DB rule with no API voice |
| 5 | **No URL validation on any link field** | Every one of them renders to the funder |
| 6 | **Search-empty vs data-empty share a message** | Actively misleading, one-line fix |
| 7 | **`window.confirm` for six destructive actions; delete beside edit, undifferentiated** | Consistency and mis-click risk |
| 8 | **Errors bound to the wrong field** in two dialogs | Small, cheap, visible |
| 9 | **Empty states offer no next action** | The first thing an operator sees on every new project |
| 10 | **Contact email/phone unvalidated** | It is the roster you use to reach the funder |

Items 1–3 are all on the funder's side. That is the pattern of this review: **the internal operator
surface is competently built and inconsistent; the external surface is well-protected and
under-designed.** The funder is the only user in this system with no training, no support and no
second chance — and their side got the most careful *security* work and the least careful
*interaction* work.
