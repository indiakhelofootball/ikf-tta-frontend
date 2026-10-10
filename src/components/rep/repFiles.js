// A REP's logo and MoU, for rows that carry them and rows that do not.
//
// Full rows (REPSerializer: one REP, the Add REP name search) hold the stored
// value in repLogoUrl / mouDocumentUrl. Slim rows (REP Management list, REP
// report) leave the file out and carry, from the backend's REPSlimSerializer:
//   hasLogo / hasMou              present under the report's rule
//   repLogoText / mouDocumentText the stored value when it is NOT an uploaded
//                                 file (a bare filename, a link, whitespace),
//                                 '' when it is one or nothing is stored
//
// storedFile() answers, for either shape, what the screens used to ask of the
// old value:
//   shown  the old value was truthy (every `rep.repLogoUrl && ...` tested this)
//   value  the old value, when the row still has it
//   fetch  an uploaded file, fetched on use from /reps/<id>/logo/ or /mou/
import { useCallback, useEffect, useState } from 'react';
import { repAPI } from '../../services/api';
import {
  downloadLogo, downloadMOU, saveBlob, logoFileName, mouFileName,
} from '../../utils/downloadHelpers';

const KEYS = {
  logo: { url: 'repLogoUrl', text: 'repLogoText', has: 'hasLogo' },
  mou: { url: 'mouDocumentUrl', text: 'mouDocumentText', has: 'hasMou' },
};

export function storedFile(rep, kind) {
  const keys = KEYS[kind];
  if (!rep) return { shown: false, value: '', fetch: false };
  if (Object.prototype.hasOwnProperty.call(rep, keys.url)) {
    const value = rep[keys.url] || '';
    return { shown: !!value, value, fetch: false };
  }
  const text = rep[keys.text] || '';
  if (text) return { shown: true, value: text, fetch: false };
  if (rep[keys.has]) return { shown: true, value: '', fetch: true };
  return { shown: false, value: '', fetch: false };
}

// What to display for one file: { status, src, retry }.
//   'none'    nothing stored: render exactly what the screen rendered before
//   'ready'   src is the old value, or an object URL of the fetched file
//   'loading' / 'error'  the owner-approved states; retry refetches this file
//   'idle'    an uploaded file not asked for yet (enabled is false)
// Fetched on mount and whenever the REP's updatedAt changes; nothing is kept
// once the component goes away.
// asText: src is the file as the data-URI text the row used to carry, for a
// screen that printed the stored value rather than linking to it.
const readAsDataUri = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export function useStoredFile(rep, kind, enabled = true, { asText = false } = {}) {
  const file = storedFile(rep, kind);
  const id = rep ? rep.id : null;
  const updatedAt = rep ? rep.updatedAt : null;
  const wanted = file.fetch && enabled;
  const [attempt, setAttempt] = useState(0);
  const key = `${id}|${kind}|${updatedAt}|${attempt}`;
  const [loaded, setLoaded] = useState({ key: '', status: 'loading', url: '' });

  useEffect(() => {
    if (!wanted) return undefined;
    let cancelled = false;
    let objectUrl = '';
    repAPI.getFileBlob(id, kind, updatedAt)
      .then((blob) => (asText ? readAsDataUri(blob) : blob))
      .then((result) => {
        if (cancelled) return;
        if (asText) {
          setLoaded({ key, status: 'ready', url: result });
          return;
        }
        objectUrl = URL.createObjectURL(result);
        setLoaded({ key, status: 'ready', url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, status: 'error', url: '' });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [wanted, id, kind, updatedAt, key, asText]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!file.shown) return { status: 'none', src: '', retry };
  if (!file.fetch) return { status: 'ready', src: file.value, retry };
  if (!enabled) return { status: 'idle', src: '', retry };
  if (loaded.key !== key) return { status: 'loading', src: '', retry };
  return { status: loaded.status, src: loaded.url, retry };
}

// Download one file under the same name the report has always used. A value
// still on the row goes through the old helper exactly as before; an uploaded
// file is fetched now, at the click. Rejects when that fetch fails.
export async function downloadRepFile(rep, kind) {
  const file = storedFile(rep, kind);
  const assignments = rep.cityAssignments || [];
  const city = [...new Set(assignments.map((a) => a.city).filter(Boolean))][0] || rep.repName;
  const assignment = assignments[0] || {};
  if (!file.fetch) {
    if (kind === 'logo') return downloadLogo({ ...rep, repLogoUrl: file.value }, city);
    return downloadMOU({ ...rep, mouDocumentUrl: file.value }, assignment);
  }
  const blob = await repAPI.getFileBlob(rep.id, kind, rep.updatedAt);
  saveBlob(blob, kind === 'logo' ? logoFileName(rep, city) : mouFileName(rep, assignment));
  return undefined;
}
