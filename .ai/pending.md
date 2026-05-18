# Pending Decisions

Open items waiting on Abhishek's input. Each entry has the context Claude needs to resume the conversation. Remove an entry once the user answers and the follow-up is done.

---

## 1. Two WOs stuck on active screen — Case A or Case B?

**Date raised:** 2026-05-02

**Records:**
- WO-PR-NE-001 — Neelkanth Print Solution — Fixed — ₹32,020 — status `Issued`
- WO-RE-FA-001 — Fast FC — Fixed — ₹24,284 — status `Issued`

**Context:**
Abhishek wants these two cards off the active Work Orders list. He said both vendors are "paid, so no use" and that they had "issues during payment, got flagged and went back" — meaning a payment request was raised, then bounced/flagged, then reversed.

The backend flow (`tta_backend/backend/payments/serializers.py:189-211`) is working correctly: when a payment is set to `Payment Bounced`, the WO's `paid_gross_amount` is decremented and status recalculated. Both these WOs went back to `paid_gross_amount = 0` → status flipped to `Issued`. That's why they're still on the active list — the system thinks they need to be paid.

The active/past split lives at `src/components/workorders/WorkOrderManagementPage.jsx:101-107`:
- active = `status !== 'Fully Paid'`
- past = `status === 'Fully Paid'`

**Decision needed:**
- **Case A:** Payment truly failed, vendor never got the money → no code change, Abhishek just retries the payment via Raise Payment. WO will move to Past once it becomes Fully Paid.
- **Case B:** Vendor was paid outside the system (cash / different transfer / paid before TTA existed) → need a "Mark as Paid (manual)" action that sets `paid_gross_amount = amount`, `status = 'Fully Paid'`, logs the override in `WorkOrderChangeLog`, and does NOT create a payment request. Adds a small button on the WO card visible only to Super Admin.

**Status:** Awaiting Abhishek's answer on Case A vs Case B.
