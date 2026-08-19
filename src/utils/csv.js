/**
 * CSV construction for every export in the app.
 *
 * Excel does not read the charset out of a Blob's MIME type. When a user
 * double-clicks a downloaded .csv it decodes using the system codepage, so a
 * UTF-8 file arrives garbled on any non-UTF-8 Windows locale — rupee symbols
 * and accented city or REP names turn to mojibake. A leading byte order mark
 * is the only in-band signal that makes Excel pick UTF-8, which is why the
 * blob helper below prepends one and no caller builds its own blob.
 */

const BOM = '\uFEFF';

/**
 * Quote every cell unconditionally rather than only when it contains a
 * delimiter. Excel still parses a quoted run of digits as a number, so
 * amount columns keep summing, and unconditional quoting removes the chance
 * of a new column being added without anyone noticing it needed escaping.
 */
const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/**
 * Rows in, RFC 4180 text out. CRLF terminators keep an embedded newline
 * inside a quoted field unambiguous against the row separator.
 */
export function buildCSV(rows) {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function csvBlob(rows) {
  return new Blob([BOM + buildCSV(rows)], { type: 'text/csv;charset=utf-8;' });
}
