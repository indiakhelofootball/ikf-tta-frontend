# Current — what is in flight

**Last verified: 2026-08-21 (end of a long session).** If that date is more than
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
| frontend | `fix/tracker-issues-2026-08-21` | 6 |
| backend | `fix/tracker-issues-2026-08-21` | 6 |

Suites at close: **577 backend · 284 frontend, all green.**

---

## The first thing to do in the morning

**Decide whether to push.** Both branches are off `main` and complete. Before
that, three things are worth knowing:

1. **#17, #10 and #7 have never been seen working in a browser.** They have
   tests, but the Chrome extension went down with an account rate limit and
   never came back. `npm run build` at minimum, ideally a click-through.
2. **The dev servers are stopped.** Backend:
   `cd tta_backend/backend && python manage.py runserver 8000 --settings=backend.dev_local_settings`
3. **One commit is mixed.** Backend `6a94e94` carries the trials fixes AND the
   vendor PAN guard, because `git add -A backend/` ran while an agent was still
   writing. The message covers both; the split is just untidy.

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
- **CSRProject.season does not follow a season rename.** `project_name` is an FK
  and follows for free; season is a copied CharField and does not. Cannot be
  fixed from config — INV-DEP (`csr/tests.py:230`) forbids a core app importing
  csr. Belongs to CSR's side.

**Closed by decision, do not re-raise:** N9, the TDS deadline. It stays computed
at display time in `src/components/bank/tdsDueDate.js` and is deliberately not
persisted.

---

## Open — known gaps, recorded not hidden

- **A stale bulk PUT can still drop a trial city** that no REP is assigned to.
  There is no version check on that endpoint. Cities a REP *does* hold are
  protected by the stranding guard. Closing it needs an optimistic lock on the
  trial, the same shape as the courier one — that changes the contract of an
  endpoint the project screen depends on, so it was recorded rather than
  quietly done. See `test_a_stale_put_DOES_wipe_an_unassigned_city_added_since`.
- **T6 from the trials review:** identity is (name, state) but survival is
  name-only, so deleting Aurangabad/Maharashtra can rebind a REP's ground
  address to the Bihar row. ~20 tests lean on `find_orphans()`, which is
  state-blind and structurally cannot see this. Not fixed.
- **T7–T11** in `_docs/testing/FIX_REVIEW_TRIALS.md`: padding-only renames vs
  the courier `city_name__iexact` join, TOCTOU races on add/delete with no
  locking, an unordered `.first()` in the courier snapshot, `groundLocation`
  still discarded by the city PATCH.
- **G8, G14, G22** in `FIX_REVIEW_2.md` — low severity, untouched.

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
