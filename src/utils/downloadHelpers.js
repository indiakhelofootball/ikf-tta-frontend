/**
 * Auto-named file download utilities for REP documents.
 */

async function downloadFile(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
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
 * Download Logo with auto-naming: <city>-<REP Name>-Logo.<ext>
 */
export function downloadLogo(rep, city) {
  if (!rep.repLogoUrl) return;
  const ext = getExt(rep.repLogoName, 'png');
  const filename = `${sanitize(city)}-${sanitize(rep.repName)}-Logo.${ext}`;
  return downloadFile(rep.repLogoUrl, filename);
}

/**
 * Download MOU with auto-naming: MOU-<season>-<project>-<city>.<ext>
 * (No trailing "-MOU" before the extension — file type is already implied by .pdf.)
 */
export function downloadMOU(rep, assignment) {
  if (!rep.mouDocumentUrl) return;
  const ext = getExt(rep.mouDocumentName, 'pdf');
  const season = sanitize(assignment.trialSeason);
  const project = sanitize(assignment.trialType);
  const city = sanitize(assignment.city);
  const filename = `MOU-${season}-${project}-${city}.${ext}`;
  return downloadFile(rep.mouDocumentUrl, filename);
}