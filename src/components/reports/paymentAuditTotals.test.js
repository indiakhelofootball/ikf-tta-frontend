// Regression tests for "In Payment Audit Report Net TDS is coming twice in case
// of bounced payment even though when work order no is same" — reported four
// times, marked Done once while still broken, and confirmed still broken by a
// live measurement on 2026-08-21 (before: Rs 15,900 with 0 bounced; after
// bouncing a Rs 1,000 payment the bounced count updated but the total did not).
//
// The backend was always correct: TDSRecord.voided is set on bounce and
// reports/views.py serves TDS with voided=False. Only this screen's own
// arithmetic was wrong, which is why the backend fix never showed up.

import { computeTotals, isBouncedPayment } from './paymentAuditTotals';

const pr = (over = {}) => ({
  grossAmount: '50000',
  tdsAmount: '1000',
  netAmount: '49000',
  status: 'Payment Done',
  ...over,
});

describe('isBouncedPayment', () => {
  test('only Payment Bounced counts as bounced', () => {
    expect(isBouncedPayment(pr({ status: 'Payment Bounced' }))).toBe(true);
    expect(isBouncedPayment(pr({ status: 'Payment Done' }))).toBe(false);
    expect(isBouncedPayment(pr({ status: 'Sent to Accounts' }))).toBe(false);
    expect(isBouncedPayment(pr({ status: 'Draft' }))).toBe(false);
  });
});

describe('computeTotals — TDS excludes bounced payments', () => {
  test('a bounced payment contributes no TDS', () => {
    const t = computeTotals([pr({ status: 'Payment Bounced' })]);
    expect(t.tds).toBe(0);
    expect(t.bounced).toBe(1);
  });

  test('THE REPORTED BUG: bounce + re-raise on one work order counts TDS once', () => {
    // The exact shape of the complaint: same work order, the original bounced
    // and a replacement raised. The deduction is owed once, not twice.
    const t = computeTotals([
      pr({ status: 'Payment Bounced', tdsAmount: '1000' }),
      pr({ status: 'Payment Done', tdsAmount: '1000' }),
    ]);
    expect(t.tds).toBe(1000);
  });

  test('unbounced payments still accumulate normally', () => {
    const t = computeTotals([
      pr({ tdsAmount: '1000' }),
      pr({ tdsAmount: '3600', status: 'Sent to Accounts' }),
    ]);
    expect(t.tds).toBe(4600);
  });

  test('a bounced payment contributes to no money total, and the row foots', () => {
    // Owner decision 2026-08-21 (option B). Excluding bounced from TDS alone
    // left the totals row unable to add up: Gross 50,000 · TDS 0 · Net 49,000.
    // A bounced payment moved no money, so it contributes to none of the three.
    const t = computeTotals([pr({ status: 'Payment Bounced' })]);
    expect(t.gross).toBe(0);
    expect(t.tds).toBe(0);
    expect(t.net).toBe(0);
    expect(t.bounced).toBe(1);   // still visible, not hidden
  });

  test('the totals row foots: gross - tds === net, with a bounce present', () => {
    // The property that was broken and is the whole point of option B.
    const t = computeTotals([
      pr({ grossAmount: '50000', tdsAmount: '1000', netAmount: '49000', status: 'Payment Bounced' }),
      pr({ grossAmount: '20000', tdsAmount: '400', netAmount: '19600' }),
      pr({ grossAmount: '10000', tdsAmount: '200', netAmount: '9800', status: 'Sent to Accounts' }),
    ]);
    expect(t.gross).toBe(30000);
    expect(t.tds).toBe(600);
    expect(t.net).toBe(29400);
    expect(t.gross - t.tds).toBe(t.net);
  });

  test('status counts are unaffected', () => {
    const t = computeTotals([
      pr({ status: 'Payment Bounced' }),
      pr({ status: 'Payment Done' }),
      pr({ status: 'Sent to Accounts' }),
      pr({ status: 'Draft' }),
    ]);
    expect(t.bounced).toBe(1);
    expect(t.done).toBe(1);
    expect(t.sent).toBe(1);
  });

  test('the bounced AMOUNT is reported, not just the count', () => {
    // Excluding bounced from the money totals would otherwise make the value of
    // a failed disbursement invisible — the strip showed only a count.
    const t = computeTotals([
      pr({ grossAmount: '50000', status: 'Payment Bounced' }),
      pr({ grossAmount: '30000', status: 'Payment Bounced' }),
      pr({ grossAmount: '20000' }),
    ]);
    expect(t.bounced).toBe(2);
    expect(t.bouncedGross).toBe(80000);
    expect(t.gross).toBe(20000);        // excluded from the headline total
  });

  test('bouncedGross is zero when nothing bounced', () => {
    expect(computeTotals([pr(), pr()]).bouncedGross).toBe(0);
  });

  test('empty input gives zeroes, not NaN', () => {
    expect(computeTotals([])).toEqual({
      gross: 0, tds: 0, net: 0, sent: 0, done: 0, bounced: 0, bouncedGross: 0,
    });
  });

  test('missing or malformed amounts do not produce NaN', () => {
    // Amounts arrive as strings from the API and a row may carry nulls.
    const t = computeTotals([
      pr({ grossAmount: null, tdsAmount: undefined, netAmount: '' }),
      pr({ grossAmount: 'abc', tdsAmount: 'abc', netAmount: 'abc' }),
    ]);
    expect(t.gross).toBe(0);
    expect(t.tds).toBe(0);
    expect(t.net).toBe(0);
  });

  test('reproduces the live 2026-08-21 measurement', () => {
    // Five payments totalling Rs 15,900 TDS, then one Rs 1,000 payment bounces.
    // Measured on the running app: the bounced count moved and the total did
    // not. It must now drop to Rs 14,900.
    const rows = [
      pr({ tdsAmount: '1000', status: 'Payment Bounced' }),
      pr({ tdsAmount: '3600' }),
      pr({ tdsAmount: '4900' }),
      pr({ tdsAmount: '6400' }),
      pr({ tdsAmount: '0' }),
    ];
    expect(computeTotals(rows).tds).toBe(14900);
  });
});
