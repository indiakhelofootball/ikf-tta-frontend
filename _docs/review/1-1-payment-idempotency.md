# Pass 1.1 — Payment idempotency

**Date:** 2026-08-03 · **Mode:** read-only · **CORE pass**

**Question:** can the same vendor be paid twice, and through which exact paths?

## Answer

**Yes. 6 unprotected paths.** One of them (P-1) is not hypothetical — it fires on
an ordinary network timeout, needs no unusual user behaviour, and the backend
does nothing to stop it.

**Count of unprotected paths: 6 (2 critical, 2 high, 2 medium).**
**Count of properly protected paths: 3** (listed at the end so you don't re-check them).

---

## The one that matters

### P-1 · A failed batch-list fetch silently re-arms every already-paid request — **CRITICAL**

This is a three-line chain and every link is in the code today.

**Link 1 — the silent catch.** `src/components/payments/PaymentManagementPage.jsx:247–253`

```js
const fetchBatches = () => {
  paymentBatchesAPI.getAll()
    .then((res) => { setSentBatches(res.batches || []); })
    .catch(() => { setSentBatches([]); });     // ← no toast, no error state
};
```

**Link 2 — "already sent" is computed *client-side* from that list.** Same file, `:281–295`

```js
const sentIds = useMemo(() => { ... sentBatches.forEach(b => b.payments.forEach(p => ids.add(p.id))) ... }, [sentBatches]);
const activePayments = useMemo(() => payments.filter(p => !sentIds.has(p.id)), [payments, sentIds]);
```

If `sentBatches` is `[]`, `sentIds` is empty, and **every payment request ever
made — including ones already sent to IDFC/ICICI — reappears in the active list.**
The screen looks completely normal. No error is shown, because link 1 swallowed it.

**Link 3 — the server does not second-guess it.**
`tta_backend/backend/payments/serializers.py`, `PaymentBatchSerializer.create`:

```python
prs = PaymentRequest.objects.filter(id__in=payment_ids)   # no status filter
...
prs.update(batch=batch, status='Sent to Accounts')        # reassigns batch FK
```

There is **no** `status='Draft'` filter and **no** `batch__isnull=True` filter. A
payment request that is already in a batch is silently moved into the new one.

**What the user experiences:** the Payments page loads normally after a slow
moment. Everything that has ever been paid is sitting in the active list. They
click *Send to Payment* → a bank file is generated containing vendors who were
already paid → it gets uploaded to IDFC → **those vendors are paid twice.**
Nothing in the app ever says anything went wrong.

**Why the trigger is realistic:** `/payment-batches/` has no pagination and
`prefetch_related('payment_requests__vendor', 'payment_requests__work_order')` —
it returns *every batch with every payment inside it*, growing forever. See Pass
4.3; this is exactly the class of endpoint that hits the 100-second Cloudflare
timeout. **The endpoint most likely to time out is the one whose failure re-arms
duplicate payments.**

---

### P-2 · Bank file is written *before* the batch is recorded, and failure is faked as success — **CRITICAL**

`PaymentManagementPage.jsx:360–401`

```js
const handleBankChosen = async (bank) => {
  setBankPicker({ open: false });
  const fileName = await downloadBankFormat(filtered, bank);   // ① file hits the user's disk
  if (!fileName) return;
  try {
    await paymentBatchesAPI.create({ paymentIds: filtered.map(r => r.id), fileName });  // ② server record
    ...
  } catch {
    // Fallback: save batch locally
    const batch = { id: `BATCH-${Date.now()}`, ... };
    setSentBatches(prev => [batch, ...prev]);        // ③ pretend it worked
    setPayments(prev => prev.map(p => filtered.some(f => f.id === p.id) ? { ...p, status: 'Sent to Accounts' } : p));
  }
  setExportModal({ open: true, fileName, count: filtered.length });   // ④ success modal either way
};
```

Order matters: **① always happens, ② may not.** If ② fails, the uploadable bank
file already exists on disk, the user sees the same success modal, and the server
still has those requests as `Draft` with `batch=NULL`. On the next page load the
local fake batch is gone (it was never persisted) and those requests are active
again — ready to be exported a second time. Same duplicate-payment outcome as
P-1, reached by a different door.

The success modal fires in both branches, so there is no moment at which the user
could know to check.

---

### P-3 · Nothing prevents two payment requests for the same Work Order slot — **HIGH**

`PaymentRequestSerializer.validate` is the *only* duplicate check, and it is a
balance check, not an identity check:

```python
remaining = wo.amount - wo.paid_gross_amount
if gross > remaining: raise ValidationError(...)
```

Consequences:

- **Two half-payments pass.** A ₹100,000 WO paid ₹50,000 twice for the same work
  passes both times — `remaining` is still ≥ the amount each time.
- **Periodic WOs have no period guard at all.** `validate()` never looks at
  `period_number`. `WorkOrderPeriod.is_paid` is *set* to `True` on create but is
  never *checked*, so the same period of a periodic Work Order can be paid any
  number of times until the WO total is exhausted.
- **`PaymentRequest.Meta` has no `UniqueConstraint`** — only four plain indexes on
  `vendor`, `work_order`, `status`, `batch`. The only unique column is
  `request_number`, which is auto-generated fresh each time and therefore never
  collides for a genuine duplicate.

**What prevents a double-click:** `PaymentRequestModal.jsx:389`
(`const [submitting, setSubmitting] = useState(false)`, button
`disabled={submitting || !canGoStep3}` at `:931`). That is a disabled button —
**per your own plan's rule, that is not protection.** It stops the fast double-tap
and nothing else: two browser tabs, a retried request, or a user who reopens the
modal after a slow save all get through.

---

### P-4 · Concurrent creates race the balance check (TOCTOU) — **HIGH**

`create()` correctly uses `F('paid_gross_amount') + gross` so the *increment* is
atomic — that part is well done. But `validate()` reads `wo.paid_gross_amount`
outside the transaction, with no `select_for_update()`. Two requests arriving
together both read the pre-payment balance, both pass validation, and both
commit. `paid_gross_amount` ends up **over** `wo.amount`, which no code path
checks for afterwards.

Same shape in `_generate_request_number()`:

```python
last = PaymentRequest.objects.order_by('-id').first()
next_num = int(match.group(1)) + 1
```

read-then-write with no lock. Here the `unique=True` on `request_number` *does*
save you — the loser gets an `IntegrityError`, which `create()` catches and turns
into *"Duplicate request number generated. Please try again."* That is the one
place a real database constraint is doing the work. Note the same generator in
`PaymentBatchSerializer._generate_batch_number()` has **no** matching
`try/except IntegrityError`, so a batch-number collision surfaces as a 500.

---

### P-5 · Concurrent status PATCHes double-reverse the paid amount — **MEDIUM**

`PaymentRequestSerializer.update()` guards the bounce reversal with
`if new_status == 'Payment Bounced' and old_status != 'Payment Bounced'`. That is
a correct guard against *sequential* repeats — a second "Mark Bounced" is a no-op.

But the read of `instance` is not locked. Two concurrent PATCHes both see
`old_status='Payment Done'`, both pass, and the reversal
`Greatest(F('paid_gross_amount') - instance.gross_amount, 0)` runs twice. The
`Greatest(..., 0)` clamp means the WO's paid amount silently floors at 0 instead
of going negative — so the corruption is *invisible* rather than obvious.

Contributing factor: none of the four action handlers in
`src/components/bank/BankManagementPage.jsx` (`markDone:180`, `markBounced:194`,
`handleBounceEdit:208`, `handleStatusCorrection:255`) has a `submitting` guard or
a `disabled` prop. Every one of them is double-clickable.

---

### P-6 · "Offline" fallbacks report success for writes that never happened — **MEDIUM**

Three handlers catch a failed write and mutate local state as if it had
succeeded, with a toast that says the operation worked:

| File · line | Handler | Toast on failure |
|---|---|---|
| `PaymentManagementPage.jsx:334` | `handlePaymentUpdate` | `'Payment request updated (offline)'` |
| `PaymentManagementPage.jsx:346` | `handlePaymentDelete` | `'Payment request deleted (offline)'` |
| `BankManagementPage.jsx:243` | `markTDSDeposited` | `` `TDS for ${month} marked as deposited (offline)` `` |

The third is the worst: **it marks TDS as deposited to the government in the UI
when the server was never told.** The operator closes the loop in their head, the
record stays `Pending` on the server, and the discrepancy only shows up at filing
time. There is no offline queue anywhere in the codebase that would ever replay
these — the word "offline" describes a feature that does not exist.

---

## Paths that ARE protected (verified — don't re-audit these)

| Path | What protects it | Verdict |
|---|---|---|
| Un-bounce (`Payment Bounced` → `Payment Done`/`Sent to Accounts`) | Explicit `if instance.bounce_resolved: raise` **and** a `retry_qs.exists()` check that looks for a replacement PR on the same WO slot | **Genuinely guarded.** The best-defended code in the payments app — it reads like it was written after the Carpenter Work incident. One narrow gap: for non-periodic WOs the retry lookup matches on `gross_amount=instance.gross_amount`, so a retry raised for a *different* amount is not detected. |
| Duplicate `request_number` | DB `unique=True` + `IntegrityError` handler | **Real constraint.** Works. |
| Delete a payment request | `destroy()` reverses `paid_gross_amount` inside `transaction.atomic()`, unmarks the period, recomputes WO status, cascades the TDS record | Correct. The `Value(0)` int-vs-Decimal comment on the `Greatest` clamp shows someone already debugged this properly. |

---

## ✓ Pass complete

- **Do I have a number?** 6 unprotected paths, 3 protected.
- **Have I seen one with my own eyes?** Yes — P-1 was read end to end across
  `PaymentManagementPage.jsx:247–295, 360–401` and
  `payments/serializers.py::PaymentBatchSerializer.create`.
- **Do I know what the user experiences?** Yes — for P-1 and P-2, a normal-looking
  screen and a success modal, followed by a vendor being paid twice.

**The single sentence for triage:** *the only thing standing between this app and
a duplicate bank transfer is a client-side `Set` built from an API call whose
failure is silently swallowed.*
