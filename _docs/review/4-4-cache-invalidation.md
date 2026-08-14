# Pass 4.4 — Cache without invalidation

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** what can go stale and never refresh on its own?

## Answer

**Four caches. Three have a working invalidation path. One does not.**

The one that does not is the `sentBatches` list on the Payments screen, and its
staleness window is a duplicate bank transfer.

**Count: 6 findings (1 high, 2 medium, 3 low).**

---

### C-1 · `sentBatches` — no invalidation, and the stale state is dangerous — **HIGH**

`PaymentManagementPage.jsx:228,247–253,281–295`

`sentBatches` is React state, refreshed only by an explicit `fetchBatches()` call
on mount, after a successful batch creation, and on window focus. It has **no
invalidation on failure** — the failure path (`.catch(() => setSentBatches([]))`)
replaces it with an empty list, which the rest of the component treats as
authoritative fact.

There is no "stale" concept: `sentBatches = []` means *nothing has ever been
sent*, permanently, until the next successful fetch. And `activePayments` is
derived from it, so a stale-empty cache re-arms every historical payment request
for export. Full chain in Pass 1.1, P-1.

**This is not "data looks old" staleness. It is "the app believes a payment never
happened" staleness.**

---

### C-2 · The config cache trusts a 24-hour-old `localStorage` snapshot as *loaded* — **MEDIUM**

`src/utils/adminStorage.js:97–115`

```js
const LS_MAX_AGE = 24 * 60 * 60 * 1000;

(function hydrate() {
  const { at, cache } = JSON.parse(localStorage.getItem(LS_KEY));
  if (!at || Date.now() - at > LS_MAX_AGE) return;
  Object.keys(_cache).forEach((k) => {
    if (Array.isArray(cache?.[k])) {
      _cache[k] = cache[k];
      _status[k] = 'loaded';       // ← a 23-hour-old value is marked "loaded"
    }
  });
})();
```

The warm start is a good idea — first paint shows real values instead of seeds.
But it sets `_status = 'loaded'`, which is the *same* state a fresh successful
network load produces. Nothing downstream can tell a live value from a
23-hour-old one.

Practical effect: an admin adds a vendor type; another user with a warm cache and
a failing config endpoint sees the old list for up to 24 hours with no indication
it is stale. `refreshAllFromAPI()` runs on login and on window focus
(`AuthContext.jsx:39,70`) so it self-corrects in normal use — but **both of those
calls end in `.catch(() => {})`** (Pass 4.1), so a persistently failing config
endpoint leaves the stale cache in place indefinitely and silently.

A separate `'stale'` status, or storing `at` alongside `_status`, would let a
caller distinguish them.

---

### C-3 · The config cache is module-level and survives user switches by design — **LOW (handled)**

`_cache` and `_status` are module-scoped mutable objects — a classic
cross-user-leak shape in an SPA.

**This is handled.** `clearConfigCache()` resets both plus the `localStorage` key,
with the reason in a comment:

> *"Drop the warm-start cache on logout so the next user never sees the previous
> one's dropdown values."*

Worth confirming it is actually called on **every** exit path — the forced logout
in `api.js:44–54` (refresh-token failure) clears `tta_token`, `tta_refresh` and
`tta_user`, and then does `window.location.href = …`, which is a full page load
and therefore resets the module anyway. So both paths are covered, one
deliberately and one incidentally.

The change-notification design here is genuinely good: `_bump()` →
`useSyncExternalStore` via `useConfigVersion()`, added specifically because
*"refreshAllFromAPI mutates a module-level object and told nobody, so any consumer
reading through `useMemo(..., [])` froze whatever it saw at mount."* That is a
subtle bug, correctly diagnosed and correctly fixed.

---

### C-4 · `useRefetchOnFocus` is the only automatic invalidation, and it is 30-second rate-limited — **MEDIUM**

`src/hooks/useRefetchOnFocus.js` re-runs a loader on `focus` /
`visibilitychange`, at most once per 30 s. It is used on the Payments, Bank, Work
Orders and Vendors screens.

Consequences:

- **A tab left open and focused refreshes nothing.** There is no polling and no
  websocket. Two users editing the same work order will not see each other's
  changes until one of them alt-tabs away and back.
- `lastRun` is initialised to `Date.now()`, so the first 30 seconds after mount are
  suppressed — correct, avoids a double-fetch on load.
- The loaders passed in are `{ silent: true }`, so a focus refetch that *fails*
  shows nothing at all: `fetchPayments({ silent: true })` returns early in its
  catch without even setting `[]`. **The screen keeps showing data that may now be
  hours old, and cannot say so.** That is the better of the two failure modes, but
  it is still silent.

---

### C-5 · `localStorage` profile blobs never expire — **LOW**

`AuthContext.jsx:118–145` reads and writes `tta_profile_<email>` with no
timestamp, no version, and no cleanup. Keys accumulate one per email address that
has ever logged in on that browser. `saveProfileData` catches a quota exception and
returns `false`; **no caller checks the return value**, so a full quota means
profile saves silently do nothing (Pass 4.1 shape, applied to storage).

There is no `tta_profile_*` cleanup in `clearConfigCache` or the logout path, so a
shared machine accumulates every previous user's profile blob — including, per
Pass 3.3, base64 avatar images.

---

### C-6 · Server-side: no HTTP caching at all, anywhere — **LOW (observation, mostly correct)**

No `Cache-Control`, `ETag`, or `Last-Modified` on any API response. No Django
cache framework configured — no `CACHES` setting, no Redis, no memcached, no
`cache_page`. `PaymentBatch` totals are the only denormalised snapshot in the
backend (and they go stale — Pass 1.2, M-3).

For an app with 148 payment requests this is the right call: no cache means no
invalidation bugs. Recording it because it means **every performance problem in
Pass 4.3 is being paid in full on every single request** — an 18 MB report is 18 MB
every time it is opened, by every user, forever. Adding a short `Cache-Control` on
the report endpoints would be the cheapest mitigation available while the payload
fix is planned.

---

## What is clean

- `clearConfigCache()` on logout, with the reasoning written down.
- `useSyncExternalStore` + version counter, which is the correct React 18 answer
  to "a module-level cache changed".
- `fetchCategory` refusing to downgrade good data to seeds on failure.
- No stale server-side cache to invalidate, because there is no server-side cache.

**Read the shape of this pass:** the *deliberate* cache in this codebase
(`adminStorage`) is thoughtfully built, with invalidation, subscription, and a
tri-state. The dangerous cache (`sentBatches`) is the one nobody thinks of as a
cache — it is just a `useState` that happens to be load-bearing for money.

---

## ✓ Pass complete

- **Do I have a number?** 4 caches; 6 findings; 1 with no invalidation path at all.
- **Have I seen one with my own eyes?** Yes — `adminStorage.js:97–186` and
  `PaymentManagementPage.jsx:247–295` read in full.
- **Do I know what the user experiences?** For C-1, a Payments screen that looks
  normal and is wrong. For C-2/C-4, data that is quietly older than it appears.
