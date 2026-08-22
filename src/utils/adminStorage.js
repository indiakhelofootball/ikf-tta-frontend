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
  // CSR activity catalogs. Read-only here: the agreed spec puts their
  // maintenance in TTA Admin -> Setup, and CSR only picks from them.
  workshopNames: 'workshop_name',
  trainingProgrammes: 'training_programme',
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
  workshopNames: null,
  trainingProgrammes: null,
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
  workshopNames: 'idle',
  trainingProgrammes: 'idle',
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
  // No seeds. A workshop name is a real catalog entry an admin created; a
  // made-up default would be offered to an operator as if it existed.
  workshopNames: [],
  trainingProgrammes: [],
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
  });
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // unavailable storage — in-memory reset above is what matters
  }
  _version += 1;
  _subscribers.forEach((fn) => fn());
}

function getFromCache(key) {
  // Trust the cache only after a successful load, so a server-confirmed empty
  // list renders as empty while a failed or pending load still shows seeds.
  if (_status[key] === 'loaded') return _cache[key];
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

async function fetchCategory(cacheKey, category) {
  _status[cacheKey] = 'loading';
  try {
    const res = await configAPI.getByCategory(category);
    const items = (res || []).map(apiToLocal);
    // Cache the server's answer verbatim, including an empty list — that IS the
    // truth and must not be overwritten with seeds.
    _cache[cacheKey] = items;
    _status[cacheKey] = 'loaded';
    _bump();
    return items;
  } catch (err) {
    console.error(`[adminStorage] Failed to fetch "${category}":`, err.message || err);
    // Leave _cache untouched. A key that already holds a good value keeps it —
    // a transient failure must never downgrade real data to seeds. Otherwise
    // mark 'error', which keeps getFromCache on seeds and leaves the key
    // retryable instead of freezing a blank for the session. (Checking _cache,
    // not _status: this function sets _status to 'loading' on entry.)
    _status[cacheKey] = _cache[cacheKey] ? 'loaded' : 'error';
    _bump();
    return null;
  }
}

async function saveCategory(cacheKey, category, list) {
  const previous = _cache[cacheKey] || [];
  const newIds = new Set(list.map((item) => item.id));
  const removed = previous.filter((item) => !newIds.has(item.id));

  _cache[cacheKey] = list;
  _status[cacheKey] = 'loaded';
  _bump();

  await Promise.all(
    removed.map((item) => configAPI.delete(item.id).catch((err) => {
      console.error(`[adminStorage] Failed to delete config item ${item.id}:`, err.message || err);
    }))
  );

  try {
    if (list.length === 0) return;
    const items = list.map((item) => localToApi(category, item));
    await configAPI.bulk(items);
  } catch (err) {
    console.error(`[adminStorage] Failed to save "${category}":`, err.message || err);
    throw err;
  }
}

// ── Public API (sync — reads from in-memory cache) ──────────────────

export function getProjectNames() {
  return getFromCache('projectNames');
}

export function saveProjectNames(list) {
  return saveCategory('projectNames', CATEGORY_MAP.projectNames, list);
}

export function getSeasons() {
  return getFromCache('seasons');
}

export function saveSeasons(list) {
  return saveCategory('seasons', CATEGORY_MAP.seasons, list);
}

export function getVendorTypes() {
  return getFromCache('vendorTypes');
}

export function saveVendorTypes(list) {
  return saveCategory('vendorTypes', CATEGORY_MAP.vendorTypes, list);
}

export function getEntityTypes() {
  return getFromCache('entityTypes');
}

export function saveEntityTypes(list) {
  return saveCategory('entityTypes', CATEGORY_MAP.entityTypes, list);
}

export function getVendorNames() {
  return getFromCache('vendorNames');
}

export function saveVendorNames(list) {
  return saveCategory('vendorNames', CATEGORY_MAP.vendorNames, list);
}

export function getBankNames() {
  return getFromCache('bankNames');
}

export function saveBankNames(list) {
  return saveCategory('bankNames', CATEGORY_MAP.bankNames, list);
}

export function getAccountTypes() {
  return getFromCache('accountTypes');
}

export function saveAccountTypes(list) {
  return saveCategory('accountTypes', CATEGORY_MAP.accountTypes, list);
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

export function saveCourierItems(list) {
  return saveCategory('courierItems', CATEGORY_MAP.courierItems, list);
}

export function getCourierItemNames() {
  return getCourierItems().map(item => item.name);
}

// CSR reads these two; it never writes them. There is deliberately no
// saveWorkshopNames/saveTrainingProgrammes here -- the catalog is maintained in
// TTA Admin -> Setup, per CSR_VISUAL_FLOW (1).pdf s2a: "The CSR app reads this
// catalog at runtime; it does not edit it."

export function getWorkshopNames() {
  return getFromCache('workshopNames');
}

export function getTrainingProgrammes() {
  return getFromCache('trainingProgrammes');
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
