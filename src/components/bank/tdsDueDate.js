// src/components/bank/tdsDueDate.js
//
// TDS statutory deposit deadline.
//
// Client requirement (transcript 2026-03-06, quoted in _docs/requirements/README.md):
//   "the amount you deduct between 1 to 30, you have to deposit within 1 to 7 days
//    of the next month"
//
// TDS deducted in month M is due on the 7th of M+1. The deadline belongs to the
// record's own deduction month, never to today.
//
// TDSRecord.month arrives from the API in Django's display form ("Mar 2026"), not
// ISO — payments/serializers.py writes invoice_date.strftime('%b %Y') and
// TDSRecordSerializer passes the CharField through unchanged.

const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const parseTDSMonth = (month) => {
  if (typeof month !== 'string') return null;
  const m = month.trim().match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (!m) return null;
  const monthIndex = MONTH_ABBR.indexOf(m[1].slice(0, 3).toLowerCase());
  if (monthIndex === -1) return null;
  return { year: Number(m[2]), monthIndex };
};

export const tdsDueDate = (month) => {
  const p = parseTDSMonth(month);
  if (!p) return null;
  // monthIndex + 1 === 12 rolls into January of the following year automatically.
  return new Date(p.year, p.monthIndex + 1, 7);
};

// Whole days from today to the deadline. Negative means the deadline has passed.
export const daysUntilTDSDue = (month, today = new Date()) => {
  const due = tdsDueDate(month);
  if (!due) return null;
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due - midnight) / 86400000);
};

export const fmtDueDate = (due) =>
  due ? due.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

// One entry per pending month, oldest deadline first so overdue months lead.
export const buildTDSDueInfo = (months, today = new Date()) =>
  months
    .map((month) => {
      const due = tdsDueDate(month);
      const days = daysUntilTDSDue(month, today);
      return {
        month,
        due,
        dueStr: fmtDueDate(due),
        days,
        overdue: days !== null && days < 0,
      };
    })
    .sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due - b.due;
    });
