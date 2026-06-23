# Open Items & Decisions — TTA

**Updated:** 2026-06-22
**Purpose:** Single list of everything not yet closed — status, *why* it's open, and the
*decision* needed (and from whom) so we can address them one by one.

**Deployed state right now:**
- Frontend live = `a5cce80` **plus** the REPModal Dhingsara fix (deployed 2026-06-22, working, **not yet committed**).
- Backend live = `08a87f1`.
- Companion docs: `work_timeline_execution_plan.md`, `tds_double_count_diagnosis.md`,
  `subcity_and_rep_assignment_notes.md`, `rep_logo_google_drive_plan.md`.

Status legend: **LIVE** (deployed) · **READY** (coded, uncommitted, not deployed) ·
**BLOCKED** (needs a decision/input) · **HOLD** (told to wait).

---

## A. Live but uncommitted — close the loop

| Item | What | Decision / action |
|---|---|---|
| REPModal Dhingsara fix | (1) folded "City, SubCity" now shows in the REP edit city dropdown; (2) footer **Save** now persists a pending new assignment instead of silently dropping it; (3) removed the misleading "ASSIGNED" greying for cities used in another project | **Commit** `src/components/rep/REPModal.jsx` to the frontend repo (no decision needed; just record it). |

---

## B. Coded & READY — not deployed (uncommitted)

These were written in the 2026-06-20 session and are sitting in the working tree.

### Frontend (`ikf-tta-frontend`)
| # | Item | Files | Notes |
|---|---|---|---|
| 4 | Lock rename/delete of project names already used by a trial | `AdminPage.jsx` | **See Decision D-1 — this conflicts with what the client asked on the Dhingsara call.** |
| 9 | Trial Date field in REP assignment detail | `REPDetailView.jsx` | Display only. |
| 11 | Extra trial fields on REP report | `SocialMediaReport.jsx` | |
| 13 | Rename "Social Media" → "REP Report" | `ReportsHub.jsx`, `DashboardLayout.jsx`, `DashboardHome.jsx`, `SocialMediaReport.jsx` | Labels only; path/key/grant unchanged. |
| 12 | New **Trials Report** | `TrialsReport.jsx` (new), `App.js`, `auth/roles.js`, `services/api.js`, `ReportsHub.jsx`, `DashboardLayout.jsx` | **Depends on the #12 backend below — deploy together or the tile 404s.** |

### Backend (`ikf-tta-backend`)
| # | Item | Files | Notes |
|---|---|---|---|
| 12 | `report_trials` grant + `/reports/trials/` endpoint | `permissions/registry.py`, `reports/views.py`, `reports/urls.py` | Pair with #12 frontend. |
| 8 | Trial-date backfill command | `courier/management/commands/backfill_trial_dates.py` | Fills NULL `snap_trial_date` (dry-run default). |
| 5 | TDS double-count tools | `payments/management/commands/audit_tds_duplicates.py`, `dedupe_tds_records.py` | **See Decision D-2 — must be RUN on prod, not just deployed.** |

**Deploy rule:** two separate repos, never mixed. FE commits to `ikf-tta-frontend`, BE to
`ikf-tta-backend`. #12 FE and #12 BE must ship in the same deploy window.

---

## C. BLOCKED — need a decision before any code

### D-1 — Project rename: lock, or rename-and-cascade? *(decided by: owner)*
- **Why open:** On the Dhingsara call the client renamed a project "Trials" → "IKF Trials"
  and expected it to show everywhere — it didn't, because each Trial stores the project
  name as a denormalized string (`trial_type`) at creation. Renaming the Admin dropdown
  only affects *new* trials.
- **But** item #4 (already coded) does the opposite — it **locks** renaming of in-use
  project names. These two expectations contradict.
- **Decision needed — pick one:**
  - **(a) Rename + cascade:** allow renaming an in-use project; a backfill rewrites
    `trial_type` on all matching trials. Matches what the client expects. (Replaces #4's lock.)
  - **(b) Keep the lock (#4):** no renaming once a project has trials; rename only by
    editing each trial. Simplest, but contradicts the client's ask.
  - **(c) Make project name a reference (FK to the config row):** a rename is then live
    everywhere automatically. Cleanest long-term; biggest change (model + migration + UI).
- **Recommendation:** (a) for now; (c) if we ever formalize project/city as structured data.

### D-2 — TDS double-count: run the audit on prod *(decided by: owner; action: us)*
- **Why open:** Root cause is legacy duplicate `TDSRecord`s created before fix `cf7b0d5`;
  the fix never cleaned old data. Tools are written but not run.
- **Decision/sequence:** deploy the BE commands → run `audit_tds_duplicates` (read-only) →
  review → `dedupe_tds_records` (preview) → `--apply` → re-audit. Full detail in
  `tds_double_count_diagnosis.md`.

### #1 — Courier slip format *(decided by: client)*
- **Why open:** Slip was rebuilt (`1a606fe`); client still says something's wrong but
  hasn't said *what*.
- **Decision needed:** the client must mark up the exact field/layout that's incorrect.

### #2 — REP logo on Google Drive *(decided by: owner)*
- **Why open:** Needs an OAuth / Google Workspace account decision before any integration.
  Plan exists in `rep_logo_google_drive_plan.md`; no code.
- **Decision needed:** which Google account/credentials, and confirm the approach.

### #3 — Courier delete/retrieve *(decided by: client)*
- **Why open:** Requirement contradicts itself — "nothing should ever be deleted" vs a
  delete/retrieve feature.
- **Decision needed:** confirm the intent. Likely a reversible **archive + restore**
  (super-admin only), not a hard delete. Get the author to confirm.

### #14 — Work Order ↔ project/city linkage *(decided by: owner)*
- **Why open:** Direction is "linkage should drive logic" (restrict/filter, not just
  display), but the **concrete rule** is missing.
- **Decision needed:** the exact rule — e.g. "a WO can only be raised against a city that
  exists on the selected project," etc.

---

## D. HOLD — told to wait

| # | Item | Note |
|---|---|---|
| 6 | Bounced WO moves to "past" when paid | Owner said "wait". |
| 15 | Remove bounced WO on manual paid | Paired with #6. |

---

## E. Already done & live (reference — no action)
- #7 / #10 Report-only / per-user report access — DEPLOYED. *Operational leftover:* grant
  the relevant user the `report_social_media` grant; they log out/in.

---

## Suggested order to work through this
1. Commit the **REPModal** fix (A) — record what's already live.
2. Get **D-1** decided (project rename) — it changes whether #4 ships as-is.
3. Ship the **#9 / #11 / #13** frontend batch (low-risk, display/labels).
4. Ship **#12 FE + BE together**; then run **D-2** (TDS) and **#8** backfill on prod.
5. Chase client input for **#1 / #2 / #3 / #14**.
6. Revisit **#6 / #15** when the hold lifts.
