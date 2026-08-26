# Payment test cases — verification log

Verified 2026-08-21 against local dev (backend :8000, frontend :3000), super@demo.com.
Method: API (curl) + source reading. No browser.

| Case | Result |
| --- | --- |
| TC-PAY-01 | CONFIRMED — passes |
| TC-PAY-02 | CONFIRMED — passes |
| TC-PAY-06 | CONFIRMED defect (wording corrected) |

---

## TC-PAY-01 — Create a payment request against a work order

**CONFIRMED. Passes.**

`POST /api/payment-requests/` with `{workOrderId:9, vendorId:36, grossAmount:"10000.00", tdsRate:"2.00", invoiceDate:"2026-08-21"}` returned 201:

```
id 9, requestNumber "PR-2026-065", grossAmount 10000.00,
tdsRate 2.00, tdsAmount 200.00, netAmount 9800.00, status "Draft"
```

- TDS and net are computed server-side, not trusted from the client — `payments/serializers.py:151-157`.
- Request number auto-generated when omitted — `payments/serializers.py:124-134`.
- Work order WO-CO-DE-001 (id 9) moved from `paidGrossAmount 0.00` to `10000.00` against `amount 50000.00`, i.e. remaining 40000.00. The increment is an atomic `F()` update inside the same transaction — `payments/serializers.py:168-170`.
- Overpayment is blocked before any of this: `validate()` rejects a gross above `wo.amount - wo.paid_gross_amount` — `payments/serializers.py:136-147`.
- Side effect confirmed: a `TDSRecord` was created (id 5, rate "2.00%", gross 10000.00, tds 200.00, month "Aug 2026"), `payments/serializers.py:187`. This is the first TDSRecord in the dev DB — the seeded payments bypassed the serializer, which is why the table read as empty before this run.

The link back to the payment request and work order is exposed as `prId` and `woNumber`, not `paymentRequestId`/`workOrderNumber` — `payments/serializers.py:308, 311`.

## TC-PAY-02 — Batch payments and produce the bank file

**CONFIRMED. Passes.** Verified by API for the batching half and by unit test + reference-file inspection for the file half. The download itself was not exercised in a browser (no browser in this run) — the workbook builders were verified directly instead, which is where all the format logic lives.

### Batching (API)
`POST /api/payment-batches/` with `{paymentIds:[9], fileName:"IDFC_BLKPAY_TTA_2026-08-21.xlsx"}` returned:

```
id 1, batchNumber "BATCH-2026-001", paymentCount 1,
totalGross 10000.00, totalTds 200.00, totalNet 9800.00
```

Totals are aggregated server-side from the payment requests, not sent by the client — `payments/serializers.py:399-403`. The batched request flipped `Draft` to `Sent to Accounts` and picked up the batch FK — `payments/serializers.py:416`. The work order's status is recomputed from paid-vs-amount in the same call — `payments/serializers.py:418-423`.

### IDFC / BLKPAY file — `src/utils/blkpayExcel.js`
`CI=true npx react-scripts test --testPathPattern=blkpayExcel` — 8 tests, all pass. The suite is a genuine parity test: it opens `_docs/excel/BLKPAY_070426.xlsx` and compares the generated sheet cell by cell, including the blue `#BDD7EE` header fill, the `#DEEBF7` instruction row, the bank's exact instruction text, and the `@` number format on column B.

Debit account is pre-filled: column E is hardcoded to `10064068880` on every data row — `src/utils/blkpayExcel.js:83`. (Note the reference file ships with E empty; the test asserts the generated row matches the reference *except* E, which we fill deliberately.)

16 headers A:P, `NEFT` in the transaction-type column, `INR` currency, date as DD/MM/YYYY, amount as a real number — `src/utils/blkpayExcel.js:24-40, 78-90`.

### ICICI / NPAB file — `src/utils/iciciExcel.js`
No unit test exists for this builder; verified by reading it against the reference workbook.

Debit account is pre-filled: `DEFAULT_DEBIT_ACC = '092701004321'` written to column C of every data row — `src/utils/iciciExcel.js:19, 87`. That value matches the reference: `_docs/excel/ICICI_BLK_220426.xlsx`, sheet `Converter`, cell D2 carries `092701004321` under the label "Account No (12 Digit)", against corporate ID "KHELO FOOTBALL ECOSYSTEM DEVELOPMENT FEDERATION".

19 headers A:S in the bank's order with its own cell-comment guidance attached, `PAB_VENDOR` / `NEFT` prefilled in A and B, amount with `0.00` numFmt, PYMT_DATE as DD-MM-YYYY text, sheet protection applied — `src/utils/iciciExcel.js:22-40, 84-131`.

### Download path
`downloadBankFormat()` branches on bank and emits two files per batch: the bank file (`NPAB_FMT_<DDMMYY>.xlsx` or `IDFC_BLKPAY_TTA_<date>.xlsx`) plus the internal `PAYMENT_DETAILS_TTA_<date>.xlsx` — `src/components/payments/PaymentManagementPage.jsx:94-118`.

Gap worth noting: the IDFC builder has parity tests, the ICICI one has none. The ICICI format is asserted only by the comments in the file.

## TC-PAY-06 — Resolving a bounced payment

**CONFIRMED as a defect, with one correction to how it is worded.**

### What was run
1. `POST /api/payment-requests/` → id 10, `PR-2026-066`, gross 5000.00, tdsRate 1.00, tds 50.00, against WO id 8 (`WO-CSR-2026-014`, amount 900000.00). WO paid went 0.00 → 5000.00.
2. `PATCH /api/payment-requests/10/` `{"status":"Payment Bounced"}` → 200. WO paid went 5000.00 → **0.00**.
3. `POST /api/payment-requests/10/resolve/` with `{}` → 200 `{"detail":"Resolved."}`.
4. Re-read the payment request:

```
status "Payment Bounced", bounceResolved true,
bounceResolution "in_system", bounceResolvedNote "",
bounceResolvedBy "Super Admin"
```

5. Re-read WO 8: `paidGrossAmount 0.00`, status `Issued`.

### Finding 1 — no reason is sent. CONFIRMED.
The endpoint reads `request.data.get('mode') or 'in_system'` and `request.data.get('note', '')` — `payments/views.py:169-170`. With an empty body it therefore always stores `in_system` and an empty note, exactly as observed.

The UI sends an empty body. The only call site is `handleResolveBounced` in `src/components/workorders/WorkOrderManagementPage.jsx:336`:

```js
await Promise.all(prs.map((p) => paymentRequestsAPI.resolve(p.id || p._id)));
```

`paymentRequestsAPI.resolve(id, body = {})` defaults to `{}` — `src/services/api.js:753-757`. The confirmation step above it is a bare `window.confirm` with fixed text (`WorkOrderManagementPage.jsx:322-327`) — no reason field, no mode choice, no note. So every resolve in the product is `in_system` with a blank note. Nothing in the payments module offers a resolve action at all; `PaymentDetailDialog.jsx:91-98` only *displays* the resolution after the fact, and it renders `bounceResolvedNote`, which is always empty.

### Finding 2 — the external path does not exist. CONFIRMED.
`resolve()` writes five fields and returns — `payments/views.py:168-177`. There is no branch on `mode`. Passing `mode: "external"` would be stored as a label and change no money. There is no code path anywhere that restores gross or un-voids TDS on resolve.

### Correction to the wording in the doc
The doc says the resolve leaves "the work order still shows it unpaid", implying resolve failed to restore something. Precisely: the work order was already reset to unpaid **by the bounce**, not by the resolve. The bounce handler deliberately reverses `paid_gross_amount` (`payments/serializers.py:222-231`) and voids the TDS record. `resolve` is dismiss-only by design and documented as such in its own docstring (`payments/views.py:154-157`): it clears the item off the "Needs Resolution" worklist and nothing else. The gap is that the intended Phase-2 "external" mode — for a bounce settled off-system, where the amount *should* come back — was never built, so a work order settled outside the system has no way to show as paid.

### Reconciling with `payments/test_bounce_resolve.py`
The tests do not contradict any of this. They assert the dismiss-only contract and nothing about a reason: `paid_gross_amount` unchanged by resolve (line 95), bounced TDS stays voided (99), the PR is not deleted (100), it drops out of the bounced count (78), a second resolve is rejected 400 (111), a retry PR is untouched (145). No test asserts `bounce_resolution`, `bounce_resolved_note`, or a mode branch — the untested surface is exactly the defective one. The tests pass and the product is still wrong, because they encode the built behaviour rather than the intended one.

### To close it
Two changes, neither large: give the resolve action a reason/note input and pass a body from `handleResolveBounced`, and implement the `external` branch in `payments/views.py:168` so it re-adds gross to the work order and un-voids the TDS record.

---

## Test data created and cleaned up

Created: payment requests id 9 (`PR-2026-065`) and id 10 (`PR-2026-066`), TDS records for both, and batch `BATCH-2026-001`.

Both payment requests were deleted (204). The delete path reverses the work order paid amount, so WO 8 and WO 9 are both back to `paidGrossAmount 0.00`, status `Issued` — their pre-test state. TDS record count is back to 0.

**One leftover:** `BATCH-2026-001` still exists, now empty (`paymentCount 0`, `totalGross 0.00`). The batch viewset allows no DELETE — `http_method_names = ['get', 'post', 'head', 'options']`, `payments/views.py:192`. Removing it needs a shell/DB delete. It is inert, but it will show as an empty batch in Past Payments.

Payment request id 7 was not read, modified, or deleted.
