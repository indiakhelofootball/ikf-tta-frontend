/**
 * Full-details companion Excel — downloaded alongside BLKPAY.
 * Contains every payment + work order + vendor field for internal records / audit.
 * The BLKPAY file is schema-locked (IDFC 16-column format); this one is not.
 */
import ExcelJS from 'exceljs';

const HEADERS = [
  'Request ID', 'Status', 'Invoice Date', 'Period',
  'Work Order No.', 'WO Type', 'Project Ref',
  'Vendor Name', 'Service Type', 'PAN', 'GST', 'TDS Type',
  'Account Holder Name', 'Bank Name', 'Account Type', 'Account Number', 'IFSC',
  'Gross Amount', 'TDS Rate (%)', 'TDS Amount', 'Net Amount',
  'Notes',
];

export function buildFullDetailsWorkbook(records) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Payment Details');

  const headerRow = ws.addRow(HEADERS);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B63D3' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF4338CA' } } };
  });
  headerRow.height = 22;

  records.forEach((r) => {
    ws.addRow([
      r.requestNumber || r.id || '',
      r.status || '',
      r.invoiceDate || '',
      r.periodLabel || '',
      r.workOrderNumber || '',
      r.woType || '',
      r.projectRef || '',
      r.vendorName || '',
      r.vendorType || '',
      r.panNumber || '',
      r.gstNumber || '',
      r.tdsType || '',
      r.accountHolderName || '',
      r.bankName || '',
      r.accountType || '',
      r.accountNumber || '',
      r.ifscCode || '',
      parseFloat(r.grossAmount) || 0,
      parseFloat(r.tdsRate) || 0,
      parseFloat(r.tdsAmount) || 0,
      parseFloat(r.netAmount) || 0,
      r.notes || '',
    ]);
  });

  const widths = [14, 16, 12, 14, 16, 10, 22, 24, 16, 14, 18, 14, 24, 22, 14, 20, 14, 14, 12, 14, 14, 28];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const moneyCols = [18, 20, 21];
  const rateCol = 19;
  const lastRow = 1 + records.length;
  for (let R = 2; R <= lastRow; R++) {
    moneyCols.forEach((C) => { ws.getRow(R).getCell(C).numFmt = '#,##0.00'; });
    ws.getRow(R).getCell(rateCol).numFmt = '0.00';
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Totals row
  if (records.length > 0) {
    const totalsRow = ws.addRow([
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'TOTALS',
      records.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0),
      '',
      records.reduce((s, r) => s + (parseFloat(r.tdsAmount) || 0), 0),
      records.reduce((s, r) => s + (parseFloat(r.netAmount) || 0), 0),
      '',
    ]);
    totalsRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    });
    [18, 20, 21].forEach((C) => { totalsRow.getCell(C).numFmt = '#,##0.00'; });
  }

  return wb;
}
