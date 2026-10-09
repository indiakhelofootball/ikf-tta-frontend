import { logoNotes, checkImageFile, suggestSlug } from './brandImage';

const file = (type, size) => ({ type, size, name: 'x' });

test('only PNG, JPG and WEBP are accepted, within each kind of limit', () => {
  expect(checkImageFile(file('image/svg+xml', 10), 'logo')).toBe('Upload a PNG, JPG or WEBP image.');
  expect(checkImageFile(file('image/png', 1024 * 1024 + 1), 'logo')).toMatch(/1 MB/);
  expect(checkImageFile(file('image/png', 1024 * 1024 + 1), 'login-image')).toBe('');
  expect(checkImageFile(file('image/jpeg', 4 * 1024 * 1024 + 1), 'login-image')).toMatch(/4 MB/);
  expect(checkImageFile(file('image/webp', 2000), 'logo')).toBe('');
});

test('a logo that is too small or too wide for the box is flagged; a good one is not', () => {
  expect(logoNotes({ width: 400, height: 120, trimmed: false })).toEqual([]);
  expect(logoNotes({ width: 400, height: 120, trimmed: true })).toEqual([{ level: 'info', text: 'Empty edges were trimmed.' }]);
  expect(logoNotes({ width: 60, height: 30, trimmed: false })[0].level).toBe('warn');
  expect(logoNotes({ width: 1400, height: 100, trimmed: false })[0].text).toMatch(/Very wide/);
});

test('the suggested link drops the words every funder name carries', () => {
  expect(suggestSlug('DLF Foundation')).toBe('dlf');
  expect(suggestSlug('Vardhman Steel CSR Trust')).toBe('vardhman-steel');
  expect(suggestSlug('  Tata  Trusts ')).toBe('tata-trusts');
});
