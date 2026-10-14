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
  test('fires on fetch success, on fetch failure, and on an admin write', async () => {
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
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(3, 'ICICI Bank')]);
    await store.addConfigOption('bankNames', { id: 'local-1', name: 'ICICI Bank', comment: '' });
    expect(seen).toHaveBeenCalled();
    expect(store.getConfigVersion()).toBeGreaterThan(0);

    seen.mockClear();
    unsubscribe();
    await store.addConfigOption('bankNames', { id: 'local-2', name: 'Axis Bank', comment: '' });
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

    await store.addConfigOption('partnerCategories', { id: 'local-1', name: 'Training Partner', comment: '' });

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

    await store.addConfigOption('workshopNames', { id: 'local-1', name: 'Goalkeeping Clinic', comment: '' });
    await store.addConfigOption('trainingProgrammes', { id: 'local-2', name: 'Coach Level 1', comment: '' });

    expect(configAPI.bulk).toHaveBeenCalledWith([
      expect.objectContaining({ category: 'workshop_name', value: 'Goalkeeping Clinic' }),
    ]);
    expect(configAPI.bulk).toHaveBeenCalledWith([
      expect.objectContaining({ category: 'training_programme', value: 'Coach Level 1' }),
    ]);
  });
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// A stand-in for the config endpoint: bulk is get_or_create on the value, delete
// is a soft delete, and the active-only read returns what is left.
function fakeConfigServer(initial) {
  const rows = initial.map((r) => ({ ...r, active: true }));
  let nextId = 100;
  configAPI.getByCategory.mockImplementation(() =>
    Promise.resolve(rows.filter((r) => r.active).map(({ active, ...r }) => r))
  );
  configAPI.bulk.mockImplementation((items) => {
    items.forEach((item) => {
      const found = rows.find((r) => r.value === item.value);
      if (found) found.active = true;
      else rows.push({ id: nextId++, value: item.value, comment: item.comment || '', active: true });
    });
    return Promise.resolve({});
  });
  configAPI.delete.mockImplementation((id) => {
    const found = rows.find((r) => r.id === id);
    if (!found) return Promise.reject(new Error('Not found.'));
    found.active = false;
    return Promise.resolve();
  });
  return rows;
}

// CP3. The old save diffed the page's whole list against this module's cache
// and deleted whatever the list lacked. The cache is refreshed on window focus,
// so it can hold an option another admin added after this admin's page loaded.
describe('an admin write sends only the row the admin touched', () => {
  test('an add sends that one row and deletes nothing, even when the cache is newer than the page', async () => {
    const rows = fakeConfigServer([CONFIG_ROW(1, 'IDFC First Bank')]);
    const store = loadStore();
    await store.refreshAllFromAPI();

    // Admin B adds a bank; admin A's focus refresh pulls it into the cache.
    rows.push({ ...CONFIG_ROW(2, 'Kotak Bank'), active: true });
    await store.refreshAllFromAPI();

    const after = await store.addConfigOption('bankNames', { id: 'local-1', name: 'Axis Bank', comment: '' });

    expect(configAPI.bulk).toHaveBeenCalledTimes(1);
    expect(configAPI.bulk).toHaveBeenCalledWith([
      expect.objectContaining({ category: 'bank_name', value: 'Axis Bank' }),
    ]);
    expect(configAPI.delete).not.toHaveBeenCalled();
    expect(after.map((r) => r.name)).toEqual(['IDFC First Bank', 'Kotak Bank', 'Axis Bank']);
    expect(store.getBankNamesList()).toEqual(['IDFC First Bank', 'Kotak Bank', 'Axis Bank']);
  });

  test('a delete sends that one server id and nothing else', async () => {
    fakeConfigServer([CONFIG_ROW(1, 'IDFC First Bank'), CONFIG_ROW(2, 'Kotak Bank')]);
    const store = loadStore();
    await store.refreshAllFromAPI();

    const after = await store.deleteConfigOption('bankNames', { id: 1, name: 'IDFC First Bank' });

    expect(configAPI.delete).toHaveBeenCalledTimes(1);
    expect(configAPI.delete).toHaveBeenCalledWith(1);
    expect(configAPI.bulk).not.toHaveBeenCalled();
    expect(after.map((r) => r.name)).toEqual(['Kotak Bank']);
  });

  test('a delete clicked while its add is in flight waits for the add and uses the server id', async () => {
    fakeConfigServer([CONFIG_ROW(1, 'IDFC First Bank')]);
    const store = loadStore();
    await store.refreshAllFromAPI();

    const added = store.addConfigOption('bankNames', { id: 'local-7', name: 'Axis Bank', comment: '' });
    const removed = store.deleteConfigOption('bankNames', { id: 'local-7', name: 'Axis Bank', comment: '' });
    await added;
    const after = await removed;

    expect(configAPI.delete).toHaveBeenCalledTimes(1);
    expect(configAPI.delete).toHaveBeenCalledWith(100);
    expect(after.map((r) => r.name)).toEqual(['IDFC First Bank']);
  });

  test('a failed write rejects as a write failure instead of only logging', async () => {
    fakeConfigServer([CONFIG_ROW(1, 'IDFC First Bank')]);
    const store = loadStore();
    await store.refreshAllFromAPI();
    configAPI.delete.mockRejectedValue(new Error('500'));

    await expect(store.deleteConfigOption('bankNames', { id: 1, name: 'IDFC First Bank' }))
      .rejects.toMatchObject({ stage: 'write' });
    expect(store.getBankNamesList()).toEqual(['IDFC First Bank']);
  });

  test('a write that landed but could not be re-read rejects as a reload failure', async () => {
    fakeConfigServer([CONFIG_ROW(1, 'IDFC First Bank')]);
    const store = loadStore();
    await store.refreshAllFromAPI();
    configAPI.getByCategory.mockRejectedValue(new Error('network down'));

    await expect(store.addConfigOption('bankNames', { id: 'local-1', name: 'Axis Bank' }))
      .rejects.toMatchObject({ stage: 'reload' });
  });

  test('a refresh that started before a write cannot put the pre-write list back', async () => {
    const rows = fakeConfigServer([CONFIG_ROW(1, 'IDFC First Bank')]);
    const store = loadStore();
    await store.refreshAllFromAPI();

    const slow = deferred();
    configAPI.getByCategory.mockImplementationOnce(() => slow.promise);
    const focusRefresh = store.refreshAllFromAPI();

    await store.addConfigOption('bankNames', { id: 'local-1', name: 'Axis Bank' });
    expect(rows.filter((r) => r.active).map((r) => r.value)).toEqual(['IDFC First Bank', 'Axis Bank']);

    slow.resolve([CONFIG_ROW(1, 'IDFC First Bank')]);
    await focusRefresh;

    expect(store.getBankNamesList()).toEqual(['IDFC First Bank', 'Axis Bank']);
  });
});

// CP4. fetchCategory marks a key 'loading' for the length of the request, and
// getFromCache used to answer seeds for anything not 'loaded'. A re-render in
// that window (the focus refresh re-renders through AuthContext) showed seeds
// or a blank, then swapped back.
describe('a refetch keeps showing the list this session already loaded', () => {
  test('mid-refetch reads return the loaded list, then the new one once it lands', async () => {
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(7, 'HDFC Bank')]);
    const store = loadStore();
    await store.refreshAllFromAPI();

    const pending = deferred();
    configAPI.getByCategory.mockImplementation(() => pending.promise);
    const refresh = store.refreshAllFromAPI();

    expect(store.getCategoryStatus('bankNames')).toBe('loading');
    expect(store.getBankNamesList()).toEqual(['HDFC Bank']);

    pending.resolve([CONFIG_ROW(8, 'ICICI Bank')]);
    await refresh;

    expect(store.getBankNamesList()).toEqual(['ICICI Bank']);
  });

  test('unchanged: a key that has never loaded from the server shows seeds while it loads', async () => {
    const pending = deferred();
    configAPI.getByCategory.mockImplementation(() => pending.promise);
    const store = loadStore();
    const refresh = store.refreshAllFromAPI();

    expect(store.getCategoryStatus('bankNames')).toBe('loading');
    expect(store.getBankNamesList()).toEqual(['IDFC First Bank']);

    pending.resolve([]);
    await refresh;
  });

  test('unchanged: after logout the next session starts from seeds, not the old list', async () => {
    configAPI.getByCategory.mockResolvedValue([CONFIG_ROW(7, 'HDFC Bank')]);
    const store = loadStore();
    await store.refreshAllFromAPI();
    store.clearConfigCache();

    const pending = deferred();
    configAPI.getByCategory.mockImplementation(() => pending.promise);
    const refresh = store.refreshAllFromAPI();

    expect(store.getBankNamesList()).toEqual(['IDFC First Bank']);

    pending.resolve([]);
    await refresh;
  });
});
