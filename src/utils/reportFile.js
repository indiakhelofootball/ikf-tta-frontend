// Shared by the staff report form and the funder portal so both apply the
// limits the backend enforces (csr/report_files.py) and open a file one way.

export const REPORT_FILE_MAX_BYTES = 15 * 1024 * 1024;

export const REPORT_FILE_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
];

export const REPORT_FILE_ACCEPT = REPORT_FILE_EXTENSIONS.map((e) => `.${e}`).join(',');

const VIEWABLE = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export function reportFileError(file) {
  if (!file) return '';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!file.name.includes('.') || !REPORT_FILE_EXTENSIONS.includes(ext)) {
    return 'Upload a PDF, image (PNG, JPG, WEBP), Word, Excel or PowerPoint file.';
  }
  if (file.size === 0) return 'The file is empty.';
  if (file.size > REPORT_FILE_MAX_BYTES) return 'The file is larger than 15 MB.';
  return '';
}

export function formatFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// PDFs and images open in a new tab; anything else, or a blocked pop-up, is
// saved as a download.
export function openDownloadedFile({ blob, contentType, fileName }, fallbackName = 'report') {
  const url = URL.createObjectURL(blob);
  const viewable = VIEWABLE.some((t) => (contentType || '').startsWith(t));
  // Not 'noopener': with it window.open always returns null, and a blocked
  // pop-up could not be told apart from an opened one. The opener is cut here.
  const opened = viewable ? window.open(url, '_blank') : null;
  if (opened) {
    opened.opener = null;
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
