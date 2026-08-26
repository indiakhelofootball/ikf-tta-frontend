// Regression tests for the silent-empty state class in the config cache.
// The bug: a failed fetch wrote [] into the cache, getFromCache truthiness-tested
// it, and consumers never learned when real data arrived.

import { configAPI } from '../services/api';

// babel-jest hoists jest.mock above the import, so configAPI resolves to the mock.
jest.mock('../services/api', () => ({
  configAPI: {
    getByCategory: jest.fn(),
    bulk: jest.fn(),
    delete: jest.fn(),
  },
}));

const CONFIG_ROW = (id, value) => ({ id, value, comment: '' });

// Each test needs a virgin module: the cache, status map and version counter are
// module-level state.
function loadStore() {
  let store;
  jest.isolateModules(() => {
    store = require('./adminStorage');
  });
  return store;
}

beforeEach(() => {
  // CRA's jest preset sets resetMocks: true, which strips the implementations
  // declared in the module factory above — restore them per test.
  configAPI.bulk.mockResolvedValue(undefined);
  configAPI.delete.mockResolvedValue(undefined);
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('failure never poisons the cache', () => {
  test('a failed fetch does not overwrite a previously loaded value', async () => {
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(1, 'Ground Staff')]);
    const store = loadStore();

    await store.refreshAllFromAPI();
    expect(store.getVendorTypeNames()).toEqual(['Ground Staff']);

    configAPI.getByCategory.mockRejectedValue(new Error('network down'));
    await store.refreshAllFromAPI();

    expect(store.getVendorTypeNames()).toEqual(['Ground Staff']);
  });

  test('a failed fetch from cold leaves the key on seeds, marked error and retryable', async () => {
    configAPI.getByCategory.mockRejectedValue(new Error('network down'));
    const store = loadStore();

    await store.refreshAllFromAPI();

    expect(store.getCategoryStatus('bankNames')).toBe('error');
    // Seeded DEFAULTS, not a blank list.
    expect(store.getBankNamesList()).toEqual(['IDFC First Bank']);

    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(7, 'HDFC Bank')]);
    await store.refreshAllFromAPI();

    expect(store.getCategoryStatus('bankNames')).toBe('loaded');
    expect(store.getBankNamesList()).toEqual(['HDFC Bank']);
  });
});

describe('a server-confirmed empty list is the truth', () => {
  test('a successful fetch returning [] caches as [] and reads back as []', async () => {
    configAPI.getByCategory.mockResolvedValue([]);
    const store = loadStore();

    await store.refreshAllFromAPI();

    expect(store.getCategoryStatus('bankNames')).toBe('loaded');
    // Previously the seeds came back here, so deleting the last value in Admin
    // appeared not to work.
    expect(store.getBankNamesList()).toEqual([]);
  });
});

describe('seeded ids are stable', () => {
  test('getFromCache returns the same ids across repeated calls', () => {
    const store = loadStore();

    const first = store.getBankNames().map((b) => b.id);
    const second = store.getBankNames().map((b) => b.id);

    expect(first).toEqual(second);
    // Date.now() + i minted a fresh id per call, breaking React keys and MUI
    // Autocomplete option equality.
    expect(first.every((id) => typeof id === 'string')).toBe(true);
  });
});

describe('subscribers are notified', () => {
  test('fires on fetch success, on fetch failure, and on saveCategory', async () => {
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(1, 'Ground Staff')]);
    const store = loadStore();
    const seen = jest.fn();
    const unsubscribe = store.subscribeConfig(seen);

    await store.refreshAllFromAPI();
    expect(seen).toHaveBeenCalled();

    seen.mockClear();
    configAPI.getByCategory.mockRejectedValue(new Error('network down'));
    await store.refreshAllFromAPI();
    expect(seen).toHaveBeenCalled();

    seen.mockClear();
    await store.saveBankNames([{ id: 3, name: 'ICICI Bank', comment: '' }]);
    expect(seen).toHaveBeenCalled();
    expect(store.getConfigVersion()).toBeGreaterThan(0);

    seen.mockClear();
    unsubscribe();
    await store.saveBankNames([{ id: 4, name: 'Axis Bank', comment: '' }]);
    expect(seen).not.toHaveBeenCalled();
  });
});

describe('warm start across reloads', () => {
  test('a fresh module picks up the last successful load before any fetch', async () => {
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(1, 'Ground Staff')]);
    const first = loadStore();
    await first.refreshAllFromAPI();

    // Simulate a page reload: new module instance, same localStorage.
    const second = loadStore();

    expect(second.getCategoryStatus('vendorTypes')).toBe('loaded');
    expect(second.getVendorTypeNames()).toEqual(['Ground Staff']);
  });

  test('clearConfigCache drops the warm start so the next user starts clean', async () => {
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(1, 'Ground Staff')]);
    const first = loadStore();
    await first.refreshAllFromAPI();
    first.clearConfigCache();

    const second = loadStore();

    expect(second.getCategoryStatus('vendorTypes')).toBe('idle');
    expect(second.getVendorTypeNames()).toEqual([]);
  });

  test('a stale warm start is ignored', async () => {
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(1, 'Ground Staff')]);
    const first = loadStore();
    await first.refreshAllFromAPI();

    const raw = JSON.parse(localStorage.getItem('tta_config_cache_v1'));
    raw.at = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem('tta_config_cache_v1', JSON.stringify(raw));

    const second = loadStore();

    expect(second.getCategoryStatus('vendorTypes')).toBe('idle');
  });

  test('corrupt storage does not throw at module load', () => {
    localStorage.setItem('tta_config_cache_v1', 'not json');

    expect(() => loadStore()).not.toThrow();
  });
});

// Partner categories are the catalog that lets a vendor be named as the partner
// who ran a CSR workshop. CSR reads the flag off the vendor, so if this category
// is not fetched or not written the picker there is empty for a reason nobody
// can see from CSR.
describe('partner categories', () => {
  test('the login refresh asks the API for partner_category', async () => {
    configAPI.getByCategory.mockResolvedValue([]);
    const store = loadStore();

    await store.refreshAllFromAPI();

    expect(configAPI.getByCategory).toHaveBeenCalledWith('partner_category');
  });

  test('names come back from the cache, and there is no seed to hide an empty catalog', async () => {
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(7, 'Workshop Partner')]);
    const store = loadStore();
    expect(store.getPartnerCategoryNames()).toEqual([]);

    await store.refreshAllFromAPI();

    expect(store.getPartnerCategoryNames()).toEqual(['Workshop Partner']);
  });

  test('saving writes the rows under the partner_category category', async () => {
    configAPI.getByCategory.mockResolvedValue([]);
    const store = loadStore();
    await store.refreshAllFromAPI();

    await store.savePartnerCategories([{ id: 1, name: 'Training Partner', comment: '' }]);

    expect(configAPI.bulk).toHaveBeenCalledWith([
      expect.objectContaining({ category: 'partner_category', value: 'Training Partner' }),
    ]);
  });
});

// The two catalogs CSR reads and TTA owns. The save pair lives here and not in
// the CSR app on purpose; the spec puts catalog maintenance under TTA Admin.
describe('CSR activity catalogs', () => {
  test('the login refresh asks the API for both catalogs', async () => {
    configAPI.getByCategory.mockResolvedValue([]);
    const store = loadStore();

    await store.refreshAllFromAPI();

    expect(configAPI.getByCategory).toHaveBeenCalledWith('workshop_name');
    expect(configAPI.getByCategory).toHaveBeenCalledWith('training_programme');
  });

  test('neither catalog carries a seed, so an empty list reads as empty', async () => {
    const store = loadStore();

    expect(store.getWorkshopNameList()).toEqual([]);
    expect(store.getTrainingProgrammeList()).toEqual([]);
  });

  test('saving writes each catalog under its own category', async () => {
    configAPI.getByCategory.mockResolvedValue([]);
    const store = loadStore();
    await store.refreshAllFromAPI();

    await store.saveWorkshopNames([{ id: 1, name: 'Goalkeeping Clinic', comment: '' }]);
    await store.saveTrainingProgrammes([{ id: 2, name: 'Coach Level 1', comment: '' }]);

    expect(configAPI.bulk).toHaveBeenCalledWith([
      expect.objectContaining({ category: 'workshop_name', value: 'Goalkeeping Clinic' }),
    ]);
    expect(configAPI.bulk).toHaveBeenCalledWith([
      expect.objectContaining({ category: 'training_programme', value: 'Coach Level 1' }),
    ]);
  });
});
