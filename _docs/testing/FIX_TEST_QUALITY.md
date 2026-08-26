# FIX_TEST_QUALITY — G19 + G20

Scope: test-quality only. Files touched:
- `tta_backend/backend/courier/tests.py`
- `src/components/courier/courierWiring.test.js`

## Status log

- [x] Read `FIX_REVIEW_2.md` G19 + G20. (`FIX_CONCURRENT_ITEMS.md` does not exist in
  `_docs/testing/`; the optimistic-lock behaviour was read directly from
  `courier/views.py:19-148` instead.)
- [x] Read `courier/tests.py`, `courier/views.py`, `courierWiring.test.js`.
- [x] Baseline: `courier` app = 24 tests, OK.
- [x] G19: added `CourierLockRoundTripTests` to `courier/tests.py` (6 tests).
      Tokens come from `res.data['updatedAt']` of a real GET (detail AND list),
      never from `shipment.updated_at.isoformat()`. Courier app now 30, OK.
- [x] G19 reverse-check: replaced `_normalise_ts` body with
      `return (value or '').strip()` (raw-string compare) → `FAILED (failures=5)`:
      4 of the 5 are the new round-trip tests
      (`..._detail_endpoint_emitted_is_accepted`, `..._list_endpoint_emitted_is_accepted`,
      `..._after_a_notes_only_write`, `..._genuinely_stale_..._refused`),
      plus the pre-existing spelling test. Proves the new tests exercise the bridge.
      `views.py` restored; `git diff --stat -- courier/views.py` is empty.
- [x] G20 rewrite: `courierWiring.test.js` now normalises both sources through
      `normalise()` — CRLF, quote style, all whitespace, `(e) =>` vs `e =>`, and
      trailing commas — i.e. exactly the set prettier 3 (no config in repo →
      defaults) is free to change. Assertions are written as readable source
      snippets run through the SAME normaliser (`wires(src, snippet)`), so a
      match can only break when the wiring changes. The `GrantedRoute` ternary is
      asserted structurally (condition is the `fallbackRoles` membership test;
      `children` precedes the `/unauthorized` redirect) instead of as an exact
      one-line ternary. Same 14 tests, same guarantees.
- [x] G20 prettier-proof check: backed both source files up, ran
      `npx prettier --write src/components/courier/CourierManagementPage.jsx
      src/auth/GrantedRoute.jsx` (1769 insertions / 596 deletions of pure
      reformatting), reran the suite → **14/14 pass**. Ran the OLD regexes against
      the same reformatted source: **6 of 11 would have failed** (onChange,
      onBlur, `setLoadedUpdatedAt`, both import assertions, the GrantedRoute
      ternary). Both files then restored from backup; `git diff` on them is empty
      and `git status` shows them unmodified.
- [x] Final verification.
      - Backend `manage.py test --settings=backend.dev_local_settings`: **577 tests, OK**.
        (Count drifts run to run — another agent is editing `trials/` live. One
        earlier run showed 2 `trials`/`config` failures that were gone on the next
        run; nothing in `courier`.) `courier` alone: **30 tests, OK** (was 24).
      - Frontend `CI=true npx react-scripts test --watchAll=false`:
        **22 suites / 275 tests, all green** — unchanged from baseline.

## Files changed

Only the two in scope. `courier/views.py` was edited for the reverse-check and
restored byte-for-byte; `CourierManagementPage.jsx` / `GrantedRoute.jsx` were
prettier-formatted for the G20 check and restored byte-for-byte. Nothing under
`trials/` was touched. No commits, no pushes.
