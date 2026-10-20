// src/utils/rowChanges.js
// Which rows of a freshly fetched list are new, and which changed, compared
// with the list on screen. Used to highlight what a background reload brought.
//
// Only the keys the fresh row carries are compared. A row on screen can hold
// more than the list sends -- after a save the page puts the server's DETAIL
// response in its place, which adds fields the list leaves out -- and those
// extra keys must not make an unchanged row look changed.
export function diffRows(prev, next, key = 'id') {
  const before = new Map((prev || []).map((row) => [row[key], row]));
  const added = new Set();
  const changed = new Set();
  (next || []).forEach((row) => {
    const old = before.get(row[key]);
    if (!old) {
      added.add(row[key]);
      return;
    }
    const differs = Object.keys(row).some(
      (k) => JSON.stringify(row[k]) !== JSON.stringify(old[k])
    );
    if (differs) changed.add(row[key]);
  });
  return { added, changed };
}
