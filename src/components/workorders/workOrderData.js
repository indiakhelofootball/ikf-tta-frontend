// src/components/workorders/workOrderData.js
// localStorage-backed work order store — persists across pages and refreshes

const WO_STORAGE_KEY = 'tta_work_orders';

// Seed data for first load
const SEED_WORK_ORDERS = [
  {
    id: 'wo1',
    workOrderNumber: 'WO-S5-001',
    vendorId: 'v1',
    type: 'Fixed',
    projectRef: 'IKF-S5-001 – Delhi Trial',
    serviceDescription: 'Full video coverage of Delhi football trials.',
    amount: 50000,
    tdsRate: 2,
    paidGrossAmount: 0,
    status: 'Issued',
    createdAt: '2025-01-10T10:00:00Z',
    vendorName: 'Ravi Kumar Productions',
    vendorType: 'Videographer',
    panNumber: 'ABCPK1234D',
    gstNumber: '07ABCPK1234D1ZK',
    bankName: 'HDFC Bank',
    accountNumber: '50100123456789',
    ifscCode: 'HDFC0001234',
    accountType: 'Current',
  },
  {
    id: 'wo2',
    workOrderNumber: 'WO-S5-002',
    vendorId: 'v2',
    type: 'Periodic',
    amountPerPeriod: 25000,
    numberOfPeriods: 4,
    periodType: 'Quarterly',
    projectRef: 'IKF-S5-002 – Mumbai Trial',
    serviceDescription: 'Quarterly photography coverage for Mumbai football trials.',
    amount: 100000,
    tdsRate: 1,
    paidPeriods: [1],
    status: 'Issued',
    createdAt: '2025-01-05T10:00:00Z',
    vendorName: 'SportsPrint Media',
    vendorType: 'Photographer',
    panNumber: 'BFGPS5678H',
    gstNumber: '27BFGPS5678H1ZM',
    bankName: 'HDFC Bank',
    accountNumber: '00601234567890',
    ifscCode: 'HDFC0000606',
    accountType: 'Savings',
  },
];

/** Load all work orders from localStorage (seeds on first use) */
export function loadWorkOrders() {
  try {
    const raw = localStorage.getItem(WO_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First time — seed with sample data
  localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(SEED_WORK_ORDERS));
  return SEED_WORK_ORDERS;
}

/** Save the full work orders list to localStorage */
export function saveWorkOrders(workOrders) {
  localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(workOrders));
}

// Keep FAKE_WORK_ORDERS as alias for backward compat
export const FAKE_WORK_ORDERS = loadWorkOrders();

export const WO_STATUSES = ['Draft', 'Issued', 'Completed', 'Cancelled'];

export const WO_STATUS_COLORS = {
  Draft:     { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  Issued:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  Completed: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Cancelled: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

/** Get active WOs for a vendor */
export function getVendorWOs(vendorId) {
  const all = loadWorkOrders();
  return all.filter((wo) => wo.vendorId === vendorId);
}

/** Compute remaining gross amount for a WO */
export function getWORemainingGross(wo) {
  if (wo.type === 'Fixed') {
    return (wo.amount || 0) - (wo.paidGrossAmount || 0);
  }
  const paidCount = (wo.paidPeriods || []).length;
  const unpaidCount = (wo.numberOfPeriods || 0) - paidCount;
  return unpaidCount * (wo.amountPerPeriod || 0);
}

/** Check if a WO is fully paid */
export function isWOFullyPaid(wo) {
  return getWORemainingGross(wo) <= 0;
}

/** Get period label for a periodic WO */
export function getPeriodLabel(wo, periodIndex) {
  const labels = {
    Monthly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  };
  if (wo.periodType === 'Monthly' && wo.serviceFrom) {
    const startMonth = new Date(wo.serviceFrom).getMonth();
    const monthLabel = labels.Monthly[(startMonth + periodIndex - 1) % 12];
    return `Period ${periodIndex} – ${monthLabel}`;
  }
  if (wo.periodType === 'Quarterly') {
    return `Quarter ${periodIndex}`;
  }
  return `Period ${periodIndex}`;
}

/**
 * Generate a 2-letter abbreviation from a string.
 */
function abbrev(str) {
  const cleaned = (str || '').replace(/[^a-zA-Z]/g, '');
  return (cleaned.slice(0, 2) || 'XX').toUpperCase();
}

/**
 * Generate a unique Work Order number.
 * Format: WO-PH-IN-001  (service type abbrev + vendor name abbrev + serial)
 */
export function generateWorkOrderNumber(vendorType = '', vendorName = '', existingWOs = []) {
  const svc = abbrev(vendorType);
  const name = abbrev(vendorName);

  const existingNums = new Set(existingWOs.map(wo => wo.workOrderNumber));

  const prefix = `WO-${svc}-${name}-`;
  let maxSerial = 0;
  existingWOs.forEach(wo => {
    if (wo.workOrderNumber && wo.workOrderNumber.startsWith(prefix)) {
      const rest = wo.workOrderNumber.slice(prefix.length);
      const num = parseInt(rest, 10);
      if (!isNaN(num) && num > maxSerial) maxSerial = num;
    }
  });

  const serial = String(maxSerial + 1).padStart(3, '0');
  let woNum = `${prefix}${serial}`;

  if (existingNums.has(woNum)) {
    for (let i = 0; i < 26; i++) {
      const candidate = `${woNum}${String.fromCharCode(65 + i)}`;
      if (!existingNums.has(candidate)) {
        woNum = candidate;
        break;
      }
    }
  }

  return woNum;
}
