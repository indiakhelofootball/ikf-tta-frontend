import { csrAPI } from './api';

const json = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body,
});

beforeEach(() => {
  localStorage.setItem('tta_token', 'tok');
  global.fetch = jest.fn();
});

afterEach(() => {
  localStorage.clear();
  delete global.fetch;
});

const ROWS = [{ fullName: 'Ravi Kumar', dob: '2010-01-15' }];

test('the bulk call posts dryRun and rows to the grant', async () => {
  global.fetch.mockResolvedValue(json(200, { dryRun: true, valid: 1, rows: [] }));

  const out = await csrAPI.athletesBulk(42, ROWS, true);

  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/csr\/projects\/42\/athletes\/bulk\/$/);
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({ dryRun: true, rows: ROWS });
  expect(out.valid).toBe(1);
});

test('a refused real run hands back the row errors', async () => {
  const body = { dryRun: false, invalid: 1, rows: [{ row: 1, result: 'error', errors: { dob: 'Bad date.' } }] };
  global.fetch.mockResolvedValue(json(400, body));

  const err = await csrAPI.athletesBulk(42, ROWS, false).catch((e) => e);

  expect(err.response.status).toBe(400);
  expect(err.response.data).toEqual(body);
});

test('a refusal on the retry after a token refresh still hands back the row errors', async () => {
  localStorage.setItem('tta_refresh', 'ref');
  const body = { dryRun: false, invalid: 1, rows: [{ row: 1, result: 'error', errors: { dob: 'Bad date.' } }] };
  global.fetch.mockImplementation((url, init = {}) => {
    if (/\/auth\/token\/refresh\/$/.test(url)) return Promise.resolve(json(200, { access: 'new', refresh: 'ref2' }));
    if (init.headers?.Authorization === 'Bearer new') return Promise.resolve(json(400, body));
    return Promise.resolve(json(401, { detail: 'Token expired' }));
  });

  const err = await csrAPI.athletesBulk(42, ROWS, false).catch((e) => e);

  expect(err.response).toEqual({ status: 400, data: body });
});
