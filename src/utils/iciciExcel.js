/**
 * ICICI Bank NPAB bulk payment — NPAB_FMT_DDMMYY.xls
 *
 * Loads /templates/NPAB_FMT_DDMMYY.xls as the base workbook and writes
 * payment data into it preserving all template details (PAB_VENDOR/NEFT/
 * debit account values pre-filled in cols A/B/C, header row, empty padding
 * out to col IS).
 *
 * Each record fills cols D–M of one row starting at row 2.
 * PYMT_DATE (col M) auto-fills today's DDMMYY.
 */
import * as XLSX from 'xlsx';

const TEMPLATE_URL = `${process.env.PUBLIC_URL || ''}/templates/NPAB_FMT_DDMMYY.xls`;

const DEFAULT_PROD_TYPE = 'PAB_VENDOR';
const DEFAULT_MODE = 'NEFT';
const DEFAULT_DEBIT_ACC = '092701004321';

function todayDDMMYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

function todayDDMMYYYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function setCell(ws, addr, value, type = 's') {
  ws[addr] = { t: type, v: value };
}

export async function buildIciciXlsBuffer(records) {
  const dateStr = todayDDMMYY();
  const pymtDate = todayDDMMYYYY();

  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) {
    throw new Error(`Failed to load NPAB template: ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array', cellStyles: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const currentRange = XLSX.utils.decode_range(ws['!ref']);
  const lastCol = currentRange.e.c;
  const templateLastRow = currentRange.e.r;

  // Clear all data rows from template (rows 2..templateLastRow) so leftover
  // pre-filled sample rows don't bleed into the output.
  for (let r = 1; r <= templateLastRow; r++) {
    for (let c = 0; c <= lastCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (ws[addr]) delete ws[addr];
    }
  }

  records.forEach((r, idx) => {
    const row = idx + 2;
    setCell(ws, `A${row}`, DEFAULT_PROD_TYPE);
    setCell(ws, `B${row}`, DEFAULT_MODE);
    setCell(ws, `C${row}`, DEFAULT_DEBIT_ACC);
    setCell(ws, `D${row}`, r.accountHolderName || r.vendorName || '');
    setCell(ws, `E${row}`, r.accountNumber || '');
    setCell(ws, `F${row}`, r.ifscCode || '');
    setCell(ws, `G${row}`, parseFloat(r.netAmount) || 0, 'n');
    setCell(ws, `H${row}`, r.serviceDescription || r.vendorName || '');
    setCell(ws, `I${row}`, r.serviceDescription || r.vendorName || '');
    setCell(ws, `M${row}`, pymtDate);
  });

  const lastRow = Math.max(2, records.length + 1);
  ws['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: lastCol, r: lastRow - 1 },
  });

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return { buffer, dateStr };
}
