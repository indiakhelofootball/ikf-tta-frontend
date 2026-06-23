# Work Timeline — Execution & Verification Plan

**Source:** `work_timeline.pdf` (client feedback, 16–17 Jun 2026)
**Created:** 2026-06-20
**Verified:** 2026-06-20 — all referenced files, functions, statuses, endpoints, and commits confirmed to exist against the code. #5 root cause confirmed structural (bounced PR's TDSRecord lingers and is summed by `summary()`).
**Status:** Planning. No code written from this doc yet.

This is the master plan for the 15 timeline items. Each item lists: what's
asked, the files involved, the approach, any decision still owed by the client,
how to execute, and how to verify it works.

---

## 0. Ground rules (apply to every item)

- **Two repos, never mixed.** Frontend → `ikf-tta-frontend`. Backend
  (`tta_backend/`) → `ikf-tta-backend`. Separate commits, separate pushes.
- **No `git push`** unless explicitly asked in that turn.
- **Verify against code, not memory** — for any DB/migration claim, open the
  migration file and quote the operation.
- **Deploy:** frontend = `npm run build` then `deploy.bat`. Backend = push →
  pull on server → migrate → `sudo systemctl restart tta`.
- **Before touching financial code (#5), read the full path first.** TDS and
  bounce logic already has one prior fix (`cf7b0d5`); don't re-break it.

### Pre-existing uncommitted state (resolve before starting)
- `M src/components/reports/SocialMediaReport.jsx` — uncommitted report edit.
  Decide: finish & commit, or stash. Don't build on top of an unknown diff.
- `M src/utils/blkpayExcel.test.js`, `D src/App.test.js` — test fixups.
- Untracked docs + a stray `WhatsApp Video….mp4` (delete the video).

---

## 1. Decisions owed by client (BLOCKERS — resolve before coding the item)

| # | Item | Question |
|---|------|----------|
| 3 | Courier delete | "Nothing is deleted, kept in past courier." So is this **soft-delete/archive** or a **true hard-delete** for super-admin? |
| 4 | Project rename | Rule was "don't rename after creation." If rename IS allowed after cities/WOs exist, do we **cascade the rename everywhere**, or **block rename once dependencies exist**? |
| 14 | WO↔project/city linkage | **View-only**, or does the link drive logic/filtering? |
| 15 | Bounced WO removal | Same constraint as #3 ("goes to past payment, nothing deleted"). Confirm this means **hide from active list**, not delete. |

Everything else can proceed without a decision.

---

## 2. Consolidated work packages

Several items are the same feature stated twice. Build them as one package each.

- **PKG-A Report access decoupling** = #7 + #10 + #1(Sauksha)
- **PKG-B Reports content/structure** = #11 + #12 + #13
- **PKG-C Bounced WO lifecycle** = #6 + #15
- **PKG-D Courier** = #1(slip format) + #3 + #8
- **PKG-E REP Management** = #9 + #2(logo Drive link — see existing plan)
- **PKG-F Financial fix** = #5 (TDS double-count) — standalone, top priority
- **PKG-G Project rename** = #4 — standalone, needs decision

---

## 3. Execution order (by risk/urgency)

1. **PKG-F #5 TDS double-count** — financial correctness, "asap"
2. **PKG-A report access** — operations blocked (Sauksha can't work)
3. **PKG-G #4 project rename** — can block new project creation (needs decision)
4. **PKG-B reports content** — #11/#12/#13
5. **PKG-D courier** — #1/#3/#8
6. **PKG-C bounced WO lifecycle** — #6/#15
7. **PKG-E REP mgmt** — #9, then #2

---

## PKG-F — #5 TDS deducted/shown twice on bounced payments

**Symptom:** bounced-payment TDS appears twice → total TDS collection wrong.
**Likely cause (verify):** the prior fix `cf7b0d5` stopped a *second* TDSRecord
being auto-created on retry, but the **TDS summary aggregation still sums the
bounced PR's lingering TDSRecord** alongside the retry's record.

**Files to read first (do not skip):**
- `tta_backend/backend/payments/views.py` — `TDSRecordViewSet`, the summary
  action (~lines 126–184, `TDSRecord.objects.all()` + `Sum('tds_amount')`).
- `tta_backend/backend/payments/models.py` — `TDSRecord` (OneToOne→PR, CASCADE),
  `PaymentRequest.status` values incl. `Payment Bounced`.
- `tta_backend/backend/workorders/views.py` `resolve_bounced` — confirms bounced
  PRs reverse gross but TDSRecord may persist until WO removed.

**Approach:** exclude TDS records belonging to bounced PRs from the summary
totals (and the TDS list), e.g. `.exclude(payment_request__status='Payment
Bounced')`. Confirm this is the right semantic with the actual data before
writing.

**Execute:**
1. Reproduce: find/create a vendor with a bounced-then-retried PR; hit the TDS
   summary endpoint and confirm the doubled figure.
2. Patch the queryset(s) in `payments/views.py`.
3. Adjust/extend `payments/tests.py` to assert bounced TDS is excluded.

**Verify:**
- `python manage.py test payments` (use full venv path on server).
- Locally: TDS summary total = sum of non-bounced TDSRecords only.
- Spot-check frontend TDS display (`VendorStatementDialog`, TDS report) shows
  the corrected total.

---

## PKG-A — Report access decoupling (#7, #10, #1 Sauksha)

**Ask:** a user granted a single report (e.g. Social Media) must view *that
report only*, without needing view access to any other module.

**Status:** plumbing partly exists — backend `08a87f1` and frontend `b3c1e73`
("per-report grants + dedicated endpoints"). This item is to **close the gap**
where report view still requires module REP-access.

**Files to read first:**
- `src/components/reports/ReportsHub.jsx`, `flagEngine.js`
- `src/auth/roles.js`, `ProtectedComponent.jsx`, `RoleBasedRoute`
- Backend permissions app (grant-based enforcement, `6647f8b`) + the report
  endpoints added in `08a87f1`.

**Execute:**
1. Confirm exactly which gate blocks Sauksha (route guard vs. module permission
   check inside ReportsHub).
2. Make per-report grants sufficient on their own to render that one report;
   remove the implicit module-view dependency.
3. Re-test with a REP user who has ONLY the Social Media (REP) report grant.

**Verify:**
- Log in as a single-report user → sees only that report, nothing else.
- A user with no report grants → sees no reports, no errors.
- Existing multi-grant admins unaffected.

---

## PKG-G — #4 Project rename not propagating

**Symptom:** renaming a project leaves already-signed cities showing the old
name → rename effectively broken.

**DECISION REQUIRED (see §1).** Two viable paths:
- **(a) Cascade:** rename updates every dependent reference (cities, WOs, etc.).
- **(b) Lock:** once a project has dependencies, disable rename in the UI.

**Files to read first:**
- `src/components/admin/AdminPage.jsx` (project config CRUD)
- `src/components/trials/TrialWizard.jsx` (where project name attaches to city)
- Backend `config` app model/serializer (the `project_name` config value) and
  wherever project name is **stored as a string vs. referenced by id**. The root
  cause is almost certainly **denormalized name copies** rather than a FK.

**Execute:** depends on decision. If cascade, find every stored copy of the
name; if lock, gate the edit control on a dependency check.

**Verify:** rename a project that has signed cities → cities reflect new name
(cascade) OR rename control is disabled with a clear tooltip (lock). No orphaned
old-name references anywhere (trials, WOs, reports).

---

## PKG-B — Reports content & structure (#11, #12, #13)

**#13 Rename "Social Media Report" → "REP Report"** (label/route/tab only).
- Files: `ReportsHub.jsx`, `SocialMediaReport.jsx`, any nav label + the report
  key used by grants (rename label, keep the grant key stable or migrate it).
- Verify: tab shows "REP Report"; existing grants still resolve.

**#11 Social Media (REP) Report — add fields:** Trial Address, Trial Contact,
Trial Time, Trial Date.
- Files: `SocialMediaReport.jsx` + the report endpoint serializer feeding it.
  Confirm these fields exist on the trial model before adding columns.
- Verify: columns populate for trials that have the data; blank-safe otherwise.

**#12 New "Trials Report":**
- Assigned trials in one place with city + date.
- Month-wise trial counts per project + grand total.
- Assigned vs. unassigned REPs.
- Files: new `src/components/reports/TrialsReport.jsx`, register in
  `ReportsHub.jsx`, add a grant key, new backend report endpoint (mirror the
  pattern from `08a87f1`).
- Verify: counts reconcile against raw trial data; project grouping correct;
  unassigned REPs listed separately.

---

## PKG-D — Courier (#1, #3, #8)

**#1 Courier slip not in required format.**
- Note: slip PDF was rebuilt `1a606fe` ("pixel-identical package slip"). Confirm
  with the client *what specifically* is wrong vs. the courier's required
  format before changing — this may be a spec mismatch, not a bug.
- Files: `src/components/courier/CourierManagementPage.jsx`,
  `courierSlipAssets.js`, `ikfLogo.js`.

**#8 Trial date not visible in courier.**
- Files: `CourierManagementPage.jsx` (+ the courier serializer if the date isn't
  in the payload). Add trial date to the courier row/slip.
- Verify: each courier entry shows its trial date.

**#3 Super-admin delete/retrieve courier entry — DECISION REQUIRED (§1).**
- If soft-delete: add archived flag + "past courier" view + restore.
- If hard-delete: super-admin-only action with confirm.
- Files: courier backend (`courier` app) view/permissions + the page UI.
- Verify: only super-admin sees the action; deleted/archived entries behave per
  the chosen semantic; non-super-admins blocked.

---

## PKG-C — Bounced WO lifecycle (#6, #15)

**Ask:** once a bounced WO is fully paid (via manual paid entry), move it out of
the active Work Order section into past work orders. Constraint: nothing is
deleted; it lives in past payment.

**Files to read first:**
- `src/components/workorders/WorkOrderManagementPage.jsx`,
  `WorkOrderCard.jsx`, `workOrderData.js` (`isWOFullyPaid`,
  `getWORemainingGross`).
- Backend `workorders/views.py` (`resolve_bounced`, status handling),
  `serializers.py`.

**Approach:** filter fully-paid (incl. previously-bounced-now-paid) WOs out of
the active list into a "Past" view, rather than deleting. Reconcile with
existing `resolve_bounced` (which *hard-deletes* bounced-only WOs) — confirm the
client wants *archive*, not delete, here.

**Verify:** a bounced WO marked fully paid disappears from active, appears in
past; its payment history intact; nothing removed from the DB.

---

## PKG-E — REP Management (#9, #2)

**#9 Show trial dates per REP in REP Management.**
- Files: `src/components/rep/` (REP card/detail), the REP serializer — confirm
  the REP→trials relation is exposed; add dates to the REP view.
- Verify: each REP shows the dates of their assigned trials.

**#2 Google Drive link for logos — see existing plan**
`_docs/planning/rep_logo_google_drive_plan.md` (status: planned, OPEN item:
Google Workspace org / OAuth scope). Do not duplicate; execute from that doc.

---

## 4. Global regression checklist (run before each deploy)

- `npm run lint` and `npm test` (frontend) — green, or known-failing files noted.
- `python manage.py test <app>` for any touched backend app (full venv path).
- Smoke test the three roles: SUPER_ADMIN, ADMIN, REP — login + the changed
  screen renders, no console errors.
- Confirm no frontend+backend changes share a commit.

## 5. Deploy & rollback

- **Frontend:** `npm run build` → `deploy.bat` (scp to server, nginx serves
  immediately). Rollback = redeploy previous build.
- **Backend:** push → pull on server → `migrate` → `sudo systemctl restart tta`.
  Rollback = revert commit, pull, restart; reverse migration only if schema
  changed.
- After deploy, re-verify the specific item live (Playwright prod check per the
  existing local-demo/prod pattern).

---

## 6. Quick status map (updated 2026-06-20)

| # | Item | Status |
|---|------|--------|
| 1 | Courier slip format | BLOCKED — need client spec on what's wrong vs `1a606fe` |
| 2 | Logo Google Drive | BLOCKED — OAuth/Workspace decision; plan doc exists, no code |
| 3 | Courier delete/retrieve | PARKED — requirement contradicts itself ("nothing deleted"); confirm with client. Interpretation: reversible archive + restore, super-admin only |
| 4 | Project rename | **DONE (frontend, uncommitted)** — lock rename/delete of project names already used by a trial (`AdminPage.jsx`) |
| 5 | TDS double-count | PARKED — audit + dedupe commands written; run `audit_tds_duplicates` on prod |
| 6 | Bounced WO → past when paid | ON HOLD — user said "wait" |
| 7 | Report-only access | **DONE & DEPLOYED** (`08a87f1`/`b3c1e73`); assign Sauksha the `report_social_media` grant |
| 8 | Trial date in courier | **DONE (backend cmd, uncommitted)** — column already exists; `backfill_trial_dates` fills NULL snapshots on old rows |
| 9 | Trial dates in REP mgmt | **DONE (frontend, uncommitted)** — `REPDetailView.jsx` |
| 10 | Per-user report segregation | DONE (same as #7) |
| 11 | REP report extra fields | **DONE (frontend, uncommitted)** — the working-tree `SocialMediaReport.jsx` diff |
| 12 | New Trials Report | **DONE (FE+BE, uncommitted)** — new `report_trials` grant, `/reports/trials/` endpoint, `TrialsReport.jsx` (month-wise matrix + assigned/unassigned per trial city) |
| 13 | Rename → REP Report | **DONE (frontend, uncommitted)** — 4 label sites |
| 14 | WO↔project/city linkage | BLOCKED — decided "drives logic", but needs the concrete rule |
| 15 | Remove bounced WO on manual paid | ON HOLD — paired with #6 |

### Uncommitted work this session
- Frontend (`ikf-tta-frontend`): `AdminPage.jsx` (#4), `REPDetailView.jsx` (#9),
  `ReportsHub.jsx` + `SocialMediaReport.jsx` + `DashboardLayout.jsx` +
  `DashboardHome.jsx` (#13), `SocialMediaReport.jsx` (#11), plus pre-existing
  test fixups.
- Backend (`ikf-tta-backend`): `payments/management/commands/audit_tds_duplicates.py`,
  `dedupe_tds_records.py` (#5), `courier/management/commands/backfill_trial_dates.py` (#8).
- Nothing committed or pushed.
