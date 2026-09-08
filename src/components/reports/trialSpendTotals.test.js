import { computeTrialSpend, isPaid, isBounced } from './trialSpendTotals';

const wo = (amount) => ({ amount });
const pr = (status, grossAmount, tdsAmount, netAmount) => ({
  status, grossAmount, tdsAmount, netAmount,
});

describe('a bounced payment contributes no money and no TDS', () => {
  // Tracker #17 on a second screen. `tdsTotal` had no status filter, so the
  // bounced request's TDS was counted while its gross and net were not.
  const prs = [
    pr('Payment Done', 50000, 1000, 49000),
    pr('Payment Bounced', 30000, 600, 29400),
  ];

  test('TDS excludes the bounced request', () => {
    expect(computeTrialSpend([wo(100000)], prs).tdsTotal).toBe(1000);
  });

  test('gross, net and TDS agree with each other', () => {
    const r = computeTrialSpend([wo(100000)], prs);
    expect(r.paidGross - r.tdsTotal).toBe(r.paidNet);
  });

  test('the bounce is still counted, so nothing is hidden', () => {
    expect(computeTrialSpend([wo(100000)], prs).bounces).toBe(1);
  });
});

describe('a Draft has moved no money', () => {
  test('its TDS is not reported as deducted', () => {
    const prs = [pr('Payment Done', 10000, 200, 9800), pr('Draft', 5000, 100, 4900)];
    const r = computeTrialSpend([wo(20000)], prs);
    expect(r.tdsTotal).toBe(200);
    expect(r.paidGross).toBe(10000);
  });
});

describe('the statuses that do count', () => {
  test('Payment Done and Sent to Accounts both count', () => {
    const prs = [
      pr('Payment Done', 1000, 10, 990),
      pr('Sent to Accounts', 2000, 20, 1980),
    ];
    const r = computeTrialSpend([], prs);
    expect(r.paidGross).toBe(3000);
    expect(r.tdsTotal).toBe(30);
    expect(r.paidNet).toBe(2970);
  });

  test('one predicate governs all three money columns', () => {
    // Reverse-check for "one rule, two doors": if a future edit filters gross
    // and net differently from TDS, these stop agreeing.
    const prs = [
      pr('Payment Done', 1000, 10, 990),
      pr('Payment Bounced', 9999, 999, 9000),
      pr('Draft', 8888, 888, 8000),
      pr('Sent to Accounts', 2000, 20, 1980),
    ];
    const paid = prs.filter(isPaid);
    const r = computeTrialSpend([], prs);
    expect(paid).toHaveLength(2);
    expect(r.paidGross).toBe(3000);
    expect(r.tdsTotal).toBe(30);
    expect(r.paidNet).toBe(2970);
  });
});

describe('committed and pending', () => {
  test('pending is what is committed but not yet paid', () => {
    const r = computeTrialSpend([wo(100000), wo(50000)], [pr('Payment Done', 40000, 800, 39200)]);
    expect(r.committed).toBe(150000);
    expect(r.pending).toBe(110000);
  });
});

describe('malformed input', () => {
  test('missing arrays and unparseable amounts are zeroes, not NaN', () => {
    expect(computeTrialSpend(undefined, undefined)).toEqual({
      committed: 0, paidGross: 0, paidNet: 0, tdsTotal: 0, pending: 0, bounces: 0,
    });
    const r = computeTrialSpend([wo('abc')], [pr('Payment Done', null, undefined, '')]);
    expect(r.committed).toBe(0);
    expect(r.tdsTotal).toBe(0);
  });

  test('the predicates are exact, not fuzzy', () => {
    expect(isPaid({ status: 'Payment Done' })).toBe(true);
    expect(isPaid({ status: 'payment done' })).toBe(false);
    expect(isBounced({ status: 'Payment Bounced' })).toBe(true);
  });
});
