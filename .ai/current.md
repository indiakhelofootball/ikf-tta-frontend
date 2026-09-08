# Current — what is in flight

**Last verified: 2026-09-08.** If that date is more than a few days old, treat
every line below as a claim to re-check, not as fact.

**This file holds no git state.** Branch, HEAD and dirty files are computed at
session start by `.claude/hooks/session_start.py`. This file holds only what git
cannot know: intent, decisions, and blockers.

---

## START HERE

`_docs/testing/SESSION_2026-09-08.md` is the full record of the 08 Sept session —
what was measured on production, what changed, and what is still open. Read that
before re-deriving anything about addresses, courier dates or duplicate cities.

**Production is `247747c` / `50a5c9f` and has not moved since 07 Sept.**
19 commits are built and undeployed.

---

## The first thing to do

**Decide whether to deploy.** 11 frontend + 8 backend commits, suites 504 / 786.

The reason it matters tonight: the REP org-wipe fixes are NOT live. On the
deployed code, adding a city to an existing REP still wipes its logo link, and
the MoU/logo trash icons clear the screen and save nothing. Editing REPs is
exactly what filling in the missing addresses involves.

---

## Open — needs an owner decision

- **The orphaned assignments** — Kota, Bikaner, Chittaurgarh, Thiruvananthapuram.
  ONE answer clears three symptoms at once: the missing courier trial dates, the
  missing report addresses, and the report's orphan warning. Open since August.
  Standing instruction unchanged: do not dispatch, do not delete.
- **44 missing ground addresses.** Not recoverable — measured, they were never
  entered. Two request sheets are committed at the repo root covering all 43
  rows that have a REP. South Clan Football Academy's 18 assignments return
  NOTHING on every field.
- **Season 6** — the project is NAMED `Trials`. Rename it in Admin.
- **"Analysis numbers wrong"** — NOT REPRODUCIBLE. TRI-S6-001 September is 15 by
  stored month and 15 by date. Needs Nirja to name the figure she believes is
  wrong before anyone touches it.
- **The 8 stored month/date contradictions.** Needs a decision, not a rule. A fix
  that made the date authoritative was reverted (`8222774`) because 31 rows carry
  `2026-07-10`, the bulk-add's fallback — a date ending in -10 is DERIVED from
  the month, so the date is not the trustworthy half.
- **75 trial cities have no REP assigned.** Not an address problem; those rows
  cannot hold one. 44 are past-dated.

## Known, not fixed

- **Bulk CSV upload** dedupes against a REP list capped at 100. Past 101 a
  duplicate row writes nothing and the UI reports success. Dormant at ~66 REPs.
- **`reps/admin.py`** restricts no fields, so a superuser bypasses every guard
  added on 08 Sept.
- **`courier_sub_area` is not reliable data.** Rows edited through the UI carry
  the postal API's arbitrary first locality — Chennai's district reads
  Kanchipuram, sub-areas read "Ac.Depot", "Gowriwakkam".

## Do not re-derive

- Duplicate cities: **zero** within a project. IKF-S6-006 and IKF-S6-008 are two
  separate programmes sharing 18 cities.
- Courier dates: **41 of 53 visible, 0 actually broken.** The rest are broken
  links, not frozen snapshots.
- `trialcities.TrialCityLocation` has **0 rows**. No addresses are hiding there.
