# FIX_CITY_RENAME — N7: PATCH city rename is accepted and silently discarded

Scope: `city_detail` PATCH branch in `trials/views.py`. Files in scope: `trials/views.py`,
`trials/serializers.py`, `trials/models.py`, `trials/tests.py`. No migration, no DB constraint,
no data-flow change — application-level only, per `.ai/schema-integrity.md` §3.

## Progress log (append-only)

- [read] `trials/models.py` — has `normalise_city_key`, `city_identity`,
  `rep_assignments_blocking_removal` (added earlier today by FIX_REVIEW_FOLLOWUP).
- [read] `trials/views.py` — `city_detail` PATCH handles only `region`, `tentativeMonth`,
  `tentativeDate`, `confirmed`. `cityName`, `state`, `groundLocation` are ignored entirely:
  no error, no write. Confirms the measured defect (200 OK, nothing changes).
- [read] `trials/serializers.py` — bulk PUT `update()` already has the rename-carry block
  (lines ~350-364): on a name change it repoints every `rep_assignments` row whose
  `normalise_city_key(a.city)` equals the old key to the new `city_name`.
- [read] `_docs/testing/FIX_REVIEW_FOLLOWUP.md` — the four constraints my fix must respect.
- [built] models/serializers/views/tests changed — see the sections below.
- [ran] `trials reps` — 98 tests, OK (after the fix, before the new tests).
- [ran] `trials.tests.CityRenamePatchTests` — 20 tests, OK.
- [ran] full suite — **529 tests, OK** (was 509). Nothing regressed.
- [next] reverse-check, three pieces.

## What was wrong

`city_detail` PATCH read four keys and no more: `region`, `tentativeMonth`, `tentativeDate`,
`confirmed`. `cityName` and `state` fell through to `tc.save()` untouched, so the endpoint answered
200 with the row unchanged. Nothing in the API could rename a city.

## The decision — carry, and refuse only when carrying is impossible

`REPCityAssignment.city` is free text with no FK (deliberate; not changed). An assignment resolves
to a city by NAME, so a rename that does nothing else strands every assignment holding the old
spelling — the mechanism behind orphans #21/#22/#23/#75.

Three cases, and the rename behaves differently in each:

1. **The old name survives elsewhere in the trial** (a same-named twin row). The join still
   resolves, so nothing is stranded and nothing is moved. Moving it would be a guess: nothing
   records which of two same-named rows an assignment belongs to. This is the same reasoning as
   the DELETE twin-survival check, and judged the same way — on the NAME alone, because the name
   is all the assignment carries.
2. **The old name does not survive and the new name is non-empty.** The assignments are carried:
   every assignment on this trial whose name normalises to the old key is repointed at the new
   name. Its courier address, ground address and map link ride along on the same row untouched.
3. **The old name does not survive and the new name is blank.** There is nowhere to carry them to,
   so the rename is **refused with 409** naming the REPs, wording parallel to the DELETE refusal.
   Blank names are permitted when no REP holds the city.

Refusing wholesale was the alternative. It was rejected because the bulk PUT path already carries
a rename successfully and has tests proving it (`test_renaming_a_city_carries_the_assignment_with_it`),
so a PATCH that refused what a PUT permits would be an inconsistency, not a safeguard.

## Reuse, not a fourth comparison

The rename-carry block that lived inline in `TrialSerializer.update` moved out to
`carry_rep_assignments(trial, old_name, new_name)` in `trials/models.py`, byte-for-byte the same
logic (Python-side selection through `normalise_city_key`, so a padded stored assignment is carried
too). The serializer now calls it; the PATCH calls the same function. One rename rule, not two.

Clash detection uses the existing `city_identity(name, state)` — the same helper `add_city` and the
bulk PUT use — so a rename cannot land on a (name, state) pair the project already holds, while
Aurangabad/Maharashtra vs Aurangabad/Bihar stay two cities and `"Kota"` vs `"Kota, Central"` stay
two cities.

## Scope note

`state` is written by the same block as `cityName`, not as an extra feature: the duplicate rule is
keyed on the pair, so a rename request that carries a state has to be judged and stored on the pair
or the guard and the stored row disagree. `groundLocation` is still ignored by PATCH — that is a
separate silent-discard and was left alone.

Names are stored stripped, matching `add_city`, `create` and the bulk `update`.

## Changes, file by file

`trials/models.py` — new `carry_rep_assignments(trial, old_name, new_name)`, lifted verbatim from
the serializer's inline rename-carry block. Returns the number of assignments moved. No model field
changed, no migration.

`trials/serializers.py` — the inline rename-carry block replaced by a call to that helper. Behaviour
identical; the point is one rule instead of two.

`trials/views.py` — `city_detail` PATCH now handles `cityName` / `state` before any write:
identity clash check (400), old-name-survives check, stranding refusal when the name is cleared
(409), stripped write, and the carry after `tc.save()`.

`trials/tests.py` — new `CityRenamePatchTests`, 20 tests. No existing test touched.

## Reverse-check

Each half backed out separately, `trials reps` re-run (118 tests), then restored.

**Whole PATCH rename block backed out** (`cityName` / `state` ignored again — the defect as measured)
— **15 of the 20 fail.** Every persistence, clash and carry test fails.
Passed either way (5): `test_a_patch_that_does_not_mention_the_name_leaves_it_alone`,
`test_a_rename_leaves_another_citys_assignment_alone`,
`test_a_rename_leaves_another_trials_assignment_alone`,
`test_a_surviving_twin_keeps_the_assignment_where_it_is`,
`test_renaming_a_row_to_its_own_name_is_not_a_clash` — all five assert that something is *not*
moved or *not* refused, which a no-op endpoint satisfies. They are guards against the fix
overreaching, not against the defect, and only earn their keep with the fix in.

**Carry + stranding refusal backed out**, name still written (i.e. a rename that orphans, which is
what a naive fix would have shipped) — **3 fail**:
- `test_a_rename_carries_the_assignment` — also fails `find_orphans() == []`, so it catches the
  production orphan mechanism directly, not just a string mismatch
- `test_a_padded_assignment_is_carried_too`
- `test_clearing_a_held_name_is_refused`

**Identity clash check backed out** — **3 fail**:
- `test_renaming_onto_an_existing_pair_is_refused`
- `test_the_clash_check_ignores_case_and_padding`
- `test_a_clash_against_a_padded_stored_row_is_refused`

No test outside `CityRenamePatchTests` moved in any of the three back-outs — including the
serializer refactor, which the pre-existing bulk-PUT rename tests cover
(`test_renaming_a_city_carries_the_assignment_with_it`, `test_a_rename_still_carries_the_assignment`).

## Result

`trials reps` — 118 tests, OK (was 98).
Full suite — **530 tests, OK**, run twice with the same count. The brief quoted a 509 baseline;
530 − 20 new = 510, so discovery counts one more than the brief did. Nothing fails either way.
