# FIX_REVIEW_2 — adversarial review, second wave (2026-08-21)

Scope: everything that changed AFTER `FIX_REVIEW.md`. Findings from that file are not repeated.
Read-only review. `trials/*` skipped (another agent editing live).

Severity: **HIGH** = wrong money / data loss / blocks real work · **MED** = wrong figure or
recoverable-but-wrong behaviour · **LOW** = cosmetic / latent.

---

## G1 — the courier optimistic lock is opt-in by the client that would corrupt the data (MED-HIGH)

`tta_backend/backend/courier/views.py:115-127`

    expected = data.get('expectedUpdatedAt')
    if expected:
        ...409...

The destructive operation is a few lines below: `shipment.items.all().delete()` then recreate
(`courier/views.py:134-149`). The guard protects that operation **only if the caller volunteers a
token**. A caller that omits `expectedUpdatedAt` still gets the old, unguarded, full-list-replacing
write. The bug being fixed is not "a client sends a stale token", it is "a client sends a stale
item list" — and omitting the token is strictly easier than sending one.

Concrete failure: `PATCH /api/courier/shipments/12/` with body `{"notes":"x","items":[...6 stale
items...]}` and no `expectedUpdatedAt` -> 200, the 7th item another user added is deleted, no
warning to anyone. Identical to the reported "package slip - item added separately was missing".

Not theoretical for this deployment: the frontend is a **static build shipped by `deploy.bat` and
cached by browsers** (project CLAUDE.md). Any tab still running yesterday's bundle keeps corrupting
concurrent edits, and the server gives no signal that it happened. The comment ("older clients keep
working exactly as before - they simply do not get the protection") states the hole as if it were a
compatibility feature.

Minimum change: require the token specifically when `'items' in data` (400 if absent). Scalar-only
PATCHes can stay unguarded — they are not destructive.

## G2 — a 409 leaves the user permanently stuck; the recovery payload is ignored (MED)

`src/components/courier/CourierManagementPage.jsx:634-636` (catch -> `setError`) and `:579`
(`setLoadedUpdatedAt(s.updatedAt || '')`).

On 409 the modal stays open with the **same** stale `loadedUpdatedAt`. Every retry 409s. Closing and
re-opening does not help either: `openEdit` reads `s.updatedAt` out of the **local `shipments`
state**, which is exactly the stale copy that caused the conflict — nothing refetched it. The user
is stuck in a loop until they blur/refocus the window (`useRefetchOnFocus`) or hard-reload.

Meanwhile the server hands back `currentUpdatedAt` in the 409 body (`courier/views.py:124`) and the
frontend throws it away — `apiService.request` surfaces only `data.detail`
(`src/services/api.js:70`), so the one field that would allow "reload and retry" never reaches the
component.

Capped at MED because the error text is correct and a reload does work — but the message tells the
user to "reload", which the app never offers in-modal.

## G3 — the two specific lock questions, answered (no finding)

- **Does the frontend send a fresh token after a successful save?** It does not call
  `setLoadedUpdatedAt` again — but it does not need to: `saveShipment` closes the modal
  (`:634 setModalOpen(false)`) and replaces the list row with the PUT response, and the PUT returns
  `ShipmentDetailSerializer`, which **does** include `updatedAt` (`courier/serializers.py:51,66`).
  The next `openEdit` re-arms from a fresh value. **No false 409 on a second save.**
- **Does create leave the token empty?** No. `shipment_list` POST returns `ShipmentDetailSerializer`,
  not `ShipmentCreateSerializer` (`courier/views.py:68`), so a just-created row carries `updatedAt`
  and editing it immediately is protected.
- `_normalise_ts` is correct. `USE_TZ = True` (`backend/settings.py:140`) so DRF renders local-tz ISO
  while the server compares `updated_at.isoformat()` in UTC — parsing both to POSIX floats is exactly
  right, and the string fallback fails closed.
- `refresh_snapshot()` does **not** save (`courier/models.py:112-114`, "Caller decides"), so listing
  shipments does not bump `updated_at` and does not poison the token. Verified deliberately: if it
  did, the lock would 409 on every save.

## G4 — `openNew()` does not clear `loadedUpdatedAt` (LOW, latent)

`src/components/courier/CourierManagementPage.jsx:563` resets `editingId`, `fRepId`, `fAsgId`,
`fItems`, `fNotes`, `error` — not `loadedUpdatedAt`. Harmless today because the token is only sent on
the `editingId` branch, but it is a stale value waiting for someone to move the send out of that
branch.

## G5 — config plain-PUT cascade: a rename that also moves category silently orphans (MED)

`tta_backend/backend/config/views.py:135-140`

    if (new_value != old_value
            and old_category == instance.category
            and old_category in RENAME_CASCADES):

`PATCH /api/config-options/7/ {"value":"Scout","category":"partner_category"}` on a row that was
`service_type: "Volunteer"` -> the row is renamed **and** moved, the guard's `old_category ==
instance.category` fails, no cascade runs, and the endpoint returns **200 with no `cascade` key and
no warning**. Every `Vendor.vendor_type = "Volunteer"` now points at a string that no longer exists
in any category — precisely the orphaning this fix was written to close, reachable through the same
endpoint it hardened.

The docstring calls this deliberate ("not a rename we can safely chase"). Declining to chase it is
fine; returning 200 is not. It should 400 — "change the value or the category, not both" — because
the caller cannot tell the cascade was skipped.

## G6 — config: `season` has no cascade entry at all, in either rename path (MED)

`config/views.py:193-198` (`RENAME_CASCADES`). Covered: `project_name`, `service_type`,
`entity_type`, `partner_category`. **Not covered: `season`.**

`Trial.season` (`trials/models.py:37`), `REPCityAssignment.season` (`reps/models.py:13`) and
`CSRProject.season` (`csr/models.py:47`) all store the season as plain text with no FK — the same
shape as every string that *is* cascaded. Renaming a season through either path renames the catalog
row and leaves all three tables holding the old string.

Worse than an ordinary cascade gap because the owner decision on record is that **project identity =
project_name + season** — project_name now cascades and its paired season does not, so half the
composite key moves and half does not.

Second-order: `Trial.season` carries `choices=SEASON_CHOICES` hard-coded in the model. A rename to a
value outside that list leaves every existing trial failing `full_clean()` (DB unaffected — choices
are not DB-enforced — so it surfaces later as a validation error, not at rename time).

`courier_item` and `vendor_name` are also uncascaded, but nothing denormalizes them
(`ShipmentItem.name` is a deliberate per-shipment snapshot, not a reference), so they are correctly
absent.

## G7 — config: the plain PUT *is* collision-guarded (no finding)

`ConfigOptionSerializer.validate` (`config/serializers.py:26-39`) runs a case-insensitive
`category + value` check excluding `self.instance`, and `Meta.unique_together = ('category','value')`
(`config/models.py:26`) backs it at the DB. A PUT renaming onto an existing name 400s before
`super().update()` returns, so the cascade never runs on a collision. Correct — matches the dedicated
`rename` action's block.

## G8 — config: cascading from an inactive (soft-deleted) row (LOW)

`destroy()` is a soft delete (`is_active=False`). The new `update()` cascades with no `is_active`
check, so renaming a retired option rewrites live `Vendor`/`Trial` rows that still carry the old
string. Arguably right — those rows really do hold that text — and it matches the dedicated `rename`
action, which also ignores `is_active`. Consistent, not a defect.

## G9 â€” the REP merge fix protects `create()` and leaves `update()` wide open on the same fields (MED)

`tta_backend/backend/reps/serializers.py:235-260` adds `_submitted_attrs()` and applies it in
`create()` (`:272-280`). `REPSerializer.update()` (`:329-332`) is untouched â€” it still calls
`super().update()`, which setattrs **every** key in `validated_data`.

`repAPI.update` uses **PUT**, not PATCH (`src/services/api.js:335`), and `REPViewSet.update` passes
`partial=False` (`reps/views.py:81`). Non-partial means DRF *does* inject every serializer default
into `validated_data`. So `PUT /api/reps/12/ {"repName":"Acme","contactName":"R"}` sets
`rep_logo_link=''`, `mou_status='Pending'` and every social/URL field to `''` â€” the identical
"logo/MOU deleted again" bug, on the endpoint the edit form uses.

It does not fire from the current UI only because `REPModal`'s edit branch happens to ship the whole
prefilled `orgData`. That is a UI accident, not a guarantee, and it is the exact accident that broke
in the add branch. The guard belongs in `update()` too â€” or `_submitted_attrs()` should be applied in
a shared hook.

## G10 â€” the frontend blank-strip makes the backend fix's "a deliberate clear still clears" unreachable (MED)

`src/components/rep/REPModal.jsx:524-526`

    const repData = Object.fromEntries(
      Object.entries(orgData).filter(([, value]) => value !== '')
    );

The backend contract the same wave established is explicit (`reps/serializers.py:244-246`): a key
**present** in `initial_data` was sent by the caller, "blank included, so a deliberate clear still
clears". The frontend now guarantees a blank is never present. In add mode against an **existing**
org â€” the merge path, where the name search prefills the org fields â€” a user who sees a stale
`instagramLink`, selects it, deletes it, and saves gets **no clear**: the field is filtered out and
the old value survives. Silent no-op on an explicit user edit.

Two fixes for one bug, and the second cancels the first's stated semantics. The backend guard is the
correct one and is sufficient on its own; the frontend filter should send the full object, or the
docstring's promise should be withdrawn.

Note the filter is also value-typed: it strips only `''`, so `0`, `false` and `null` still ship. Fine
today (org fields are strings) but not a rule anyone stated.

## G11 â€” `_submitted_attrs()` returns None where it matters least (LOW â€” verified, not a live hole)

The prompt asks for a path where `initial_data` is absent or the wrong shape. There are three, and
none is currently reachable:

- **`many=True`**: DRF sets `initial_data` on the `ListSerializer`, never on the child, and
  `ListSerializer.create()` calls `self.child.create(attrs)` â€” so the child would see `None` and fall
  back to the old overwrite-everything loop. **But** the only `many=True` use of `REPSerializer` in
  either repo is `reports/views.py:35`, which is read-only serialization. No bulk REP import exists.
- **Nested write**: `REPSerializer` is not nested inside any other serializer. Grep-verified.
- **Direct `serializer.save()` with no `data=`**: documented in the docstring, falls back
  deliberately. No such call site exists.

So the fallback is correct-by-luck rather than correct-by-design: the day someone adds a REP bulk
import with `many=True`, the merge silently reverts to wiping logo/MOU with **no test covering it**.
Worth a one-line assert (`initial_data` present) rather than a silent `None`.

The `field.source or name` construction is right: DRF binds `source = field_name` when no explicit
source is given, so `submitted` holds model attr names and matches `validated_data`'s keys.

## G12 â€” REP assignment update is safe (no finding)

`reps/views.py:145` builds `REPCityAssignmentSerializer(assignment, data=request.data,
partial=True)`. Partial means the `default=''` on `groundLocation`
(`reps/serializers.py:40-41`) and its siblings is **not** applied, so `repAPI.updateAssignment`'s
PUT cannot blank an unsent field. This is the one place the default trap was already closed.

`_reread()` (`reps/views.py:99-108`) is equivalent to `get_queryset()` for a single pk â€”
`get_queryset` adds no annotations, only filters/ordering driven by query params that a detail action
does not carry. Same prefetch set. Correct.

`groundLocation` is fully wired end to end: model (`reps/models.py:90`), serializer field and
`Meta.fields` (`reps/serializers.py:40,72`), create default (`:300`), and both React forms have it in
their initial state (`REPModal.jsx:92,230,578`) so neither TextField is uncontrolled. Correct.

## G13 â€” N3: the Draft exit now un-voids TDS but still does not restore the WO gross (MED-HIGH)

`tta_backend/backend/payments/serializers.py:261-332`

The retry query **is** identical to the guard's â€” it is literally the same `retry_qs` object, built
once at `:283-289` and consumed both by `handled_elsewhere` (`:290`) and by `if retry_qs.exists()`
(`:302`). Confirmed, no drift possible.

But the second half of the question â€” did computing it on every exit change behaviour on paths that
never ran it? â€” is **yes, materially**, and the result is a new inconsistency.

Baseline invariant, established in `create()`: a PR in **any** status, Draft included, has already
added its gross to `WorkOrder.paid_gross_amount` (`:172-175`) and has an **active** TDS record
(`:190-193`). Draft is not a "nothing has happened yet" state in this system.

Bouncing reverses both halves: gross subtracted (`:229-234`), TDS voided (`:258`).

Bounced -> Draft now restores **one** half. `handled_elsewhere` is false in the ordinary case, so
`TDSRecord...update(voided=False)` runs (`:331-332`) â€” but the gross re-add sits inside
`if new_status in ('Payment Done','Sent to Accounts')` (`:292`) and does not.

Concrete: PR-2026-044, gross Rs 100,000, TDS Rs 1,000, on WO with `amount = 100,000`.
1. Create (Draft) -> WO `paid_gross_amount = 100,000`, TDS record active.
2. PATCH status = Payment Bounced -> WO `paid_gross_amount = 0`, status `Issued`, TDS voided.
3. PATCH status = Draft -> **TDS record active again. WO `paid_gross_amount` still 0.**

Result: the TDS report and any 26Q-shaped export claim a Rs 1,000 deduction against a payment the
work order says was never made, and the WO shows Rs 100,000 remaining while a live PR for exactly
that amount sits against it. Neither number is reachable any other way. Before this change step 3 was
a pure no-op â€” wrong, but *consistently* wrong (both halves reversed).

This is the money half of the previously-reported Draft-exit hole. The fix closed the TDS half and
left the gross half; the two halves now disagree, which is worse than both being off.

Minimum change: either re-add the gross on the Draft exit too (restoring the create-time invariant
in full), or leave the Draft exit alone and reject Bounced -> Draft outright.

## G14 â€” N3: the invariant the comment asserts is violated by the same block, conditionally (LOW)

`payments/serializers.py:264-268` justifies the change with "a freshly created Draft PR carries an
active TDS record, so Draft with a voided record is not a state the system can otherwise produce."
Four lines later (`:331`) the `if not handled_elsewhere` guard deliberately produces exactly that
state: a PR sitting in Draft with a voided TDS record, whenever a retry exists or the bounce was
resolved.

The double-count reasoning for skipping is sound; the stated invariant is not. Only the comment is
wrong, but it is the comment a future reader will use to decide whether the skip is safe to remove.

Status set is closed and small â€” `Draft`, `Sent to Accounts`, `Payment Done`, `Payment Bounced`
(`payments/models.py:23-28`) â€” so "every exit" means only these three, and there is no
Rejected/Cancelled status that would reactivate TDS on an abandoned request. Checked because it
would have been the worse version of G13.

## G15 â€” `get_bounceResolvedBy` and the deposit-all `voided=False` are both correct (no finding)

- `payments/serializers.py:78-85`: `User.USERNAME_FIELD = 'email'` and the model defines no
  `username` attribute (`accounts/models.py:44,74`), so the old `u.username` fallback was a genuine
  AttributeError -> 500 on any resolver with no first/last name. `.email` is right and matches every
  other call site.
- `payments/views.py:277-283`: adding `voided=False` to the bulk `mark_deposited` filter mirrors
  `get_queryset()` and stops the endpoint asserting a deposit on a bounced request. Correct, and the
  returned `updated` count now matches the ledger the user is looking at.


## G16 â€” a new test ASSERTS the courier hole as a requirement (HIGH, blocks the real fix)

`tta_backend/backend/courier/tests.py` â€” `test_a_client_that_sends_no_stamp_is_unaffected`

    """Backwards compatibility: older clients and scripts keep working, they
    simply do not get the protection."""
    res = self.client.patch(self._url(), {'items': [{'name': 'Legacy', 'quantity': 1}]})
    self.assertEqual(res.status_code, status.HTTP_200_OK)
    self.assertEqual(self._names(), ['Legacy'])

This is the G1 hole written down as a passing requirement. The shipment starts with `Banners`; a
tokenless PATCH replaces the whole list with `Legacy` and the test asserts **200 and that Banners is
gone**. That is a verbatim reproduction of tracker row #6 â€” the report the whole fix exists to close
â€” and it is now green.

Anyone who later closes G1 (require the token when `items` is present) breaks this test and will
reasonably assume they broke the feature. Rename it or invert it; do not leave it green.

## G17 â€” a new config test uses the one uncascaded category that DOES have copies (MED)

`tta_backend/backend/config/tests.py` â€” `test_category_without_a_cascade_still_renames`

    """Categories with no denormalized copies have no cascade to run..."""
    # 'season' is a real category with no entry in RENAME_CASCADES.

The docstring's premise is false. `season` has no entry in `RENAME_CASCADES` â€” that part is true â€”
but it emphatically does have denormalized copies: `Trial.season`, `REPCityAssignment.season`,
`CSRProject.season` (G6). The test renames `Season 6` -> `Season Six` and asserts **`assertNotIn
('cascade', res.data)`**, i.e. it asserts that the copies are *not* chased.

Same failure mode as G16: the gap is now a green test. Whoever adds `season` to `RENAME_CASCADES`
breaks it. If a genuinely copy-free category is wanted for this test, `courier_item` is the honest
choice â€” nothing denormalizes it.

The config suite also has **no test for the category-change case** (G5), which is the one path in the
new `update()` that silently does nothing.

## G18 â€” the N3 test suite writes down the half-restored state as expected (MED)

`tta_backend/backend/payments/test_tds_flow_map.py` â€” `test_14_N3_draft_exit_does_not_re_add_gross`

    self.assertEqual(wo.paid_gross_amount, Decimal('0.00'), ...)
    ...
    self.assertEqual(active(), 1)

Those two assertions in one test are precisely the contradiction in G13: TDS record active, work
order gross zero, for the same payment request. The test does not observe the contradiction, it
requires it. `test_11_N3_bounce_via_draft_back_to_done_restores_tds` walks Bounced -> Draft ->
Payment Done and asserts status and TDS but never asserts `paid_gross_amount` at all â€” so the money
half of that route is untested in a file whose subject is that route.

The tests are otherwise real: `test_13`, `test_14b` and `test_14c` all fail with the fix backed out
(they check `voided` stays True on the Draft door), and `test_15` genuinely exercises the
`voided=False` filter in `mark_deposited`. This finding is about what the suite *ratifies*, not about
coverage.

## G19 â€” the courier lock is never tested against a timestamp DRF actually produced (MED)

`courier/tests.py::CourierConcurrentItemEditTests._stamp()` returns
`self.ship.updated_at.isoformat()` â€” the **server-side** rendering, read straight off the model. The
production client never sees that string; it sees whatever DRF's `DateTimeField` emitted in the
`updatedAt` of the list/detail response, under `USE_TZ = True` and the project `TIME_ZONE`.

`test_timestamp_spelling_does_not_cause_a_false_conflict` only swaps `+00:00` for `Z` on the
server-side string â€” it never makes the round trip the whole `_normalise_ts` helper exists for. A
single-line change (`GET` the detail, take `res.data['updatedAt']`, send it back) would test the
actual contract. As written, the suite would stay green under a serializer change that makes every
real save 409.

The logic itself is correct (G3); this is a hole in what the tests prove, not in what the code does.

## G20 â€” the courier wiring tests assert source formatting, and `npm run format` can break them (MED)

`src/components/courier/courierWiring.test.js` asserts against the raw text of
`CourierManagementPage.jsx` with regexes that encode whitespace and line structure, e.g.

    expect(courierSrc).toMatch(/onBlur=\{e => onChange\(index,\s*'quantity',\s*normalizeQuantity\(e\.target\.value\)\)\}/);
    expect(grantedSrc).toMatch(/return fallbackRoles\.includes\(user\.role\)\s*\?\s*children\s*:\s*<Navigate to="\/unauthorized" replace \/>;/);

`npm run format` (`prettier --write src/`) is a documented project command (CLAUDE.md). Prettier
wrapping either of those expressions across lines fails the test with the behaviour completely
unchanged â€” a red suite that tells the developer nothing true. The `GrantedRoute` ternary assertion
is the most fragile: it pins an exact one-line ternary that prettier would very likely split.

Also over-broad: `expect(courierSrc).not.toMatch(/\w\.items\.(some|map|filter|reduce|length)/)` bans
the pattern on *any* identifier in the file forever, including locals that are provably arrays. It
will fire on a correct future change.

The file is honest about being a wiring test rather than a unit test, and the intent (prove the
component uses the tested helper) is right. The mechanism should be an import-shape or behaviour
assertion, not a whitespace-sensitive text match.

## G21 â€” quantity validation exists only in the browser; the API accepts anything (MED)

`src/components/courier/courierItemQuantity.js:20-33` carefully clamps negatives (`n < 0 ? 0 : n`)
and coerces non-finite values. The server does none of it: `courier/views.py:137-149` builds each
`ShipmentItem` with raw `item_data.get('quantity', 1)` â€” **no serializer, no validation** â€” into a
`PositiveIntegerField` (`courier/models.py:162`).

Two concrete consequences, both reachable from the current UI:

- **Decimals truncate silently.** The `TextField` is `type="number"` with no `step`, so `2.5` is
  accepted; `sanitizeQuantityInput('2.5')` returns `2.5`, `normalizeQuantity` passes it through, and
  Django's `IntegerField.get_prep_value` stores **2**. The operator sees 2.5 on the form and the
  packing slip prints 2. No error anywhere.
- **The negative clamp is decorative.** Any caller that is not this form â€” the same tokenless script
  from G1 â€” can post `quantity: -5`, which the DB either rejects with a 500 (MySQL unsigned) or
  stores, depending on backend.

The fix correctly solved the reported problem ("quantity cannot be cleared" â€” `Number('') === 0`
re-rendering the box as 0). The `''`-while-editing / coerce-on-blur split is the right shape and the
unit tests for it are real. This is about where the validation was placed, not whether the fix works.

## G22 â€” TrialsReport: the Venue column is now blank on every existing production row (LOW, intended)

`src/components/reports/TrialsReport.jsx:241-259` drops the
`(assignment ? assignment.physicalAddress : '')` fallback from `location`. That is right â€” the
duplicate Venue/Address columns were the defect â€” and the new `groundLocation` input is wired
(G12). But no existing row has `ground_location` populated, so on the next deploy the Venue column
reads empty for the entire report until operators refill it, and the report itself gives no hint
where to type it. The comment says as much ("A blank cell now means no one typed a Ground Name").
Flagging as expected-but-visible, not as a defect.

The `addressOf` word-boundary rewrite (`:99-105`) is correct: `words()` pads with spaces on both
sides and strips to `\p{L}\p{N}` runs, so "Kota" no longer matches inside "Rajkota" while multi-word
cities ("New Delhi") still match as a unit. Checked the first-word and last-word positions too â€” the
padding handles both.

`projectName` changing from `'â€”'` to `''` (`:230`) is safe: there is no project filter dropdown that
would lose its blank entry, the search at `:298` handles `''`, the matrix key at `:321-325` tolerates
an empty-string key, and both render sites re-add the dash (`:474`, `:564`). Verified because an
empty grouping key is the usual way this breaks.

## G23 â€” the two deliberate courier behaviours were NOT touched (verified clean)

Checked explicitly, since the brief flags them as must-not-fix:

- **`snap_*` are frozen snapshots by design.** `courier/serializers.py` and `courier/models.py` are
  **not in `git status`** for this repo â€” neither file changed in this wave. No `snap_` assignment
  appears anywhere in the courier diff.
- **The address re-reads live in flight and freezes at terminal status.**
  `ShipmentListSerializer.to_representation` still guards on `instance.status not in
  Shipment.TERMINAL_STATUSES` (`courier/serializers.py:69-75`), and `refresh_snapshot()` is still
  called-then-saved at every transition in `_transition` (`courier/views.py:193-196`) so the value
  persisted at the terminal transition is the permanent one. Unchanged, and the new optimistic lock
  does not interact with it â€” `refresh_snapshot()` performs no save of its own, so serving a list
  does not bump `updated_at`.

## G24 â€” REP merge tests are sound (no finding)

`reps/tests.py::test_second_city_preserves_logo_link_mou_and_socials` fails with the fix backed out â€”
it posts a second city with the org fields omitted and asserts eleven preserved values. The companion
tests cover both directions properly: `test_merge_still_applies_what_the_caller_did_send` (sent keys
still win) and `test_merge_with_explicit_blank_still_clears` (a real blank still clears).

Worth noting the last one is now **unreachable from the UI** because of G10 â€” the frontend filters
every blank out before the request. The backend behaviour it proves is correct; nothing exercises it
in production.

The `_reread` tests (`test_the_response_matches_what_the_next_get_returns` and siblings) are real:
they fail against the cached-prefetch original.


---

## Ranked summary

| # | Severity | Finding |
|---|---|---|
| G16 | HIGH | `courier/tests.py::test_a_client_that_sends_no_stamp_is_unaffected` asserts the concurrent-edit data loss as a passing requirement |
| G1 | MED-HIGH | Courier optimistic lock is opt-in â€” a tokenless PATCH still replaces the whole item list; cached frontend bundles keep corrupting |
| G13 | MED-HIGH | N3: Bounced -> Draft now un-voids TDS but never re-adds the WO gross â€” TDS claims a deduction the work order says was never paid |
| G9 | MED | REP merge fix guards `create()` only; `REPSerializer.update()` + a non-partial PUT still blanks logo/MOU/socials |
| G5 | MED | Config PUT that changes value AND category returns 200 with no cascade and no warning |
| G6 | MED | `season` is uncascaded in both rename paths, while its paired `project_name` cascades |
| G10 | MED | The REPModal blank-strip makes the backend's "a deliberate clear still clears" contract unreachable |
| G17 | MED | Config test picks `season` as its "no denormalized copies" example â€” the premise is false and the gap is now green |
| G18 | MED | `test_14_N3_draft_exit_does_not_re_add_gross` requires the G13 contradiction; `test_11` never checks the money on a route it calls "a PAID payment" |
| G20 | MED | Courier wiring tests match source whitespace; `npm run format` can redden them with no behaviour change |
| G21 | MED | Quantity clamping/coercion exists only client-side; the PUT items path runs no serializer at all â€” 2.5 silently stores as 2 |
| G2 | MED | A courier 409 leaves the user looping; the server's `currentUpdatedAt` recovery field is discarded |
| G19 | MED | The lock is never tested against a timestamp DRF actually emitted â€” only against the server-side `isoformat()` |
| G22 | LOW | Venue column reads blank on every existing row post-deploy (intended tradeoff, documented) |
| G4 | LOW | `openNew()` leaves `loadedUpdatedAt` stale |
| G8 | LOW | Cascading from a soft-deleted config row (consistent with the existing `rename` action) |
| G14 | LOW | N3 comment asserts an invariant the same block conditionally violates |

Verified correct, no action: **G3** (lock mechanics, `_normalise_ts`, token freshness, `refresh_snapshot`
does not save) Â· **G7** (plain PUT is collision-guarded) Â· **G12** (assignment PUT is `partial=True`;
`_reread` equals `get_queryset`; `groundLocation` fully wired) Â· **G15** (`.email` fix and
`voided=False` on `mark_deposited`) Â· **G23** (both deliberate courier behaviours untouched) Â·
**G24** (REP merge tests are sound).

`trials/views.py`, `trials/serializers.py`, `trials/models.py`, `trials/tests.py` were **not
reviewed** â€” another agent was editing them during this pass.

