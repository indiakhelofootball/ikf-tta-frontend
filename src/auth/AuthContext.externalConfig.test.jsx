// An external funder (CSR_CLIENT) holds no internal module grants, so every
// /api/config/ read on their behalf is denied. The portal used to fire the full
// 11-category config refresh on login anyway — 11 x 403 on every funder session.
// These tests measure the request count directly rather than asserting on a flag.
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';

// react-router-dom v7 ships an "exports"-only entry that Jest's CRA resolver
// cannot follow; AuthContext only needs useNavigate.
jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => jest.fn() }), {
  virtual: true,
});

jest.mock('../services/api', () => {
  const configAPI = { getByCategory: jest.fn(), bulk: jest.fn(), delete: jest.fn() };
  const permissionsAPI = { getMine: jest.fn() };
  return { __esModule: true, default: {}, configAPI, permissionsAPI };
});

// Wrap the REAL adminStorage so the cache-state assertions below exercise the
// production module, while still counting calls made by AuthContext.
jest.mock('../utils/adminStorage', () => {
  const actual = jest.requireActual('../utils/adminStorage');
  return {
    __esModule: true,
    ...actual,
    refreshAllFromAPI: jest.fn((...args) => actual.refreshAllFromAPI(...args)),
  };
});

const { configAPI, permissionsAPI } = require('../services/api');
const adminStorage = require('../utils/adminStorage');
const { AuthProvider } = require('./AuthContext');

const seedSession = (role) => {
  localStorage.setItem('tta_token', 'tok');
  localStorage.setItem('tta_login_time', Date.now().toString());
  localStorage.setItem(
    'tta_user',
    JSON.stringify({ id: 1, email: `${role.toLowerCase()}@example.com`, name: 'U', role })
  );
};

const renderAuth = async () => {
  const utils = render(
    <AuthProvider>
      <div>ok</div>
    </AuthProvider>
  );
  await act(async () => {});
  return utils;
};

beforeEach(() => {
  localStorage.clear();
  adminStorage.clearConfigCache();
  jest.clearAllMocks();
  // CRA sets resetMocks: true, which strips the pass-through implementation.
  const actual = jest.requireActual('../utils/adminStorage');
  adminStorage.refreshAllFromAPI.mockImplementation((...args) => actual.refreshAllFromAPI(...args));
  configAPI.getByCategory.mockResolvedValue([]);
  permissionsAPI.getMine.mockResolvedValue({ isSuperAdmin: false, grants: {} });
});

test('an external funder session fires zero /api/config/ requests', async () => {
  seedSession('CSR_CLIENT');
  await renderAuth();

  await waitFor(() => expect(configAPI.getByCategory).not.toHaveBeenCalled());
  expect(adminStorage.refreshAllFromAPI).not.toHaveBeenCalled();
  // The grants call is denied for the same structural reason — also skipped.
  expect(permissionsAPI.getMine).not.toHaveBeenCalled();
});

test('an internal session still loads the full config cache (11 categories)', async () => {
  seedSession('ADMIN');
  await renderAuth();

  await waitFor(() => expect(adminStorage.refreshAllFromAPI).toHaveBeenCalledTimes(1));
  // Spelled out on purpose: adding a config category stays a deliberate edit.
  expect(configAPI.getByCategory).toHaveBeenCalledTimes(11);
  // Decoupled from the grants fetch: a config failure must not blank the app,
  // and a grants failure must not blank the dropdowns.
  expect(permissionsAPI.getMine).toHaveBeenCalledTimes(1);
});

test('config still loads for an internal user when the grants fetch fails', async () => {
  permissionsAPI.getMine.mockRejectedValue(new Error('500'));
  seedSession('ADMIN');
  await renderAuth();

  await waitFor(() => expect(configAPI.getByCategory).toHaveBeenCalledTimes(11));
});

test("the funder's skipped fetch does not poison the cache for a later internal user", async () => {
  seedSession('CSR_CLIENT');
  const { unmount } = await renderAuth();

  // Nothing was fetched, so nothing may be cached as an authoritative empty
  // list — defaults must still be reachable ([] is truthy and would stick).
  expect(adminStorage.getCategoryStatus('bankNames')).toBe('idle');
  expect(adminStorage.getBankNamesList()).toEqual(['IDFC First Bank']);
  expect(adminStorage.getAccountTypesList()).toEqual(['Savings', 'Current']);

  unmount();
  localStorage.clear();

  configAPI.getByCategory.mockImplementation((category) =>
    Promise.resolve(
      category === 'bank_name' ? [{ id: 7, value: 'ICICI Bank' }] : []
    )
  );
  seedSession('ADMIN');
  await renderAuth();

  await waitFor(() => expect(adminStorage.getBankNamesList()).toEqual(['ICICI Bank']));
  expect(adminStorage.getCategoryStatus('bankNames')).toBe('loaded');
});
