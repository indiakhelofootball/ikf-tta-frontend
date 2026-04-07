// src/utils/adminStorage.js
// Admin-managed dropdown options — API-backed with in-memory cache (no localStorage)

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
};

// ── In-memory cache (replaces localStorage) ─────────────────────────

const _cache = {
  projectNames: null,
  seasons: null,
  vendorTypes: null,
  entityTypes: null,
  vendorNames: null,
  bankNames: null,
  accountTypes: null,
};

const DEFAULTS = {
  projectNames: PROJECT_NAMES,
  seasons: SEASONS_PROJECT,
  vendorTypes: [],
  entityTypes: [],
  vendorNames: [],
  bankNames: ['IDFC First Bank'],
  accountTypes: ['Savings', 'Current'],
};

function getFromCache(key) {
  if (_cache[key]) return _cache[key];
  // Return seeded defaults until API loads
  return DEFAULTS[key].map((name, i) => ({ id: Date.now() + i, name, comment: '' }));
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

async function fetchCategory(cacheKey, category, defaults) {
  try {
    const res = await configAPI.getByCategory(category);
    const items = (res || []).map(apiToLocal);
    if (items.length > 0) {
      _cache[cacheKey] = items;
      return items;
    }
  } catch {}
  const fallback = defaults.map((name, i) => ({ id: Date.now() + i, name, comment: '' }));
  _cache[cacheKey] = fallback;
  return fallback;
}

async function saveCategory(cacheKey, category, list) {
  const previous = _cache[cacheKey] || [];
  const newIds = new Set(list.map((item) => item.id));
  const removed = previous.filter((item) => !newIds.has(item.id));

  _cache[cacheKey] = list;

  await Promise.all(
    removed.map((item) => configAPI.delete(item.id).catch(() => {}))
  );

  try {
    if (list.length === 0) return;
    const items = list.map((item) => localToApi(category, item));
    await configAPI.bulk(items);
  } catch {}
}

// ── Public API (sync — reads from in-memory cache) ──────────────────

export function getProjectNames() {
  return getFromCache('projectNames');
}

export function saveProjectNames(list) {
  saveCategory('projectNames', CATEGORY_MAP.projectNames, list).catch(() => {});
}

export function getSeasons() {
  return getFromCache('seasons');
}

export function saveSeasons(list) {
  saveCategory('seasons', CATEGORY_MAP.seasons, list).catch(() => {});
}

export function getVendorTypes() {
  return getFromCache('vendorTypes');
}

export function saveVendorTypes(list) {
  saveCategory('vendorTypes', CATEGORY_MAP.vendorTypes, list).catch(() => {});
}

export function getEntityTypes() {
  return getFromCache('entityTypes');
}

export function saveEntityTypes(list) {
  saveCategory('entityTypes', CATEGORY_MAP.entityTypes, list).catch(() => {});
}

export function getVendorNames() {
  return getFromCache('vendorNames');
}

export function saveVendorNames(list) {
  saveCategory('vendorNames', CATEGORY_MAP.vendorNames, list).catch(() => {});
}

export function getBankNames() {
  return getFromCache('bankNames');
}

export function saveBankNames(list) {
  saveCategory('bankNames', CATEGORY_MAP.bankNames, list).catch(() => {});
}

export function getAccountTypes() {
  return getFromCache('accountTypes');
}

export function saveAccountTypes(list) {
  saveCategory('accountTypes', CATEGORY_MAP.accountTypes, list).catch(() => {});
}

export function getBankNamesList() {
  return getBankNames().map(item => item.name);
}

export function getAccountTypesList() {
  return getAccountTypes().map(item => item.name);
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
  await Promise.all([
    fetchCategory('projectNames', CATEGORY_MAP.projectNames, PROJECT_NAMES),
    fetchCategory('seasons', CATEGORY_MAP.seasons, SEASONS_PROJECT),
    fetchCategory('vendorTypes', CATEGORY_MAP.vendorTypes, []),
    fetchCategory('entityTypes', CATEGORY_MAP.entityTypes, []),
    fetchCategory('vendorNames', CATEGORY_MAP.vendorNames, []),
    fetchCategory('bankNames', CATEGORY_MAP.bankNames, ['IDFC First Bank']),
    fetchCategory('accountTypes', CATEGORY_MAP.accountTypes, ['Savings', 'Current']),
  ]);
}

// syncLocalToAPI removed — no longer needed since localStorage is not used
export async function syncLocalToAPI() {
  // No-op: kept for backwards compatibility if called anywhere
}
