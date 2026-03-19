// src/utils/adminStorage.js
// localStorage helpers for admin-managed dropdown options

import { PROJECT_NAMES, SEASONS_PROJECT } from '../components/trials/trialConstants';

const DEFAULT_VENDOR_TYPES = [];

const DEFAULT_ENTITY_TYPES = [];

const KEYS = {
  projectNames: 'tta_admin_project_names',
  seasons: 'tta_admin_seasons',
  vendorTypes: 'tta_admin_vendor_types',
  entityTypes: 'tta_admin_entity_types',
  vendorNames: 'tta_admin_vendor_names',
};

function load(key, defaults) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First load — seed from hardcoded constants
  const seeded = defaults.map((name, i) => ({ id: Date.now() + i, name, comment: '' }));
  localStorage.setItem(key, JSON.stringify(seeded));
  return seeded;
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getProjectNames() {
  return load(KEYS.projectNames, PROJECT_NAMES);
}

export function saveProjectNames(list) {
  save(KEYS.projectNames, list);
}

export function getSeasons() {
  return load(KEYS.seasons, SEASONS_PROJECT);
}

export function saveSeasons(list) {
  save(KEYS.seasons, list);
}

export function getVendorTypes() {
  return load(KEYS.vendorTypes, DEFAULT_VENDOR_TYPES);
}

export function saveVendorTypes(list) {
  save(KEYS.vendorTypes, list);
}

export function getEntityTypes() {
  return load(KEYS.entityTypes, DEFAULT_ENTITY_TYPES);
}

export function saveEntityTypes(list) {
  save(KEYS.entityTypes, list);
}

// Vendor names now store: { id, name, serviceType, entityType, comment }
export function getVendorNames() {
  return load(KEYS.vendorNames, []);
}

export function saveVendorNames(list) {
  save(KEYS.vendorNames, list);
}

// Helper: return just the name strings (for use in dropdowns)
export function getVendorTypeNames() {
  return getVendorTypes().map(item => item.name);
}

export function getEntityTypeNames() {
  return getEntityTypes().map(item => item.name);
}

export function getVendorNamesList() {
  return getVendorNames().map(item => item.name);
}

// Return vendor name objects filtered by serviceType and/or entityType
// If a filter is empty/null, that filter is skipped (matches all)
export function getFilteredVendorNames(serviceType, entityType) {
  let list = getVendorNames();
  if (serviceType) list = list.filter(item => item.serviceType === serviceType);
  if (entityType) list = list.filter(item => item.entityType === entityType);
  return list;
}
