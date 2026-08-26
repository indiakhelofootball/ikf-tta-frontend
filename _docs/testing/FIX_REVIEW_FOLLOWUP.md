# FIX_REVIEW_FOLLOWUP — corrections to the 2026-08-21 duplicate-city fixes

Scope: findings **#2 / F3** (name-only duplicate guard) and **#3 / F5** (whitespace mismatch)
from `_docs/testing/FIX_REVIEW.md`. Files touched: `trials/models.py`, `trials/views.py`,
`trials/serializers.py`, `trials/tests.py`. No migration, no DB constraint, no data-flow change —
application-level guards only, per the 19 Aug owner instruction in `.ai/schema-integrity.md` §3.

## Baseline

`trials reps payments` — **226 tests, OK**. Full suite — 479 (per brief), re-measured at 497
after the new tests land.

## Fix 1 — one normaliser, one identity rule (`trials/models.py`)

Two module-level helpers, so nothing compares city text its own way any more:

- `normalise_city_key(value)` → `(value or '').strip().lower()`. This is what
  `rep_assignments_blocking_removal` already did on both sides; it is now the only form.
- `city_identity(city_name, state)` → `(normalise_city_key(name), normalise_city_key(state))`.
  Whole-string on the name, so `"Kota"` and `"Kota, Central"` stay two cities.

`rep_assignments_blocking_removal` rewritten to call `normalise_city_key` instead of inlining
`.strip().lower()`. Behaviour identical — the point is that the guards and the helper can no
longer drift apart.

## Fix 2 — F3: the duplicate guard now keys on name AND state

`trials/views.py` `add_city`: the twin lookup was
`trial.cities.filter(city_name__iexact=city_name)`. It is now a Python scan comparing
`city_identity(name, state)`, so Aurangabad/Maharashtra and Aurangabad/Bihar can both sit in one
project — matching `ProjectDashboard.jsx:298-301`, which already dedupes its bulk-add list on
`cityName` + `state`. The 400 message is unchanged (names the city and the holding code).

`trials/serializers.py` `update`: same correction on the bulk PUT path. Added `_resulting_state`
and `_resulting_identity` alongside the existing `_resulting_name`; the `seen_new` clash check now
keys on the identity pair instead of the lowered name.

Deliberately **not** changed: the DELETE twin-survival check stays **name-only**. A REP assignment
carries a city name and no state, so any surviving row answering to that name keeps the join
resolvable. Adding state there would block a delete that strands nothing — the opposite of what
the guard is for. Documented in the comment at the check.

## Fix 3 — F5: guards and helper normalise identically; names stored stripped

- `add_city` twin check: was stripped-input vs raw column via `__iexact`; now both sides through
  `city_identity`.
- `city_detail` DELETE `twin_survives`: was stripped-input vs raw column via `__iexact`; now both
  sides through `normalise_city_key`. This is the half that produced the permanent 409 — the
  helper matched a padded row, the twin check did not.
- Writes now store `city_name` / `state` stripped: `add_city`, `TrialSerializer.create`, and both
  the update and create branches of `TrialSerializer.update`. No migration — existing rows are
  untouched and are handled by the normalised comparisons.
- The rename-carry block in `update` compared `was.strip() != tc.city_name.strip()` and then
  filtered `city__iexact=was.strip()` against the raw assignment column. Now it selects the
  assignments to repoint in Python through `normalise_city_key`, so a padded stored assignment is
  carried across too.

## Reverse-check

Each fix backed out, suite re-run, fix restored.

**F3 backed out** (`city_identity` dropping the state term) — 4 failures, all new:

- `DuplicateCityTests.test_the_same_name_in_another_state_is_a_different_city`
- `DuplicateCityTests.test_a_missing_state_does_not_match_a_stated_one`
- `DuplicateCityBulkUpdateTests.test_the_same_name_in_another_state_is_a_different_city`
- `DuplicateCityBulkUpdateTests.test_an_existing_row_in_another_state_does_not_block_a_new_one`

**F5 backed out** (raw-column `__iexact` comparisons restored, writes un-stripped) — 4 failures,
all new:

- `DuplicateCityTests.test_deleting_the_clean_row_is_allowed_while_the_padded_twin_stays`
  — this is the undeletable-duplicate symptom itself
- `DuplicateCityTests.test_a_row_stored_with_padding_blocks_the_clean_name`
- `DuplicateCityTests.test_a_padded_name_is_stored_stripped`
- `DuplicateCityBulkUpdateTests.test_a_padded_name_is_stored_stripped`

## Tests added (18)

`DuplicateCityTests` (single-city endpoints): same name in another state allowed · same name and
state still refused (state compared case- and padding-insensitively) · a blank state does not match
a stated one · a row stored with padding blocks the clean name · a padded name is stored stripped ·
a legacy padded duplicate can be deleted · the clean row can be deleted while the padded twin stays
· the last padded row of a name is still protected (409, names the REP) · a same-name row in
another state still answers the assignment.

`DuplicateCityBulkUpdateTests` (bulk PUT): same name in another state allowed · same name and state
refused · an existing row in another state does not block a new one · a padded new name cannot
duplicate a stored one · a row stored with padding blocks the clean name · a padded name is stored
stripped · a legacy padded duplicate can be dropped by omission · dropping the clean row leaves the
padded twin answering · dropping the last padded row of a name is still refused.

## Existing tests modified

One helper, no assertion. `DuplicateCityBulkUpdateTests.payload` accepted 2-tuples
`(code, name)` and hardcoded `state='Rajasthan'`; it now accepts an optional third item for the
state and defaults to `'Rajasthan'` when absent, so every pre-existing call reads exactly as it did.
A `codes()` helper was added to `DuplicateCityTests` (it already existed on the bulk class).
**No existing test encoded the name-only rule** — every one of them uses a single state, so none
needed its behaviour changed.

## Result

`trials reps payments` — **244 tests, OK** (was 226).
Full suite — **497 tests, OK** (was 479).
