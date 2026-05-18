// src/components/payments/paymentData.js

export const PR_STATUSES = ['Draft', 'Sent to Accounts', 'Payment Done', 'Payment Bounced'];

export const PR_STATUS_COLORS = {
  Draft:              { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  'Sent to Accounts': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Payment Done':     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Payment Bounced':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

let _nextPrNum = 1;
export function generatePRNumber() {
  const num = String(_nextPrNum).padStart(3, '0');
  _nextPrNum++;
  return `PR-2026-${num}`;
}

// ── Vendor Statement helpers ───────────────────────────────────────
export function getVendorPaymentHistory(vendorId, paymentRequests = []) {
  return paymentRequests.filter(pr => pr.vendorId === vendorId)
    .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
}

export function getVendorStatement(vendorId, paymentRequests = [], tdsRecords = []) {
  const prs = getVendorPaymentHistory(vendorId, paymentRequests);
  const done = prs.filter(pr => pr.status === 'Payment Done');

  const enrichedRequests = prs.map(pr => {
    if (pr.status === 'Payment Done' && parseFloat(pr.tdsAmount) > 0 && tdsRecords) {
      const tds = tdsRecords.find(t => t.prId === pr.id);
      if (tds) {
        return { ...pr, tdsDeposited: tds.status === 'Deposited', tdsDepositedDate: tds.depositedDate };
      }
    }
    return pr;
  });

  return {
    requests: enrichedRequests,
    totalGross: done.reduce((s, pr) => s + (parseFloat(pr.grossAmount) || 0), 0),
    totalTDS: done.reduce((s, pr) => s + (parseFloat(pr.tdsAmount) || 0), 0),
    totalNet: done.reduce((s, pr) => s + (parseFloat(pr.netAmount) || 0), 0),
    pendingCount: prs.filter(pr => pr.status === 'Sent to Accounts').length,
    pendingAmount: prs.filter(pr => pr.status === 'Sent to Accounts')
      .reduce((s, pr) => s + (parseFloat(pr.netAmount) || 0), 0),
  };
}
