# Pass 1.2 — Money arithmetic

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** is any money stored or computed as a float?

## Answer

**Storage: no — and this is genuinely well done.** Zero `FloatField` anywhere in
the backend. All 17 money columns across all apps are `DecimalField` with
explicit `max_digits`/`decimal_places`.

**Computation: yes, in two places that matter.** The frontend does every money
calculation in IEEE-754 doubles via `parseFloat`, and — more seriously — it
computes TDS with a **different rounding rule than the backend**, so the number
on the confirmation screen is not always the number that moves.

**Count: 4 findings (1 high, 1 medium, 2 low).**

---

### M-1 · Frontend and backend round TDS differently — **HIGH**

| | Frontend | Backend |
|---|---|---|
| Where | `src/components/payments/PaymentRequestModal.jsx:359` | `tta_backend/backend/payments/serializers.py:136` |
| Code | `const tdsAmount = Math.round(gross * tdsRate / 100);` | `tds_amount = (gross * tds_rate / Decimal('100')).quantize(Decimal('0.01'))` |
| Rounds to | **nearest whole rupee** | **nearest paisa**, ROUND_HALF_EVEN |

These disagree for any gross × rate that doesn't land on a whole rupee.

**Worked example.** Gross ₹10,550 at 1% TDS:

- Screen shows: TDS `Math.round(105.5)` = **₹106**, Net = 10550 − 106 = **₹10,444**
- Database stores: TDS `Decimal('105.50')`, Net = **₹10,444.50**
- The bank file is built from the stored values → the vendor receives **₹10,444.50**

The operator approved ₹10,444 and ₹10,444.50 went out. Individually trivial;
across a batch it means the batch total on screen never quite reconciles with the
bank's debit, and the TDS ledger you file against never quite matches what the
UI showed. This is the kind of half-rupee drift that makes month-end feel haunted.

`netAmount` on the frontend (`:360`) is derived from the wrong `tdsAmount`, so the
error propagates to every net figure shown before submission.

**Second-order note on the backend rule.** `quantize(Decimal('0.01'))` with no
explicit `rounding=` argument uses Python's default **ROUND_HALF_EVEN** (banker's
rounding), so ₹105.505 becomes ₹105.50 but ₹105.515 becomes ₹105.52 — the
direction depends on the preceding digit's parity. That is a defensible choice
for statistics and an odd one for tax. **Which of the two rules is correct for
Indian TDS is a business question this review cannot settle** — but they must not
both be live at once, which is what M-1 is.

---

### M-2 · Every frontend money total is a float sum — **MEDIUM**

25+ occurrences of the pattern `reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0)`.
Representative sites:

| File | Lines |
|---|---|
| `payments/PaymentManagementPage.jsx` | 311, 312, 392, 393, 394, 578, 583, 589 |
| `bank/BankManagementPage.jsx` | 275, 276, 279, 502, 567, 570 |
| `payments/paymentData.js` | 41, 42, 43, 46 |
| `reports/TrialSpendReport.jsx` | 91 |
| `reports/flagEngine.js` | 133, 134, 236, 265, 266 |
| `csr/CSRProjectDetailPage.jsx` | 205, 206 |

The classic `0.1 + 0.2 === 0.30000000000000004` error accumulates across the
batch. With rupee-and-paise values and batches in the tens-to-hundreds this shows
up as a batch total that is off by a paisa or two from the sum of its rows —
enough to make a reconciliation fail, not enough to be obviously a bug.

`PaymentManagementPage.jsx:392–394` is the one to care about: those float totals
are written into the **locally-faked batch object** in the `catch` branch (see
Pass 1.1, P-2), so they can end up being the only totals a user ever sees for
that batch.

**Mitigating factor:** these are display and local-fallback values only. The
authoritative totals in `PaymentBatchSerializer.create` come from a database
`Sum()` over `DecimalField`s and are exact.

---

### M-3 · Batch totals stop reconciling once a payment request is re-batched — **MEDIUM**

`PaymentBatch.total_gross/total_tds/total_net/payment_count` are **snapshots**
written once at creation:

```python
totals = prs.aggregate(total_gross=Sum('gross_amount'), ...)
batch = PaymentBatch.objects.create(..., payment_count=prs.count())
prs.update(batch=batch, status='Sent to Accounts')
```

They are never recomputed. Because `create()` puts no `batch__isnull=True` filter
on `prs` (Pass 1.1, P-1), an existing batch's payment requests can be reassigned
to a newer batch — at which point the old batch still reports its original
`total_gross` and `payment_count` while `batch.payment_requests` returns fewer
rows, or none.

**Test to prove it:** `SELECT b.batch_number, b.total_gross, b.payment_count,
COUNT(pr.id), SUM(pr.gross_amount) FROM payments_paymentbatch b LEFT JOIN
payments_paymentrequest pr ON pr.batch_id = b.id GROUP BY b.id HAVING
b.payment_count <> COUNT(pr.id);` — any row returned is a batch whose stored
total is a lie.

---

### M-4 · Two different definitions of "remaining balance" — **LOW**

Backend (`serializers.py::validate`) and `WorkOrder.remaining` (`models.py:67`):

```python
remaining = wo.amount - wo.paid_gross_amount
```

Frontend (`src/components/workorders/workOrderData.js:16–23`), for Periodic WOs:

```js
const unpaidCount = (parseFloat(wo.numberOfPeriods) || 0) - (wo.paidPeriods || []).length;
return unpaidCount * (parseFloat(wo.amountPerPeriod) || 0);
```

The frontend counts *unpaid periods × per-period amount*; the backend subtracts
*actual rupees paid*. These agree only while every period is paid at exactly
`amountPerPeriod`. A part-payment on one period, or a bounce that reverses
`paid_gross_amount` while `paidPeriods` is recomputed differently, makes the
client-side `canGoStep3` gate (`gross <= remaining`) and the server-side
`ValidationError` disagree about whether a payment is allowed.

Also note `parseFloat(wo.numberOfPeriods)` — a count, not money, but a float
multiply against `amountPerPeriod` all the same.

---

## What is clean

- **No `FloatField` in any model, in any app.** Verified by grep across all 231
  backend Python files.
- `net_amount = gross - tds_amount` in `Decimal` throughout the backend.
- The `Greatest(F('paid_gross_amount') - gross, Value(0))` reversals use an
  **int** `0` rather than `Decimal('0')`, with a comment explaining that SQLite
  binds `Decimal` as a string and `MAX(number, '0')` returns the string, zeroing
  the column. Someone found that the hard way and documented it — that is real
  engineering and it should not be "cleaned up" by a future refactor.
- `tta_backend/check_integrity.py` already exists and already re-derives
  `expected_tds = (gross_amount * tds_rate / Decimal('100')).quantize(Decimal('0.01'))`
  per PR (check [8], line 184–189) and cross-checks `TDSRecord.tds_amount ==
  PaymentRequest.tds_amount` (check at line 145). **Run it — it is a
  ready-made oracle for M-1 and M-3 against your live data.**

---

## ✓ Pass complete

- **Do I have a number?** 4 findings; 25+ float-typed money computations, 0
  float-typed money *columns*.
- **Have I seen one with my own eyes?** Yes — `PaymentRequestModal.jsx:357–360`
  and `payments/serializers.py:136` read side by side.
- **Do I know what the user experiences?** Yes — for M-1, a confirmation screen
  showing a net amount up to 50 paise away from what the bank actually pays.

**The one you must decide, not me:** is Indian TDS on these payments rounded to
the nearest rupee (frontend) or held to the paisa (backend)? Pick one and make
both sides use it. *Review can prove they disagree; only you know which is right.*
