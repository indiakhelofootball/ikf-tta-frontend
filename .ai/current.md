# Current — what is in flight

**Last verified: 2026-08-22.** If that date is more than
a few days old, treat every line below as a claim to re-check, not as fact.

**This file deliberately holds no git state.** Branch, HEAD, dirty files and
memory-index staleness are computed live at session start by
`.claude/hooks/session_start.py`. Duplicating them here is how a status file
starts lying. This file holds only what git cannot know: **intent, decisions,
and blockers.**

---

## START HERE

Everything below came out of one session: a 74-case test campaign run against a
live app, then fixing what it found, then three adversarial reviews of those
fixes, then fixing what *those* found.

Full detail is in `_docs/testing/` (committed). The single most useful file is
`LIVE_RUN_2026-08-21.md`. The issue tracker with live results per row is
`TTA_Issues_live_tested_2026-08-21.xlsx` in the repo root — **untracked on
purpose**, matching the precedent that root trackers are not committed.

**Nothing is pushed. Nothing is deployed.**

| repo | branch | commits |
|---|---|---|
| frontend | `fix/tracker-issues-2026-08-21` | 9 |
| backend | `fix/tracker-issues-2026-08-21` | 9 |

Suites at close: **608 backend · 288 frontend, all green.**

---

## The first thing to do

**Decide whether to push.** Both branches are off `main` and complete, and the
evidence under that decision is current as of 2026-08-22:

1. **#17, #10 and #7 were verified in a browser** on 22 Aug, against the
   database, not just the screen. The Chrome extension still refuses to
   connect; Playwright drove it instead (system python 3.13 — see the
   `local-demo-setup` memory).
2. **`npm run build` passes**, and the suites are 608 backend · 288 frontend.
3. **Two dev-server facts.** They are stopped. And the command this file used
   to give was wrong: bare `python` is 3.13 + Django 6.0 on this machine, which
   **cannot import the project** (`csr/models.py:238` uses
   `CheckConstraint(check=...)`, removed in Django 6). Use the repo venv:
   `cd tta_backend/backend && ./venv/Scripts/python.exe manage.py runserver 8000 --settings=backend.dev_local_settings --noreload`
4. **One commit is mixed.** Backend `6a94e94` carries the trials fixes AND the
   vendor PAN guard, because `git add -A backend/` ran while an agent was still
   writing. The message covers both; the split is just untidy.
5. **Deploy: `CLAUDE.md` was lying** and now names an unresolved contradiction
   instead. `DEPLOYMENT.md` opens with `git pull` on the server; a 2026-08-17
   measurement found `/root/tta` is not a git repo. Settle it with one ssh
   before deploying anything: `cd /root/tta && git log -1`.

---

## What was fixed

From the tracker: **#1** cities appearing twice (both halves — could not be
created, and existing ones could not be deleted) · **#2** logo/MoU blanked on
merge · **#5** courier quantity stuck at 0 · **#6** concurrent edits deleting
another user's items · **#7** super admin could not delete a dispatched
shipment · **#8** "address edits not getting saved" (they saved; the *response*
was stale) · **#9** courier blank page · **#10** report cards ignoring filters ·
**#17** TDS counted twice on bounced payments.

Verified already fixed, no work needed: Season 6 visibility, the Mayur/sauksha
module count, the REP Report label, courier dates.

Not reproducible: **#9 vendors not visible** — real bug, but in a component
nothing imports.

Found by testing, not on the tracker: silent discard of every payment status
change · a cancelled TDS being reportable as remitted to the tax authority · a
bounced payment losing its TDS permanently via Draft · vendor status
force-stamped Verified on every edit · three UI messages stating something
untrue about TDS · city rename accepted and ignored · config renames orphaning
copies · a 500 on reading any resolved payment request whose resolver had no
name.

---

## Open — needs an owner decision

- **N4 duplicate PAN.** The API now refuses duplicates. The **database has no
  unique constraint**, and the duplicates already on production are untouched —
  including two created during measurement. Adding it needs a production
  duplicate census first. `.ai/schema-integrity.md` §6 step 5.
- **N10 — a dispatched parcel's address keeps changing until *delivery*.**
  Deliberate in code (`courier/serializers.py:69-75`); the test plan assumed it
  froze at dispatch. Product call.
- **The four orphaned assignments** (#21 Kota, #22 Bikaner, #23 Chittaurgarh,
  #75 Thiruvananthapuram). Still one question: *should those trials be running
  in those cities?* Standing instruction unchanged: do not dispatch, do not
  delete.
- **The deploy contradiction.** `_docs/deployment/DEPLOYMENT.md` opens with
  `git pull` in both repos on the server; a 2026-08-17 measurement on the box
  found `/root/tta` is not a git repo (`git log` fails, files carry the Windows
  UID). Both cannot be true, and if the second still holds, step 1 of the
  documented procedure cannot run. `CLAUDE.md` now names the contradiction
  rather than picking a side. One ssh settles it: `cd /root/tta && git log -1`.
- **`.ai/pending.md` item 1**, open since 2026-05-02 — WO-PR-NE-001 and
  WO-RE-FA-001 stuck on the active list. Case A (retry the payment, no code
  change) or Case B (a Super-Admin "Mark as Paid (manual)" action).
- **CSRProject.season does not follow a season rename.** `project_name` is an FK
  and follows for free; season is a copied CharField and does not. Cannot be
  fixed from config — INV-DEP (`csr/tests.py:230`) forbids a core app importing
  csr. Belongs to CSR's side.

**Closed by decision, do not re-raise:** N9, the TDS deadline. It stays computed
at display time in `src/components/bank/tdsDueDate.js` and is deliberately not
persisted.

---

## Handed to this window from the CSR worktree — 2026-08-23

**Who is asking and why.** The CSR worktree (`D:\tta-csr`, branch `csr/work`)
diffed what CSR was built to against the three files the client actually agreed:
`D:\CSR\CSR_Module_Design_Review.docx`, `CSR_VISUAL_FLOW.pdf` (6pp, the earlier
walkthrough) and `CSR_VISUAL_FLOW (1).pdf` (7pp, "CSR Module — Functional Flow";
`(1) (1).pdf` is byte-identical to it). Three requirements were stated in all of
them and never built. Two are now closed. **The rest is TTA's, not CSR's, and
that is the point** — the spec puts this catalog on TTA's side deliberately:

> "Workshops are catalog entries, not CSR-owned records. They are created and
> maintained under TTA Admin → Setup, alongside the existing admin-managed
> dropdowns… Catalog maintenance is an admin responsibility, not a CSR-operator
> responsibility. **The CSR app reads this catalog at runtime; it does not edit
> it.**" — `CSR_VISUAL_FLOW (1).pdf` §2a

That is why these three items cannot be finished in the CSR worktree. CSR is
the consumer. TTA owns the catalog.

### Already done, so you are not starting cold

- **Backend** — `tta_backend` `d40634e` on branch **`csr/catalog`** (cut from
  `e196a6d`, not merged, not pushed). Adds `ConfigOption` categories
  `workshop_name` and `training_programme`, and `CSRActivity.linked_vendor` /
  `.workshop` / `.training_programme`. Migrations `config/0004`, `csr/0008`.
  614 backend tests pass.
- **CSR frontend** — `csr/work` `02b5fcd`. The activity dialog now has all three
  pickers, reading the catalogs through `adminStorage` as **read-only getters**
  (`getWorkshopNames`, `getTrainingProgrammes` — deliberately no `save*` pair).

### What is left, and it is all in this tree

1. **Admin UI for the two new catalogs.** `AdminPage.jsx` + `adminStorage.js`.
   The read path and the cache keys already exist; what is missing is the
   editor and the `saveWorkshopNames` / `saveTrainingProgrammes` writers. Follow
   the `courier_item` pattern — same shape, same `configAPI.bulk` call.

2. **`partner_category` has no frontend at all.** Backend `915c6b2` shipped
   `Vendor.partner_category` and the config category on 2026-08-19 and **nothing
   in `src/` ever consumed either** — grep returns zero hits. So today there is
   no way to create a partner category and no way to flag a vendor with one.
   Needs the catalog editor plus an input on the vendor form
   (`src/components/vendors/`). Until it exists, the CSR workshop-partner picker
   is correct and permanently empty.

3. **A CSR operator cannot read `/api/vendors/`** — internal RBAC is grant-based
   and a CSR_OPS user holds no `vendors` grant (measured 2026-08-19; the picker
   degrades to empty and says so rather than breaking). Granting them the vendor
   module would be wrong: **"Vendor management tab" is listed out of scope for
   CSR in all three agreed documents.** The right shape is a narrow read-only
   endpoint — partner-category vendors only, id and name and category — not
   access to the vendor module. That is a backend decision, flagged not taken.

**Sequence that works:** 2 before 1 before 3. Item 2 unblocks the picker that
already ships; item 3 only matters once real partner vendors exist.

### Also worth knowing

`Q3` in the design review is still open and is now reachable: *"Trainings run
for months. The one-upload model does not fit."* Naming a training programme
makes the multi-month case concrete, so the report-cadence question lands the
moment item 1 ships.

---

## Closed 2026-08-22 — the gaps this file used to list as open

All of it is on the branches, none of it is pushed. Backend 608 tests, frontend
288, both green.

- **The stale bulk PUT** now carries an optimistic lock, same shape as the
  courier one: `expectedUpdatedAt` is required whenever `assignedCities` is
  present, and a stale or missing token is a 409. The reason this was deferred
  was **wrong** — the note said it changes the contract of an endpoint the
  project screen depends on, and `trialsAPI.update` has no caller anywhere in
  the frontend. Nothing broke and no screen changed.
- **T6.** A same-named row in another state is no longer treated as an answer
  for an assignment. The review declined to fix it because "the name is all a
  `REPCityAssignment` carries" — untrue, `REPCityAssignment.state` exists
  (`reps/models.py:74`) and is not nullable, so no migration was needed. State
  is compared only when **both** sides carry one; blank falls back to name-only,
  because the production population of that column is unmeasured and a stricter
  rule would orphan assignments that resolve today.
- **T7–T11.** Padding-only renames now carry (in the helper *and* both callers —
  fixing the helper alone changes nothing). `add_city` and `city_detail` run in
  one transaction with the trial locked. The courier snapshot is ordered and
  state-aware. The city PATCH stores `groundLocation` instead of discarding it.
- **G14** was real but comment-only. **G8 and G22 were never defects** —
  `FIX_REVIEW_2` says so itself; they were carried here on the strength of a
  summary line.

Two tests were found asserting the defect they guarded, both using
`find_orphans() == []` as the safety assertion on a state-blind audit that
could not see the thing being tested. Every replacement names the row.

**Not covered by any test, deliberately:** the T8/T9 locking. SQLite makes
`select_for_update` a no-op, so this suite cannot demonstrate a race either
way. The guarantee is a MySQL one and is unverified here.

---

## The lesson worth carrying forward

**Five verdicts written from code review alone turned out to be wrong**, and
every one was caught only by running the thing or by an adversarial pass:

- Trial Cities was recorded as five separate defects. The screen had been
  deliberately deleted months earlier, with a one-line comment saying so
  (`App.js:22`).
- A vendor picker bug was real but sat in dead code nothing imports.
- A fix reported as verified — including by me — reopened the hole it closed
  through a route the verification never tried.

**And four tests were found asserting the bug they were named for.** One
required the concurrent-edit data loss under the heading "backwards
compatibility". Another asserted `assertNotIn('Bikaner')` in a test called
`test_a_stale_put_cannot_wipe_cities_added_since`. Both sat in suites that read
as reassurance, and two adversarial reviews passed over them.

So: **a green suite is evidence about the paths someone thought to write down,
and nothing more.** Reverse-check every new test — back the fix out, confirm it
fails, restore. Several tests written this session passed either way, and saying
so was more useful than the tests were.

---

## How to refresh this file

Rewrite it when a section becomes false — not on a schedule. Keep it to intent
and blockers. The moment it starts restating what `git status` says, delete that
part instead of maintaining it.

## Related

`.ai/pending.md` · `.ai/vision.md` · `.ai/design.md` · `.ai/design-system.md` ·
`.ai/schema-integrity.md` · `_docs/testing/` (this session's full record)
