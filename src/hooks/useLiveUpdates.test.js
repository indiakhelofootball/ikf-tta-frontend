import { renderHook, act } from '@testing-library/react';
import useLiveUpdates, { CHECK_INTERVAL_MS, resetLiveUpdatesForTests } from './useLiveUpdates';
import { changesAPI } from '../services/api';

jest.mock('../services/api', () => ({ changesAPI: { get: jest.fn() } }));

let visibility = 'visible';
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });

function setVisibility(state) {
  visibility = state;
  document.dispatchEvent(new Event('visibilitychange'));
}

async function settle(ms = 0) {
  await act(async () => { jest.advanceTimersByTime(ms); });
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await Promise.resolve(); });
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.useFakeTimers();
  resetLiveUpdatesForTests();
  changesAPI.get.mockReset();
  visibility = 'visible';
});

afterEach(() => {
  resetLiveUpdatesForTests();
  jest.useRealTimers();
});

test('reads the version before the list, then puts the list on screen', async () => {
  const order = [];
  changesAPI.get.mockImplementation(async () => { order.push('version'); return { courier: 'v1' }; });
  const fetch = jest.fn(async () => { order.push('list'); return ['row']; });
  const apply = jest.fn();
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch, apply }));

  await act(() => result.current.reload());

  expect(order).toEqual(['version', 'list']);
  expect(apply).toHaveBeenCalledWith(['row'], {});
  expect(result.current.checkedAt).toBeInstanceOf(Date);
  expect(result.current.failed).toBe(false);
});

test('does not fetch the list again while nothing has changed', async () => {
  changesAPI.get.mockResolvedValue({ courier: 'v1' });
  const fetch = jest.fn(async () => []);
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch, apply: jest.fn() }));
  await act(() => result.current.reload());

  // One interval at a time: ticks that fire while a check is still waiting
  // for its answer are skipped on purpose, so a slow server is never queued up.
  await settle(CHECK_INTERVAL_MS);
  await settle(CHECK_INTERVAL_MS);
  await settle(CHECK_INTERVAL_MS);

  expect(changesAPI.get).toHaveBeenCalledTimes(4);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('fetches again, marked as a background reload, once the version moves', async () => {
  changesAPI.get.mockResolvedValue({ courier: 'v1' });
  const fetch = jest.fn(async () => ['old']);
  const apply = jest.fn();
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch, apply }));
  await act(() => result.current.reload());

  changesAPI.get.mockResolvedValue({ courier: 'v2' });
  fetch.mockResolvedValue(['new']);
  await settle(CHECK_INTERVAL_MS);

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(apply).toHaveBeenLastCalledWith(['new'], { background: true });
});

test('an older reload that finishes last never overwrites a newer one', async () => {
  changesAPI.get
    .mockResolvedValueOnce({ courier: 'vA' })
    .mockResolvedValueOnce({ courier: 'vB' })
    .mockResolvedValue({ courier: 'vB' });
  const slow = deferred();
  const fetch = jest.fn()
    .mockImplementationOnce(() => slow.promise)
    .mockImplementationOnce(async () => ['B']);
  const apply = jest.fn();
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch, apply }));

  let first;
  await act(async () => { first = result.current.reload(); });
  await act(() => result.current.reload());
  await act(async () => { slow.resolve(['A']); await first; });

  expect(apply).toHaveBeenCalledTimes(1);
  expect(apply).toHaveBeenCalledWith(['B'], {});
  // The version kept is B's, so the next check sees nothing new.
  await settle(CHECK_INTERVAL_MS);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('stops checking while the tab is hidden, and checks at once on return', async () => {
  changesAPI.get.mockResolvedValue({ courier: 'v1' });
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch: async () => [], apply: jest.fn() }));
  await act(() => result.current.reload());
  const before = changesAPI.get.mock.calls.length;

  await act(async () => setVisibility('hidden'));
  await settle(CHECK_INTERVAL_MS * 4);
  expect(changesAPI.get).toHaveBeenCalledTimes(before);

  await act(async () => setVisibility('visible'));
  await settle();
  expect(changesAPI.get).toHaveBeenCalledTimes(before + 1);
});

test('a failed check is shown, and the next good one clears it', async () => {
  changesAPI.get.mockResolvedValue({ courier: 'v1' });
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch: async () => [], apply: jest.fn() }));
  await act(() => result.current.reload());

  changesAPI.get.mockRejectedValue(new Error("Can't reach the server right now."));
  await settle(CHECK_INTERVAL_MS);
  expect(result.current.failed).toBe(true);

  changesAPI.get.mockResolvedValue({ courier: 'v1' });
  await settle(CHECK_INTERVAL_MS);
  expect(result.current.failed).toBe(false);
});

test('a failed list fetch is shown and retried by the next check', async () => {
  changesAPI.get.mockResolvedValue({ courier: 'v1' });
  const fetch = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(['row']);
  const apply = jest.fn();
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch, apply }));

  await act(async () => { await result.current.reload().catch(() => {}); });
  expect(result.current.failed).toBe(true);

  await settle(CHECK_INTERVAL_MS);
  expect(apply).toHaveBeenCalledWith(['row'], { background: true });
  expect(result.current.failed).toBe(false);
});

test('two screens open at once share one request', async () => {
  changesAPI.get.mockResolvedValue({ courier: 'c1', payments: 'p1' });
  renderHook(() => useLiveUpdates('courier', { fetch: async () => [], apply: jest.fn() }));
  renderHook(() => useLiveUpdates('payments', { fetch: async () => [], apply: jest.fn() }));
  changesAPI.get.mockClear();

  await settle(CHECK_INTERVAL_MS);

  const timerChecks = changesAPI.get.mock.calls.filter(([areas]) => areas.length === 2);
  expect(timerChecks).toEqual([[['courier', 'payments']]]);
});

test('an area the server leaves out causes no reload and no warning', async () => {
  changesAPI.get.mockResolvedValue({});
  const fetch = jest.fn(async () => []);
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch, apply: jest.fn() }));

  await settle(CHECK_INTERVAL_MS);

  expect(fetch).not.toHaveBeenCalled();
  expect(result.current.failed).toBe(false);
});

test('a check does not start a second reload while one is running', async () => {
  changesAPI.get.mockResolvedValue({ courier: 'v1' });
  const slow = deferred();
  const fetch = jest.fn(() => slow.promise);
  const { result } = renderHook(() => useLiveUpdates('courier', { fetch, apply: jest.fn() }));

  let pending;
  await act(async () => { pending = result.current.reload(); });
  changesAPI.get.mockResolvedValue({ courier: 'v2' });
  await settle(CHECK_INTERVAL_MS);
  expect(fetch).toHaveBeenCalledTimes(1);

  await act(async () => { slow.resolve([]); await pending; });
});
