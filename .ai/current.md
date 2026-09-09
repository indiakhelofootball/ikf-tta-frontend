# Current — what is in flight

**Last verified: 2026-09-09.** If that date is more than a few days old, treat
every line below as a claim to re-check, not as fact.

**This file holds no git state.** Branch, HEAD and dirty files are computed at
session start by `.claude/hooks/session_start.py`. This file holds only what git
cannot know: intent, decisions, and blockers.

---

## START HERE

`_docs/testing/SESSION_2026-09-08.md` is the record of the 08 Sept session.
Today's work is below and supersedes its "courier dates" section.

**Production: frontend `9fde89c` on `hotfix/courier-actions-clip`, backend
`50a5c9f`.** That frontend is the 07 Sept build plus ONE commit — the courier
clip fix — and nothing else. Confirm with
`curl https://tta.indiakhelofootball.com/release.txt`.

**14 frontend + 8 backend commits remain built and undeployed** on
`deploy/courier-fix` / `deploy/reps-test`.

---

## The first thing to do

**Ask Sanskriti to confirm the courier action buttons are back.** The fix is in
the served bundle (verified), but nobody has looked at the screen. Cloudflare
fronts this origin, so a hard refresh may be needed.

---

## What happened on 09 Sept

Sanskriti reported two things at once. They were unrelated, and treating them as
one is what made the day long.

**1. Courier action buttons vanished (PDF / Edit / Dispatch / Delete).**
NOT a regression and NOT the deploy. `CourierManagementPage.jsx` wraps its table
in a `Paper` with `overflow:'hidden'` and no scroll container, so once the table
is wider than the window the last column is clipped with no scrollbar. Two
shipments were dispatched that morning, filling AWB and Courier with a tracking
number and a full URL — enough extra width to push the actions off a laptop
viewport. Fixed by an inner `Box sx={{overflowX:'auto'}}` + `minWidth:980`.
Deployed ALONE as `9fde89c`.

**2. Trial date blank on Courier — the four August orphans. ALL NOW CLOSED.**
The question in `.ai/pending.md` was wrong. It asked *"should the trial run in
that city?"*, which had no answer because nobody had removed anything. The
answerable question is **"which project does this assignment belong to?"**
Details and the per-city reasoning are in the `orphaned-rep-assignments` memory.

    asgn 75  Thiruvananthapuram  IKF-S6-001 -> TRI-S6-001   (date 26 Sep)
    asgn 22  Bikaner             TRI-S6-001 -> IKF-S6-008   (date 06 Sep)
    asgn 21  Kota                TRI-S6-001 -> IKF-S6-006   (date 10 Jul)
    deleted  asgn 72             empty duplicate, 0 shipments
    wrote snap_trial_date on CR-2026-0061 / 0040 / 0009 (frozen terminal rows)

**Measured after, on production:** orphaned assignments **0** (was 4) · courier
41 of 48 showing a date, the 7 blanks all have `assignment=None` and are
unrecoverable · Trials Report orphan banner **gone**, addresses 60 -> 64,
no-REP 75 -> 73.

---

## Open — needs an owner decision

- **Kota's date is not trustworthy.** `CR-2026-0009` now reads `2026-07-10`,
  written on the owner's instruction after the objection was stated twice. That
  value was DERIVED from month `July` by `ProjectDashboard.jsx` (any date on the
  10th is generated; 31 rows share it) and its TrialCity row is
  `confirmed=False`. Nothing on screen says so. If the real date surfaces,
  correct `CR-2026-0009.snap_trial_date` AND the TrialCity row.
- **41 report rows have a REP but no ground address.** The two request docx at
  the repo root cover them. Bikaner is now one of these — that record only ever
  held a courier address.
- **73 trial cities have no REP.** Scheduling, not data entry.
- **Season 6** — the project is still NAMED `Trials`. Rename it in Admin.
- **The 8 stored month/date contradictions.** Needs a decision, not a rule —
  see the revert `8222774`.
- **"Analysis numbers wrong"** — still NOT REPRODUCIBLE. Needs Nirja to name the
  figure.

## Known, not fixed

- **Nothing validates that `REPCityAssignment.city` exists in
  `assignment.trial`.** The city is free text with no FK, so today's root cause
  can recur tomorrow. See `.ai/schema-integrity.md`.
- **`courierShipmentFlag.js` returns `null` when `snapTrialDate` is null**, so
  the one row nobody can date is the only row with NO warning triangle. The
  failure renders as an innocent `—`. This is why it reached the owner as a
  fresh bug three times instead of as a visible state.
- **Bulk CSV upload** dedupes against a REP list capped at 100.
- **`reps/admin.py`** restricts no fields; a superuser bypasses every guard.
- **`courier_sub_area` is not reliable data.**

## Do not re-derive

- **The 7 dateless courier shipments have no assignment at all** — no project,
  no city, nothing to read from. No backfill reaches them. Do not re-open.
- Duplicate cities: **zero** within a project. Bikaner appearing under both
  `IKF-S6-006` and `IKF-S6-008` is two programmes sharing a city, and correct.
- `trialcities.TrialCityLocation` has **0 rows**.
- 5 shipments carry a trial date earlier than their creation date
  (`CR-2026-0006/0008/0011/0012/0014`). Historical rows entered late, backfilled
  07 Sept. Not a defect.

## A process fact from today, do not repeat

A deploy ran even though the tool reported the call as REJECTED. The full
15 FE + 8 BE bundle went live at 08:27 UTC unnoticed; the next deploy's
live-version gate caught it and the owner asked for a rollback, which restored
`247747c`/`50a5c9f` with **zero data loss** (census re-verified: 66 orgs, 64
logos, 18 MoUs, 0 wipe fingerprints). **Check `/release.txt` before assuming a
deploy did not happen.**
