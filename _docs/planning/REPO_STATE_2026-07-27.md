# Repo State Audit — 2026-07-27

Full survey of the three TTA folders on `D:\`, what's committed, what's not, and what
the backlog worktrees still hold. Everything below was verified against git and the
working tree today; no claim is from memory.

---

## 1. Folder topology

Three folders, **two** git repos.

| Folder | What it is | Repo | Branch | HEAD |
|---|---|---|---|---|
| `D:\tta_frontend-main\` | primary checkout | `ikf-tta-frontend` | `main` | `6891f79` (2026-07-06) |
| `D:\tta_frontend-main\tta_backend\` | nested, separate repo | `ikf-tta-backend` | `main` | `222f0a6` (2026-07-06) |
| `D:\tta-fe-backlog\` | **git worktree** of the frontend repo | `ikf-tta-frontend` | `backlog/courier-wo-fixes` | `9e5e027` (2026-06-30) |
| `D:\tta-be-backlog\` | **git worktree** of the backend repo | `ikf-tta-backend` | `backlog/courier-wo-fixes` | `9e4c375` (2026-06-30) |

The two backlog folders are a paired FE/BE checkout of the same branch name, created so
the parked courier/WO work could be run without disturbing `main`.

Both `main` branches are **level with `origin/main`** — nothing unpushed.

---

## 2. Verdict on the backlog worktrees: fully superseded — safe to delete

`backlog/courier-wo-fixes` is **not** an ancestor of `main`, so git reports it as
unmerged. That is misleading. The work was **re-landed on `main` on 2026-07-04 as
finer-grained commits**, not merged. Content check confirms `main` is a strict superset.

Divergence counts (`main...backlog`):

- Frontend: **42** commits only on main, **1** only on backlog
- Backend: **35** commits only on main, **2** only on backlog

### Item-by-item

| Backlog feature | Where it lives on `main` | Status |
|---|---|---|
| Courier slip: omit qty-0 rows | `1a606fe` (2026-06-16), still present in `CourierManagementPage.jsx` | on main |
| Slip rebuilt as blank base + per-item tiles | `479504c` / `5776155`, `b84b0d8` (slip-asset script) | on main |
| Courier soft-delete + super-admin restore + "Deleted" view (FE) | `479504c` / `5776155` | on main |
| Courier soft-delete + restore + `?deleted=true` (BE), migration `0003` | `438bf55` / `89057a3` | on main, migration **byte-identical** |
| WO project + city-of-project pickers and list filters (FE) | `636cd4e` / `661cb4e` | on main |
| WO `project_city` column (BE), migration `0004` | `f876e34` / `c56054a` | on main, migration **byte-identical** |
| REP card shows trial date per assignment | `Repcard.jsx:115` | on main |
| Config reads ungated for any authenticated user (BE) | `be9a3ad` / `22ccb72` — same `ReadOpenModulePermission` | on main, **plus** rename cascades the backlog never had |

Direct file diff `backlog → main` shows main is ahead on every shared file. The only path
that exists on backlog and not on main is `src/App.test.js` — the stock CRA test file,
deliberately deleted on main.

### Uncommitted work in the worktrees: none

Both worktrees show a long `git status` list, but ignoring line endings the real diff is
**zero lines** in both. It is pure CRLF↔LF churn.

`.ai/pending.md` is identical to main's copy.

**Conclusion:** neither backlog folder holds anything that isn't on `main`. They can be
removed with `git worktree remove` (or `git worktree prune` + delete) once you're
comfortable. Keep the `backlog/courier-wo-fixes` branch ref if you want the history
marker; the folders themselves are dead weight.

### Other branches

| Branch | State |
|---|---|
| `csr-foundation` | fully merged into main (13 behind) |
| `csr-merge` | fully merged into main (2 behind) |
| `backup/pre-strip-2026-06-11` | 2 commits unique to it — the only branch with anything not on main |
| two `.cursor/worktrees/` entries | detached HEAD at `b1a223f`, prunable |

---

## 3. Uncommitted work in the primary checkout

`git status` reports ~89 dirty files (FE) and ~79 (BE). **Almost all of it is noise.**

| Repo | Raw diff | Real diff (whitespace + CRLF ignored) |
|---|---|---|
| Frontend | 89 files, +30,582 / −30,485 | **6 files, +106 / −9** |
| Backend | 79 files, +9,534 / −9,320 | **12 files, +231 / −17** |

Something rewrote line endings across both trees. Deal with this before committing or
the real changes will be buried in a 40k-line diff. A `.gitattributes` with
`* text=auto` plus `git add --renormalize .` is the usual fix.

The real changes fall into two unrelated workstreams.

### Workstream A — the 2026-07-10 client bug wave (items 19–23 of `new_track.xlsx`)

Complete in code, uncommitted, untested against prod.

| # | Client report | Change |
|---|---|---|
| 19 | Bounced WO can't be identified once it moves to Past | BE: `bouncedPayments` serializer method (resolved bounces included) + `payment_requests` prefetch + `test_06_resolved_bounce_stays_in_history`. FE: grey "Bounced · resolved" chip on `WorkOrderCard`, full history block on `WorkOrderDetailView` |
| 20 | Google Drive link to upload invoice on work orders | BE: `WorkOrder.invoice_drive_link` + serializer field + **untracked migration `0005_workorder_invoice_drive_link.py`**. FE: field in `WorkOrderModal`, link in `WorkOrderDetailView` |
| 21 | "Season 6 Trials" project invisible in Admin | BE: config `bulk/` matched soft-deleted rows via `get_or_create` without flipping `is_active` back, so a re-added value stayed hidden. Now returns a `reactivated` list; test added |
| 22 | Logo/MOU disappeared again (Silchar, Ahmednagar, Tiruchirappalli) | BE: dropped `default=''` from four REP attachment serializer fields so an omitted field no longer blanks the stored value. FE: `REPModal` only sends logo/MOU when a new file was actually chosen |
| 23 | Users show "2 mod" when granted one module | BE: `grantedModules` now excludes legacy `reports`/`bank` grant rows that the grid can't display; test added |

### Workstream B — MySQL 8.4 migration + containerization (2026-07-23)

| Change | Why |
|---|---|
| `payments/migrations/0003_auto_20260403_1213.py` — AddIndex ops moved before RemoveIndex | MySQL 8 error 1553 refuses to drop an index an FK still needs. Already applied on prod MariaDB, so this only affects fresh migrates (CI, new box) |
| `config/test_rename_scenarios.py` — reads raw values instead of a case-insensitive filter | assertion was unverifiable on a case-insensitive collation |
| **Untracked** FE: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-compose.local.yml`, `nginx.conf` | Phase 1 of the container migration |
| **Untracked** BE: `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh` | same |
| **Untracked** `project_tta/` | `OPUS_CONTEXT_PROMPT.md`, `TTA_Migration_CompleteGuide.md`, `TTA_Migration_StudyGuide.md` |

Target: `47.237.115.74`, Ubuntu, Docker preinstalled, native MySQL 8.4.10, shared with
Shanu's IKF. Source: `47.245.98.149`, Ubuntu 18.04 (EOL), MariaDB 10.1.48 (EOL), disk 70%
full. Per `OPUS_CONTEXT_PROMPT.md` the compatibility verification is done — 300/300 backend
tests pass on MySQL 8.4, and the real 24 MB prod dump imports clean.

The `Dockerfile` carries a live caveat: `package-lock.json` is out of sync with
`package.json` (missing `@craco/craco` and deps), so it uses `npm install` instead of
`npm ci`. Worth regenerating and committing the lockfile.

---

## 4. Immediate hazards

1. **`auth_db_migration_2026-07-23.sql` — 24 MB of real production data, untracked and
   NOT gitignored, sitting at the frontend repo root.** One careless `git add -A` publishes
   it. Add `*.sql` to `.gitignore` first. A copy also remains on the old server at `/root/`
   where disk is 70% full.
2. **Credential exposure** (flagged in `OPUS_CONTEXT_PROMPT.md`, unresolved): a real `.env`
   is committed in the backend tree, `deploy.sh` hardcodes a DB password, and server root +
   DB passwords were shared over WhatsApp. Rotate at the end of the migration.
3. **Line-ending churn** across both trees — see §3.
4. Migration `0005_workorder_invoice_drive_link.py` is untracked while `models.py` and
   `serializers.py` already reference the field. Commit them together or a fresh clone breaks.

---

## 5. Open decisions (no code will resolve these)

From `.ai/pending.md`:

- **WO-PR-NE-001 (Neelkanth, ₹32,020) and WO-RE-FA-001 (Fast FC, ₹24,284)** — both bounced
  back to `paid_gross_amount = 0`, status `Issued`, so they sit on the active list.
  Case A (retry the payment, no code change) or Case B (add a Super-Admin-only
  "Mark as Paid (manual)" override)?

From `_docs/planning/OPEN_ITEMS_AND_DECISIONS.md` (annotated, uncommitted):

- **D-1** project-name rename strategy — annotated *"backend se kardunga"*
- **D-2** TDS double-count: run the audit on prod
- **#2** Google Drive for REP logos — which account/credentials
- **#3** courier delete/retrieve — annotated *"2 dhingsara wala"*; requirement contradicts
  itself ("nothing should ever be deleted" vs a delete feature)

From `new_track.xlsx` (sheet `0407`), still open:

- **#6 / #17** TDS shows twice on bounced payments (marked "Not Done"; #17 is the Payment
  Audit Report surface of the same bug)
- **#11** users given access that Admin didn't grant
- **#13** trial report — location still not visible
- **#14** courier trial date visible for only 3 cities
- **#24** projects changed for cities already in TTA — bulk update approach undecided

`#18` (package slip missing separately-added items) is fixed on main by `9e1daee` but is
part of the undeployed backlog.

---

## 6. Deploy gap

`FIX_PLAN_2026-07-04.md` recorded prod as sitting at the 2026-06-18 deploy
(FE `a5cce80` / BE `08a87f1`). That was accurate on 2026-07-04 and **has not been
re-verified since** — treat it as stale, not as fact.

If it still holds, everything from 2026-06-18 through `6891f79` / `222f0a6` is committed,
pushed, and **not live**: the whole CSR module, the permission cluster fixes (F1–F6), the
courier soft-delete, WO project/city, the slip rework, and the resolved-bounce work. Several
issues the client is still reporting are already fixed in undeployed code.

Confirm with `git log --oneline -1` on the server before planning anything around this.

---

## 7. Suggested order

1. Add `*.sql` to `.gitignore`; move the dump out of the repo root.
2. Normalize line endings (`.gitattributes` + `git add --renormalize .`) as its own commit
   in each repo, so the real diffs become readable.
3. Commit workstream A (client items 19–23) — FE and BE as **separate** commits, backend
   including migration `0005`.
4. Commit workstream B (MySQL 8.4 compat fixes) separately from the Docker files.
5. Verify the prod deploy point, then decide whether to deploy the 2026-07-06 backlog
   before or after the server migration.
6. Remove the two backlog worktrees.
