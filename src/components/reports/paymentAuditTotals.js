// Cumulative figures for the Payment Audit report.
//
// Extracted from PaymentAuditReport.jsx so it can be tested: that component
// imports react-router-dom, which CRA's Jest resolver cannot load, so anything
// left inside it is untestable. Same reason tdsDueDate.js and
// csrContractRules.js are separate modules.
//
// This is the "Net TDS is coming twice in case of bounced payment" report,
// raised four times. The backend has always been right — a bounced payment's
// TDSRecord is voided, and reports/views.py serves TDS with voided=False — but
// this screen summed tdsAmount over the raw payment requests and never read
// that flag, so a bounce plus its re-raise counted the deduction twice.

// A bounced payment moved no money: nothing left the account, nothing reached
// the vendor, and its TDS was cancelled rather than remitted.
export const isBouncedPayment = (p) => p.status === 'Payment Bounced';

// One place computes the cumulative figures: totals strip, table total row,
// Excel totals row.
//
// Bounced rows are excluded from ALL THREE money columns, not just TDS.
// Excluding TDS alone fixed the reported defect but left the totals row unable
// to add up — a bounced payment showed Gross 50,000 · TDS 0 · Net 49,000, and
// 50,000 − 0 ≠ 49,000. Owner decision 2026-08-21: a bounced payment moved no
// money, so it contributes nothing to any money total. The `bounced` count
// below still reports how many rows were excluded, and every per-row cell
// still shows what was booked against that request, so nothing is hidden.
// `bouncedGross` is what the exclusion took out. Without it the money would
// leave the screen entirely — the strip reported only a COUNT ("1 bounced"),
// so excluding bounced from the three money columns would have made the value
// of a failed disbursement invisible. Excluded from the totals, still shown.
export const computeTotals = (rows) => rows.reduce((acc, p) => {
  if (isBouncedPayment(p)) {
    acc.bouncedGross += parseFloat(p.grossAmount) || 0;
  } else {
    acc.gross += parseFloat(p.grossAmount) || 0;
    acc.tds += parseFloat(p.tdsAmount) || 0;
    acc.net += parseFloat(p.netAmount) || 0;
  }
  if (p.status === 'Sent to Accounts') acc.sent += 1;
  else if (p.status === 'Payment Done') acc.done += 1;
  else if (p.status === 'Payment Bounced') acc.bounced += 1;
  return acc;
}, { gross: 0, tds: 0, net: 0, sent: 0, done: 0, bounced: 0, bouncedGross: 0 });
