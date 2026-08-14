# Pass 1.4 — Payment state machine

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** which illegal state jumps does the code currently allow?

## Answer

**7 illegal transitions are reachable through the normal API.** The most serious
is that `status` is a *directly writable field* on both `PaymentRequest` and
`WorkOrder` — it is simultaneously a derived value (recomputed by the payment
flow) and a client-settable one, with no transition guard. Any status can be
PATCHed to any other status.

**Count: 7 unguarded transitions, 5 properly guarded.**

---

## The lifecycle as the code actually implements it

```
WorkOrder                     PaymentRequest                    Batch / TDS
─────────                     ──────────────                    ───────────
Issued
  │  (PR created)
  ├──────────────────────────► Draft ──────────────────────────► TDSRecord created
  │  paid_gross += gross        │        (if tds_amount > 0)      status=Pending
  │  period.is_paid = True      │
Partially Paid                  │  (batch created)
  │                             ├─────► Sent to Accounts ───────► PaymentBatch
Fully Paid                      │       (batch FK set)             (immutable: GET/POST only)
  │                             │
  │                             ├─────► Payment Done
  │  paid_gross -= gross        │
  ◄─────────────────────────────┴─────► Payment Bounced ─────────► TDSRecord.voided = True
                                          │
                                          ├─► bounce_resolved=True  (frozen, dismiss-only)
                                          └─► un-bounce → Done/Sent (guarded, see below)
Completed / Cancelled  ← never set by any code path
```

**There is no approval state.** `Draft → Sent to Accounts` happens as a side
effect of creating a batch, which is the same click that writes the bank file.
The plan asks *"can a batch export before approval?"* — the honest answer is that
approval does not exist as a concept in this system, so the question cannot be
answered yes or no. That is itself the finding (SM-7).

---

## Transition table

| # | Transition | Where | Guarded? |
|---|---|---|---|
| 1 | `Draft` → `Sent to Accounts` | `PaymentBatchSerializer.create` | ⚠️ **unguarded** — no status filter on `paymentIds`; any status can be batched, including already-batched (SM-1) |
| 2 | `Draft` → `Payment Done` (skipping the batch) | `PaymentRequestSerializer.update` | ❌ **unguarded** (SM-2) |
| 3 | `Payment Done` → `Draft` | same | ❌ **unguarded** (SM-3) |
| 4 | any → `Payment Bounced` | same | ✅ guarded by `old_status != 'Payment Bounced'` for the *reversal*; but reachable from `Draft` (SM-4) |
| 5 | `Payment Bounced` → `Payment Done` / `Sent to Accounts` (un-bounce) | same | ✅ **well guarded** — `bounce_resolved` check + `retry_qs.exists()` check |
| 6 | `Payment Bounced` → resolved | `PaymentRequestViewSet.resolve` | ✅ guarded — `if pr.status != 'Payment Bounced' or pr.bounce_resolved: 400` |
| 7 | Batch → edited / deleted | `PaymentBatchViewSet` | ✅ **`http_method_names = ['get','post','head','options']`** — batches are append-only. Correct. |
| 8 | WO `Issued` → `Fully Paid` by PATCH | `WorkOrderSerializer` | ❌ **unguarded** — `status` is a plain writable field (SM-5) |
| 9 | WO amount edited after payments sent | `WorkOrderSerializer.validate` | ✅ **well guarded** (see below) |
| 10 | WO `type` `Fixed` ⇄ `Periodic` after payments | `WorkOrderSerializer.update` | ❌ **unguarded, and corrupting** (SM-6) |
| 11 | TDS `Pending` → `Deposited` | `TDSRecordViewSet.mark_deposited` | ⚠️ one-way, no reverse path exists (SM-7b) |
| 12 | WO delete with payments attached | `WorkOrderViewSet.destroy` | ✅ guarded — `on_delete=PROTECT` → `ProtectedError` → 409 with a clear message |

---

## Findings

### SM-1 · Any payment request, in any status, can be put in a new batch — **CRITICAL**

Covered in full in Pass 1.1 (P-1). Restated here because it is a state-machine
violation as much as an idempotency one: `Sent to Accounts → Sent to Accounts` in
a *different* batch is a transition the model has no concept of, yet
`prs.update(batch=batch, status='Sent to Accounts')` performs it silently.

**Fix shape:** `PaymentRequest.objects.filter(id__in=payment_ids, status='Draft', batch__isnull=True)`
and reject the request if the count doesn't match `len(payment_ids)`.

---

### SM-2 · `Draft → Payment Done` skips the batch and the bank file entirely — **HIGH**

`status` is listed in `PaymentRequestSerializer.Meta.fields` with no
`read_only=True` and no `validate_status`. `update()` pops `gross_amount`,
`tds_rate`, `work_order` and `vendor` — but not `status`.

So `PATCH /api/payment-requests/<id>/ {"status": "Payment Done"}` succeeds from
`Draft`. The serializer even helps: *"If status is set to Payment Done and no
payment_date, auto-set today"*.

**Consequence:** the request is marked paid, `paymentDate` is stamped, the WO
shows as paid — and no batch exists, no bank file was ever generated, no money
moved. The record is indistinguishable from a real payment in every report.
`BankManagementPage` filters to *"Only show non-Draft payments"*, so it appears
there too, fully legitimate-looking.

This is reachable from the UI: `PaymentDetailDialog.jsx:52–61` (`handleSave`)
sends whatever is in the status dropdown, and the dropdown is not restricted by
current status.

---

### SM-3 · `Payment Done → Draft` un-pays a payment without reversing anything — **HIGH**

The reversal logic in `update()` triggers **only** on the transition into
`Payment Bounced`. Every other backwards transition is a plain field write.

`Payment Done → Draft` leaves `paid_gross_amount` incremented, `period.is_paid =
True`, the `TDSRecord` active and un-voided, and the `batch` FK still set — while
the request itself reappears in the *active* payments list (which filters on
`sentIds`, not status) and can be batched and paid again.

---

### SM-4 · `Draft → Payment Bounced` reverses money that was never sent — **MEDIUM**

The bounce branch runs whenever `new_status == 'Payment Bounced' and old_status
!= 'Payment Bounced'` — including from `Draft`. It subtracts `gross_amount` from
`paid_gross_amount`, unmarks the period, and voids the `TDSRecord`.

But a `Draft` request's gross was already *added* at create, so this is
arithmetically self-cancelling — the WO returns to the right number. The damage is
narrative: a payment that was never sent is now recorded as *bounced*, with a
voided TDS record, and it shows on the Bank page's "Needs Resolution" worklist.
Someone will spend an afternoon on it.

---

### SM-5 · Work Order `status` is both derived and directly writable — **HIGH**

Four code paths compute `wo.status` from `paid_gross_amount`:
`payments/serializers.py` (create → via batch, bounce branch, un-bounce branch),
`payments/views.py::destroy`, and `PaymentBatchSerializer.create`.

At the same time `'status'` sits in `WorkOrderSerializer.Meta.fields:107` as a
plain writable field. So a client PATCH and the payment engine are both authors of
the same column, with no coordination.

`PATCH /api/work-orders/<id>/ {"status": "Fully Paid"}` on an unpaid WO sticks —
until the next payment event recomputes it, at which point it silently flips back.
Reports read `status`. This is a strong candidate for a class of "the number
changed by itself" complaints.

Note also: `Completed` and `Cancelled` are declared in `STATUS_CHOICES` and set by
**no code path anywhere**. They are reachable only by direct PATCH, and nothing
downstream — not the payment flow, not `validate()` — treats `Cancelled` as
meaning "stop". A cancelled WO can still be paid.

---

### SM-6 · Changing a Work Order's `type` after payments corrupts its period accounting — **HIGH**

`type` is writable and appears in `tracked_fields`, so the change is *logged* —
but nothing blocks it, and `validate()` never considers it.

`WorkOrderPeriod` rows are created **only in `create()`**, never in `update()`.
So `Fixed → Periodic` on a work order that already has payments produces a
Periodic WO with **zero period rows**:

- `paidPeriods` is empty → the frontend offers every period as available
- `getWORemainingGross()` returns `numberOfPeriods × amountPerPeriod`, where
  `amount_per_period` is `null` (it is `null=True, blank=True`) → `parseFloat(null) || 0`
  → **remaining = 0** → the WO looks fully paid and no further payment can be raised
- or, if `amountPerPeriod` is set, remaining is computed with **no reference at all**
  to `paid_gross_amount`, so an already-paid WO offers its full value again

`Periodic → Fixed` orphans the existing `WorkOrderPeriod` rows, which keep
`is_paid` flags nothing reads.

---

### SM-7 · No approval state, and TDS deposit is one-way — **MEDIUM**

**7a — no approval.** Raising a payment request and sending it to the bank are
gated by the *same* `payments` grant. The backend comments on this deliberately:

> *"raising a payment and sending it are one responsibility here — the person who
> raises a payment request also sends it to the bank."*

That is a documented business decision, not an oversight, so it is not a bug. But
it means there is **no second pair of eyes anywhere between "someone typed an
amount" and "a bank file exists"** — worth naming explicitly given SM-2 (a
payment can be marked Done with no file at all) and Pass 2.1's findings on who
holds the `payments` grant.

**7b — TDS deposit cannot be undone.** `mark_deposited` bulk-sets every `Pending`
record in a month to `Deposited` with today's date. There is no reverse action,
no per-record granularity, and no confirmation of *which* records were affected
beyond a count. A wrong month selection is unrecoverable through the app.

---

## What is properly guarded (verified — don't re-audit)

- **Amount edits after batching** — `WorkOrderSerializer.validate:175–226`. This
  is the best-written guard in the codebase. It compares submitted values against
  stored ones rather than checking key-presence (with a comment explaining
  exactly why: the frontend resends `amount` on every save, so presence-checking
  wrongly blocked metadata edits on old WOs). It then separately enforces
  `new_amount >= paid` for Fixed, `new_num_periods >= max_paid_period` and
  `new_total >= paid` for Periodic. Confirmed: this *is* the only such path, as
  the plan expected.
- **Un-bounce** — double-guarded (`bounce_resolved` + replacement-PR lookup) with
  a comment naming the real incident it was written for.
- **Batches are append-only** — `http_method_names` excludes PUT/PATCH/DELETE.
- **WO deletion with payments** — `PROTECT` + a 409 with an actionable message.
- **Change logging** — `WorkOrderChangeLog` records old/new for `amount`,
  `amount_per_period`, `number_of_periods`, `tds_rate`, `service_description`,
  `type`. Note it logs `type` changes but doesn't block them (SM-6) — the audit
  trail exists, so **you can query it right now** to find out whether SM-6 has
  already happened.

---

## ✓ Pass complete

- **Do I have a number?** 7 unguarded transitions, 5 guarded.
- **Have I seen one with my own eyes?** Yes — `status` confirmed writable in both
  serializers' `Meta.fields`, and `update()` confirmed to pop amounts but not
  status.
- **Do I know what the user experiences?** Yes — for SM-2, a payment that shows
  as Done in every report with no bank file behind it.

**Query to run now (read-only) — has SM-6 already happened?**

```sql
SELECT work_order_id, old_value, new_value, changed_at
FROM workorders_workorderchangelog
WHERE field_name = 'Type';
```

**And for SM-2 — payments marked Done that never went through a batch:**

```sql
SELECT request_number, status, gross_amount, payment_date
FROM payments_paymentrequest
WHERE status = 'Payment Done' AND batch_id IS NULL;
```
