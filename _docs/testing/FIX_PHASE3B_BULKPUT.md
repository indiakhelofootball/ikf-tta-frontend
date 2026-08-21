# Phase 3b — bulk PUT city path (2026-08-21)

Scope: `trials/serializers.py`, `trials/tests.py` only. No migrations, no schema
change, no data-flow change (standing owner instruction, 19 Aug — see
`.ai/schema-integrity.md` §3).

Follows `FIX_PHASE3_BACKEND.md`, which fixed the same two defects on the
single-city endpoints in `trials/views.py` and explicitly left the bulk PUT path
(`TrialSerializer.update`, around :235) open.

Status legend: PENDING / DONE / VERIFIED

- FIX #1b-bulk — duplicate city cannot be removed via bulk PUT — DONE
- FIX #1a-bulk — duplicate city NAME insertable via bulk PUT — DONE

## Baseline

`python manage.py test trials reps payments --settings=backend.dev_local_settings`

- Before: **212 tests, OK.**
- After: **224 tests, OK.** 12 regression tests added in
  `trials/tests.py` (`DuplicateCityBulkUpdateTests`).
- Reverse-check: with the guard backed out to its previous two lines, **5 of the
  12 new tests fail** — duplicate dropped by omission, swap to a new code, a row
  taking over a dropped name, and both duplicate-name insert cases. The other 7
  are the "must keep working" cases (dropping both twins still refused, dropping
  the last row of a name still refused, rename still carries the assignment, an
  existing duplicate pair still editable, sub-area names distinct, another
  project may hold the name, assignment not stranded), which correctly pass
  either way. Fix restored, full run green again.

Files touched: `trials/serializers.py`, `trials/tests.py`. Nothing else —
`trials/views.py`, `reps/`, `payments/` untouched. No migration created.

## FIX #1b-bulk — a duplicate city could not be removed by omission

`trials/serializers.py`, `TrialSerializer.update`. The project edit screen sends
the whole city list back, so removal happens by omission, not by DELETE. The
guard passed every omitted row to `rep_assignments_blocking_removal`, which
matches by NAME — so a duplicate "Kota" inherited the protection of the row the
REP actually holds and could not be dropped here either.

Same scoping as the DELETE fix, no FK, no migration: an omitted row only strands
an assignment if its name matches nothing **left in the trial after the update**.
Implemented as a `surviving_names` set built from the requested codes, and the
blocking check now runs on `stranding` (omitted rows whose name is not in that
set) rather than on every omitted row.

### Difference from the DELETE path that had to be accounted for

The DELETE path removes exactly one row and changes nothing else, so "does a
twin survive" is a query against the current table. The bulk path removes a
*set* and can rename and create rows in the same request, so the surviving names
are not the current names:

- a requested code with a sent `cityName` will carry the **new** name;
- a requested code with no detail sent keeps its current name;
- a requested code with no row yet is a city about to be created — its name
  counts as surviving.

`_resulting_name(code)` computes that projected name, using the same
`d.get('cityName', tc.city_name)` fallback the row update itself uses, so the
guard and the write agree. Consequences, all intended:

- renaming a row off a held name still counts as removing that name, so the
  removal is blocked unless something else answers to it;
- swapping a duplicate for a new code carrying the same name is allowed — the
  name still resolves, nothing is stranded;
- dropping **both** twins in one request is still blocked, because no surviving
  row carries the name.

Not touched: the existing rename-carry block, which moves assignments from the
old name to the new. With twins present it moves an assignment off a row that
still exists under the old name — pre-existing behaviour of this path, outside
this fix, and it does not strand anything (the new name always exists).

## FIX #1a-bulk — a duplicate city NAME could be inserted by bulk PUT

Same method. Uniqueness is `('trial','city_code')`, so a payload could add a
second row named "Kota" under a new code — the hole `add_city` closed.
Case-insensitive **whole-name** check, so "Kota" and "Kota, Central" remain two
cities.

Scoped to **newly created codes only**, deliberately. A project that already
holds a duplicated pair must stay editable: refusing a payload that merely
carries the existing pair through would lock the project out of the very edit
that removes the duplicate. So the check refuses introducing a *new* clash —
against another new entry in the same payload, or against a row that survives
the update — and lets an existing pair pass. Raised as a DRF
`ValidationError` on `assignedCities` (400), matching the path's other guard.
