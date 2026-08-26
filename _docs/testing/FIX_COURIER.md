# FIX_COURIER — 2026-08-21

Two courier defects from the live run tracker: #5 (quantity cannot be cleared)
and #9 (courier page goes blank). Files touched are limited to
`src/components/courier/CourierManagementPage.jsx`, `src/auth/GrantedRoute.jsx`
and new pure-logic modules and tests beside them.

Baseline before any change: **18 suites / 217 tests passing**.
After: **21 suites / 265 tests passing** (+3 suites, +48 tests). No regressions.
`courierDeletePermission.js` and its 31 tests untouched and still passing.

## Status

- [x] Fix #5 — quantity field cannot be cleared
- [x] Fix #9a — `getShipmentFlag` throws on a shipment with no `items`
- [x] Fix #9b — `GrantedRoute` renders `null` while permissions load

---

## Fix #5 — item quantity cannot be cleared

**Report (Sanskriti):** "While editing numbers in courier it automatically start
with 0 even after backspace it doesn't work." Reproduced live twice.

**Cause.** `ItemRow`'s Quantity box is a controlled `type="number"` TextField
whose onChange ran `Number(e.target.value)`. `Number('') === 0`, so backspacing
to empty immediately re-rendered the box as `0`. The operator then had to select
the 0 and type over it, and a stray leading zero appeared.

**Change.** Quantity now has two explicit shapes:

- *editing shape* — `''` or a number, whatever keeps the box honest as you type
- *wire shape* — always a number, so the API contract is unchanged

New module `src/components/courier/courierItemQuantity.js`:

| export | purpose |
| --- | --- |
| `sanitizeQuantityInput(raw)` | what the box holds after a keystroke — `''` stays `''`, negatives clamp to 0, junk never becomes NaN |
| `normalizeQuantity(value)` | what a quantity means once editing stops (onBlur) — `''` settles to 0 |
| `normalizeItemsForSave(items)` | every item leaves for the API with a numeric quantity |
| `canSaveShipment({editingId, assignmentId, items})` | the save guard, stated once |

Wired in `CourierManagementPage.jsx`:
- quantity `onChange` → `sanitizeQuantityInput`, new `onBlur` → `normalizeQuantity`
- `saveShipment` builds `itemsForSave = normalizeItemsForSave(fItems)` and hands
  *that* to `courierAPI.update` / `courierAPI.create` — the wire format is
  unchanged, numeric as before
- the `(!editingId && !fAsgId) || !fItems.length` guard became
  `canSaveShipment(...)`, same rule, now testable. An empty quantity box does not
  change `fItems.length`, so a mid-edit empty box cannot disable the save button.

Existing behaviour preserved: `makeCourierItem` still starts Volunteer Tshirts at
qty 0, and the dispatch-time zero-Tshirt reason flow (`Number(i.quantity || 0) === 0`)
is unaffected because saved quantities are always numbers.

## Fix #9a — one malformed row blanked the whole page

**Report:** "In courier user wasnt not able to fetch anything and everything went
blank - repatative." Never reproduced live; found by code review.

**Cause.** `getShipmentFlag` read `shipment.items.some(...)` with no `|| []`,
unlike every other item access in the file (lines reading `(s.items || [])`,
`(shipment?.items || [])`). A shipment row arriving without an items array threw
during render, and the app-level ErrorBoundary blanked the WHOLE page rather than
one row.

**Change.** `daysUntil` and `getShipmentFlag` moved to
`src/components/courier/courierShipmentFlag.js` (so they are importable in a
test), with the items access made defensive — `(shipment?.items || []).some(...)`
— matching the rest of the file. The flag thresholds (60/30/75/45 days, terminal
statuses exempt) are byte-for-byte unchanged.

## Fix #9b — GrantedRoute rendered nothing while permissions loaded

**Cause.** `GrantedRoute` returned `null` while `permsLoading` — correct in
avoiding an `/unauthorized` flash, but an empty return is indistinguishable from
a crashed page, which is exactly how "everything went blank" presents.

**Change.** The loading branch now renders a centred `CircularProgress` with
`role="status" aria-live="polite"` and the text "Checking your access…".

**Deliberately not changed:** the `fallbackRoles` branch at the bottom ("Grants
fetch failed (offline, pre-backfill server) — preserve the legacy role behavior
so admins are never locked out"). It is byte-identical, and a wiring test now
asserts it stays that way, along with the order of the unauthenticated and
super-admin short-circuits above it.

---

## Tests

**Unit tests** (pure modules, no component import):
- `src/components/courier/courierItemQuantity.test.js` — 21 tests
- `src/components/courier/courierShipmentFlag.test.js` — 14 tests

**Wiring test** (reads component source with `fs`; both components reach
react-router-dom, which CRA's Jest resolver cannot load — same constraint that
produced `courierDeletePermission.js` and `trialsReportStats.test.js`):
- `src/components/courier/courierWiring.test.js` — 13 tests

## Reverse-check — each fix backed out, tests re-run, then restored

| Fix backed out | Result |
| --- | --- |
| `sanitizeQuantityInput` → `Number(raw)` | 7 unit tests failed, incl. "THE BUG: backspacing to empty leaves the box empty, not 0" |
| `normalizeQuantity` → `Number(value)` | 3 unit tests failed ("never returns NaN", "negatives clamp to zero", "no item leaves with a NaN quantity") |
| `getShipmentFlag` → `shipment.items.some` | 2 unit tests failed, incl. "THE BUG: a shipment with no items array returns a flag instead of throwing" |
| quantity `onChange`/`onBlur` reverted in JSX | 3 wiring tests failed |
| `itemsForSave = fItems` (save normalization removed) | 1 wiring test failed |
| a `(s.items \|\| [])` read reverted to `s.items` | 1 wiring test failed ("the unguarded shipment.items access is gone") |
| `GrantedRoute` loading branch → `return null` | 2 wiring tests failed |

**Tests that passed with the bug present — worth stating rather than hiding:**
- `getShipmentFlag`: "an entirely empty object does not throw" and "undefined
  does not throw" passed either way — both return early on the missing
  `snapTrialDate` before ever reaching `items`. They guard the optional-chaining,
  not the items fallback.
- `normalizeQuantity`: "an empty box settles to 0 on blur" passed either way,
  since `Number('') === 0` coincides with the intended value.
- The `canSaveShipment` block and the flag-threshold block passed either way in
  every reverse-check — they are characterisation tests protecting unchanged
  behaviour, not detectors for these two bugs.
