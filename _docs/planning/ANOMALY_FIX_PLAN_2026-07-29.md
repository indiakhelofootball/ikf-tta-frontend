# Anomaly Fix Plan — silent-empty state class

**Date:** 2026-07-29
**Status:** proposed, nothing applied
**Scope:** frontend only. No backend change required.

Companion to the code audit of the same date. This document carries the exact
diffs for the config-cache defects (fixes 1–5) and the campaign shape for the
wider sweep (fix 6). Nothing here has been applied to the tree.

---

## The class in one sentence

When a fetch fails, the code swallows the error and writes an empty value into
state; the UI renders that empty value as truth, so "failed to load", "not
loaded yet", and "genuinely empty" are indistinguishable to the user and to us.

115 occurrences across 34 files. The config dropdown cache is the highest-traffic
instance and the one behind the recurring "everything went away" reports.

---

## Root cause chain (config cache)

1. `fetchCategory` writes `_cache[key]` on the failure path as well as the
   success path.
2. `getFromCache` tests truthiness, and `[]` is truthy — so a cached `[]` is
   returned forever and the DEFAULTS fallback becomes unreachable.
3. Consumers read the cache through `useMemo(..., [])`, so a value read before
   the fetch resolved is frozen for the component's lifetime. `refreshAllFromAPI`
   notifies nobody.
4. The cache load is chained inside `permissionsAPI.getMine()`'s handlers; if
   that call fails, non-admin users never load config at all.
5. The cache is in-memory only, so every page load re-runs the race.

Recovery requires a successful refetch **and** a remount at the same time.
Only logout/login guarantees both — which is why that is the folk remedy.

---

## Fix 1 — stop empty from being cacheable as truth

Introduce an explicit per-key status so "loaded and genuinely empty" is
distinguishable from "never loaded" and "failed".

`src/utils/adminStorage.js`

```diff
 const _cache = {
   projectNames: null,
   seasons: null,
   vendorTypes: null,
   entityTypes: null,
   vendorNames: null,
   bankNames: null,
   accountTypes: null,
   courierItems: null,
 };
+
+// Per-key load status. 'loaded' is the ONLY state in which _cache is
+// authoritative — including when it is legitimately []. Anything else falls
+// back to DEFAULTS and stays retryable. Without this, a transient failure that
+// cached [] was indistinguishable from a real empty list and stuck for the
+// whole session (empty arrays are truthy).
+const _status = {
+  projectNames: 'idle',
+  seasons: 'idle',
+  vendorTypes: 'idle',
+  entityTypes: 'idle',
+  vendorNames: 'idle',
+  bankNames: 'idle',
+  accountTypes: 'idle',
+  courierItems: 'idle',
+};
```

```diff
 function getFromCache(key) {
-  if (_cache[key]) return _cache[key];
-  // Return seeded defaults until API loads
-  return DEFAULTS[key].map((name, i) => ({ id: Date.now() + i, name, comment: '' }));
+  // Trust the cache only after a successful load, so a server-confirmed empty
+  // list renders as empty while a failed/pending load still shows seeds.
+  if (_status[key] === 'loaded') return _cache[key];
+  // Stable synthetic ids — Date.now() minted a NEW id on every call, which broke
+  // React keys and MUI Autocomplete option equality for seeded values.
+  return DEFAULTS[key].map((name, i) => ({ id: `seed-${key}-${i}`, name, comment: '' }));
 }
```

Two bugs closed: the poisoning, and the unstable `Date.now() + i` ids that
changed identity on every read.

---

## Fix 2 — never write the cache on failure

`src/utils/adminStorage.js`

```diff
 async function fetchCategory(cacheKey, category, defaults) {
+  _status[cacheKey] = 'loading';
   try {
     const res = await configAPI.getByCategory(category);
     const items = (res || []).map(apiToLocal);
-    if (items.length > 0) {
-      _cache[cacheKey] = items;
-      return items;
-    }
+    // Cache the server's answer verbatim, including an empty list — that IS the
+    // truth and must not be overwritten with seeds.
+    _cache[cacheKey] = items;
+    _status[cacheKey] = 'loaded';
+    _bump();
+    return items;
   } catch (err) {
     console.error(`[adminStorage] Failed to fetch "${category}":`, err.message || err);
+    // Leave _cache untouched. Marking 'error' keeps getFromCache on seeds and
+    // leaves the key retryable instead of freezing a blank for the session.
+    _status[cacheKey] = 'error';
+    _bump();
+    return null;
   }
-  const fallback = defaults.map((name, i) => ({ id: Date.now() + i, name, comment: '' }));
-  _cache[cacheKey] = fallback;
-  return fallback;
 }
```

The `defaults` parameter becomes unused inside the function. Keep the signature
for now — `refreshAllFromAPI` passes it and the seeds still live in `DEFAULTS`.
Removing it is a separate tidy-up.

---

## Fix 3 — make the cache observable

This is the fix that actually ends the class. Consumers currently have no way to
learn that data arrived.

### 3a. Store plumbing

`src/utils/adminStorage.js`, above `getFromCache`:

```diff
+// ── Change notification ─────────────────────────────────────────────
+// refreshAllFromAPI mutates a module-level object and told nobody, so any
+// consumer that read through useMemo(..., []) froze whatever it saw at mount —
+// usually seeds, because the fetch had not resolved yet. A version counter plus
+// useSyncExternalStore lets consumers re-derive when the cache actually changes.
+let _version = 0;
+const _subscribers = new Set();
+
+function _bump() {
+  _version += 1;
+  _subscribers.forEach((fn) => fn());
+}
+
+export function getConfigVersion() {
+  return _version;
+}
+
+export function subscribeConfig(fn) {
+  _subscribers.add(fn);
+  return () => _subscribers.delete(fn);
+}
+
+export function getCategoryStatus(key) {
+  return _status[key];
+}
```

`saveCategory` also mutates the cache and must notify:

```diff
   const removed = previous.filter((item) => !newIds.has(item.id));

   _cache[cacheKey] = list;
+  _status[cacheKey] = 'loaded';
+  _bump();
```

### 3b. The hook

New file `src/hooks/useConfigVersion.js`:

```js
import { useSyncExternalStore } from 'react';
import { subscribeConfig, getConfigVersion } from '../utils/adminStorage';

// Re-renders the caller whenever the admin config cache changes, so sync getters
// like getVendorTypeNames() can be used in a useMemo that actually updates.
export default function useConfigVersion() {
  return useSyncExternalStore(subscribeConfig, getConfigVersion, getConfigVersion);
}
```

React 19 is in use (`react ^19.2.4`), so `useSyncExternalStore` is available.
The third argument is the server-snapshot getter, harmless in CRA but required
for correctness if SSR is ever added.

### 3c. Consumers

`src/components/workorders/WorkOrderModal.jsx`

```diff
+import useConfigVersion from '../../hooks/useConfigVersion';
```

```diff
-  const serviceTypeOptions = useMemo(() => getVendorTypeNames(), []);
-  const entityTypeOptions = useMemo(() => getEntityTypeNames(), []);
-  const projectOptions = useMemo(() => getProjectNames().map((p) => p.name), []);
+  // cfgVersion, not [] — the config cache loads asynchronously after mount, and
+  // an empty dep array froze whatever was there at mount (usually nothing).
+  const cfgVersion = useConfigVersion();
+  const serviceTypeOptions = useMemo(() => getVendorTypeNames(), [cfgVersion]);
+  const entityTypeOptions = useMemo(() => getEntityTypeNames(), [cfgVersion]);
+  const projectOptions = useMemo(() => getProjectNames().map((p) => p.name), [cfgVersion]);
```

Same treatment, mechanically:

| File | Line | Symbol |
|---|---|---|
| `workorders/WorkOrderManagementPage.jsx` | 58 | `serviceTypes` |
| `vendors/VendorModal.jsx` | 65 | `banks` |
| `vendors/VendorModal.jsx` | 66 | `accountTypeOptions` |
| `vendors/VendorModal.jsx` | 103 | `adminVendorNames` (add `cfgVersion` to existing deps) |
| `vendors/VendorModal.jsx` | 110 | `serviceTypeOptions` |
| `vendors/VendorModal.jsx` | 111 | `entityTypeOptions` |
| `trials/TrialWizard.jsx` | 67-69 | `adminProjects` / `adminSeasons` — currently bare calls in the render body; wrap in `useMemo([cfgVersion])` for consistency |

`VendorModal.jsx:65-66` are bare calls in the component body, so they already
re-read on every render and self-heal. They still want the memo for stable
identity, but they are not the source of a stuck blank.

`admin/AdminPage.jsx` needs no change — it already loads seeds, calls
`refreshAllFromAPI()`, and re-sets its local state afterward. It is the only
consumer that got this right, which is why the Admin screen behaves.

---

## Fix 4 — decouple the config load from the grants call

`src/auth/AuthContext.jsx`

```diff
   useEffect(() => {
     let active = true;
     if (user?.email) {
       setPermsSettled(false);
+      // Config reference data is readable by ANY authenticated user
+      // (ReadOpenModulePermission) and every operational form needs it, so it
+      // must not ride on the grants call. When getMine() failed, non-admins
+      // previously loaded no config at all and every dropdown came up blank.
+      refreshAllFromAPI().catch(() => {});
       permissionsAPI.getMine()
         .then((d) => {
           if (!active) return;
           setPerms(d);
-          refreshAllFromAPI().catch(() => {});
         })
         .catch(() => {
           if (!active) return;
           setPerms(null);
-          if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
-            refreshAllFromAPI().catch(() => {});
-          }
         })
         .finally(() => { if (active) setPermsSettled(true); });
```

The `ROLES` import may become unused in this file — check before committing.

Focus-refetch (line 73-79) gets the same treatment: hoist
`refreshAllFromAPI()` out of the `.then()` so a grants failure does not also
skip the config reload.

---

## Fix 5 — persist the cache across reloads

Removes the race on every page load rather than merely surviving it.

`src/utils/adminStorage.js`, hydrate at module load:

```js
const LS_KEY = 'tta_config_cache_v1';
const LS_MAX_AGE = 24 * 60 * 60 * 1000;

(function hydrate() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const { at, cache } = JSON.parse(raw);
    if (!at || Date.now() - at > LS_MAX_AGE) return;
    Object.keys(_cache).forEach((k) => {
      if (Array.isArray(cache?.[k])) {
        _cache[k] = cache[k];
        _status[k] = 'loaded';
      }
    });
  } catch {
    // corrupt or unavailable storage — start cold, the API load will fill in
  }
})();
```

Persist inside `_bump()`:

```js
try {
  localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), cache: _cache }));
} catch {
  // quota or private mode — in-memory cache still works
}
```

Warm start shows last-known values immediately; the network load then corrects
them. Clear `LS_KEY` on logout alongside `tta_token` / `tta_user`.

Note the file header comment at line 2 says "no localStorage" — update it.

---

## Fix 6 — the sweep (campaign, not a patch)

The remaining ~110 occurrences follow one shape:

```js
.catch(() => { setThing([]); })
```

Target shape:

```js
.catch((err) => { setThingError(err); })   // leave prior data intact
```

and render three distinct states: loading, error-with-retry, empty.

Priority order by blast radius:

| File | Count |
|---|---|
| `courier/CourierManagementPage.jsx` | 12 |
| `reports/PaymentAuditReport.jsx` | 9 |
| `rep/REPModal.jsx` | 9 |
| `reports/SocialMediaReport.jsx` | 8 |
| `reports/TrialSpendReport.jsx` | 6 |
| `permissions/PermissionsManagementPage.jsx` | 6 |
| `payments/PaymentRequestModal.jsx` | 5 |
| `workorders/WorkOrderModal.jsx` | 5 |

`trialCities/TrialCitiesPage.jsx:99` documents the anti-pattern explicitly
(`// Set empty array to prevent UI crashes`) and is a good first conversion —
small, self-contained, and the comment makes the intent obvious to a reviewer.

Do this incrementally, one file per commit, after 1–5 are deployed and stable.

---

## Verification

Fixes 1–5 are covered by existing suites only incidentally. Add before merging:

1. `adminStorage` unit tests
   - failed fetch does **not** overwrite a previously loaded value
   - failed fetch leaves status `error` and the key retryable
   - a successful fetch returning `[]` caches as `[]` and reads back as `[]`
   - `getFromCache` returns stable ids across repeated calls
   - `subscribeConfig` fires on `fetchCategory` success, failure, and `saveCategory`
2. `WorkOrderModal` render test — mount with an unloaded cache, resolve the
   config fetch, assert Service Type options appear **without a remount**. This
   is the regression test for the actual client-reported bug.
3. Full run: `npm test`, `npm run build`. Backend untouched, but re-run
   `manage.py test` if anything in `config/` is touched later.

Baseline as of 2026-07-29: FE 72/72, BE 300/300, `makemigrations --check` clean.

---

## Sequencing

Fixes 1, 2 and 4 are small, independent, and each removes a distinct way to get
a permanent blank. Ship them together as one commit.

Fix 3 is the structural one and should be its own commit — it touches several
consumers and wants the regression test above.

Fix 5 is independent and can land any time after 1–2.

Fix 6 starts after the above are deployed and confirmed quiet.

**Deploy note:** none of this is verifiable in the field without a build
identifier in the UI. Land the version stamp first, or the next report will be
as ambiguous as the last thirty.
