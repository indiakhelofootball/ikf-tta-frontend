// src/utils/adminStorage.js
// Admin-managed dropdown options — API-backed in-memory cache, warm-started from
// localStorage so a page load renders last-known values instead of racing the fetch.

import { PROJECT_NAMES, SEASONS_PROJECT } from '../components/trials/trialConstants';
import { configAPI } from '../services/api';

const CATEGORY_MAP = {
  projectNames: 'project_name',
  seasons: 'season',
  vendorTypes: 'service_type',
  entityTypes: 'entity_type',
  vendorNames: 'vendor_name',
  bankNames: 'bank_name',
  accountTypes: 'account_type',
  courierItems: 'courier_item',
  partnerCategories: 'partner_category',
  workshopNames: 'workshop_name',
  trainingProgrammes: 'training_programme',
  utilisationTypes: 'utilisation_type',
};

// ── In-memory cache ─────────────────────────────────────────────────

const _cache = {
  projectNames: null,
  seasons: null,
  vendorTypes: null,
  entityTypes: null,
  vendorNames: null,
  bankNames: null,
  accountTypes: null,
  courierItems: null,
  partnerCategories: null,
  workshopNames: null,
  trainingProgrammes: null,
  utilisationTypes: null,
};

// Per-key load status. 'loaded' is the ONLY state in which _cache is
// authoritative — including when it is legitimately []. Anything else falls back
// to DEFAULTS and stays retryable. Without this, a transient failure that cached
// [] was indistinguishable from a real empty list and stuck for the whole
// session, because empty arrays are truthy.
const _status = {
  projectNames: 'idle',
  seasons: 'idle',
  vendorTypes: 'idle',
  entityTypes: 'idle',
  vendorNames: 'idle',
  bankNames: 'idle',
  accountTypes: 'idle',
  courierItems: 'idle',
  partnerCategories: 'idle',
  workshopNames: 'idle',
  trainingProgrammes: 'idle',
  utilisationTypes: 'idle',
};

const DEFAULTS = {
  projectNames: PROJECT_NAMES,
  seasons: SEASONS_PROJECT,
  vendorTypes: [],
  entityTypes: [],
  vendorNames: [],
  bankNames: ['IDFC First Bank'],
  accountTypes: ['Savings', 'Current'],
  courierItems: [],
  // No seed. A partner category is a real classification an admin defined; a
  // made-up default would flag vendors into a category nobody agreed to.
  partnerCategories: [],
  // No seeds, for the same reason. A workshop name is a real entry an admin
  // created; a default would offer CSR something that never happened.
  workshopNames: [],
  trainingProgrammes: [],
  // No client-side seed: the three starting types are rows the server seeds by
  // migration, so they carry real ids a grant can reference. A local seed has
  // only a synthetic id and could not be saved onto a grant.
  utilisationTypes: [],
};

// ── Change notification ─────────────────────────────────────────────
// refreshAllFromAPI mutates a module-level object and told nobody, so any
// consumer reading through useMemo(..., []) froze whatever it saw at mount —
// usually seeds, because the fetch had not resolved yet. A version counter plus
// useSyncExternalStore lets consumers re-derive when the cache actually changes.

const LS_KEY = 'tta_config_cache_v1';
const LS_MAX_AGE = 24 * 60 * 60 * 1000;

let _version = 0;
const _subscribers = new Set();

function _persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), cache: _cache }));
  } catch {
    // quota or private mode — the in-memory cache still works
  }
}

function _bump() {
  _version += 1;
  _persist();
  _subscribers.forEach((fn) => fn());
}

export function getConfigVersion() {
  return _version;
}

export function subscribeConfig(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

export function getCategoryStatus(key) {
  return _status[key];
}

// Warm start: hydrate from the last successful load so the first paint shows
// real values instead of seeds. The network load then corrects them.
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

// Drop the warm-start cache on logout so the next user never sees the previous
// one's dropdown values.
export function clearConfigCache() {
  Object.keys(_cache).forEach((k) => {
    _cache[k] = null;
    _status[k] = 'idle';
    _loadedThisSession[k] = false;
  });
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // unavailable storage — in-memory reset above is what matters
  }
  _version += 1;
  _subscribers.forEach((fn) => fn());
}

// Keys whose list came from the server during this page session (not from the
// localStorage warm start). A refetch of such a key keeps returning that list
// until the new one lands; dropping to seeds mid-fetch flashed made-up values.
const _loadedThisSession = {};

// Per-key fetch counter. A response is applied only if no later fetch of the
// same key has started, so a slow refresh that began before an admin write
// cannot put the pre-write list back into the cache.
const _fetchSeq = {};

function getFromCache(key) {
  // Trust the cache only after a successful load, so a server-confirmed empty
  // list renders as empty while a failed or pending load still shows seeds.
  if (_status[key] === 'loaded') return _cache[key];
  if (_loadedThisSession[key]) return _cache[key];
  // Stable synthetic ids — Date.now() minted a NEW id on every call, which broke
  // React keys and MUI Autocomplete option equality for seeded values.
  return DEFAULTS[key].map((name, i) => ({ id: `seed-${key}-${i}`, name, comment: '' }));
}

// ── API shape converters ────────────────────────────────────────────

function apiToLocal(apiItem) {
  return {
    id: apiItem.id,
    name: apiItem.value,
    comment: apiItem.comment || '',
    serviceType: apiItem.serviceType || '',
    entityType: apiItem.entityType || '',
  };
}

function localToApi(category, localItem) {
  return {
    category,
    value: localItem.name,
    comment: localItem.comment || '',
    serviceType: localItem.serviceType || '',
    entityType: localItem.entityType || '',
  };
}

// ── Generic fetch ───────────────────────────────────────────────────

async function fetchCategory(cacheKey, category, { rethrow = false } = {}) {
  const seq = (_fetchSeq[cacheKey] || 0) + 1;
  _fetchSeq[cacheKey] = seq;
  _status[cacheKey] = 'loading';
  try {
    const res = await configAPI.getByCategory(category);
    const items = (res || []).map(apiToLocal);
    if (seq === _fetchSeq[cacheKey]) {
      // Cache the server's answer verbatim, including an empty list — that IS
      // the truth and must not be overwritten with seeds.
      _cache[cacheKey] = items;
      _status[cacheKey] = 'loaded';
      _loadedThisSession[cacheKey] = true;
      _bump();
    }
    return items;
  } catch (err) {
    console.error(`[adminStorage] Failed to fetch "${category}":`, err.message || err);
    if (seq === _fetchSeq[cacheKey]) {
      // Leave _cache untouched. A key that already holds a good value keeps it —
      // a transient failure must never downgrade real data to seeds. Otherwise
      // mark 'error', which keeps getFromCache on seeds and leaves the key
      // retryable instead of freezing a blank for the session. (Checking _cache,
      // not _status: this function sets _status to 'loading' on entry.)
      _status[cacheKey] = _cache[cacheKey] ? 'loaded' : 'error';
      _bump();
    }
    if (rethrow) throw err;
    return null;
  }
}

// ── Admin writes: one call per user action ──────────────────────────
// Each write sends only the row the admin touched, then re-reads that category
// and returns the server's rows. The old save diffed the editor's whole list
// against _cache and deleted whatever the list lacked; _cache is refreshed on
// focus and can be newer than the Admin page, so an option another admin had
// just added was soft-deleted by an unrelated add.

const _writeQueue = {};

// Writes to one category run in order, so a delete clicked while an add is in
// flight runs after that add has landed and been re-read.
function enqueue(cacheKey, run) {
  const prev = _writeQueue[cacheKey] || Promise.resolve();
  const next = prev.then(run);
  _writeQueue[cacheKey] = next.catch(() => {});
  return next;
}

function stageError(stage, err) {
  const wrapped = new Error((err && err.message) || String(err));
  wrapped.stage = stage;
  wrapped.cause = err;
  return wrapped;
}

function isServerId(id) {
  return typeof id === 'number';
}

function sameOption(a, b) {
  return a.name === b.name
    && (a.serviceType || '') === (b.serviceType || '')
    && (a.entityType || '') === (b.entityType || '');
}

async function reloadAfterWrite(cacheKey) {
  try {
    return await fetchCategory(cacheKey, CATEGORY_MAP[cacheKey], { rethrow: true });
  } catch (err) {
    throw stageError('reload', err);
  }
}

async function bulkOne(cacheKey, item) {
  const category = CATEGORY_MAP[cacheKey];
  try {
    await configAPI.bulk([localToApi(category, item)]);
  } catch (err) {
    console.error(`[adminStorage] Failed to save "${category}":`, err.message || err);
    throw stageError('write', err);
  }
}

// bulk is get_or_create on (category, value): it creates the name, revives it
// if it was soft-deleted, or skips it if it is already active.
export function addConfigOption(cacheKey, item) {
  return enqueue(cacheKey, async () => {
    await bulkOne(cacheKey, item);
    return reloadAfterWrite(cacheKey);
  });
}

// An edit that is not routed through configAPI.rename or configAPI.update. It
// goes through bulk exactly as before, so it adds the new name and leaves the
// old row active; the difference is that only this row is sent.
export function editConfigOption(cacheKey, item) {
  return addConfigOption(cacheKey, item);
}

// A row added a moment ago may still carry the page's local id. By the time
// this runs the add has been re-read, so the server row is found by its value.
export function deleteConfigOption(cacheKey, item) {
  return enqueue(cacheKey, async () => {
    let id = isServerId(item.id) ? item.id : null;
    if (id === null && _loadedThisSession[cacheKey]) {
      const match = (_cache[cacheKey] || []).find((row) => sameOption(row, item));
      if (match) id = match.id;
    }
    if (id !== null) {
      try {
        await configAPI.delete(id);
      } catch (err) {
        console.error(`[adminStorage] Failed to delete config item ${id}:`, err.message || err);
        throw stageError('write', err);
      }
    }
    return reloadAfterWrite(cacheKey);
  });
}

// ── Public API (sync — reads from in-memory cache) ──────────────────

export function getProjectNames() {
  return getFromCache('projectNames');
}

export function getSeasons() {
  return getFromCache('seasons');
}

export function getVendorTypes() {
  return getFromCache('vendorTypes');
}

export function getEntityTypes() {
  return getFromCache('entityTypes');
}

export function getVendorNames() {
  return getFromCache('vendorNames');
}

export function getBankNames() {
  return getFromCache('bankNames');
}

export function getAccountTypes() {
  return getFromCache('accountTypes');
}

export function getBankNamesList() {
  return getBankNames().map(item => item.name);
}

export function getAccountTypesList() {
  return getAccountTypes().map(item => item.name);
}

export function getCourierItems() {
  return getFromCache('courierItems');
}

export function getCourierItemNames() {
  return getCourierItems().map(item => item.name);
}

// Partner categories classify a vendor as a CSR delivery partner. CSR reads the
// flag off the vendor; only this catalog and the vendor form write it.
export function getPartnerCategories() {
  return getFromCache('partnerCategories');
}

export function getPartnerCategoryNames() {
  return getPartnerCategories().map(item => item.name);
}

// The two CSR activity catalogs. TTA owns them; CSR only reads them, so the
// writes go through TTA Admin and deliberately do not exist in the CSR app.
//
// A rename of either MUST go through configAPI.rename, not through the bulk
// write. CSRActivity.workshop and .training_programme are ForeignKeys to the
// ConfigOption row, and bulk adds the new name as a second row, which would
// leave the activity pointing at the old row. AdminPage wires onRename for
// exactly this reason.
export function getWorkshopNames() {
  return getFromCache('workshopNames');
}

export function getWorkshopNameList() {
  return getWorkshopNames().map(item => item.name);
}

export function getTrainingProgrammes() {
  return getFromCache('trainingProgrammes');
}

export function getTrainingProgrammeList() {
  return getTrainingProgrammes().map(item => item.name);
}

// The Utilisation Certificate types (tranche, final, periodic). Same ownership
// as the two catalogs above: TTA Admin edits them, CSR only reads them, and a
// rename goes through configAPI.rename because CSRProject.utilisation_type
// holds the row by ForeignKey.
export function getUtilisationTypes() {
  return getFromCache('utilisationTypes');
}

// ── Helper: return just name strings ─────────────────────────────────

export function getVendorTypeNames() {
  return getVendorTypes().map(item => item.name);
}

export function getEntityTypeNames() {
  return getEntityTypes().map(item => item.name);
}

export function getVendorNamesList() {
  return getVendorNames().map(item => item.name);
}

export function getFilteredVendorNames(serviceType, entityType) {
  let list = getVendorNames();
  if (serviceType) list = list.filter(item => item.serviceType === serviceType);
  if (entityType) list = list.filter(item => item.entityType === entityType);
  return list;
}

// ── Async: fetch from API and refresh in-memory cache ───────────────

export async function refreshAllFromAPI() {
  // Seeds live in DEFAULTS and are applied by getFromCache, so fetchCategory no
  // longer takes a fallback list — it must never invent data the server did not send.
  await Promise.all(
    Object.keys(CATEGORY_MAP).map((key) => fetchCategory(key, CATEGORY_MAP[key]))
  );
}

// syncLocalToAPI removed — no longer needed since localStorage is not used
export async function syncLocalToAPI() {
  // No-op: kept for backwards compatibility if called anywhere
}
