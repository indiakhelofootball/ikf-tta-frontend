// src/components/payments/paymentData.js
// Fake data for Payment Request + Bank/TDS modules

export const PR_STATUSES = ['Draft', 'Sent to Accounts', 'Payment Done', 'Payment Bounced'];

export const PR_STATUS_COLORS = {
  Draft:              { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  'Sent to Accounts': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Payment Done':     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Payment Bounced':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

export const FAKE_PAYMENT_REQUESTS = [
  {
    id: 'PR-2026-001',
    workOrderNumber: 'WO-S5-002',
    workOrderId: 'wo2',
    vendorId: 'v2',
    vendorName: 'SportsPrint Media',
    vendorType: 'Photographer',
    panNumber: 'BFGPS5678H',
    gstNumber: '27BFGPS5678H1ZM',
    tdsType: 'TDS @ 1% (Sec 194C – Contractor)',
    bankName: 'HDFC Bank',
    accountNumber: '00601234567890',
    ifscCode: 'HDFC0000606',
    accountType: 'Savings',
    woType: 'Periodic',
    periodLabel: 'Quarter 1 of 4',
    grossAmount: 25000,
    tdsRate: 1,
    tdsAmount: 250,
    netAmount: 24750,
    invoiceDate: '2025-01-20',
    notes: '',
    status: 'Payment Done',
    paymentDate: '2025-01-25',
    createdAt: '2025-01-18T10:00:00Z',
  },
  {
    id: 'PR-2026-002',
    workOrderNumber: 'WO-S5-001',
    workOrderId: 'wo1',
    vendorId: 'v1',
    vendorName: 'Ravi Kumar Productions',
    vendorType: 'Videographer',
    panNumber: 'ABCPK1234D',
    gstNumber: '07ABCPK1234D1ZK',
    tdsType: 'TDS @ 2% (Sec 194C – Company)',
    bankName: 'HDFC Bank',
    accountNumber: '50100123456789',
    ifscCode: 'HDFC0001234',
    accountType: 'Current',
    woType: 'Fixed',
    periodLabel: null,
    grossAmount: 50000,
    tdsRate: 2,
    tdsAmount: 1000,
    netAmount: 49000,
    invoiceDate: '2025-01-10',
    notes: 'Full payment for Delhi Trial video coverage.',
    status: 'Sent to Accounts',
    paymentDate: null,
    createdAt: '2025-01-08T10:00:00Z',
  },
  {
    id: 'PR-2026-003',
    workOrderNumber: 'WO-S5-004',
    workOrderId: 'wo4',
    vendorId: 'v1',
    vendorName: 'Ravi Kumar Productions',
    vendorType: 'Videographer',
    panNumber: 'ABCPK1234D',
    gstNumber: '07ABCPK1234D1ZK',
    tdsType: 'TDS @ 2% (Sec 194C – Company)',
    bankName: 'HDFC Bank',
    accountNumber: '99999999999',
    ifscCode: 'HDFC0001234',
    accountType: 'Current',
    woType: 'Periodic',
    periodLabel: 'Period 1 – Jan',
    grossAmount: 15000,
    tdsRate: 2,
    tdsAmount: 300,
    netAmount: 14700,
    invoiceDate: '2025-01-05',
    notes: '',
    status: 'Payment Bounced',
    bounceReason: 'Incorrect account number provided',
    paymentDate: null,
    createdAt: '2025-01-03T10:00:00Z',
  },
  {
    id: 'PR-2026-004',
    workOrderNumber: 'WO-S5-003',
    workOrderId: 'wo3',
    vendorId: 'v3',
    vendorName: 'GoalLine Events Pvt Ltd',
    vendorType: 'Event Manager',
    panNumber: 'CGLEV9012K',
    gstNumber: '29CGLEV9012K1ZR',
    tdsType: 'TDS @ 10% (Sec 194J – Professional)',
    bankName: 'HDFC Bank',
    accountNumber: '03722345678901',
    ifscCode: 'HDFC0000372',
    accountType: 'Current',
    woType: 'Fixed',
    periodLabel: null,
    grossAmount: 150000,
    tdsRate: 10,
    tdsAmount: 15000,
    netAmount: 135000,
    invoiceDate: '2025-02-05',
    notes: 'Full and final payment for Bengaluru Trial.',
    status: 'Payment Done',
    paymentDate: '2025-02-10',
    createdAt: '2025-02-03T10:00:00Z',
  },
];

// TDS records for Bank/TDS module
export const FAKE_TDS_RECORDS = [
  {
    id: 'TDS-001',
    prId: 'PR-2026-001',
    vendorName: 'SportsPrint Media',
    panNumber: 'BFGPS5678H',
    section: '194C – Contractor (Individual)',
    rate: '1%',
    grossAmount: 25000,
    tdsAmount: 250,
    month: 'Jan 2025',
    woNumber: 'WO-S5-002',
    status: 'Deposited',
    depositedDate: '2025-02-06',
  },
  {
    id: 'TDS-002',
    prId: 'PR-2026-002',
    vendorName: 'Ravi Kumar Productions',
    panNumber: 'ABCPK1234D',
    section: '194C – Contractor (Company)',
    rate: '2%',
    grossAmount: 50000,
    tdsAmount: 1000,
    month: 'Jan 2025',
    woNumber: 'WO-S5-001',
    status: 'Pending',
    depositedDate: null,
  },
  {
    id: 'TDS-003',
    prId: 'PR-2026-004',
    vendorName: 'GoalLine Events Pvt Ltd',
    panNumber: 'CGLEV9012K',
    section: '194J – Professional Services',
    rate: '10%',
    grossAmount: 150000,
    tdsAmount: 15000,
    month: 'Feb 2025',
    woNumber: 'WO-S5-003',
    status: 'Pending',
    depositedDate: null,
  },
];

// Monthly TDS summary (for the TDS dashboard)
export const FAKE_TDS_SUMMARY = [
  { section: '194C – Contractor (Individual)', rate: '1%', vendorCount: 1, grossAmount: 25000, tdsAmount: 250 },
  { section: '194C – Contractor (Company)',    rate: '2%', vendorCount: 2, grossAmount: 65000, tdsAmount: 1300 },
  { section: '194J – Professional Services',  rate: '10%', vendorCount: 1, grossAmount: 150000, tdsAmount: 15000 },
  { section: '194H – Commission',             rate: '10%', vendorCount: 0, grossAmount: 0, tdsAmount: 0 },
  { section: '194I – Rent',                   rate: '2%',  vendorCount: 0, grossAmount: 0, tdsAmount: 0 },
];

let _nextPrNum = FAKE_PAYMENT_REQUESTS.length + 1;
export function generatePRNumber() {
  const num = String(_nextPrNum).padStart(3, '0');
  _nextPrNum++;
  return `PR-2026-${num}`;
}

// ── Vendor Statement helpers ───────────────────────────────────────
export function getVendorPaymentHistory(vendorId) {
  return FAKE_PAYMENT_REQUESTS.filter(pr => pr.vendorId === vendorId)
    .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
}

export function getVendorStatement(vendorId, tdsRecords) {
  const prs = getVendorPaymentHistory(vendorId);
  const done = prs.filter(pr => pr.status === 'Payment Done');

  // Enrich each completed payment with TDS deposit status from tdsRecords
  const enrichedRequests = prs.map(pr => {
    if (pr.status === 'Payment Done' && pr.tdsAmount > 0 && tdsRecords) {
      const tds = tdsRecords.find(t => t.prId === pr.id);
      if (tds) {
        return { ...pr, tdsDeposited: tds.status === 'Deposited', tdsDepositedDate: tds.depositedDate };
      }
    }
    return pr;
  });

  return {
    requests: enrichedRequests,
    totalGross: done.reduce((s, pr) => s + (pr.grossAmount || 0), 0),
    totalTDS: done.reduce((s, pr) => s + (pr.tdsAmount || 0), 0),
    totalNet: done.reduce((s, pr) => s + (pr.netAmount || 0), 0),
    pendingCount: prs.filter(pr => pr.status === 'Sent to Accounts').length,
    pendingAmount: prs.filter(pr => pr.status === 'Sent to Accounts')
      .reduce((s, pr) => s + (pr.netAmount || 0), 0),
  };
}
