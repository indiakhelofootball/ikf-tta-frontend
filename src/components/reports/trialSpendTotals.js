// Per-trial money totals for the Trial Spend report.
//
// Extracted from TrialSpendReport.jsx so the rule can be unit-tested: that file
// imports react-router-dom, which cannot be imported under Jest in this repo.
// Same reason trialsReportStats.js and paymentAuditTotals.js exist.
//
// THE ONE RULE, BEHIND ONE DOOR
//
// A payment request contributes money only once it has actually been paid.
// `paidGross` and `paidNet` always applied that. `tdsTotal` did not -- it summed
// EVERY request on the work order with no status filter at all, three lines
// under two that filtered correctly. So a bounced payment's TDS was counted
// again here, which is tracker row #17 ("Net TDS is coming twice in case of
// bounced payment") arriving on a second screen after being fixed on the first.
//
// It showed nothing wrong on production only because no affected work order
// carried a project tag, so no row reached this report. That is a data
// accident, not a fix: the defect goes live the moment one of them is tagged.
//
// Drafts are excluded for the same reason and by the same predicate. A Draft has
// moved no money, so its TDS has not been deducted from anyone -- the sibling
// finding to F8, where a Draft's TDS could be reported as remitted to the tax
// authority.

// The single definition. Every money total below goes through it, so the rule
// cannot be fixed in one place and left wrong in another.
export const isPaid = (p) => p.status === 'Payment Done' || p.status === 'Sent to Accounts';

export const isBounced = (p) => p.status === 'Payment Bounced';

const sum = (rows, field) => rows.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);

/**
 * @param {Array} wos  work orders matched to this trial
 * @param {Array} prs  payment requests raised against those work orders
 */
export function computeTrialSpend(wos, prs) {
  const workOrders = wos || [];
  const requests = prs || [];
  const paid = requests.filter(isPaid);

  const committed = sum(workOrders, 'amount');
  const paidGross = sum(paid, 'grossAmount');
  const paidNet = sum(paid, 'netAmount');
  const tdsTotal = sum(paid, 'tdsAmount');

  return {
    committed,
    paidGross,
    paidNet,
    tdsTotal,
    pending: committed - paidGross,
    bounces: requests.filter(isBounced).length,
  };
}
