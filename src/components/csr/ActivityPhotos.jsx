import React, { useState, useEffect, useCallback } from 'react';

import { csrAPI } from '../../services/api';

const MAX_PHOTOS = 8;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Photos from one activity. They reach the funder's Overview (the latest photo
// large, then a tile per recent activity) only while the activity is Completed
// and visible to the funder, the same rule as the activity itself.
//
// Uploads go straight to the server rather than waiting for Save: the activity
// already exists, and a photo is its own record.
export default function ActivityPhotos({ activityId }) {
  const [photos, setPhotos] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await csrAPI.activityPhotos.list(activityId);
      setPhotos(Array.isArray(list) ? list : []);
    } catch {
      setError('Photos could not be loaded.');
    }
  }, [activityId]);

  useEffect(() => { load(); }, [load]);

  // Thumbnails are fetched with the operator's token, like every other file.
  useEffect(() => {
    let active = true;
    const made = [];
    photos.forEach((ph) => {
      csrAPI.activityPhotos.file(activityId, ph.id)
        .then(({ blob }) => {
          if (!active) return;
          const url = URL.createObjectURL(blob);
          made.push(url);
          setThumbs((t) => ({ ...t, [ph.id]: url }));
        })
        .catch(() => {});
    });
    return () => { active = false; made.forEach((u) => URL.revokeObjectURL(u)); };
  }, [activityId, photos]);

  const add = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError('');
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) {
      setError(room <= 0
        ? `An activity can carry up to ${MAX_PHOTOS} photos. Remove one first.`
        : `Only ${room} more photo${room === 1 ? '' : 's'} can be added to this activity.`);
      return;
    }
    const bad = files.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) {
      setError(!TYPES.includes(bad.type)
        ? `${bad.name}: upload a PNG, JPG or WEBP photo.`
        : `${bad.name} is larger than 4 MB. Export a smaller version.`);
      return;
    }
    setBusy(true);
    try {
      let latest = photos;
      for (const f of files) {
        // eslint-disable-next-line no-await-in-loop
        latest = await csrAPI.activityPhotos.upload(activityId, f);
      }
      setPhotos(Array.isArray(latest) ? latest : photos);
    } catch (err) {
      setError(err.message || 'The photo could not be uploaded.');
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ph) => {
    setBusy(true);
    setError('');
    try {
      await csrAPI.activityPhotos.remove(activityId, ph.id);
      setPhotos((list) => list.filter((x) => x.id !== ph.id));
    } catch (err) {
      setError(err.message || 'The photo could not be removed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aphotos">
      {photos.length > 0 && (
        <ul className="aphotos-grid" aria-label="Activity photos">
          {photos.map((ph) => (
            <li key={ph.id} className="aphoto">
              {thumbs[ph.id] ? <img src={thumbs[ph.id]} alt={ph.name} /> : <span className="aphoto-ph" />}
              <button type="button" className="ghostbtn aphoto-x" onClick={() => remove(ph)} disabled={busy} aria-label={`Remove ${ph.name}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className={`ghostbtn aphotos-add${busy || photos.length >= MAX_PHOTOS ? ' is-off' : ''}`}>
        {busy ? 'Uploading…' : 'Add photos'}
        <input
          type="file" accept="image/png,image/jpeg,image/webp" multiple hidden
          aria-label="Add activity photos" onChange={add} disabled={busy || photos.length >= MAX_PHOTOS}
        />
      </label>
      <p className={`pform-help${error ? ' bad' : ''}`} role={error ? 'alert' : undefined}>
        {error || `${photos.length} of ${MAX_PHOTOS}. PNG, JPG or WEBP, up to 4 MB each. The funder sees them once the activity is Completed and shown to them.`}
      </p>
    </div>
  );
}
