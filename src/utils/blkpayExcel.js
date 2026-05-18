/**
 * IDFC FIRST Bank bulk payment Excel (BLKPAY-style) — pure ExcelJS workbook builder.
 * Used by PaymentManagementPage and automated parity tests.
 */
import ExcelJS from 'exceljs';

/**
 * @param {Array<Record<string, unknown>>} records Payment rows (vendorName, accountNumber, ifscCode, netAmount, email, serviceDescription, …)
 * @param {{ valueDate?: Date }} [options] Pass valueDate for deterministic tests (defaults to today).
 * @returns {ExcelJS.Workbook}
 */
export function buildBlkpayWorkbook(records, options = {}) {
  const valueDate = options.valueDate instanceof Date ? options.valueDate : new Date();
  const ddmmyyyy = `${String(valueDate.getDate()).padStart(2, '0')}/${String(valueDate.getMonth() + 1).padStart(2, '0')}/${valueDate.getFullYear()}`;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
  const instrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEEBF7' } };

  const headers = [
    'Beneficiary Name',
    'Beneficiary Account Number',
    'IFSC',
    'Transaction Type',
    'Debit Account Number',
    'Transaction Date',
    'Amount',
    'Currency',
    'Beneficiary Email ID',
    'Remarks',
    'Custom Header \u2013 1',
    'Custom Header \u2013 2',
    'Custom Header \u2013 3',
    'Custom Header \u2013 4',
    'Custom Header \u2013 5',
    'Errors',
  ];
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  headerRow.height = 38;

  const instructions = [
    'Enter beneficiary name.\r\nMANDATORY',
    'Enter beneficiary account number. \r\nThis can be IDFC FIRST Bank account or other Bank account.\r\nMANDATORY',
    'Enter beneficiary bank IFSC code. Required only for Inter bank (NEFT/RTGS) payment.',
    'Enter payment type:\r\nIFT - Within Bank payment\r\nNEFT - Inter-Bank(NEFT) payment\r\nRTGS - Inter-Bank(RTGS) payment\r\nMANDATORY',
    'Enter debit account number. This should be IDFC FIRST Bank account only. User should have access to do transaction on this account',
    'Enter transaction value date. Should be today\'s date or future date.\r\nMANDATORY\r\nDD/MM/YYYY format',
    'Enter payment amount.\r\nMANDATORY',
    'Enter transaction currency. Should be INR only.\r\nMANDATORY',
    'Enter beneficiary email id\r\nOPTIONAL',
    'Enter remarks\r\nOPTIONAL',
    'Credit Advice:\r\nEnter Custom Info -1\r\nNote: Header label is editable in Row 1\r\nOPTIONAL',
    'Credit Advice:\r\nEnter Custom Info -2\r\nNote: Header label is editable in Row 1\r\nOPTIONAL',
    'Credit Advice:\r\nEnter Custom Info -3\r\nNote: Header label is editable in Row 1\r\nOPTIONAL',
    'Credit Advice:\r\nEnter Custom Info -4\r\nNote: Header label is editable in Row 1\r\nOPTIONAL',
    'Credit Advice:\r\nEnter Custom Info -5\r\nNote: Header label is editable in Row 1\r\nOPTIONAL',
    null, // P2 — blank cell (matches reference)
  ];
  const instrRow = ws.addRow(instructions);
  instrRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = instrFill;
    cell.font = { size: 9 };
    cell.alignment = { vertical: 'top', wrapText: true };
  });
  instrRow.height = 110;

  records.forEach((r) => {
    ws.addRow([
      r.accountHolderName || r.vendorName || '',
      r.accountNumber || '',
      r.ifscCode || '',
      'NEFT',
      '10064068880',
      ddmmyyyy,
      parseFloat(r.netAmount) || 0,
      'INR',
      r.email || '',
      r.serviceDescription || r.vendorName || '',
      '',
      '',
      '',
      '',
      '',
      null,
    ]);
  });

  const lastDataRow = 2 + records.length;
  for (let R = 3; R <= lastDataRow; R++) {
    const row = ws.getRow(R);
    for (let C = 1; C <= 16; C++) {
      if (C === 7) {
        row.getCell(C).numFmt = '0.00';
      } else {
        row.getCell(C).numFmt = '@';
      }
    }
  }
  ws.getRow(1).getCell(2).numFmt = '@';
  ws.getRow(2).getCell(2).numFmt = '@';

  return wb;
}
