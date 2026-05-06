/**
 * ICICI Bank NPAB bulk payment workbook — ExcelJS builder.
 *
 * Built to match _docs/excel/NPAB_FMT_DDMMYY.xls exactly:
 *  - 19 headers (A:S) with the bank's original cell-comment guidance
 *  - column widths from the template (col A wide, B-S equal)
 *  - tall header row with wrap-text alignment
 *  - PAB_VENDOR / NEFT / 092701004321 prefilled in cols A/B/C of each data row
 *  - sheet protection: all cells locked, sheet protected (no password)
 *  - PYMT_DATE in col M as DD-MM-YYYY string per template instruction
 *
 * Output is .xlsx. Filename in the caller is NPAB_FMT_<DDMMYY>.xlsx.
 */
import ExcelJS from 'exceljs';

const DEFAULT_PROD_TYPE = 'PAB_VENDOR';
const DEFAULT_MODE = 'NEFT';
const DEFAULT_DEBIT_ACC = '092701004321';

// [header label, cell comment from bank's template]
const HEADERS = [
  ['PYMT_PROD_TYPE_CODE', 'Fixed Value: PAB_VENDOR (All in block letters)'],
  ['PYMT_MODE', 'Allowed values:\nFT, NEFT, RTGS, IMPS\n(All in block letters; FT: for Fund Transfer to ICICI Acc.; No special Characters)'],
  ['DEBIT_ACC_NO', 'Allowed values:\n12 digit ICICI Bank Account number; No special Characters'],
  ['BNF_NAME', 'Name of Beneficiary (No Special Characters; Max 500 Alphabetical Characters allowed)'],
  ['BENE_ACC_NO', 'Account number of Beneficiary (Max 32 Numeric Characters allowed only)'],
  ['BENE_IFSC', 'IFSC code of Beneficiary (Enter ICIC0000011 for FT; Alphanumeric only; No special characters)'],
  ['AMOUNT', 'Numeric value with decimal up to 2 places'],
  ['DEBIT_NARR', '30 Alphanumeric Characters; No special characters allowed'],
  ['CREDIT_NARR', '30 Alphanumeric Characters; No special characters allowed'],
  ['MOBILE_NUM', 'Mobile no of Bene.  10 Digit Numeric values allowed'],
  ['EMAIL_ID', 'Email Id of Bene.  500 Characters allowed'],
  ['REMARK', 'Non-Mandatory field (For Internal Use Only)'],
  ['PYMT_DATE', 'Date format DD-MM-YYYY'],
  ['REF_NO', 'Non-Mandatory field (30 Characters Alphanumeric Allowed)'],
  ['ADDL_INFO1', 'Non-Mandatory field (500 Characters Alphanumeric Allowed)'],
  ['ADDL_INFO2', 'Non-Mandatory field (500 Characters Alphanumeric Allowed)'],
  ['ADDL_INFO3', 'Non-Mandatory field (500 Characters Alphanumeric Allowed)'],
  ['ADDL_INFO4', 'Non-Mandatory field (500 Characters Alphanumeric Allowed)'],
  ['ADDL_INFO5', 'Non-Mandatory field (500 Characters Alphanumeric Allowed)'],
];

function todayDDMMYY() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getFullYear()).slice(-2)}`;
}

function todayDDMMYYYY() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

export async function buildIciciXlsBuffer(records) {
  const dateStr = todayDDMMYY();
  const pymtDate = todayDDMMYYYY();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');

  // Column widths from template: col A wider, B–S equal
  ws.columns = [
    { width: 27.17 },
    ...Array(18).fill({ width: 21.67 }),
  ];

  // Header row with cell comments
  const headerRow = ws.addRow(HEADERS.map(([label]) => label));
  headerRow.height = 90;
  headerRow.eachCell((cell, col) => {
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
    const note = HEADERS[col - 1] && HEADERS[col - 1][1];
    if (note) cell.note = note;
  });

  // Data rows
  records.forEach((r) => {
    const row = ws.addRow([
      DEFAULT_PROD_TYPE,
      DEFAULT_MODE,
      DEFAULT_DEBIT_ACC,
      r.accountHolderName || r.vendorName || '',
      r.accountNumber || '',
      r.ifscCode || '',
      parseFloat(r.netAmount) || 0,
      r.serviceDescription || r.vendorName || '',
      r.serviceDescription || r.vendorName || '',
      '',
      '',
      '',
      pymtDate,
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    row.getCell(7).numFmt = '0.00';
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      };
    });
  });

  // Sheet protection: every cell stays locked (default), sheet locked.
  // No password — this is structural lock, not security.
  await ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, dateStr };
}
