// WIRING tests, not unit tests.
//
// WorkOrderManagementPage and PaymentManagementPage reach react-router-dom,
// which CRA's Jest resolver cannot load, so they are read as source. Each of
// the three vendor pickers must load /vendors/options/ (no PAN images) and
// never the full vendor list. Same normalise() as courierWiring.test.js.
import fs from 'fs';
import path from 'path';

const normalise = (src) =>
  src
    .replace(/\r\n/g, '\n')
    .replace(/'/g, '"')
    .replace(/\s+/g, '')
    .replace(/\((\w+)\)=>/g, '$1=>')
    .replace(/,(?=[)\]}])/g, '');

// Whole-line and block comments only, so a comment that records the old call
// cannot fail the "never calls" check; code is untouched.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const read = (...parts) =>
  normalise(stripComments(fs.readFileSync(path.join(__dirname, ...parts), 'utf8')));

const callers = {
  WorkOrderManagementPage: read('WorkOrderManagementPage.jsx'),
  WorkOrderModal: read('WorkOrderModal.jsx'),
  PaymentManagementPage: read('..', 'payments', 'PaymentManagementPage.jsx'),
};

describe.each(Object.entries(callers))('%s vendor fetch', (name, src) => {
  test('calls vendorsAPI.getOptions() and reads res.vendors', () => {
    expect(src).toContain(normalise('vendorsAPI.getOptions()'));
    expect(src).toMatch(/vendorsAPI\.getOptions\(\)\.then\(res=>[^]{0,40}res\.vendors/);
  });

  test('never calls vendorsAPI.getAll', () => {
    expect(src).not.toContain('vendorsAPI.getAll');
  });
});

test('PaymentManagementPage keeps its failure toast and empty-list fallback', () => {
  expect(callers.PaymentManagementPage).toContain(
    normalise(`vendorsAPI.getOptions()
      .then((res) => {
        setVendors(res.vendors || []);
      })
      .catch(() => {
        setVendors([]);
        showToast('Failed to load vendors', 'error');
      });`)
  );
});

test('WorkOrderModal keeps its .length guard so an empty answer never blanks the picker', () => {
  expect(callers.WorkOrderModal).toContain(
    normalise('.then(res => { if (res.vendors?.length) setFreshVendors(res.vendors); })')
  );
});

test('vendorsAPI.getOptions targets /vendors/options/', () => {
  const api = read('..', '..', 'services', 'api.js');
  expect(api).toContain(normalise("getOptions: async () => {\n    return apiService.request('/vendors/options/');"));
});
