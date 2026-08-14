# CSR Shell — execution plan

**Date:** 2026-08-14
**Closes:** finding D5 in `_docs/review/CSR_INTENT_VS_BUILD_2026-08-13.md` — *"Three apps became one
app with extra routes"*, raised by the owner four times on 2026-08-13.
**Status:** NOT STARTED. Needs an explicit go — this changes navigation for every CSR user.

---

## 1. Why this shape

The design specifies three platforms. Two of them are already right:

| # | Platform | Route | State |
|---|---|---|---|
| 1 | TTA (ops) | `/` | correct |
| 2 | CSR (office) | `/csr/*` | **a module inside the TTA sidebar — the entire subject of this plan** |
| 3 | CSR (funder) | `/client/*` | already its own shell, outside `DashboardLayout` (`App.js:226-231`) — no work here |

Surface 3 is done structurally. Its separate gap is the G3 bundle split (funders download the
internal JS bundle), which is a Dockerfile/nginx task, not a shell task, and is out of scope here.

So this plan touches **surface 2 only**.

The root cause is a single omission. `CSR_IMPLEMENTATION.md:86-97` calls for a `sidebar` prop on
`DashboardLayout` and calls it a "two-line change". It was never added, so `CSRSidebar` had nowhere
to mount and was never written. Every visible symptom descends from that: two flat nav items
reading as peers, no CSR menu, config stranded in Admin → Setup.

**The governing constraint** is `CSR_IMPLEMENTATION.md:113-122` — the CSR sidebar has no Payments,
Vendors, REP, Banking or Courier item, *on purpose*. TTA objects stay reachable only from inside a
project detail page, in the act of attaching one. The new sidebar must not become a door into the
ledger. This is the rule a link broke on 2026-08-13; it must survive this refactor intact.

**Deliberately unchanged: every URL.** `/csr`, `/csr/:id`, `/csr/clients`, `/csr/activity-types`,
`/csr/branding` all keep their paths. Only the chrome around them changes. This is what keeps the
existing Playwright suites valid — `e2e/csr/tests/*.spec.js` navigate by URL and assert on page
headings, never on sidebar links.

---

## 2. Step 1 — make the layout pluggable

`DashboardLayout.jsx` currently hard-imports `Sidebar` (line 6) and renders it at line 77. The
collapse state lives in the layout (`sidebarCollapsed`, line 27) and is passed down as
`collapsed` / `onToggle`.

Accept a **component reference**, not an element:

```jsx
export default function DashboardLayout({ sidebar: SidebarComponent = Sidebar }) {
  ...
  <SidebarComponent collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
```

`CSR_IMPLEMENTATION.md:69` writes it as an element (`sidebar={<CSRSidebar />}`). Do not follow that
literally: an element cannot receive `collapsed`/`onToggle` without `React.cloneElement`, which
would silently break the collapse toggle. The component form keeps the existing prop contract and
the default keeps every current call site working untouched.

Also fix while here: `pageTitles` (lines 11-20) has no `/csr` entries, so **every CSR page header
currently reads "Dashboard"**. Add the CSR paths. Note `/csr/:id` is dynamic and won't match the
exact-path lookup — either leave it falling back or resolve the title from the page.

**Risk:** `marginLeft` is hardcoded to `64 / 260` at line 79. `CSRSidebar` must reuse the existing
`Sidebar.css` widths, not invent its own, or the content pane will misalign.

---

## 3. Step 2 — extract the shared frame before writing a second sidebar

`Sidebar.jsx` holds four things a second sidebar needs identically: the brand block, the collapse
toggle, the build stamp, and a `NavItem` carrying ~25 lines of MUI `Tooltip` styling (lines 55-86).
Copy-pasting that into `CSRSidebar` guarantees the two drift.

Extract into `src/components/layout/SidebarFrame.jsx`:

- `SidebarFrame({ collapsed, onToggle, brand, children })` — renders `aside.sidebar`, the brand,
  the toggle, `nav.sidebar-nav` wrapping `children`, and the build stamp.
- `NavItem({ to, icon, label, end, collapsed })` — exported from the same file.

Then `Sidebar.jsx` becomes the same list of `NavItem`s inside `SidebarFrame`, with no behaviour
change, and `CSRSidebar.jsx` is only its own list. Do this as its own commit and verify the TTA
sidebar is byte-identical in behaviour before writing anything new.

---

## 4. Step 3 — write `CSRSidebar`

`CSR_IMPLEMENTATION.md:104-111` specifies six items, but three of them describe screens that were
built differently and are **better as built**. Reconciled list:

| Item | Route | Gate | Note |
|---|---|---|---|
| Projects | `/csr` (end) | `canView('csr')` | |
| Funders | `/csr/clients` | ADMIN / SUPER_ADMIN | renamed from "CSR Clients" — inside a CSR shell the "CSR" prefix is noise, and "Funders" is what they are |
| Activity Types | `/csr/activity-types` | ADMIN / SUPER_ADMIN | |
| Branding | `/csr/branding` | ADMIN / SUPER_ADMIN | |
| — divider — | | | |
| Back to TTA | `/dashboard` | always | |

Spec items deliberately **not** built:

- **Dashboard → `/csr`** — there is no CSR dashboard page. Building one is separate scope; listing
  a "Dashboard" that lands on the project list is worse than omitting it.
- **Activities / Reports** — the spec put these in the sidebar as `/csr/:id/activities`. They exist
  as tabs on `/csr/:id`, which is correct: they are per-project and meaningless without one
  selected. The content architecture survived; only the chrome moved. Leave them.
- **Utilisation Cert. → `/csr/utilisation`** — same reason. The built per-project tab is more
  correct than a global page. **Flagging as a decision** in case a cross-project certificate view is
  wanted later; it does not exist today.
- **CSR Admin Config → `/csr/admin`** — replaced by the two concrete config items above, which is
  what actually got built.

**"Back to TTA" is safe and necessary.** `/dashboard` carries no `GrantedRoute` (`App.js:105`), so
it is reachable by anyone. Without it an admin who entered CSR has no way out. It does not breach
containment: containment forbids linking into a TTA *module* (payments, vendors, work orders), not
returning to the ungated home.

**Containment checklist for review — the sidebar must contain no item pointing at** `/payments`,
`/vendors`, `/work-orders`, `/bank-tds`, `/courier`, `/reports`, `/rep-management`, `/trials`.

---

## 5. Step 4 — split the routes

In `App.js`, move the five `/csr/*` routes (lines 181-209) out of the shared outlet at line 104 and
into a second outlet inside the same `RequireAuth`:

```jsx
<Route element={<DashboardLayout sidebar={CSRSidebar} />}>
  {/* /csr, /csr/activity-types, /csr/clients, /csr/branding, /csr/:id */}
</Route>
```

**Order matters and is already correct — preserve it.** The static `/csr/clients`,
`/csr/activity-types` and `/csr/branding` must stay *before* the dynamic `/csr/:id`, or `clients`
will be parsed as an id. There is already a comment at line 193-194 saying exactly this; keep it.

Then remove the two CSR entries from `Sidebar.jsx` (lines 121-122) — that is the line that resolves
the "two CSRs" complaint.

**What is documented.** `CSR_PRODUCT_DESIGN.md:39` decides this for one user type only —
**TTA + CSR staff (ops team)**: *"give an existing staff user the `csr` grant and the CSR app
appears in their sidebar"*, landing on `/dashboard` (and `/csr`). So a single launcher from the TTA
sidebar into the CSR app **is** the design for the person who does both jobs.

Note the wording: *the CSR **app*** appears — singular, one door into a separate app. That is not
what shipped. What shipped is two flat module items (`Sidebar.jsx:121-122`) sitting as peers among
eleven others, which is the "two CSRs" bug. Replacing two module entries with one launcher is
therefore a *correction toward* the documented design, not a retreat from it.

**What is NOT documented — the gap.** Line 39 covers staff who work in both TTA and CSR. Type 2 is
the funder, type 3 the deferred partner. **No document describes a CSR-only operator**, so what a
user holding only the `csr` grant should see at login is unspecified. Do not invent it:

1. Single "CSR" launcher in the TTA sidebar — matches `:39` for dual-role staff, but leaves a
   CSR-only user landing on a `/dashboard` they have no grants for.
2. Post-login redirect to `/csr` for `csr`-only users, mirroring the existing `CSR_CLIENT` redirect
   — matches *"the only fork is the post-login redirect"* (`CSR_PRODUCT_DESIGN.md:34-35`).
3. Both: launcher for dual-role staff, redirect for CSR-only.

Option 3 is the only one that serves both populations, but it is the owner's call and it is not
written down anywhere. **Ask before building. This blocks Step 4.**

---

## 6. Step 5 — Admin → Setup cleanup

The pink "CSR" section in Admin → Setup holds two buttons that navigate to `/csr/activity-types`
and `/csr/branding`. Once those live in the CSR sidebar, that section is a second door to the same
screens — and it throws an admin out of the TTA shell into the CSR shell with no warning. Remove
the section, or leave it and accept the shell jump. **Decision needed.**

---

## 7. Verification

Ordinary gates:

- `npm test` (currently 82 frontend tests)
- `npm run build`
- `npm run lint` on every changed file

CSR-specific, and the part that matters:

- `e2e/csr/tests/csr-operator.spec.js` and `client-portal.spec.js` — must still pass unchanged.
  They assert on the `CSR Projects` heading and navigate by URL, so a green run is real evidence
  the URL surface did not move.
- **Test as a user holding only the `csr` grant, never as admin.** Admin bypasses grants, which is
  precisely why the 2026-08-13 containment bug survived testing. Specifically check: the four CSR
  items render with the right subset for a non-admin, `/dashboard` is still reachable, and no CSR
  sidebar item leads anywhere that 403s.
- Collapse the sidebar in both shells and confirm the content pane still aligns.

---

## 8. Sequence and cost

| Step | Commit | Risk |
|---|---|---|
| 2 — `sidebar` prop + `pageTitles` | 1 | none; default preserves behaviour |
| 3 — extract `SidebarFrame` / `NavItem` | 2 | low; pure refactor, verify TTA sidebar unchanged |
| 4 — write `CSRSidebar` | 3 | low; new file, not yet mounted |
| 5 — split routes, drop the two TTA entries | 4 | **the real one** — changes navigation for every CSR user |
| 6 — Admin Setup cleanup | 5 | low, pending decision |

Steps 2-4 are safe to land ahead of the decision in §5, because nothing changes visibly until the
routes are split.

---

## 9. Open decisions — needed before Step 4 lands

1. **How does a CSR user enter the shell?** A single launcher is documented at
   `CSR_PRODUCT_DESIGN.md:39` for dual-role TTA+CSR staff. A **CSR-only operator is described in no
   document** — launcher, post-login redirect, or both. Unspecified; ask, do not infer. See §5.
2. **Admin → Setup CSR section** — remove, or keep as a second door.
3. **A global `/csr/utilisation` page** — not built, not clearly wanted. Confirm the per-project tab
   is the final answer.

---

## 9a. Live run, 2026-08-15 — what changed after actually using it

Run locally (SQLite + `npm start`) as two purpose-made non-admin users, driven with Playwright.
This was the first time CSR had been *used* rather than read. Four things the code-reading missed:

1. **A `csr`-only user's home is a blank page.** They land on `/dashboard`, which renders "Welcome
   back, CSR Only! Role: REP" and nothing else — no tiles, no content, every login. This is the
   strongest argument for the shell, and it is stronger than anything in §1: the fix is not
   cosmetic grouping, it is that these users currently have no home.
2. **The role chip reads "REP"** in the header for a CSR operator — a side effect of `REP` being the
   default `User.role`. Cosmetic, but it is on screen next to their name.
3. **The header says "Dashboard" on every CSR page**, breadcrumb "Home / Dashboard", including
   `/csr/:id`. Confirms the `pageTitles` gap in §2 — worth fixing in the same pass.
4. **"Two CSRs" is an ADMIN-only symptom.** A non-admin `csr` user sees exactly one item, because
   `CSR Clients` is gated by `isAdminOrSuper` (`Sidebar.jsx:122`). The duplicate that prompted this
   plan never appears for the operator it was assumed to confuse.

**Containment verified holding:** Overview renders WORK ORDER / CONTRACT as plain text with no link
out, and `/csr/clients`, `/csr/activity-types`, `/csr/branding` all correctly redirect a non-admin
to `/unauthorized`.

**And the finding that outranks this whole plan.** As `csr` + `csr_certificate` and nothing else —
the separation-of-duties operator the client asked for — `GET /api/payment-requests/?limit=1000`
returns **403**, and the Tag Expense picker renders **zero options with no error at all**, under
helper text still reading *"A payment can be tagged to only one project."* That user cannot tag a
single payment, and is told nothing. E1 confirms alongside it: the delete icon renders and returns
`403 DELETE /api/csr/expense-tags/3/` with a red permission toast.

Navigation chrome is worth fixing. It is not worth fixing before the role that the certificate
exists to serve can perform its one job.

---

## 10. What this plan does not fix

Ranked above this by the same report, and untouched here:

- **D1/E3** — the "one payment, one project" audit rule is enforced by a 500, not a validator.
- **E2** — a `csr` + `csr_certificate` operator sees an empty payment picker (swallowed 403), which
  defeats the separation of duties the rule was written for.
- **A2/G3** — funders download the internal bundle.
- **The work-order substitution** — the inbound grant contract still lives in the outbound
  vendor-payable table.

The shell work is navigation. None of the above is.
