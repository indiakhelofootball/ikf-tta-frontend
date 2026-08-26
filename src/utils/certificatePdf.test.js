/**
 * certificatePdf builds a jsPDF document. jsPDF and jspdf-autotable are
 * mocked so these tests assert on what the builder is ASKED to draw — the
 * sequence of doc.text() calls and the autoTable() head/body — rather than
 * on rendered binary output, which no test here can meaningfully inspect.
 */

const mockTextCalls = [];
const mockSaveCalls = [];

jest.mock('jspdf', () => {
  class MockJsPDF {
    constructor() {
      this.setFontSize = jest.fn();
      this.text = jest.fn((str, x, y) => { mockTextCalls.push({ str, x, y }); });
      this.save = jest.fn((name) => { mockSaveCalls.push(name); });
    }
  }
  return { __esModule: true, default: MockJsPDF };
});

// jspdf-autotable is stubbed to a no-op, NOT spied on: its `exports` map has no
// CJS entry, so a jest mock for it registers under a key this module never
// resolves and silently captures nothing. The table is asserted through
// buildCertificateTable instead, which needs no mock at all.
jest.mock('jspdf-autotable', () => ({ __esModule: true, default: () => {} }));

/* eslint-disable import/first -- the jest.mock calls above must be evaluated
   before this module is pulled in, so the import cannot move to the top. */
import {
  buildCertificateDoc,
  buildCertificateTable,
  downloadCertificatePdf,
  formatMoney,
  formatPeriod,
  sanitizeFileNamePart,
  certificateFileName,
} from './certificatePdf';

beforeEach(() => {
  mockTextCalls.length = 0;
  mockSaveCalls.length = 0;
});

const allText = () => mockTextCalls.map((c) => c.str).join('\n');

describe('formatMoney', () => {
  test('Indian grouping, 2dp, INR label', () => {
    expect(formatMoney(150000)).toBe('INR 1,50,000.00');
  });

  test('missing/zero amount does not throw and reads as zero', () => {
    expect(formatMoney(null)).toBe('INR 0.00');
    expect(formatMoney(undefined)).toBe('INR 0.00');
  });
});

describe('formatPeriod', () => {
  test('both bounds present', () => {
    expect(formatPeriod({ periodStart: '2026-01-01', periodEnd: '2026-06-30' }))
      .toBe('Period: 2026-01-01 to 2026-06-30');
  });

  test('null bounds never print "null" or "Invalid Date"', () => {
    const text = formatPeriod({ periodStart: null, periodEnd: null });
    expect(text).not.toMatch(/null/i);
    expect(text).not.toMatch(/invalid date/i);
    expect(text).toBe('Period: not stated on the project');
  });

  test('open text override is used for the null case', () => {
    const text = formatPeriod({ periodStart: null, periodEnd: null }, { openText: 'custom' });
    expect(text).toBe('custom');
  });

  test('one open bound reads as inception/date, not null', () => {
    expect(formatPeriod({ periodStart: null, periodEnd: '2026-06-30' }))
      .toBe('Period: project inception to 2026-06-30');
    expect(formatPeriod({ periodStart: '2026-01-01', periodEnd: null }))
      .toBe('Period: 2026-01-01 to date');
  });
});

describe('sanitizeFileNamePart / certificateFileName', () => {
  test('strips filesystem-illegal characters', () => {
    expect(sanitizeFileNamePart('Water/Sanitation: Phase*1?')).not.toMatch(/[\\/:*?"<>|]/);
  });

  test('blank name falls back to a safe default', () => {
    expect(sanitizeFileNamePart('')).toBe('grant');
    expect(sanitizeFileNamePart(undefined)).toBe('grant');
  });

  test('two projects sharing a name do not collide once id/version are included', () => {
    const a = certificateFileName({ projectName: 'Football Program', projectId: 1, certificateVersion: 2 });
    const b = certificateFileName({ projectName: 'Football Program', projectId: 2, certificateVersion: 2 });
    expect(a).not.toBe(b);
  });
});

describe('buildCertificateDoc — funder variant', () => {
  const base = {
    projectName: 'Football Program',
    clientName: 'Acme Foundation',
    sanctionedAmount: 500000,
    totalUtilised: 120000,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-30',
    certificateVersion: 1,
    frozenAt: '2026-07-01T10:00:00Z',
    lineItems: [{ note: 'Coaching kits', amount: 50000 }],
  };

  test('states frozen status and version', () => {
    buildCertificateDoc(base, { variant: 'funder' });
    expect(allText()).toMatch(/Frozen v1/);
  });

  test('treats a funder cert with no explicit frozen flag as frozen, not live', () => {
    buildCertificateDoc(base, { variant: 'funder' });
    expect(allText()).not.toMatch(/Live/);
  });

  test('money figures use INR grouping, not raw numbers', () => {
    buildCertificateDoc(base, { variant: 'funder' });
    expect(allText()).toMatch(/INR 5,00,000\.00/);
    expect(allText()).toMatch(/INR 1,20,000\.00/);
  });

  test('zero line items render a non-empty, non-broken table', () => {
    const { head, body } = buildCertificateTable({ ...base, lineItems: [] }, { variant: 'funder' });
    expect(body.length).toBeGreaterThan(0);
    expect(body[0][0]).toMatch(/No expenses are recorded/);
    expect(head[0]).toEqual(['Expense', 'Amount']);
  });

  test('isolation guarantee: never emits a Source/vendor/payment column or value, even when the object carries one', () => {
    const leaky = {
      ...base,
      lineItems: [{
        note: 'Coaching kits',
        amount: 50000,
        source: 'Vendor Payment',
        vendorName: 'Acme Sports Pvt Ltd',
        paymentId: 'PAY-9912',
      }],
    };
    const { head, body } = buildCertificateTable(leaky, { variant: 'funder' });
    buildCertificateDoc(leaky, { variant: 'funder' });
    expect(head[0]).toEqual(['Expense', 'Amount']);
    expect(body[0]).toHaveLength(2);
    expect(JSON.stringify(body)).not.toMatch(/Vendor Payment/);
    expect(JSON.stringify(body)).not.toMatch(/Acme Sports/);
    expect(JSON.stringify(body)).not.toMatch(/PAY-9912/);
    expect(allText()).not.toMatch(/Vendor Payment|Acme Sports|PAY-9912/);
  });

  test('out-of-period count is internal-only: never printed on the funder side even if present', () => {
    buildCertificateDoc({ ...base, outOfPeriodCount: 3 }, { variant: 'funder' });
    expect(allText()).not.toMatch(/outside this period/);
  });
});

describe('buildCertificateDoc — internal variant', () => {
  const base = {
    projectName: 'Football Program',
    clientName: 'Acme Foundation',
    sanctionedAmount: 500000,
    totalUtilised: 120000,
    periodStart: null,
    periodEnd: null,
    frozen: false,
    lineItems: [{ source: 'Vendor Payment', note: 'Coaching kits', amount: 50000 }],
  };

  test('live (unfrozen) certificate is stated as live, not frozen', () => {
    buildCertificateDoc(base, { variant: 'internal' });
    expect(allText()).toMatch(/Live — figures may still change/);
  });

  test('frozen internal certificate states version and freeze time', () => {
    buildCertificateDoc({ ...base, frozen: true, certificateVersion: 4, frozenAt: '2026-07-01T10:00:00Z' }, { variant: 'internal' });
    expect(allText()).toMatch(/Frozen v4/);
  });

  test('open-ended period reads as covering all tagged expenses, not null', () => {
    buildCertificateDoc(base, { variant: 'internal' });
    expect(allText()).toMatch(/covers all tagged expenses/);
    expect(allText()).not.toMatch(/null/i);
  });

  test('Source column is present and carries the value', () => {
    const { head, body } = buildCertificateTable(base, { variant: 'internal' });
    expect(head[0]).toEqual(['Source', 'Note', 'Amount']);
    expect(body[0][0]).toBe('Vendor Payment');
  });

  test('excludedItems/outOfPeriodCount reach the reader on the internal side', () => {
    buildCertificateDoc({ ...base, outOfPeriodCount: 2 }, { variant: 'internal' });
    expect(allText()).toMatch(/2 tagged expense\(s\) fall outside this period/);
  });

  test('zero line items render a non-empty, non-broken table', () => {
    const { head, body } = buildCertificateTable({ ...base, lineItems: [] }, { variant: 'internal' });
    expect(body.length).toBeGreaterThan(0);
    expect(body[0][1]).toMatch(/No expenses are recorded/);
    expect(head[0]).toEqual(['Source', 'Note', 'Amount']);
  });
});

describe('downloadCertificatePdf', () => {
  test('saves under a sanitised, collision-resistant file name', () => {
    downloadCertificatePdf({
      projectName: 'Water/Sanitation: Phase 1',
      projectId: 7,
      certificateVersion: 2,
      lineItems: [],
    }, { variant: 'funder' });
    expect(mockSaveCalls).toHaveLength(1);
    expect(mockSaveCalls[0]).not.toMatch(/[\\/:*?"<>|]/);
    expect(mockSaveCalls[0]).toMatch(/_7_v2\.pdf$/);
  });
});
