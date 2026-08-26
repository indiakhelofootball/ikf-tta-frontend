# FIX_PAN_AND_VENUE — 2026-08-21

Two independent fixes, one backend one frontend.

- FIX 1 (N4): two vendors can be created with the same PAN — application-level
  uniqueness guard in `vendors/serializers.py`.
- FIX 2: the Venue column is missing from the on-screen Trials Report table.

Written incrementally. Sections are appended as each step completes.

---

## Reading pass — what is actually there

### FIX 1

`tta_backend/backend/vendors/models.py:70-77` — `Vendor.Meta` has four plain
`models.Index` entries (`status`, `vendor_type`, `partner_category`, `state`)
and **no `unique_together`, no `UniqueConstraint`, no `unique=True` on any
field**. Confirms `.ai/schema-integrity.md` §2.

`vendors/models.py:40` — `pan_number = models.CharField(max_length=10)`. No
`blank=True`, no `default`, so the model itself treats it as required.

`vendors/serializers.py:24` — `panNumber = serializers.CharField(source='pan_number', max_length=10)`.
No `required=False`, no `allow_blank`. And `validate_panNumber` (line 99-107)
opens with:

```python
if not value or not value.strip():
    raise serializers.ValidationError('PAN number is required.')
```

**So PAN is required and blank is NOT permitted through this serializer.** The
brief said to verify before assuming, and the answer is: a "two blank PANs are
both allowed" test cannot be written against a create, because a blank PAN is
rejected before uniqueness is ever reached. What I will assert instead is that
the *rejection reason for a blank stays the required-field message*, i.e. the
new guard does not turn "PAN is required" into "PAN already in use" — and that
pre-existing rows with a blank PAN (creatable only via the ORM factory, as
legacy/bulk-import rows are) do not collide with each other in the guard.

`validate_panNumber` already normalises: `.strip().upper()`. So by the time a
cross-field `validate()` sees `attrs['pan_number']`, case and padding are
already gone. That is the right place to hang the uniqueness check — it means
case and padding cannot evade it *for the incoming value*. The **stored** side
still needs `__iexact`, because rows already in the DB were written before this
normalisation existed and may hold lowercase.

`vendors/views.py:133-148` — `create()` and `update()` both go through
`serializer.is_valid(raise_exception=True)`, so a serializer-level guard covers
both. `bank_details` (line 159) bypasses the serializer but only writes three
bank fields, never PAN — not a hole.

There is no `vendors/tests.py` and no test module in `vendors/` at all. New file
needed. `test_support/factories.py:39` provides `create_vendor(**kwargs)`
(defaults PAN `ABCDE1234F`), and `create_user(role=...)`; the pattern to copy is
`config/test_vendor_tag_rename.py`.

### FIX 2

`src/components/reports/TrialsReport.jsx:259` builds the row field:

```js
location: (assignment && assignment.groundLocation) || c.groundLocation || '',
```

That single `location` field is what the Excel export (`:358`, `:367`) and the
CSV export (`:374`, `:376`) both print under the header **Venue**. The
on-screen header array at `:549` is
`['Project', 'Season', 'State', 'City', 'Address', 'Date', 'Map', 'REP', 'Status']`
— no Venue. Confirmed: the field exists on every row, both exports read it, the
table never renders it.

So the fix is to render `r.location` on screen, sourced from the same `r.location`
field the exports use — screen and export cannot drift because there is only one
field. Nothing about how `location` is computed changes.

Also noted: `filteredRows` already searches `norm(r.location)` (`:301`), so the
column is already searchable; only the display was missing.

Not touched, per instruction: the `groundPinCode || pinCode` fallback block at
`:179-188`, and `addressOf`'s word-boundary logic.

---

## FIX 1 — implemented

`tta_backend/backend/vendors/serializers.py`

`validate()` now ends with a call to a new `_reject_duplicate_pan(attrs)`. It:

- returns early when `pan_number` is absent from `attrs` (a PATCH that never
  mentions PAN has nothing new to check);
- returns early on a blank (two blanks are not the same legal entity);
- otherwise `Vendor.objects.filter(pan_number__iexact=pan)`, `.exclude(pk=self.instance.pk)`
  when editing, and raises `{'panNumber': ...}` naming the vendor already
  holding it.

Case and padding cannot evade it from either side: the incoming value has
already been through `validate_panNumber`'s `.strip().upper()`, and the stored
side uses `__iexact` because rows written before that normalisation existed
hold lowercase.

`views.py` was **not** changed — `create()` and `update()` both already run
`serializer.is_valid(raise_exception=True)`, so both paths are covered by the
serializer alone. `bank_details` bypasses the serializer but writes only
`bank_name` / `account_number` / `ifsc_code`, never PAN, so it is not a hole.

**No migration was written and no DB constraint was added**, per the standing
owner instruction in `.ai/schema-integrity.md` §3.

### OUTSTANDING — the DB-level constraint is NOT done

`Vendor.pan_number` still has **no database unique constraint**. This fix stops
new duplicates *through the API*; it does nothing about:

- the duplicate rows already on production, including the two created during the
  2026-08-21 measurement (`TCVEN Alpha Services` / `TCVEN Beta Services`, PAN
  `TCVEN1234A`) — these still exist and still need cleaning up;
- any writer that bypasses `VendorSerializer` — the Django admin, a management
  command, a shell session, or direct SQL;
- a genuine race between two simultaneous creates, which only a DB constraint
  can close.

Adding the constraint requires a duplicate census on production first
(`.ai/schema-integrity.md` §6 step 5), which is not possible from here. It
remains real, unfinished work.

### Tests — `vendors/test_pan_uniqueness.py` (new file, 12 tests)

There was no test module in `vendors/` at all before this.

| test | reverse-check |
|---|---|
| `test_second_vendor_with_the_same_pan_is_refused` | **CAUGHT** |
| `test_lowercase_pan_does_not_evade_the_guard` | **CAUGHT** |
| `test_padded_pan_does_not_evade_the_guard` | **CAUGHT** |
| `test_a_stored_lowercase_pan_is_still_matched` | **CAUGHT** |
| `test_editing_a_vendor_onto_another_vendors_pan_is_refused` | **CAUGHT** |
| `test_editing_a_vendor_without_changing_its_pan_still_works` | passed with the bug present |
| `test_first_vendor_with_a_pan_is_accepted` | passed with the bug present |
| `test_a_different_pan_is_still_accepted` | passed with the bug present |
| `test_patching_bank_details_does_not_trip_the_pan_guard` | passed with the bug present |
| `test_blank_pan_is_still_rejected_as_required_not_as_a_duplicate` | passed with the bug present |
| `test_two_legacy_blank_pan_rows_do_not_collide_with_each_other` | passed with the bug present |
| `test_a_legacy_blank_pan_row_can_be_given_a_real_pan` | passed with the bug present |

**5 of 12 caught the bug. 7 passed either way — stated plainly rather than
hidden.** Those 7 are not duplicate-detection tests; they exist so the guard
cannot over-reach. To check they were not dead weight, the fix was broken a
second time in the opposite direction (over-strict: `.exclude(pk=...)` and the
blank skip removed). That variant was caught by
`test_editing_a_vendor_without_changing_its_pan_still_works` — a real
over-reach the guard could plausibly have shipped with, and the single most
damaging one, since it would have made every vendor uneditable.

A third variant was tried — dropping the `'pan_number' not in attrs` early
return and falling back to the stored PAN — and **nothing caught it**. That is
because `.exclude(pk=self.instance.pk)` already covers the case, making the
early return a pure short-circuit with no behavioural effect.
`test_patching_bank_details_does_not_trip_the_pan_guard` therefore cannot fail;
it documents intent rather than defending behaviour.

Similarly, the guard's `if not pan: return` line is **unreachable from the
API** — DRF's `allow_blank=False` on `panNumber` rejects a blank at field level
before `validate()` runs. The blank tests were rewritten once this was measured,
so they exercise the reachable path (a PATCH on a legacy blank row) rather than
pretending to cover the unreachable branch.

---

## FIX 2 — implemented

`src/components/reports/TrialsReport.jsx` — three changes, 18 lines added, 2
changed, nothing removed:

1. `'Venue'` inserted into the detail-table header array between `'City'` and
   `'Address'` — the same position both exports use.
2. A new `<TableCell>` rendering `r.location`, with the grey em-dash placeholder
   the Map column already uses for an absent value.
3. The empty-state `colSpan` bumped `9` -> `10` to match the new column count.

`r.location` is the identical field the Excel builder (`:367`) and the CSV
builder (`:376`) print under their `Venue` header. There is one field, so screen
and export cannot drift.

Not touched, as instructed: the `groundPinCode || pinCode` fallback and its
comment, and `addressOf`'s word-boundary logic. Verified by `git diff` — the
whole diff is the three changes above.

Blank Venue cells on most existing rows are expected: the Ground Name input is
new, so nobody has filled it in yet.

### Tests — `src/components/reports/TrialsReport.venue.test.jsx` (new file, 9 tests)

Note on setup: `react-router-dom` does not resolve under jest in this repo, so
the mock needs `{ virtual: true }` — a plain `jest.mock` fails with "Cannot find
module" before it can substitute anything.

| test | reverse-check (column fully backed out) |
|---|---|
| `renders a Venue column header in the detail table` | **CAUGHT** |
| `places Venue between City and Address, matching the export order` | **CAUGHT** |
| `shows the ground name from the REP city assignment` | **CAUGHT** |
| `shows the venue as its own cell, not folded into the Address cell` | **CAUGHT** |
| `leaves Venue blank when the assignment has no ground name` | **CAUGHT** |
| `leaves Venue blank for a city with no REP assignment at all` | **CAUGHT** |
| `shows the same Venue value on screen as the Excel export writes` | **CAUGHT** |
| `finds a row by its venue when searching, and shows it in the Venue cell` | **CAUGHT** |
| `keeps every body row the same width as the header row` | passed with the bug present |

**8 of 9 caught the bug.** The ninth is a consistency test, not a
venue-detection test: with the column fully absent, header and body agree at 9
columns, so it correctly has nothing to report. It was run against a **second,
partial backout** — header row restored but the body cell still missing, the
classic half-applied version of this change — and **it caught that**, along with
5 others. It is doing a real job; it just is not the job of proving the column
exists.

---

## Verification

| suite | before | after |
|---|---|---|
| backend, full | 559 passed, OK | 577 passed, OK |
| frontend, full | 22 suites / 275 tests passed | 23 suites / 284 tests passed |

Frontend: +1 suite, +9 tests — exactly what was added here.

Backend: +18, of which **12 are mine**. The other 6 come from live work by
someone else in this same tree: `git status` shows `backend/trials/tests.py`,
`backend/trials/serializers.py` and `backend/courier/tests.py` modified, none of
which was touched here. The brief's stated baseline was 553; the measured
baseline immediately before this work was 559, for the same reason.

Nothing regressed in either suite.

### One flake worth recording

The first frontend baseline run reported `1 suite failed, 3 tests failed`. It
was run in parallel with the full backend suite and the failures did not
reproduce on either of two subsequent clean runs (275/275, then 284/284). The
frontend suite has timing-sensitive `waitFor` assertions that miss their
deadline under CPU contention. Not caused by anything here, but a re-run under
load could show it again — do not read a single red frontend run as a real
regression without repeating it on an idle machine.

## Scope

Files changed:

- `tta_backend/backend/vendors/serializers.py` (51 lines added, 0 removed)
- `tta_backend/backend/vendors/test_pan_uniqueness.py` (new)
- `src/components/reports/TrialsReport.jsx` (18 added, 2 changed)
- `src/components/reports/TrialsReport.venue.test.jsx` (new)
- this file

No migration written. No DB constraint added. Nothing under `trials/` or
`courier/` touched. `paymentAuditTotals.js`, `trialsReportStats.js` and their
tests untouched. Nothing committed, nothing pushed.
