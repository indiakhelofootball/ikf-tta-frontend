# Phase 3 — backend fixes (2026-08-21)

Scope: `reps/views.py`, `trials/views.py` only. No migrations, no schema change,
no data-flow change (standing owner instruction, 19 Aug — see `.ai/schema-integrity.md` §3).

Status legend: PENDING / DONE / VERIFIED

- FIX #8 — stale REP assignment response — VERIFIED
- FIX #1b — duplicate city cannot be deleted — VERIFIED
- FIX #1a — duplicate city NAME can be inserted — VERIFIED

## Test results

`python manage.py test reps trials --settings=backend.dev_local_settings`

- Before: 52 tests, OK.
- After: **64 tests, OK.** 12 regression tests added — 4 in
  `reps/tests.py` (`AssignmentResponseFreshnessTests`), 8 in `trials/tests.py`
  (`DuplicateCityTests`).
- Reverse-check: with the three fixes temporarily backed out, 8 of the 12 new
  tests fail. The other 4 are the "must keep working" cases (sub-area names,
  repeated code, same city name on another project, assignment not stranded),
  which correctly pass either way.

Files touched: `reps/views.py`, `reps/tests.py`, `trials/views.py`,
`trials/tests.py`. Nothing else — `payments/` untouched. No migration created.
The pre-existing uncommitted `ground_location` change in `trials/views.py`
`add_city` is intact.

## FIX #8 — stale REP assignment response

`reps/views.py`. `get_object()` is served from `get_queryset()`, which
`prefetch_related('city_assignments', 'city_assignments__trial')`. The prefetch
cache is populated before the assignment write, so re-serialising the same
instance afterwards returns the pre-write assignment list. The write landed; the
response denied it — which is why "address not saving" was reported repeatedly
and twice closed as Done.

Added `REPViewSet._reread(rep)`, which re-reads the row with the same prefetch,
and used it in all three write paths:

- `manage_assignment` PUT (the reported case)
- `manage_assignment` DELETE (**same defect** — the removed assignment was still
  listed in the response)
- `add_assignment` POST (**same defect** — the new assignment was missing from
  the response)

No behaviour change beyond what the response reports.

## FIX #1b — a duplicate city could not be deleted

`trials/views.py`, `city_detail` DELETE. The guard matched blocking REP
assignments by city NAME, so a second row named "Kota" inherited the protection
belonging to the first and was undeletable through the product.

Scoped **without an FK** (`REPCityAssignment.city` stays a plain CharField, by
standing decision): the guard's purpose is to stop an assignment being
*stranded* — left with a city name that matches no remaining city row in the
trial. If another row with the same name survives the delete, the name still
resolves and nothing is stranded, so the delete is safe. Only the last row
carrying a given name can strand an assignment, so only that row is blocked.

Implemented as a `twin_survives` check (`city_name__iexact`, excluding the row
being deleted) that short-circuits `rep_assignments_blocking_removal`. The
helper in `trials/models.py` is untouched, so the bulk-update path in
`trials/serializers.py` keeps its current behaviour. Error message format
unchanged — still names the city and the blocking REP.

## FIX #1a — a duplicate city NAME could be inserted

`trials/views.py`, `add_city`. `unique_together ('trial','city_code')` never
looked at the name, so a second "Kota" under a different code returned 201.
Added a case-insensitive whole-name check against the trial's existing cities,
returning 400 naming the existing entry and its code. Whole-string comparison,
so the frontend's deliberate `"City, Sub-area"` names ("Kota" vs "Kota, Central")
remain distinct. Application-level only — no constraint, no migration.

