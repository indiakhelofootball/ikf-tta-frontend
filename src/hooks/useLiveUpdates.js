// src/hooks/useLiveUpdates.js
// Keeps an open screen current. Every CHECK_INTERVAL_MS while the tab is
// visible, one small request asks the server whether anything a watched list
// shows has changed (backend/changes.py), and a list is fetched again only when
// its version moved. Becoming visible again checks at once.
//
// Returning to the tab also reloads the list outright, at most every 30 s,
// exactly as screens did before the check existed (useRefetchOnFocus). The
// check only sees what backend/changes.py watches; if a screen ever shows
// something it misses, this reload still brings the edit in on return, so the
// check can only make a screen fresher than before, never staler. Silent: the
// list on screen stays until the new one replaces it.
//
// This is not stale-while-revalidate, which never-show-stale-data rules out:
// nothing cached is ever shown. The timer only decides WHEN to fetch; what the
// screen shows is always what was fetched for it.
//
// Two rules keep a change from being skipped:
// - The version is read BEFORE the list. A change landing between the two reads
//   leaves the version older than the list, so the next check fetches once
//   more. Read the other way round, the change would count as already seen.
// - Only the newest reload is applied. Two overlapping reloads could otherwise
//   pair an older list with a newer version, which is the same skip.
//
// Every screen shares one timer and one request: each registers its area, and
// the request asks for all of them at once.
import { useCallback, useEffect, useRef, useState } from 'react';
import { changesAPI } from '../services/api';
import useRefetchOnFocus from './useRefetchOnFocus';

export const CHECK_INTERVAL_MS = 15 * 1000;
const MIN_GAP_MS = 2 * 1000;

const listeners = new Set();
let timer = null;
let checking = false;
let lastCheck = 0;

async function checkAll() {
  const areas = [...new Set([...listeners].map((l) => l.area))];
  if (!areas.length || checking) return;
  checking = true;
  lastCheck = Date.now();
  try {
    let versions;
    try {
      versions = (await changesAPI.get(areas)) || {};
    } catch (err) {
      listeners.forEach((l) => l.onFailure(err));
      return;
    }
    listeners.forEach((l) => l.onVersions(versions));
  } finally {
    checking = false;
  }
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer() {
  stopTimer();
  if (listeners.size && document.visibilityState === 'visible') {
    timer = setInterval(checkAll, CHECK_INTERVAL_MS);
  }
}

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') {
    stopTimer();
    return;
  }
  if (Date.now() - lastCheck >= MIN_GAP_MS) checkAll();
  startTimer();
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) document.addEventListener('visibilitychange', onVisibilityChange);
  startTimer();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopTimer();
    }
  };
}

// For tests: forget every subscriber and timer between cases.
export function resetLiveUpdatesForTests() {
  listeners.clear();
  stopTimer();
  checking = false;
  lastCheck = 0;
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

/**
 * area   – a key of backend/changes.py AREAS, e.g. 'courier'.
 * fetch  – (opts) => Promise<data>: reads the list from the server. Throws on failure.
 * apply  – (data, opts) => void: puts the fetched list on screen.
 *
 * Returns { reload, checkedAt, failed }. reload(opts) fetches now; opts is
 * passed through to fetch and apply ({ background: true } for a reload the
 * check started). checkedAt is when the list was last confirmed current;
 * failed is true while the latest check or reload has not succeeded.
 */
export default function useLiveUpdates(area, { fetch, apply }) {
  const fetchRef = useRef(fetch);
  const applyRef = useRef(apply);
  fetchRef.current = fetch;
  applyRef.current = apply;

  const seen = useRef(undefined);
  const latest = useRef(0);
  const running = useRef(0);
  const [checkedAt, setCheckedAt] = useState(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async (opts = {}) => {
    const seq = ++latest.current;
    running.current += 1;
    try {
      let version = null;
      try {
        version = (await changesAPI.get([area]))?.[area] ?? null;
      } catch {
        // Unknown version: the next check will differ from it and fetch again.
      }
      const data = await fetchRef.current(opts);
      if (seq !== latest.current) return;
      applyRef.current(data, opts);
      seen.current = version;
      setCheckedAt(new Date());
      setFailed(false);
    } catch (err) {
      if (seq === latest.current) setFailed(true);
      throw err;
    } finally {
      running.current -= 1;
    }
  }, [area]);

  useEffect(() => subscribe({
    area,
    onVersions: (versions) => {
      if (!(area in versions)) return;
      if (running.current) return;
      if (versions[area] === seen.current) {
        setCheckedAt(new Date());
        setFailed(false);
        return;
      }
      reload({ background: true }).catch(() => {});
    },
    onFailure: () => setFailed(true),
  }), [area, reload]);

  useRefetchOnFocus(() => reload({ background: true }).catch(() => {}));

  return { reload, checkedAt, failed };
}
