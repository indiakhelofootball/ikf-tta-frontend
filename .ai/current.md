# Current — what is in flight

**Last verified: 2026-08-21.** If that date is more than a few days old, treat
every line below as a claim to re-check, not as fact.

**This file deliberately holds no git state.** Branch, HEAD, dirty files and
memory-index staleness are computed live at session start by
`.claude/hooks/session_start.py`. Duplicating them here is how a status file
starts lying. This file holds only what git cannot know: **intent, decisions,
and blockers.**

---

## In the working tree, unfinished

**Last touched 2026-08-21.**

### The Venue column — CLOSED, and the removal plan is dead

The plan recorded here previously was to **delete the Venue column** from the
Excel column list and the CSV header, on the reasoning that nothing could ever
fill it. **That plan is withdrawn. Do not act on it.**

The diagnosis behind it was wrong. `REPModal.renderGroundSection` collected the
ground *address* (`physicalAddress`, 55 records) but never the ground *name*,
which is what the Venue column prints. The record was always the right one —
`REPCityAssignment` is keyed `(rep, trial, city)`, so it is already per-city.
There was simply no input.

Fixed 2026-08-21, uncommitted:

- **A Ground Name box** added beside Ground Address on both forms —
  `renderGroundSection` and the add-REP inline block. 17 insertions, 0 deletions.
- **`openEditAssignment` now hydrates `groundLocation`** — without it the edit
  form opened blank and saved the blank back over a stored value.
- **`trials/views.py` stops hardcoding `ground_location=''`** on add-city.
  Backend change: separate commit, separate repo.

The column stays. Rows already saved stay blank until someone fills them in.
Detail and the corrected reasoning: memory `venue-ownership-decision-2026-08-21`.

### Still wrong in the tree — revert before committing

The uncommitted hunk in `TrialsReport.jsx` that drops the `|| a.pinCode`
fallback. Its comment calls `pinCode` "the REP's personal PIN". There is no such
field. `REPModal.jsx:1486` renders it under the heading **"Trial Ground
Location"**, and the 2026-08-21 field inventory confirms `groundPinCode` has no
input anywhere. `pinCode` is filled on 51 assignments, `groundPinCode` on 0.
Shipping this blanks the PIN on every row that has one.

### Also uncommitted and complete

Shape guards in `csv.js` and `reportExcel.js` (row width must match the header,
or throw). All six call sites verified.

`TrialManagementPage.jsx` — the projects list now pages to the end instead of
silently showing the 20 newest. Closes the repeated "Season 6 not visible"
report. 165 FE tests green.

`TrialsReport.jsx` also carries one comment edited by a parallel review session.

---

## Blocked on someone else

**Four orphaned REP assignments — #21 Kota, #22 Bikaner, #23 Chittaurgarh,
#75 Thiruvananthapuram.** The mechanism that creates them is fixed and
deployed; these four pre-date the fix.

Two dispatch-ready courier drafts hang off them — `CR-2026-0040` and
`CR-2026-0044` — and in-flight shipments re-read the address **live**, so
dispatching sends kit for a trial city the trial does not have.

**Standing owner decision: do not dispatch, do not delete.** One question
settles all four: *should those trials be running in those cities?* Yes → re-add
the cities. No → cancel the two drafts first, then retire the assignments.
`--repoint` handles three of the four; #22 is genuinely ambiguous and the
command refuses to guess, by design.

---

## Decided, not built

| Item | State |
|---|---|
| CSR colour saturation (2.8% measured) | fix agreed, not written |
| CSR **D1** — project identity = project_name + season, not free text | needs a data migration; cost grows per funder onboarded |
| Funder landing tab — shows no output, then ~600px of white | this is the surface renewal decisions happen on |
| FK from `REPCityAssignment` → `TrialCity` | the real fix under the orphan guards — full census and sequencing now in `.ai/schema-integrity.md` |

## Open questions for you

Beyond `.ai/pending.md`:

- **Q2** — should "visible to client" require a report to exist? No gate today.
- **Q3** — the training report model. One-report-per-activity is unchanged.
- **Funder utilisation** — currently invisible to funders by isolation policy.
  Changing it is a policy decision with a UI attached, not a UI change.
- **`csr_certificate` gating** — the owner asked for the itemised view to be
  gated; that half was deliberately not built, because a test asserts the
  opposite with reasoning written in. Still open.
- **Security R1** — the live DB password has not been rotated. It sits in
  plaintext in the 23 Jul transcript and in `.claude/settings.local.json`
  permission strings. `.claude/` is gitignored, so nothing reached the repo.

---

## How to refresh this file

Rewrite it when a section becomes false — not on a schedule. Keep it to intent
and blockers. The moment it starts restating what `git status` says, delete that
part instead of maintaining it.

## Related

`.ai/pending.md` · `.ai/vision.md` · `.ai/design.md` · `.ai/design-system.md`
