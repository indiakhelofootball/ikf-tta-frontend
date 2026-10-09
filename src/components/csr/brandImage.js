// What happens to a logo before it is uploaded. Logos arrive with transparent
// or white margins of every size, and the portal fits each one into the same
// fixed box, so a margin left in place makes that funder's logo look smaller
// than the next one. The margin is cut here, in the browser, and the result is
// checked against the box.

export const LOGO_BOX = { width: 168, height: 40 };
const MAX_LOGO_BYTES = 1024 * 1024;
const MAX_LOGIN_IMAGE_BYTES = 4 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const isBlank = (d, i) => d[i + 3] < 10 || (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245);

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be read.')); };
    img.src = url;
  });
}

// The notes the form shows under the logo: what was done, and what will look
// wrong. Pure, so the rules can be tested without a canvas.
export function logoNotes({ width, height, trimmed }) {
  const notes = [];
  if (trimmed) notes.push({ level: 'info', text: 'Empty edges were trimmed.' });
  if (height < LOGO_BOX.height * 2) {
    notes.push({ level: 'warn', text: `Only ${height} px tall after trimming, so it may look blurry. Use a version at least ${LOGO_BOX.height * 2} px tall.` });
  }
  if (width / height > 6) {
    notes.push({ level: 'warn', text: 'Very wide: it will be small in the header. A shorter version of the logo works better.' });
  }
  return notes;
}

export function checkImageFile(file, kind) {
  if (!file) return 'Choose an image.';
  if (!TYPES.includes(file.type)) return 'Upload a PNG, JPG or WEBP image.';
  const max = kind === 'logo' ? MAX_LOGO_BYTES : MAX_LOGIN_IMAGE_BYTES;
  if (file.size > max) return kind === 'logo' ? 'The logo is larger than 1 MB. Export a smaller version.' : 'The login image is larger than 4 MB. Export a smaller version.';
  return '';
}

// Returns { file, width, height, trimmed }. Where a canvas is not available
// the original file is kept untrimmed.
export async function trimLogo(file) {
  const { img, url } = await loadImage(file);
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx || !w || !h) return { file, width: w, height: h, trimmed: false };
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    let top = h; let left = w; let right = -1; let bottom = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (!isBlank(d, (y * w + x) * 4)) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    if (right < left || bottom < top) return { file, width: w, height: h, trimmed: false };
    const tw = right - left + 1;
    const th = bottom - top + 1;
    if (tw >= w - 2 && th >= h - 2) return { file, width: w, height: h, trimmed: false };
    const out = document.createElement('canvas');
    out.width = tw;
    out.height = th;
    out.getContext('2d').drawImage(canvas, left, top, tw, th, 0, 0, tw, th);
    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    if (!blob) return { file, width: w, height: h, trimmed: false };
    const name = file.name.replace(/\.[^.]+$/, '') + '.png';
    return { file: new File([blob], name, { type: 'image/png' }), width: tw, height: th, trimmed: true };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 'DLF Foundation' -> 'dlf'. Words that every funder name carries are dropped
// so the link stays short.
export function suggestSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(foundation|trust|limited|ltd|pvt|private|csr)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
