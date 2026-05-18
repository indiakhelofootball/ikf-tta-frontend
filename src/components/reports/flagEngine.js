// src/components/reports/flagEngine.js
//
// Pure functions that compute audit flags from the in-memory data set.
// No React, no API calls — just data in, flagged data out.
//
// Flag shape:
//   { code, severity, label, reason, relatedIds }
// severity: 'red' | 'amber' | 'blue'

const SEVERITY_RANK = { red: 3, amber: 2, blue: 1 };

const f = (code, severity, label, reason, relatedIds = []) => ({
  code, severity, label, reason, relatedIds,
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const daysBetween = (a, b) => {
  if (!a || !b) return null;
  return Math.abs((new Date(a) - new Date(b)) / 86400000);
};

const sameMonth = (dateStr, monthLabel) => {
  if (!dateStr || !monthLabel) return false;
  const d = new Date(dateStr);
  const expected = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return expected === monthLabel;
};

// ── Vendor-level flag computation ───────────────────────────────────────────

export function computeVendorFlags(vendors) {
  // Index by shared fields to find duplicates
  const byAccount = new Map();
  const byPan = new Map();
  const byPhone = new Map();

  vendors.forEach((v) => {
    const id = v._id || v.id;
    const acct = (v.accountNumber || '').trim();
    const pan = (v.panNumber || '').trim().toUpperCase();
    const phone = (v.phone || '').trim();

    if (acct) {
      if (!byAccount.has(acct)) byAccount.set(acct, []);
      byAccount.get(acct).push(id);
    }
    if (pan) {
      if (!byPan.has(pan)) byPan.set(pan, []);
      byPan.get(pan).push(id);
    }
    if (phone) {
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      byPhone.get(phone).push(id);
    }
  });

  const flagsByVendor = new Map();
  const add = (vid, flag) => {
    if (!flagsByVendor.has(vid)) flagsByVendor.set(vid, []);
    flagsByVendor.get(vid).push(flag);
  };

  // Duplicate detection
  byAccount.forEach((ids) => {
    if (ids.length > 1) {
      ids.forEach((id) => add(id, f(
        'VENDOR_DUP_ACCOUNT', 'red', 'Shared bank account',
        `${ids.length} vendor records share this account number`,
        ids.filter((x) => x !== id),
      )));
    }
  });
  byPan.forEach((ids) => {
    if (ids.length > 1) {
      ids.forEach((id) => add(id, f(
        'VENDOR_DUP_PAN', 'red', 'Duplicate PAN',
        `${ids.length} vendor records share this PAN — almost always a duplicate`,
        ids.filter((x) => x !== id),
      )));
    }
  });
  byPhone.forEach((ids) => {
    if (ids.length > 1) {
      ids.forEach((id) => add(id, f(
        'VENDOR_DUP_PHONE', 'amber', 'Shared phone',
        `${ids.length} vendor records share this phone number`,
        ids.filter((x) => x !== id),
      )));
    }
  });

  // KYC + bank completeness
  vendors.forEach((v) => {
    const id = v._id || v.id;
    const hasBank = !!(v.bankName && v.accountNumber && v.ifscCode);
    if (!hasBank) {
      add(id, f(
        'VENDOR_BANK_INCOMPLETE', 'red', 'Bank details incomplete',
        'Missing bank name, account number or IFSC',
      ));
    }
    if (v.panNumber && !v.panVerified) {
      add(id, f(
        'VENDOR_PAN_UNVERIFIED', 'amber', 'PAN unverified',
        'PAN entered but never marked verified',
      ));
    }
    if (v.gstNumber && !v.gstVerified) {
      add(id, f(
        'VENDOR_GST_UNVERIFIED', 'amber', 'GST unverified',
        'GST entered but never marked verified',
      ));
    }
  });

  return flagsByVendor;
}

// ── Work-order-level flag computation ───────────────────────────────────────

export function computeWorkOrderFlags(workOrders, trials = []) {
  const flagsByWO = new Map();
  const add = (woid, flag) => {
    if (!flagsByWO.has(woid)) flagsByWO.set(woid, []);
    flagsByWO.get(woid).push(flag);
  };

  const trialCodes = new Set(trials.map((t) => t.trialCode));

  workOrders.forEach((wo) => {
    const id = wo._id || wo.id;
    const amount = parseFloat(wo.amount) || 0;
    const paid = parseFloat(wo.paidGrossAmount) || 0;

    if (paid > amount + 0.01) {
      add(id, f(
        'WO_OVERPAID', 'red', 'Over-paid',
        `Paid ${paid.toFixed(2)} against agreed ${amount.toFixed(2)}`,
      ));
    }
    if (!wo.projectRef) {
      add(id, f(
        'WO_NO_PROJECT', 'amber', 'No project tag',
        'WO is not linked to any trial',
      ));
    } else if (trialCodes.size > 0 && !trialCodes.has(wo.projectRef)) {
      add(id, f(
        'WO_ORPHAN_TRIAL', 'amber', 'Orphan project ref',
        `project_ref "${wo.projectRef}" does not match any trial code`,
      ));
    }
  });

  return flagsByWO;
}

// ── Payment-request-level flag computation ──────────────────────────────────

export function computePaymentFlags(payments, vendors, workOrders, batches, tdsRecords) {
  const vendorById = new Map(vendors.map((v) => [v._id || v.id, v]));
  const woById = new Map(workOrders.map((w) => [w._id || w.id, w]));
  const batchById = new Map(batches.map((b) => [b._id || b.id, b]));
  // TDSRecord serializer exposes `prId` (the PR's request_number string), not PR's db id.
  // So we key by request_number and look up via PR.requestNumber.
  const tdsByPrNumber = new Map(tdsRecords.map((t) => [t.prId, t]));
  const hasTdsForPR = (pr) => tdsByPrNumber.has(pr.requestNumber);

  // Group PRs by (work_order, period_number) to detect retry pairs and multi-bounces
  const byWoPeriod = new Map();
  payments.forEach((p) => {
    const woid = p.workOrderId || p.workOrder;
    const key = `${woid}::${p.periodNumber ?? 'NONE'}::${parseFloat(p.grossAmount) || 0}`;
    if (!byWoPeriod.has(key)) byWoPeriod.set(key, []);
    byWoPeriod.get(key).push(p);
  });

  // Group PRs by (vendor, gross) to detect duplicate suspects
  const byVendorGross = new Map();
  payments.forEach((p) => {
    const vid = p.vendorId || p.vendor;
    const key = `${vid}::${parseFloat(p.grossAmount) || 0}`;
    if (!byVendorGross.has(key)) byVendorGross.set(key, []);
    byVendorGross.get(key).push(p);
  });

  const flagsByPR = new Map();
  const add = (prid, flag) => {
    if (!flagsByPR.has(prid)) flagsByPR.set(prid, []);
    flagsByPR.get(prid).push(flag);
  };

  payments.forEach((p) => {
    const id = p._id || p.id;
    const vendor = vendorById.get(p.vendorId || p.vendor);
    const wo = woById.get(p.workOrderId || p.workOrder);
    const batch = p.batchId ? batchById.get(p.batchId) : null;
    const tds = tdsByPrNumber.get(p.requestNumber);

    // RETRY_OF_BOUNCED: shares (wo, period) with a bounced sibling that has TDS
    const woid = p.workOrderId || p.workOrder;
    const key = `${woid}::${p.periodNumber ?? 'NONE'}::${parseFloat(p.grossAmount) || 0}`;
    const siblings = byWoPeriod.get(key) || [];
    const bouncedSiblings = siblings.filter((s) => s.status === 'Payment Bounced' && (s._id || s.id) !== id);
    const bouncedSiblingsWithTds = bouncedSiblings.filter((s) => hasTdsForPR(s));
    if (bouncedSiblingsWithTds.length > 0 && p.status !== 'Payment Bounced') {
      add(id, f(
        'RETRY_OF_BOUNCED', 'blue', 'Retry of bounced',
        `This PR is a retry — TDS was already booked on ${bouncedSiblingsWithTds.map((s) => s.requestNumber).join(', ')}`,
        bouncedSiblingsWithTds.map((s) => s._id || s.id),
      ));
    }

    // DOUBLE_BOUNCE: same (wo, period) has 2+ bounced PRs
    const allBouncedHere = siblings.filter((s) => s.status === 'Payment Bounced');
    if (allBouncedHere.length >= 2 && p.status === 'Payment Bounced') {
      add(id, f(
        'DOUBLE_BOUNCE', 'red', 'Multi-bounce',
        `Same WO/period bounced ${allBouncedHere.length} times`,
        allBouncedHere.filter((s) => (s._id || s.id) !== id).map((s) => s._id || s.id),
      ));
    }

    // STALE_SENT: status Sent to Accounts and batch sent_at > 7 days ago
    if (p.status === 'Sent to Accounts' && batch?.sentAt) {
      const age = daysBetween(batch.sentAt, new Date());
      if (age > 7) {
        add(id, f(
          'STALE_SENT', 'amber', 'Stale',
          `Sent to bank ${Math.round(age)} days ago, no confirmation yet`,
        ));
      }
    }

    // TDS_MISSING: tds_amount = 0 and vendor.tdsType != 'None'
    const tdsAmount = parseFloat(p.tdsAmount) || 0;
    if (tdsAmount === 0 && vendor && vendor.tdsType && vendor.tdsType !== 'None') {
      add(id, f(
        'TDS_MISSING', 'red', 'TDS missing',
        `Vendor TDS type is "${vendor.tdsType}" but no TDS was deducted on this payment`,
      ));
    }

    // TDS_MONTH_DRIFT: TDS month string doesn't match invoice_date month
    if (tds && p.invoiceDate && !sameMonth(p.invoiceDate, tds.month)) {
      add(id, f(
        'TDS_MONTH_DRIFT', 'amber', 'TDS month mismatch',
        `TDS booked in "${tds.month}" but invoice date is ${p.invoiceDate}`,
      ));
    }

    // BACKDATED_INVOICE: invoice_date more than 60 days before created_at
    if (p.invoiceDate && p.createdAt) {
      const lag = (new Date(p.createdAt) - new Date(p.invoiceDate)) / 86400000;
      if (lag > 60) {
        add(id, f(
          'BACKDATED_INVOICE', 'amber', 'Backdated',
          `Invoice dated ${Math.round(lag)} days before this PR was raised`,
        ));
      }
    }

    // WO_OVERPAID inheritance: if the WO is over-paid, mark the PR too
    if (wo) {
      const woAmount = parseFloat(wo.amount) || 0;
      const woPaid = parseFloat(wo.paidGrossAmount) || 0;
      if (woPaid > woAmount + 0.01) {
        add(id, f(
          'WO_OVERPAID', 'red', 'WO over-paid',
          `Work order paid (${woPaid.toFixed(2)}) exceeds agreed amount (${woAmount.toFixed(2)})`,
        ));
      }
    }

    // DUPLICATE_SUSPECT: same vendor + same gross, within 7 days of another PR, not a known retry
    const vendorGrossSiblings = byVendorGross.get(`${p.vendorId || p.vendor}::${parseFloat(p.grossAmount) || 0}`) || [];
    const closeInTime = vendorGrossSiblings.filter((s) => {
      if ((s._id || s.id) === id) return false;
      if (!s.invoiceDate || !p.invoiceDate) return false;
      return daysBetween(s.invoiceDate, p.invoiceDate) <= 7;
    });
    // Exclude pairs that are already explained by retry logic
    const closeNotRetry = closeInTime.filter((s) => {
      const skey = `${s.workOrderId || s.workOrder}::${s.periodNumber ?? 'NONE'}::${parseFloat(s.grossAmount) || 0}`;
      return skey !== key;
    });
    if (closeNotRetry.length > 0) {
      add(id, f(
        'DUPLICATE_SUSPECT', 'red', 'Duplicate suspect',
        `Same vendor + same amount + within 7 days of ${closeNotRetry.map((s) => s.requestNumber).join(', ')}`,
        closeNotRetry.map((s) => s._id || s.id),
      ));
    }
  });

  return flagsByPR;
}

// ── Helpers exposed to UI ───────────────────────────────────────────────────

export function topSeverity(flags) {
  if (!flags || flags.length === 0) return null;
  return flags.reduce((max, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[max] ? f.severity : max), 'blue');
}

export function countBySeverity(flagsMap) {
  const counts = { red: 0, amber: 0, blue: 0 };
  flagsMap.forEach((flags) => {
    const top = topSeverity(flags);
    if (top) counts[top] += 1;
  });
  return counts;
}

export const FLAG_COLORS = {
  red:   { border: '#dc2626', bg: '#fef2f2', chip: '#dc2626', chipBg: '#fee2e2' },
  amber: { border: '#d97706', bg: '#fffbeb', chip: '#b45309', chipBg: '#fef3c7' },
  blue:  { border: '#2563eb', bg: '#eff6ff', chip: '#1d4ed8', chipBg: '#dbeafe' },
};

export const FLAG_LABELS = {
  RETRY_OF_BOUNCED: 'Retry of bounced',
  DOUBLE_BOUNCE: 'Multi-bounce',
  STALE_SENT: 'Stale',
  TDS_MISSING: 'TDS missing',
  TDS_MONTH_DRIFT: 'TDS month mismatch',
  BACKDATED_INVOICE: 'Backdated invoice',
  WO_OVERPAID: 'WO over-paid',
  DUPLICATE_SUSPECT: 'Duplicate suspect',
  VENDOR_DUP_ACCOUNT: 'Shared bank account',
  VENDOR_DUP_PAN: 'Duplicate PAN',
  VENDOR_DUP_PHONE: 'Shared phone',
  VENDOR_BANK_INCOMPLETE: 'Bank details incomplete',
  VENDOR_PAN_UNVERIFIED: 'PAN unverified',
  VENDOR_GST_UNVERIFIED: 'GST unverified',
  WO_NO_PROJECT: 'No project tag',
  WO_ORPHAN_TRIAL: 'Orphan project ref',
};
