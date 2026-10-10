/**
 * Auto-named file download utilities for REP documents.
 */

/**
 * Save a Blob the browser already holds under the given filename.
 */
export function saveBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

async function downloadFile(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    saveBlob(blob, filename);
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

function getExt(fileName, fallback = 'pdf') {
  if (!fileName) return fallback;
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : fallback;
}

function sanitize(str) {
  return (str || '').replace(/[/\\?%*:|"<>]/g, '-').trim();
}

/**
 * Logo file name: <city>-<REP Name>-Logo.<ext>
 */
export function logoFileName(rep, city) {
  const ext = getExt(rep.repLogoName, 'png');
  return `${sanitize(city)}-${sanitize(rep.repName)}-Logo.${ext}`;
}

/**
 * Download Logo with auto-naming: <city>-<REP Name>-Logo.<ext>
 */
export function downloadLogo(rep, city) {
  if (!rep.repLogoUrl) return;
  return downloadFile(rep.repLogoUrl, logoFileName(rep, city));
}

/**
 * MOU file name: MOU-<season>-<project>-<city>.<ext>
 * (No trailing "-MOU" before the extension — file type is already implied by .pdf.)
 */
export function mouFileName(rep, assignment) {
  const ext = getExt(rep.mouDocumentName, 'pdf');
  const season = sanitize(assignment.trialSeason);
  const project = sanitize(assignment.trialType);
  const city = sanitize(assignment.city);
  return `MOU-${season}-${project}-${city}.${ext}`;
}

/**
 * Download MOU with auto-naming (see mouFileName).
 */
export function downloadMOU(rep, assignment) {
  if (!rep.mouDocumentUrl) return;
  return downloadFile(rep.mouDocumentUrl, mouFileName(rep, assignment));
}