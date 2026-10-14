// A failed token refresh used to log the user out whatever the reason: a dropped
// connection, or a 502 while the backend restarts, at the moment the access token
// had expired, signed out a perfectly valid session. Only the refresh endpoint
// refusing the token (400/401), or no refresh token at all, may end the session.

import apiService, { trialsAPI, clientAPI } from './api';
import { redirectToLoginDoor } from '../auth/loginDoor';

jest.mock('../auth/loginDoor', () => ({
  ...jest.requireActual('../auth/loginDoor'),
  redirectToLoginDoor: jest.fn(),
}));

const UNREACHABLE = "Can't reach the server right now. Please try again.";
const REFRESH_URL = /\/auth\/token\/refresh\/$/;

const response = (status, body, contentType = 'application/json') => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? contentType : null) },
  json: async () => {
    if (contentType !== 'application/json') throw new SyntaxError('Unexpected token <');
    return body;
  },
  blob: async () => body,
});

const USER = JSON.stringify({ id: 1, email: 'u@example.com', role: 'ADMIN' });

const seedSession = () => {
  localStorage.setItem('tta_token', 'old-access');
  localStorage.setItem('tta_refresh', 'old-refresh');
  localStorage.setItem('tta_user', USER);
};

const expectSessionKept = () => {
  expect(localStorage.getItem('tta_token')).toBe('old-access');
  expect(localStorage.getItem('tta_refresh')).toBe('old-refresh');
  expect(localStorage.getItem('tta_user')).toBe(USER);
  expect(redirectToLoginDoor).not.toHaveBeenCalled();
};

const expectLoggedOut = () => {
  expect(localStorage.getItem('tta_token')).toBeNull();
  expect(localStorage.getItem('tta_refresh')).toBeNull();
  expect(localStorage.getItem('tta_user')).toBeNull();
  expect(redirectToLoginDoor).toHaveBeenCalledTimes(1);
  expect(redirectToLoginDoor).toHaveBeenCalledWith('ADMIN');
};

// Every API call answers 401 with the old token and 200 with the new one; the
// refresh endpoint answers with whatever the test gives it.
const routeFetch = (refreshAnswer) => {
  global.fetch = jest.fn((url, init = {}) => {
    if (REFRESH_URL.test(url)) return refreshAnswer(init);
    const auth = init.headers?.Authorization;
    if (auth === 'Bearer new-access') return Promise.resolve(response(200, { trials: [], total: 0 }));
    return Promise.resolve(response(401, { detail: 'Token expired' }));
  });
};

const refreshCalls = () => global.fetch.mock.calls.filter(([url]) => REFRESH_URL.test(url));

beforeEach(() => {
  jest.clearAllMocks();
  seedSession();
});

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
  delete global.fetch;
});

describe('a refresh that could not reach a verdict keeps the session', () => {
  test('a network error during the refresh: no logout, tokens kept, a clear error', async () => {
    routeFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(trialsAPI.getAll()).rejects.toThrow(UNREACHABLE);
    expectSessionKept();
  });

  test.each([500, 502, 503, 504])('a %i from the refresh endpoint: no logout, tokens kept, a clear error', async (status) => {
    routeFetch(() => Promise.resolve(response(status, '<html>Bad Gateway</html>', 'text/html')));
    await expect(trialsAPI.getAll()).rejects.toThrow(UNREACHABLE);
    expectSessionKept();
  });

  test('a refresh that never answers times out with the timeout sentence and keeps the tokens', async () => {
    jest.useFakeTimers();
    routeFetch((init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => {
        const err = new Error('The operation was aborted.');
        err.name = 'AbortError';
        reject(err);
      });
    }));
    const pending = apiService.refreshToken();
    jest.advanceTimersByTime(60000);
    await expect(pending).rejects.toThrow('The server took too long to respond. Please try again.');
    expectSessionKept();
  });

  test('the file-download path (rawFetch) keeps the session on a 503 too', async () => {
    routeFetch(() => Promise.resolve(response(503, '', 'text/html')));
    await expect(clientAPI.reportFile(4)).rejects.toThrow(UNREACHABLE);
    expectSessionKept();
  });

  test('once the server is back, the next request refreshes and succeeds', async () => {
    let up = false;
    routeFetch(() => (up
      ? Promise.resolve(response(200, { access: 'new-access', refresh: 'new-refresh' }))
      : Promise.reject(new TypeError('Failed to fetch'))));
    await expect(trialsAPI.getAll()).rejects.toThrow(UNREACHABLE);
    up = true;
    await expect(trialsAPI.getAll()).resolves.toEqual({ trials: [], total: 0 });
    expect(localStorage.getItem('tta_token')).toBe('new-access');
    expect(localStorage.getItem('tta_refresh')).toBe('new-refresh');
    expect(redirectToLoginDoor).not.toHaveBeenCalled();
  });
});

describe('unchanged: a refused refresh still logs out', () => {
  test.each([401, 400])('a %i from the refresh endpoint logs out and sends the user to their login door', async (status) => {
    routeFetch(() => Promise.resolve(response(status, { detail: 'Token is invalid or expired' })));
    await expect(trialsAPI.getAll()).rejects.toThrow('Session expired');
    expectLoggedOut();
  });

  test('no refresh token stored logs out', async () => {
    localStorage.removeItem('tta_refresh');
    routeFetch(() => Promise.resolve(response(200, { access: 'new-access' })));
    await expect(trialsAPI.getAll()).rejects.toThrow('Session expired');
    expect(refreshCalls()).toHaveLength(0);
    expectLoggedOut();
  });

  test('after a no-refresh-token logout, the next session can still refresh', async () => {
    localStorage.removeItem('tta_refresh');
    routeFetch(() => Promise.resolve(response(200, { access: 'new-access', refresh: 'new-refresh' })));
    await expect(trialsAPI.getAll()).rejects.toThrow('Session expired');
    seedSession();
    await expect(trialsAPI.getAll()).resolves.toEqual({ trials: [], total: 0 });
    expect(refreshCalls()).toHaveLength(1);
  });

  test('the file-download path (rawFetch) logs out on a 401 from the refresh endpoint', async () => {
    routeFetch(() => Promise.resolve(response(401, { detail: 'Token is blacklisted' })));
    await expect(clientAPI.reportFile(4)).rejects.toThrow('Session expired');
    expectLoggedOut();
  });

  test('a successful refresh stores the rotated tokens and retries the request', async () => {
    routeFetch(() => Promise.resolve(response(200, { access: 'new-access', refresh: 'new-refresh' })));
    await expect(trialsAPI.getAll()).resolves.toEqual({ trials: [], total: 0 });
    expect(localStorage.getItem('tta_token')).toBe('new-access');
    expect(localStorage.getItem('tta_refresh')).toBe('new-refresh');
    expect(redirectToLoginDoor).not.toHaveBeenCalled();
  });
});

describe('unchanged: concurrent 401s share one refresh', () => {
  test('three parallel requests make exactly one refresh call and all succeed', async () => {
    let release;
    routeFetch(() => new Promise((resolve) => {
      release = () => resolve(response(200, { access: 'new-access', refresh: 'new-refresh' }));
    }));
    const calls = [trialsAPI.getAll(), trialsAPI.getAll(), trialsAPI.getAll()];
    await new Promise((r) => setTimeout(r, 0));
    release();
    await expect(Promise.all(calls)).resolves.toHaveLength(3);
    expect(refreshCalls()).toHaveLength(1);
  });

  test('parallel requests during an outage share one refresh, and none logs out', async () => {
    let fail;
    routeFetch(() => new Promise((_, reject) => {
      fail = () => reject(new TypeError('Failed to fetch'));
    }));
    const calls = [trialsAPI.getAll(), trialsAPI.getAll(), trialsAPI.getAll()].map((p) => p.catch((e) => e.message));
    await new Promise((r) => setTimeout(r, 0));
    fail();
    await expect(Promise.all(calls)).resolves.toEqual([UNREACHABLE, UNREACHABLE, UNREACHABLE]);
    expect(refreshCalls()).toHaveLength(1);
    expectSessionKept();
  });
});
