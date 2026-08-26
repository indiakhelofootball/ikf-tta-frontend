# FIX_REVIEW_TRIALS — adversarial review of the `trials/` app

Read-only review. No file outside this one was touched.

Scope: `backend/trials/{models,serializers,views,tests}.py` as changed by `548520d`,
`2317a57`, `db57d44`, plus the city-rename work described in `FIX_CITY_RENAME.md`.
Intent docs read, then checked against the code rather than believed.

Verified corroborating code outside scope (read only): `reps/models.py` (`REPCityAssignment`),
`courier/models.py` `refresh_snapshot`, `reps/management/commands/audit_orphan_assignments.py`
(`find_orphans`).

Line numbers are as of the working tree at review time.

---

## Summary table

| # | Severity | Where | What |
|---|----------|-------|------|
| T1 | HIGH | `serializers.py:333-357` | Bulk PUT can blank a city name and orphan every assignment under it. PATCH refuses this with 409; PUT does it silently. **Creates new #21/#22/#23/#75-class orphans.** |
| T2 | HIGH | `serializers.py:357` | Bulk PUT carry has no twin-survival check. Renaming one of two same-named rows drags the *other* row's assignments with it. Directly contradicts the PATCH rule. |
| T3 | HIGH | `serializers.py:275-277` | Bulk PUT duplicate guard skips every existing code, so a **rename** onto an existing (name, state) pair is unchecked. The add_city guard is bypassable through the edit screen. |
| T4 | MEDIUM-HIGH | `serializers.py:333-357` | Carry is applied inside the write loop in payload order, so a chained or swapped rename in one PUT mis-carries assignments depending on key order. |
| T5 | MEDIUM-HIGH | `tests.py:131-143` | `test_a_stale_put_cannot_wipe_cities_added_since` asserts the exact opposite of its own name and docstring. It encodes a lost-update wipe as intended behaviour. |
| T6 | MEDIUM | `views.py:208-213`, `views.py:264-267` | Name-only survival vs (name, state) identity are two contradictory definitions of "same city". Where they meet, an assignment silently rebinds to a city in another state. Two tests assert this as correct. |
| T7 | MEDIUM | `models.py:165` | A padding-only rename returns 0 carries, but `courier` joins with `city_name__iexact`, which does not strip. Padded legacy assignments strand. |
| T8 | MEDIUM | `views.py:141-172` | `add_city` duplicate guard is check-then-create with no transaction and no DB constraint — plain TOCTOU. |
| T9 | MEDIUM | `views.py:209-222` | DELETE twin-survival check is also TOCTOU: two concurrent deletes of same-named twins both see the other surviving, both proceed, assignment stranded. |
| T10 | LOW-MEDIUM | `courier/models.py:139-141` | `TrialCity.objects.filter(trial, city_name__iexact).first()` with no ordering — with twins the trial date is picked arbitrarily. Pre-existing, but the twin-tolerant guards make twins a supported state. |
| T11 | LOW | `views.py:289-296` | PATCH still silently discards `groundLocation`. Acknowledged in the doc; noted so it is not lost. |
| — | OK | — | No FK added, no migration, no data-flow change. `.ai/schema-integrity.md` §3 respected across all three commits (`git show --stat` shows no migration files). |

---

## T1 — Bulk PUT can blank a city name and orphan every assignment under it (HIGH)

`backend/trials/serializers.py:312-316` and `:333-357`.

The stranding guard only inspects **doomed** rows:

```python
doomed = [tc for code, tc in current.items() if code not in city_codes]
stranding = [tc for tc in doomed
             if normalise_city_key(tc.city_name) not in surviving_names]
```

A row whose code is still in `city_codes` is never doomed, so it is never checked — no
matter what happens to its name. At `:343` the write is

```python
tc.city_name = (d.get('cityName', tc.city_name) or '').strip()
```

which happily stores `''`. `carry_rep_assignments` then returns 0 immediately
(`models.py:165`, `if not old_key or not new_name`). Nothing else looks.

**Failure:** trial holds `IKF-RJ-KOT-001` / `"Kota"` / Rajasthan. A REP assignment holds
`city="Kota"` with a ground address and a courier address.

`PUT /api/trials/<id>/` with
`assignedCities: [{"code": "IKF-RJ-KOT-001", "cityName": "", "state": "Rajasthan"}]`

→ 200 OK. Row persists with `city_name = ''`. The assignment still says `"Kota"`.
No city in the trial answers to that name. `find_orphans()` now returns it. Its courier
address and ground address can never be joined back to a trial city again.

This is *the* mechanism behind orphans #21/#22/#23/#75, still open on the path the
project edit screen actually uses. `city_detail` PATCH refuses the identical operation
with 409 (`views.py:270-281`) and has a test for it
(`test_clearing_a_held_name_is_refused`, `tests.py:1020`). The two paths disagree, and
the *unguarded* one is the one the UI drives.

The same hole covers a non-blank rename combined with an omission — see T4.

## T2 — Bulk PUT carry ignores twin survival; it moves assignments it must not (HIGH)

`backend/trials/serializers.py:357` calls `carry_rep_assignments(instance, was, tc.city_name)`
unconditionally whenever a detail was sent. `carry_rep_assignments` (`models.py:148-173`)
has no notion of a surviving twin: it repoints **every** assignment in the trial whose
normalised name equals the old key.

`city_detail` PATCH deliberately does the opposite (`views.py:264-268`): if another row
still answers to the old name, `renamed_from` stays `None` and nothing is carried,
because "nothing records which of two same-named rows an assignment belongs to".

**Failure:** trial holds `IKF-RJ-KOT-001` / `"Kota"` (the row the REP actually works) and
the legacy duplicate `IKF-RJ-KOT-999` / `"Kota"`. One assignment, `city="Kota"`,
`physical_address="Mittal ground"`.

`PUT` with `[{KOT-001, "Kota"}, {KOT-999, "Kota North"}]`

→ 200 OK. Loop reaches KOT-999, `was="Kota"`, new `"Kota North"`, carry fires and moves
the assignment to `"Kota North"` — the duplicate row, not the row it belongs to. KOT-001
now has no REP; the REP's ground address is attached to a row that was a data-entry
mistake. `find_orphans()` is green, because the name resolves.

Do the same thing through PATCH on KOT-999 and the assignment correctly stays put
(`test_a_surviving_twin_keeps_the_assignment_where_it_is`, `tests.py:1004`). One rename
rule was the stated goal of the refactor; there are still two, and the loud one is wrong.

## T3 — Bulk PUT duplicate guard never examines an existing code (HIGH)

`backend/trials/serializers.py:275-277`:

```python
for code in city_codes:
    if code in current:
        continue
```

Only **newly created** codes are identity-checked. The projection helpers
(`_resulting_name` / `_resulting_state` / `_resulting_identity`) are correct in
themselves and do match the write at `:342-343`; the defect is that the guard declines
to consult them for existing rows.

**Failure:** trial holds `IKF-RJ-KOT-001` / `"Kota"` / Rajasthan and
`IKF-RJ-JAI-002` / `"Jaipur"` / Rajasthan.

`PUT` with `[{KOT-001, "Kota", "Rajasthan"}, {JAI-002, "Kota", "Rajasthan"}]`

→ 200 OK, two rows with an identical (name, state) pair. That is the exact state
`add_city` (`views.py:141-153`) and `city_detail` PATCH (`views.py:241-254`) both refuse
with 400, and it is reachable from the project edit screen, which is the primary way
cities are edited. Question 1 of the brief — "can it be bypassed through the bulk PUT
path?" — answers yes.

The justification for skipping existing codes is real and is tested
(`test_an_existing_duplicate_pair_can_still_be_carried_through`, `tests.py:784`: a project
already holding twins must stay editable). But the correct exemption is "skip when this
row's resulting identity is unchanged from its stored identity", not "skip all existing
rows". As written, the guard only stops a duplicate arriving with a fresh `city_code` and
does nothing about one created by editing.

Related: once T3 lets twins exist, T2 makes their renames destructive and T6 makes their
deletes rebind across states. The three compound.

## T4 — Carry runs inside the write loop, in payload order (MEDIUM-HIGH)

`backend/trials/serializers.py:333-357`. Each row is written and carried before the next
row is examined, so a later carry can pick up assignments an earlier carry just moved.
`city_codes` order is whatever the client sent.

**Failure (chained rename):** trial holds A=`"Alpha"`, B=`"Beta"`. Assignments: R1 on
`"Alpha"`, R2 on `"Beta"`.

`PUT` with `[{A, "Beta"}, {B, "Gamma"}]` — i.e. B moves out of the way and A takes its name.

- Iteration A: `was="Alpha"` → `"Beta"`. Carry moves **R1** to `"Beta"`.
- Iteration B: `was="Beta"` → `"Gamma"`. Carry moves everything named `"Beta"` — **R1 and R2** — to `"Gamma"`.

Result: R1 ends on `"Gamma"` (row B) when it should be on `"Beta"` (row A). Send the same
two entries in the order `[{B,"Gamma"}, {A,"Beta"}]` and the result is correct. The
outcome depends on JSON key order, which no caller controls deliberately.

The same applies to a straight swap (`A: Kota→Jaipur`, `B: Jaipur→Kota`): one order is
correct by luck, the reverse order collapses both sets onto one city.

The fix shape is to compute every (old → new) pair before writing anything and apply the
carries against the pre-update snapshot, which is what `_resulting_*` was built for and
then not used for.

## T5 — A test that asserts the opposite of its own name (MEDIUM-HIGH, test defect)

`backend/trials/tests.py:131-143`:

```python
def test_a_stale_put_cannot_wipe_cities_added_since(self):
    """The lost-update race: a client PUTs the list it loaded minutes ago."""
    ...
    self.assertEqual(res.status_code, status.HTTP_200_OK)
    self.assertNotIn('Bikaner', self.trial.cities.values_list('city_name', flat=True))
```

The name says the stale PUT *cannot* wipe. The assertion requires that Bikaner **was**
wiped, and that the request succeeded. The test passes precisely because the data loss
happens. Anyone scanning the suite reads a green line named "cannot wipe cities added
since" and concludes the race is handled; it is not, and this test is what would go red
if it ever were handled.

Whether the lost update should be fixed is a separate call (it needs no migration —
an `If-Match` / `updatedAt` precondition would do). The test as written is actively
misleading and should be renamed to what it measures, or inverted.

Note it also sits in `CityRemovalAPITests`, not in one of the new classes, so both
earlier reviews of the removal guards would have read it as reassurance.

## T6 — Two contradictory definitions of "same city", and the seam rebinds assignments (MEDIUM)

The duplicate rule says a city is identified by **(name, state)** — `city_identity`,
`models.py:137`, applied in `add_city`, PATCH clash and bulk-PUT new-code clash.
The survival rules say a city is identified by **name alone** — `views.py:208-212`
(DELETE) and `views.py:264-267` (PATCH rename). `find_orphans` is likewise name-only
(`audit_orphan_assignments.py:26-38`).

Each rule is defensible alone. Where they meet, a delete or rename that the identity rule
calls "a different city" is treated by the survival rule as "the same city", and the
assignment silently transfers.

**Failure:** trial holds Aurangabad/Maharashtra (`IKF-MH-AUR-001`) and Aurangabad/Bihar
(`IKF-BR-AUR-001`) — two genuinely different cities by the project's own rule. A REP holds
`city="Aurangabad"`, `physical_address="<the Maharashtra ground>"`, plus a courier address.

`DELETE /api/trials/<id>/cities/IKF-MH-AUR-001/` → 200 OK (twin survives by name).

The assignment now resolves to the **Bihar** row. `courier/models.py:139-141`
(`TrialCity.objects.filter(trial_id=..., city_name__iexact=asgn.city).first()`) picks up
Bihar's `tentative_date` for the courier snapshot. Per `project_address_truth_2026_08_19`,
courier and ground are different facts and must never fall back onto each other; here a
Maharashtra ground address is silently filed under a Bihar city with a Bihar trial date.

`tests.py:580` — `test_a_same_name_row_in_another_state_still_answers_the_assignment` —
runs exactly this and asserts `find_orphans() == []`. It is green because `find_orphans`
is state-blind, so the assertion cannot see the thing that went wrong. It **encodes the
cross-state rebind as intended**. `tests.py:1004`
(`test_a_surviving_twin_keeps_the_assignment_where_it_is`, twin in Madhya Pradesh) does
the same on the PATCH path.

The same seam produces a cross-**row** rebind at `tests.py:738`,
`test_a_row_taking_over_a_dropped_name_keeps_it_resolvable`: JAI-002 (which holds the
assignment and its ground address) is dropped while KOT-001 is renamed to `"Jaipur"`. The
assignment ends up pointing at KOT-001 — a different row with a different
`ground_location`, `region` and `tentative_date` — and the test asserts 200 + no orphans.
"Resolvable" is not the same as "resolves to the right city", and only the first is tested.

Not proposing a redesign here; flagging that `find_orphans() == []` is being used as the
safety assertion in ~20 tests and is structurally incapable of catching a wrong-city
rebind. At minimum the twin tests should also assert *which row* the assignment now
answers to.

## T7 — A padding-only rename carries nothing, but the courier join does not strip (MEDIUM)

`backend/trials/models.py:165`:

```python
if not old_key or not new_name or old_key == normalise_city_key(new_name):
    return 0
```

`normalise_city_key` strips and lowercases, so `" Kota"` → `"Kota"` is treated as "not a
rename" and no assignment is touched. Every comparison *inside* `trials/` then agrees, so
nothing looks wrong from here.

But the consumer join is `city_name__iexact=asgn.city` (`courier/models.py:140`).
`iexact` ignores case; it does **not** strip. The code's own docstrings
(`models.py:126-132`) confirm padded legacy rows exist in production.

**Failure:** legacy row `city_name=" Kota"`, legacy assignment `city=" Kota"` — currently
joining fine. Someone tidies the row: `PATCH {"cityName": " Kota "}` → stored `"Kota"`.
No carry (keys equal). The assignment still holds `" Kota"`.
`city_name__iexact=" Kota"` no longer matches `"Kota"` → the courier snapshot loses its
trial date and the address join breaks, while `find_orphans()` stays green because *it*
normalises. A silent orphan invisible to the audit command.

`test_a_padded_assignment_is_carried_too` (`tests.py:977`) does not cover this: it pads
the assignment while making a real name change, so the carry fires.

Cheapest correct fix in-app: make the early return `old_name.strip() == new_name` rather
than key-equal, so a whitespace/case correction still rewrites the assignments.

## T8 — `add_city` duplicate guard is check-then-create (MEDIUM)

`backend/trials/views.py:141-172`. The identity scan (`:142-147`) and
`TrialCity.objects.create` (`:157`) are separate statements with no `transaction.atomic`,
no `select_for_update`, and no DB uniqueness on (trial, city_name, state) — the last of
which is correctly out of bounds under §3.

Two concurrent `POST /api/trials/<id>/cities/` with different `code` and the same
(cityName, state) both pass the scan and both create. Result: the duplicate pair the
guard exists to prevent. Given the project screen's bulk-add, a double-click is a
plausible trigger.

Also worth noting: the `city_code` pre-check at `:126` is likewise racy, but there
`unique_together = ('trial', 'city_code')` catches it — as an uncaught `IntegrityError`,
i.e. a 500 instead of the intended 400. Wrapping the create in `try/IntegrityError` →
400 would close both without a migration.

## T9 — DELETE twin-survival check is TOCTOU (MEDIUM)

`backend/trials/views.py:208-222`. Sequentially the guard is correct: delete twin A
(B survives, allowed), then delete twin B (nothing survives, 409). Confirmed by
`test_deleting_the_duplicate_first_still_protects_the_last_one` (`tests.py:608`).

Concurrently it is not. Two requests, one for each twin, both evaluate
`trial.cities.all()` before either `tc.delete()` commits; each sees the other alive,
`twin_survives` is True for both, `blocking` is `{}` for both, both delete. The
assignment is stranded and the guard reports nothing. Same shape as T8; the whole
read-check-write needs to be one `transaction.atomic` with the trial's city rows locked.

## T10 — Ambiguous twin lookup in the courier snapshot (LOW-MEDIUM)

`courier/models.py:139-141` uses `.filter(...).first()` with no `order_by`. With two
same-named rows in a trial — a state these guards now deliberately tolerate — the trial
date attached to a courier dispatch is whichever row the DB returns first, and MySQL
gives no ordering guarantee. Out of scope to fix here, but it is the consumer that makes
T2/T3/T6 expensive rather than merely untidy.

## T11 — PATCH still discards `groundLocation` (LOW)

`backend/trials/views.py:289-296` handles `region`, `tentativeMonth`, `tentativeDate`,
`confirmed`, and now `cityName` / `state`. `groundLocation` is still accepted and
silently dropped, while `add_city` (`:168`) and the bulk PUT (`:345`) both store it.
`FIX_CITY_RENAME.md` declares this deliberate and out of scope. Recording it so the
"silent save" class is not considered closed for this endpoint.

---

## Things checked and found correct

- `normalise_city_key` / `city_identity` are applied on both sides of every comparison in
  `trials/`; no surviving path compares a normalised input against a raw column via
  `__iexact`. The defect the docstring at `models.py:126-132` describes is genuinely fixed
  **within this app**. The remaining inconsistency is at the `courier` consumer (T7).
- `rep_assignments_blocking_removal` reads through `trial.rep_assignments`
  (`reps/models.py:71`, `related_name='rep_assignments'`), so it cannot see another
  trial's assignments. `carry_rep_assignments` is scoped the same way — it cannot move a
  different trial's assignment. `test_a_rename_leaves_another_trials_assignment_alone`
  is a real test.
- Bulk PUT projection (`_resulting_name` / `_resulting_state`) does match the writes at
  `:342-343` and `:363-364` for every input shape including `''`, `None` and absent keys.
  The projection is not where the bulk PUT is wrong; T1-T4 are.
- New-code duplicate detection in the bulk PUT (new-vs-new via `seen_new`, new-vs-existing
  via the `for other in city_codes` scan) is correct, and correctly ignores rows being
  removed in the same request.
- PATCH writes name and state before `tc.save()` and carries only after
  (`views.py:286-302`); `rep_assignments_blocking_removal` is called while `tc.city_name`
  still holds the old name. Ordering here is right.
- `test_a_second_city_with_the_same_name_is_refused`, `test_two_new_cities_sharing_a_name_are_refused`,
  `test_a_sub_area_of_the_same_city_is_still_a_different_city`,
  `test_clearing_a_held_name_is_refused`, `test_renaming_onto_an_existing_pair_is_refused`
  all fail with their fix backed out and assert the right thing. The reverse-check in
  `FIX_CITY_RENAME.md` is honest as far as it goes; what it does not do is test the bulk
  PUT against the rules it verified on PATCH.
- No FK, no migration, no data-flow change in any of the three commits.
  `.ai/schema-integrity.md` §3 is respected.

## Does any path here create new orphans?

Yes — **T1** does, directly and silently, on the path the project edit screen uses.
**T7** creates orphans that `find_orphans()` cannot even report. **T2** and **T4** do not
strand assignments but attach them to the wrong city, which the audit command reads as
healthy.
