/**
 * Parity tests: generated BLKPAY workbook vs BLKPAY_070426.xlsx reference.
 * Column E is pre-filled with the TTA IDFC debit account 10064068880.
 */
import path from 'path';
import ExcelJS from 'exceljs';
import fs from 'fs';
import { buildBlkpayWorkbook } from './blkpayExcel';

const REFERENCE = path.join(process.cwd(), 'BLKPAY_070426.xlsx');

function normNewlines(s) {
  if (s == null) return s;
  return String(s).replace(/\r\n/g, '\n');
}

function cellText(cell) {
  const v = cell.value;
  if (v == null) return null;
  if (typeof v === 'object' && v.richText) {
    return v.richText.map((t) => t.text).join('');
  }
  return v;
}

function fillArgb(cell) {
  const f = cell.fill;
  if (!f || f.type !== 'pattern') return null;
  const fg = f.fgColor;
  if (fg && fg.argb) return fg.argb.toUpperCase();
  return null;
}

async function loadWorkbookFromFile(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  return wb;
}

async function loadGeneratedWorkbook(records, options) {
  const wb = buildBlkpayWorkbook(records, options);
  const buffer = await wb.xlsx.writeBuffer();
  const out = new ExcelJS.Workbook();
  await out.xlsx.load(buffer);
  return out.getWorksheet('Sheet1');
}

describe('buildBlkpayWorkbook — BLKPAY parity', () => {
  let refWs;

  beforeAll(async () => {
    if (!fs.existsSync(REFERENCE)) {
      throw new Error(`Missing reference file: ${REFERENCE}`);
    }
    const refWb = await loadWorkbookFromFile(REFERENCE);
    refWs = refWb.getWorksheet('Sheet1');
  });

  test('reference file is readable (row 1–2)', () => {
    expect(refWs).toBeTruthy();
    expect(refWs.rowCount).toBeGreaterThanOrEqual(3);
  });

  test('row 1 headers: text, blue fill #BDD7EE, bold; B1 numFmt @', async () => {
    const records = [
      {
        vendorName: 'X',
        accountNumber: '1',
        ifscCode: 'IFSC0001',
        netAmount: 1,
        email: '',
        serviceDescription: 'Scouting Fees',
      },
    ];
    const gen = await loadGeneratedWorkbook(records, { valueDate: new Date(2026, 3, 7) });

    for (let c = 1; c <= 16; c++) {
      const refCell = refWs.getRow(1).getCell(c);
      const genCell = gen.getRow(1).getCell(c);
      expect(cellText(genCell)).toBe(cellText(refCell));
      expect(fillArgb(genCell)).toBe('FFBDD7EE');
      expect(genCell.font && genCell.font.bold).toBe(true);
      if (c === 2) {
        expect(genCell.numFmt).toBe('@');
      }
    }
  });

  test('row 2 instructions: light blue fill #DEEBF7, normalized text matches reference', async () => {
    const records = [
      {
        vendorName: 'X',
        accountNumber: '1',
        ifscCode: 'IFSC0001',
        netAmount: 1,
        email: '',
        serviceDescription: 'Scouting Fees',
      },
    ];
    const gen = await loadGeneratedWorkbook(records, { valueDate: new Date(2026, 3, 7) });

    for (let c = 1; c <= 16; c++) {
      const refCell = refWs.getRow(2).getCell(c);
      const genCell = gen.getRow(2).getCell(c);
      expect(normNewlines(cellText(genCell))).toBe(normNewlines(cellText(refCell)));
      expect(fillArgb(genCell)).toBe('FFDEEBF7');
      if (c === 2) {
        expect(genCell.numFmt).toBe('@');
      }
    }
  });

  test('data row matches reference row 3 except E (debit) left empty; P blank', async () => {
    const records = [
      {
        vendorName: 'Ashish Singh',
        accountNumber: '331001000011423',
        ifscCode: 'IOBA0003310',
        netAmount: 4420,
        email: '',
        serviceDescription: 'Scouting Fees',
      },
    ];
    const gen = await loadGeneratedWorkbook(records, { valueDate: new Date(2026, 3, 7) });
    const refRow = refWs.getRow(3);
    const genRow = gen.getRow(3);

    expect(genRow.getCell(5).value).toBe('10064068880');
    expect(genRow.getCell(16).value).toBeNull();

    const colsCompareValue = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    for (const c of colsCompareValue) {
      const rv = cellText(refRow.getCell(c));
      const gv = cellText(genRow.getCell(c));
      if (c === 7) {
        expect(gv).toBe(rv);
        expect(genRow.getCell(7).type).toBe(ExcelJS.ValueType.Number);
      } else {
        expect(normNewlines(gv)).toBe(normNewlines(rv));
      }
    }

    expect(genRow.getCell(7).numFmt).toBe('0.00');
    for (const c of [1, 2, 3, 4, 6, 8, 9, 10]) {
      expect(genRow.getCell(c).numFmt).toBe('@');
    }
  });

  test('remarks column uses serviceDescription when set', async () => {
    const records = [
      {
        vendorName: 'A',
        accountNumber: '123',
        ifscCode: 'IFSC',
        netAmount: 100,
        email: '',
        serviceDescription: 'Budge Budge Videography',
      },
    ];
    const gen = await loadGeneratedWorkbook(records, { valueDate: new Date(2026, 3, 7) });
    expect(cellText(gen.getRow(3).getCell(10))).toBe('Budge Budge Videography');
  });

  test('remarks falls back to vendorName when serviceDescription is missing', async () => {
    const records = [
      {
        vendorName: 'Acme Sports',
        accountNumber: '123',
        ifscCode: 'IFSC',
        netAmount: 100,
        email: '',
      },
    ];
    const gen = await loadGeneratedWorkbook(records, { valueDate: new Date(2026, 3, 7) });
    expect(cellText(gen.getRow(3).getCell(10))).toBe('Acme Sports');
  });

  test('no worksheet protection on generated sheet', async () => {
    const records = [
      {
        vendorName: 'A',
        accountNumber: '1',
        ifscCode: 'IFSC',
        netAmount: 1,
        email: '',
      },
    ];
    const wb = buildBlkpayWorkbook(records, { valueDate: new Date(2026, 3, 7) });
    const buffer = await wb.xlsx.writeBuffer();
    const out = new ExcelJS.Workbook();
    await out.xlsx.load(buffer);
    const ws = out.getWorksheet('Sheet1');
    expect(ws.sheetProtection).toBeFalsy();
  });

  test('headers do not include PAN', async () => {
    const records = [
      {
        vendorName: 'A',
        accountNumber: '1',
        ifscCode: 'IFSC',
        netAmount: 1,
        email: '',
      },
    ];
    const gen = await loadGeneratedWorkbook(records, { valueDate: new Date(2026, 3, 7) });
    const h = [];
    gen.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
      h.push(cellText(cell));
    });
    expect(h.some((t) => String(t).toUpperCase().includes('PAN'))).toBe(false);
    expect(h[15]).toBe('Errors');
  });
});
