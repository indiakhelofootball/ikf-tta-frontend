# Move-Forward Plan — 2026-06-24 (corrected)

Single source of truth for closing out this session's TTA work. **Corrected** after
verifying against the repo (`origin/main` heads) and the live prod steps actually run
earlier in this session — the TDS work is **done and live**; only the project-name
rename feature is still pending deploy.

## Decisions locked

1. **Single owner.** One agent on the repo at a time (two agents already forced a
   migration renumber and a redundant code path). The redundant `adminStorage.js` edit
   has been reverted — the committed `AdminPage.onRename` path is the single rename path.
2. **Rename cascades to all records, including historical.** A renamed project updates
   old work orders, trial cities, and reprinted slips — matches the client's "reflect
   everywhere" ask. (Not frozen-history.)

---

## Ground truth (verified)

### DONE & LIVE on prod — TDS double-count (closed)
Verified this session, not assumed:
- `origin/main = 9596608` → commits `6928187` (void-on-bounce fix) and `9596608`
  (recover prod-only `0003_auto`, rebase `voided` as `0004`) are **pushed**.
- Prod migrate ran: `Applying payments.0004_tdsrecord_voided... OK`; `showmigrations
  payments` → all `[X]`.
- `systemctl status tta` → `active (running)` (restarted on the new code).
- Data cleanup ran: `dedupe_tds_records --apply` removed 1 legacy duplicate
  (₹3,500 reclaimed); re-audit → "TDS ledger is clean."

**Nothing left to do for TDS.** Do not re-run migrate/cleanup — they're no-ops now.

### NOT yet deployed — project-name rename cascade (the only pending work)
- **Backend `1958952`** (committed, **NOT pushed**): `/config/rename/` action that
  updates the config row in place and cascades a `project_name` change to
  `trials.trial_type`, `trialcities.trial_type`, `workorders.project_ref`
  (transactional, case-insensitive guard); `merge_project_name` command; tests.
  **No migration** — no model change.
- **Frontend `0c87337`** (committed, **NOT pushed**): `configAPI.rename`,
  `OptionPanel.onRename`, removal of the #4 in-use lock.

### Housekeeping
- `adminStorage.js` redundant edit: **reverted** (tree clean).
- Still local/untracked: held test items (`App.test.js` deletion, `blkpayExcel.test.js`),
  a stray `.mp4`, and the deploy/plan docs.

---

## Remaining sequence (rename feature only)

### Step 1 — Verify (local, real env; the sandbox truncates freshly-edited files)
```
cd D:\tta_frontend-main\tta_backend\backend
python manage.py test config.test_project_rename -v2        # expect 3 green
cd D:\tta_frontend-main
npm run lint                                                # AdminPage / api.js clean
```

### Step 2 — Deploy backend rename (push → pull → restart; NO migrate)
```
# local
cd D:\tta_frontend-main\tta_backend && git push origin main          # pushes 1958952
# server (full venv path, never `activate`)
cd /root/TTA/backend/ikf-tta-backend && git pull origin main
sudo systemctl restart tta && sudo systemctl status tta --no-pager | head -5
```
No `migrate` step — the rename feature adds no model fields. (If you run `migrate
--skip-checks` anyway it's a harmless no-op; `0004` is already applied.)

### Step 3 — Deploy frontend rename (build + upload — NOT git deploy)
```
cd D:\tta_frontend-main && git push origin main      # pushes 0c87337 (version control)
npm run build
deploy.bat                                           # or pscp build\* to /root/TTA/frontend/ikf-tta-frontend/build/
```
Note: the frontend repo already has earlier UI commits (courier slip, reports rename,
Trials Report tile) that are pushed but **never uploaded** — this build+upload makes
**all** of them live at once, including the unconfirmed courier slip redesign.

### Step 4 — Verify live
- Rename a project in Admin → confirm old trials/WOs **and** the reports now show the new
  name, with the "Updated N trials, M city records, K work orders" confirmation.
- Try renaming to an existing name → blocked.
- Reports (REP / Trial Spend / Trials) no longer split the renamed project into two.

### Step 5 — One-time cleanup (only if prod data is already fragmented)
If past renames left both names (e.g. "Trials" and "IKF Trials"):
```
/root/TTA/backend/venv/bin/python manage.py merge_project_name --from "Trials" --to "IKF Trials"          # dry-run
/root/TTA/backend/venv/bin/python manage.py merge_project_name --from "Trials" --to "IKF Trials" --apply
```

---

## Decision-blocked backlog (cannot code without answers)

| Item | Needs |
|---|---|
| #1 courier slip | client sign-off (you said "consider it right" — confirm before relying on the live slip) |
| #2 logo → Google Drive | which Google account / OAuth approval |
| #3 courier delete/retrieve | archive-and-restore, or hard delete? |
| #14 WO ↔ project/city linkage | the exact linkage rule from the owner |
| #6 / #15 bounced WO → past | lift the "wait" hold |
| Project as a real entity (FK) | the durable Phase-2 of the rename fix; gated on season↔project shape, merge, archive policy |

---

## Standing caveats
- **Sandbox can't reliably test freshly-edited files** — run tests from the real env.
- **Frontend ≠ git deploy** — UI changes go live only on `npm run build` + upload.
- **Never `git push` without an explicit ask**; never mix frontend/backend commits.
- **Migration drift** — prod has had `makemigrations`-on-server incidents; `showmigrations`
  before/after any migrate. The `0004` renumber exists because of one.
- **Grants:** assign `report_trials` via User Management or `backfill_report_grants`;
  never `backfill_permissions` (it resets every ADMIN to view+edit on all modules).
