// src/components/workorders/workOrderData.js
// Work order utilities — no localStorage, API is the source of truth

export const WO_STATUSES = ['Issued', 'Partially Paid', 'Fully Paid', 'Completed', 'Cancelled'];

export const WO_STATUS_COLORS = {
  Draft:            { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  Issued:           { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Partially Paid': { bg: '#fffbeb', color: '#A35905', border: '#fde68a' },
  'Fully Paid':     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Completed:        { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Cancelled:        { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

/** Compute remaining gross amount for a WO */
export function getWORemainingGross(wo) {
  if (wo.type === 'Fixed') {
    return (parseFloat(wo.amount) || 0) - (parseFloat(wo.paidGrossAmount) || 0);
  }
  const paidCount = (wo.paidPeriods || []).length;
  const unpaidCount = (parseFloat(wo.numberOfPeriods) || 0) - paidCount;
  return unpaidCount * (parseFloat(wo.amountPerPeriod) || 0);
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
