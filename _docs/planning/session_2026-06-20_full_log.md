# Session Log — Work-Timeline Review & Execution

**Span:** 2026-06-20 → 2026-06-21
**Scope:** Analysed `work_timeline.pdf` (15 client items), built a master plan,
diagnosed #5 (TDS) in depth, executed the no-decision items, and mapped
sub-city / REP-assignment behaviour. This is the single record of everything
discussed; detailed sub-docs are cross-referenced.

**Companion docs (do not duplicate — read for depth):**
- `work_timeline_execution_plan.md` — master plan, all 15 items, status map
- `tds_double_count_diagnosis.md` — full #5 diagnosis
- `subcity_and_rep_assignment_notes.md` — sub-city / REP assignment behaviour
- `rep_logo_google_drive_plan.md` — #2 plan (pre-existing)

---

## 1. Starting state (verified, not from memory)

- Two repos in one folder: frontend → `ikf-tta-frontend`, `tta_backend/` →
  `ikf-tta-backend`. Never mix commits.
- Both branches even with `origin/main` at session start. All committed work was
  pushed.
- Frontend had uncommitted work pre-session: `SocialMediaReport.jsx` (turned out
  to be #11), `blkpayExcel.test.js`, deleted `App.test.js`, plus untracked docs
  and a stray `WhatsApp Video….mp4`.
- "Pushed yesterday before report code" question resolved: the report commits
  `b3c1e73` (FE) / `08a87f1` (BE) are committed and on origin; only the
  `SocialMediaReport.jsx` working-tree edit (#11) was unpushed.

---

## 2. The 15 items — final status this session

| # | Item | Status |
|---|------|--------|
| 1 | Courier slip format | BLOCKED — slip rebuilt `1a606fe`; need client spec on what's still wrong |
| 2 | Logo Google Drive | BLOCKED — OAuth/Workspace decision; plan exists, no code |
| 3 | Courier delete/retrieve | PARKED — requirement self-contradicts ("nothing deleted"). Interpretation: reversible archive + restore, super-admin only. Confirm with client |
| 4 | Project rename | **DONE (FE, uncommitted)** — lock rename/delete of project names already used by a trial |
| 5 | TDS double-count | PARKED on prod audit — audit + dedupe commands written |
| 6 | Bounced WO → past when paid | ON HOLD — user said "wait" |
| 7 | Report-only access | **DONE & DEPLOYED** — assign Sauksha the `report_social_media` grant |
| 8 | Trial date in courier | **DONE (BE cmd, uncommitted)** — column exists; backfill fills NULL snapshots |
| 9 | Trial dates in REP mgmt | **DONE (FE, uncommitted)** |
| 10 | Per-user report segregation | DONE (same as #7) |
| 11 | REP report extra fields | **DONE (FE, uncommitted)** — the working-tree diff is the full impl |
| 12 | New Trials Report | **DONE (FE+BE, uncommitted)** — `report_trials` grant + `/reports/trials/` endpoint + `TrialsReport.jsx` |
| 13 | Rename → REP Report | **DONE (FE, uncommitted)** — 4 labels; path/key/grant unchanged |
| 14 | WO↔project/city linkage | BLOCKED — decided "drives logic", need the concrete rule |
| 15 | Remove bounced WO on manual paid | ON HOLD — paired with #6 |

---

## 3. Decisions captured this session

- **#4 → Lock once dependencies exist.** Disable rename when a project has trials.
- **#3 → "nothing should be deleted".** User questioned the requirement itself;
  it's contradictory. Park; confirm with the timeline author.
- **#6/#15 → "wait".** On hold.
- **#14 → "drives logic".** Linkage should restrict/filter, not just display —
  but the exact rule is still needed before coding.

---

## 4. #5 TDS double-count — key findings (full detail in its own doc)

- **Root cause is architectural:** TDS lives in two un-reconciled ledgers —
  `PaymentRequest.tds_amount` (on every PR, never deduped) and `TDSRecord`
  (deduped by `cf7b0d5`).
- `cf7b0d5` already stops a second TDSRecord on retry. The **plan's first fix
  (exclude bounced from summary) was wrong** — it would undercount.
- **Two false starts, corrected by reading deeper:** (1) the "exclude bounced
  from summary" hypothesis; (2) calling V1/V2 (PaymentManagementPage footer /
  batch) "live" — they're actually LATENT because batched-then-bounced PRs are
  excluded from the active list via `sentIds`.
- **Primary live cause = V3(a): legacy duplicate TDSRecords** created before
  `cf7b0d5` deployed; the fix never cleaned old data.
- **Tools delivered (BE, uncommitted):**
  `payments/management/commands/audit_tds_duplicates.py` (read-only) and
  `dedupe_tds_records.py` (dry-run default, transactional, skips groups whose
  amounts differ).
- **Run on prod:** `cd /root/TTA/backend && /root/TTA/backend/venv/bin/python
  manage.py audit_tds_duplicates` → then `dedupe_tds_records` (preview) →
  `--apply` → re-audit. (Commands must be committed/pushed/pulled first.)
- **Process note:** "does X exist" ≠ "is my explanation of X correct." A
  header line claiming "root cause confirmed structural" was overstated and
  corrected.

---

## 5. #7 report access — why it was already done

- Backend endpoints gated by their own grant: `module_permission('report_social_media')`
  (`reports/views.py`), no operational-module grant needed.
- Routes: `GrantedRoute module="report_social_media"`; `/reports` → `anyOf REPORT_KEYS`.
- Sidebar shows Reports if user has any report grant; hub filters tiles by `canView(grant)`.
- Shipped `b3c1e73` + `08a87f1` (16 Jun), live 18 Jun — after the client's
  complaint. **Remaining = operational:** grant Sauksha `report_social_media`,
  she logs out/in.

---

## 6. Sub-city / REP assignment (full detail in its own doc)

- "Sub city" = three unrelated things: trial **Sub City** (free-text suffix
  folded into city name `"City, SubCity"`), `region` (**zone**: N/S/E/W/Central),
  courier **sub_area** (PIN locality, auto-filled).
- REP assignment is per **`(REP, Trial/project, City)`** — `unique_together`.
  Sub-city is NOT a separate column; it's inside the `city` string.
- **Mumbai vs South Mumbai:** no system clash. "South Mumbai" isn't in the
  `country-state-city` dataset (which has Mumbai, Mumbai Suburban, Navi Mumbai,
  Sion Mumbai) → enter as `Mumbai + Sub City "South"` → `"Mumbai, South"`,
  distinct from `"Mumbai"`. They **never auto-relate** — cover both = two
  assignments. Folded city string also rides into shipment `snap_city`.
- Open decision: keep sub-city folded (current) vs promote to a structured field
  (fixes grouping/linkage; model + migration change).

---

## 7. Code changed this session (all uncommitted)

**Frontend (`ikf-tta-frontend`):**
- `src/components/admin/AdminPage.jsx` — #4 lock rename/delete of in-use project names (+ `trialsAPI` import, `usedProjectNames`, `lockedNames` prop, disabled buttons with tooltip).
- `src/components/rep/REPDetailView.jsx` — #9 Trial Date field in assignment detail.
- `src/components/reports/ReportsHub.jsx` — #13 title "REP Report" + description.
- `src/components/reports/SocialMediaReport.jsx` — #13 heading "REP Report"; #11 extra trial fields (pre-existing working-tree diff).
- `src/components/layout/DashboardLayout.jsx` — #13 breadcrumb label.
- `src/components/dashboard/DashboardHome.jsx` — #13 button label.
- #12 Trials Report: `src/components/reports/TrialsReport.jsx` (new), `ReportsHub.jsx` (tile), `App.js` (route + import), `auth/roles.js` (REPORT_KEYS), `services/api.js` (`reportsAPI.trials`), `layout/DashboardLayout.jsx` (breadcrumb).
- Lint: 0 errors (only a pre-existing unused-`Paper` warning in ReportsHub).

**Backend (`ikf-tta-backend`):**
- `payments/management/commands/audit_tds_duplicates.py` — #5 read-only finder.
- `payments/management/commands/dedupe_tds_records.py` — #5 guarded cleanup.
- `courier/management/commands/backfill_trial_dates.py` — #8 NULL snap_trial_date backfill (dry-run default).
- #12 Trials Report: `permissions/registry.py` (`report_trials` in MODULES + REPORT_MODULES), `reports/views.py` (`trials_report`), `reports/urls.py` (route).
- All syntax-checked (`py_compile`).

**Docs added:** this log + the three planning docs listed at top.

**Not done:** no commits, no pushes (per house rule — push only when explicitly asked).

---

## 8. Next steps when we resume

1. **#5:** run the audit on prod (after committing/pushing/pulling the commands),
   then dedupe.
2. **#7:** assign Sauksha the `report_social_media` grant; verify.
3. **#12:** build the Trials Report (assigned trials by city+date; month-wise
   counts per project + total; assigned vs unassigned REPs). New component +
   backend aggregation endpoint + grant key + sidebar/route.
4. **#14:** get the concrete linkage rule, then build.
5. **#1 / #2 / #3:** client input needed.
6. **Commit strategy:** frontend items (#4/#9/#11/#13) → one or grouped FE
   commits; backend commands (#5/#8) → separate BE commits. Two repos, never mixed.
7. **Deploy verification:** smoke-test the 3 roles on changed screens; run the
   regression checklist in the master plan before any deploy.

---

## 9. Process notes / how to work (from this session)

- One item at a time to a clear stop; don't let one item's investigation sprawl.
- Read the actual code/write-path before asserting a root cause; verifying
  existence is not verifying correctness.
- Surface every out-of-scope or assumption before coding; flag uncommitted work.
- Decisions that change behaviour are the client's/user's to make — ask, don't guess.
