# FIX — "Address and MOU, Logo got deleted again" (add-REP merge path)

Reported 6x by the client. Tracker row #2. Narrowed by live testing 2026-08-21 (TC-REP-04).

## What is NOT broken
Editing an existing REP and changing only the phone PASSES — verified against the API,
not the screen. `repLogoLink` survived, `mouStatus` untouched. The ordinary edit path
(`REPSerializer.update`) is not being changed.

## The defect
`REPSerializer.create()` merges onto an existing org row when the submitted `repName`
matches one already stored:

```python
for attr, value in validated_data.items():
    setattr(rep, attr, value)
```

Unconditional. Two independent things feed blanks into that loop:

1. **Backend** — `repLogoLink` is declared `required=False, allow_blank=True, default=''`.
   The `default=''` puts the key into `validated_data` **even when the payload never
   mentioned it**. Same shape for `mouStatus` (`default='Pending'`), `season`, `website`,
   `facebook`, `instagram`, `telegram` and the `*NA` booleans. So `validated_data` cannot
   be used as evidence of what the caller sent.
2. **Frontend** — `REPModal.jsx` add mode does `const repData = { ...orgData }`, and
   `orgData` is seeded with `repLogoLink: ''` / `mouStatus: ''` and stays `''` for every
   field the user did not type. So the blank is *actually on the wire*: no backend rule
   can tell it from a deliberate clear. `searchRepByName` prefills contact/socials/MOU
   from the matched org but **never prefills `repLogoLink`** — that is why the logo link
   is the field that dies every single time a second city is added.

## The trap (and why "skip empty values" alone is wrong)
Skipping blanks in the merge would make it impossible to ever clear a field on purpose.
The distinction that matters is **not sent** vs **sent empty**, and `validated_data`
destroys it. `serializer.initial_data` preserves it — a key present there was typed by
the caller, blank included.

## Plan
- Backend: merge only the source attrs whose serializer field name is present in
  `self.initial_data`. Explicit blank still lands (clear still works).
- Frontend (add mode only): stop sending org fields the user left empty. On a brand-new
  REP an omitted field is identical to the model default `''`; on the merge path it is
  the difference between keeping and destroying the stored value.
- No migrations, no new constraints, no data-flow change.

## Progress log
- [x] Read serializers.py / models.py / views.py / tests.py / REPModal.jsx
- [x] Root cause confirmed on BOTH sides (see above)
- [x] Backend fix applied
- [x] Frontend fix applied
- [x] Regression tests added
- [x] Backend suite run
- [x] Frontend suite run
- [x] Reverse-check each new test

## Side finding (pre-existing, fixed as a side effect)
`mouStatus` is a `ChoiceField` with no `allow_blank`, and the modal does not require it.
A fresh add with MOU status left untouched therefore sent `mouStatus: ''` and would have
been rejected 400 `"is not a valid choice"`. Omitting empty org fields removes that too.

## What changed

### `reps/serializers.py`
- New `REPSerializer._submitted_attrs()` — returns the set of model source attrs whose
  serializer field name appears in `self.initial_data`, i.e. what the caller genuinely
  sent. Returns `None` when there is no dict payload (direct `serializer.save()`), in
  which case the old apply-everything behaviour is kept.
- `create()`'s name-match merge loop now skips any `validated_data` key that is not in
  that set. Explicitly-sent blanks are still applied, so a deliberate clear still clears.
- `update()` was NOT touched — the ordinary edit path was verified working today.

### `src/components/rep/REPModal.jsx`
- Add mode builds `repData` from `orgData` filtered to non-`''` values, instead of
  spreading the whole object. Necessary because the modal seeds every untouched org field
  to `''`; without this the blank is physically on the wire and no backend rule can tell
  it from a deliberate clear.
- Pre-existing uncommitted work in this file (Ground Name input, `openEditAssignment`
  hydrating `groundLocation`) left untouched.

## Results

### Backend — `python manage.py test reps --settings=backend.dev_local_settings`
- Before: **34 tests, OK**
- After: **38 tests, OK** (4 new)

### Frontend — `CI=true npx react-scripts test --watchAll=false`
- **21 suites / 265 tests passed** (the 18/217 baseline in the brief is stale — other
  in-flight work has added suites). No frontend test was added or changed; REPModal has
  no suite. `npx eslint src/components/rep/REPModal.jsx` clean.

### Reverse-check (backend fix disabled, then restored)

| Test | with fix out |
|---|---|
| `test_second_city_preserves_logo_link_mou_and_socials` | **FAILS** — `rep_logo_link` becomes `''` (the exact client-reported symptom) |
| `test_merge_still_applies_what_the_caller_did_send` | **FAILS** — `facebook` blanked by the default while the sent keys still landed |
| `test_merge_with_explicit_blank_still_clears` | **FAILS** — `mou_status` reset `Signed` → `Pending` by the serializer default |
| `test_single_field_edit_still_updates_and_preserves` | **passes either way** — correct: it guards `update()`, which was deliberately not changed |

3 of 4 catch the regression. The 4th is a guard, not a detector, and is expected to pass
either way — it is what proves the edit path was not collaterally broken.

The frontend half is proved by `test_merge_with_explicit_blank_still_clears`: a blank
`repLogoLink` on the wire *does* clear the stored value, by design. That is precisely why
the modal must stop putting one there.
