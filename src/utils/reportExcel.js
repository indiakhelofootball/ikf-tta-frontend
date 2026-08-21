/**
 * Shared .xlsx writer for the four report screens.
 *
 * Extracted from PaymentAuditReport's exportExcel so TrialsReport,
 * TrialSpendReport and VendorAuditReport get the same sheet without three
 * more copies of the same ExcelJS boilerplate.
 *
 * The workbook-building half (buildReportWorkbook) is pure and testable in
 * node; only downloadWorkbook touches the DOM.
 */

import ExcelJS from 'exceljs';

/** Indian lakh/crore grouping — Excel's equivalent of the app's fmtINR. */
export const INR_NUM_FMT = '##,##,##0.00';

/** Matches the on-screen fmtDate (`02 Aug 2026`) closely enough to read the same. */
export const DATE_NUM_FMT = 'dd-mmm-yyyy';

/** Forces Excel to leave a cell alone: no numeric coercion, no lost leading zeros. */
const TEXT_NUM_FMT = '@';

const MIN_COL_WIDTH = 10;
const MAX_COL_WIDTH = 50;
const WIDTH_SAMPLE_ROWS = 200;

/**
 * Column types.
 * - text    plain string
 * - code    identifier-shaped string (PIN, phone, PAN, trial code, account no.)
 *           written as text so "062501" never becomes 62501
 * - money   real number, INR number format — sortable and summable in Excel
 * - number  real number, general format (decimals kept)
 * - integer real number, no decimals (counts: WOs, PRs, bounces)
 * - date    real date cell, so date sort and date filters work
 */
const TYPES = ['text', 'code', 'money', 'number', 'integer', 'date'];

const isBlank = (v) => v === null || v === undefined || v === '';

/** Strict: only a bare numeric literal converts. Anything else stays a string. */
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && NUMERIC_RE.test(value.trim())) {
    const n = parseFloat(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Dates are pinned to local noon. ExcelJS serialises a JS Date through the
 * local timezone, so a `2026-08-19T00:00:00Z` value can land on the 18th for
 * anyone west of UTC. Noon has 12 hours of slack in both directions.
 */
function toDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || value.trim() === '') return null;
  const iso = ISO_DATE_RE.exec(value.trim());
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0,
  );
}

/** `'Vendor'` or `{ header, type, width }` → a settled column descriptor. */
function normaliseColumn(col) {
  if (typeof col === 'string') return { header: col, type: 'text', width: null };
  const type = TYPES.includes(col?.type) ? col.type : 'text';
  return {
    header: String(col?.header ?? ''),
    type,
    width: typeof col?.width === 'number' ? col.width : null,
  };
}

/**
 * Applies a column's declared type to one cell.
 *
 * Honest fallback: if a value declared `money` or `date` cannot be converted
 * without guessing, it is written as the original string. A wrong number is
 * worse than an unsortable one.
 */
function writeCell(cell, value, type) {
  if (isBlank(value)) {
    cell.value = null;
    if (type === 'code') cell.numFmt = TEXT_NUM_FMT;
    return;
  }

  switch (type) {
    case 'money': {
      const n = toNumber(value);
      if (n === null) { cell.value = String(value); return; }
      cell.value = n;
      cell.numFmt = INR_NUM_FMT;
      cell.alignment = { horizontal: 'right' };
      return;
    }
    case 'integer': {
      const n = toNumber(value);
      if (n === null) { cell.value = String(value); return; }
      cell.value = n;
      cell.numFmt = '0';
      cell.alignment = { horizontal: 'right' };
      return;
    }
    case 'number': {
      const n = toNumber(value);
      if (n === null) { cell.value = String(value); return; }
      cell.value = n;
      cell.alignment = { horizontal: 'right' };
      return;
    }
    case 'date': {
      const d = toDate(value);
      if (d === null) { cell.value = String(value); return; }
      cell.value = d;
      cell.numFmt = DATE_NUM_FMT;
      return;
    }
    case 'code':
      cell.value = String(value);
      cell.numFmt = TEXT_NUM_FMT;
      return;
    case 'text':
    default:
      cell.value = String(value);
  }
}

/** Rough display length, used only to size columns. */
function displayLength(value, type) {
  if (isBlank(value)) return 0;
  if (type === 'date') return toDate(value) ? 11 : String(value).length;
  if (type === 'money') {
    const n = toNumber(value);
    return n === null ? String(value).length : Math.round(n).toString().length + 6;
  }
  return String(value).length;
}

function autoWidth(column, index, rows) {
  if (column.width) return column.width;
  let longest = column.header.length;
  const limit = Math.min(rows.length, WIDTH_SAMPLE_ROWS);
  for (let i = 0; i < limit; i += 1) {
    const len = displayLength(rows[i]?.[index], column.type);
    if (len > longest) longest = len;
  }
  return Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, longest + 2));
}

/**
 * Builds the workbook. No DOM — safe to call from node or a test.
 *
 * @param {Object}   opts
 * @param {string}   opts.sheetName  worksheet tab name
 * @param {Array}    opts.columns    strings, or { header, type, width } objects
 * @param {Array[]}  opts.rows       array of arrays, aligned to columns
 * @param {string}  [opts.summary]   one bold line above the header
 * @param {Array}   [opts.totals]    optional bold footer row, same shape as a row
 * @returns {ExcelJS.Workbook}
 */
export function buildReportWorkbook({
  sheetName,
  columns,
  rows,
  summary,
  totals,
}) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('buildReportWorkbook: columns is required');
  }
  const cols = columns.map(normaliseColumn);
  const dataRows = Array.isArray(rows) ? rows : [];

  // Shape guard. writeCell below walks the COLUMNS, so a row carrying more
  // values than there are columns loses its tail and a row carrying fewer is
  // padded with blanks -- either way Excel opens without complaint and every
  // field after the mismatch reads under the wrong heading. A 10-column header
  // over 11-column rows was one edit away from shipping exactly that. Four
  // report screens share this writer, so the check belongs here, once, rather
  // than as a habit repeated in each of them. Loud failure beats quiet
  // corruption: a broken export is noticed, a shifted one is believed.
  const badRow = dataRows.findIndex((r) => !Array.isArray(r) || r.length !== cols.length);
  if (badRow !== -1) {
    const got = Array.isArray(dataRows[badRow]) ? dataRows[badRow].length : 'a non-array';
    throw new Error(
      `buildReportWorkbook: row ${badRow} has ${got} values but ${cols.length} columns are declared`
    );
  }

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet(String(sheetName || 'Report').slice(0, 31));

  if (summary) {
    const summaryRow = ws.addRow([String(summary)]);
    summaryRow.getCell(1).font = { bold: true };
  }

  const headerRow = ws.addRow(cols.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { bottom: { style: 'thin' } };
  });
  headerRow.height = 22;

  dataRows.forEach((row) => {
    const excelRow = ws.addRow([]);
    cols.forEach((col, i) => {
      writeCell(excelRow.getCell(i + 1), Array.isArray(row) ? row[i] : undefined, col.type);
    });
    excelRow.commit?.();
  });

  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = autoWidth(col, i, dataRows);
  });

  if (Array.isArray(totals) && totals.length > 0) {
    const totalsRow = ws.addRow([]);
    cols.forEach((col, i) => {
      writeCell(totalsRow.getCell(i + 1), totals[i], col.type);
    });
    totalsRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.border = { top: { style: 'thin' } };
    });
  }

  // Freeze everything above and including the header, and let Excel filter the
  // data block — the whole point of shipping xlsx instead of csv.
  ws.views = [{ state: 'frozen', ySplit: headerRow.number }];
  if (dataRows.length > 0) {
    ws.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number + dataRows.length, column: cols.length },
    };
  }

  return wb;
}

/** The browser half: turn a workbook into a download. Needs a DOM. */
export async function downloadWorkbook(wb, fileName) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** `trial_spend` → `trial_spend_2026-08-19.xlsx` */
export function datedFileName(base) {
  return `${base}_${new Date().toISOString().slice(0, 10)}.xlsx`;
}

/**
 * Build and download in one call — what the report screens use.
 *
 * @param {Object} opts  everything buildReportWorkbook takes, plus:
 * @param {string} opts.fileName  full name including .xlsx
 */
export async function exportReportExcel(opts) {
  const { fileName, ...rest } = opts;
  const wb = buildReportWorkbook(rest);
  await downloadWorkbook(wb, fileName || datedFileName('report'));
}

export default exportReportExcel;
