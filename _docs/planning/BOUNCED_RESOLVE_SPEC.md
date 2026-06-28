# Bounced Payment — "Resolved" Button (item #15)

**Goal:** replace the broken, destructive bounced-cleanup with a non-destructive
**Resolved** action. A bounced payment that has actually been settled (in-system retry,
or paid externally / over WhatsApp) gets marked **Resolved**, leaves the "Needs
Resolution" list, and is preserved in **Past Payments** badged *"Bounced → Resolved."*
Nothing is deleted — matches the org rule "nothing gets deleted, it moves to past."

**Why today is broken** (confirmed in code): the bounced list = work orders with any PR in
`status='Payment Bounced'` (`workorders/serializers.py:122`, `WorkOrderManagementPage.jsx:104`).
A bounced PR's status is **never cleared** by a retry (a retry is a *new* PR), and
`PaymentRequest` has **no "resolved" concept** — only `status`. So a WO that bounced once
stays in the list forever, and all three exits (Remove / Delete / Raise Payment) are blocked
once a real payment exists. See `tds_double_count_diagnosis.md` and the bounced-flow trace.

---

## 1. The two cases the button MUST distinguish (critical)

"Resolved" means different things depending on whether the work order was already paid
**inside** the system. Getting this wrong double-counts money or TDS.

| Case | Situation | What "Resolved" must do |
|---|---|---|
| **A — Already paid in-system** | The bounced PR was retried with a **new successful PR** in the app (the video case: WO shows *Fully Paid + Bounced*). The retry already added gross and booked its own (real) TDS. | **Dismiss only.** Mark the bounced PR resolved. **Do NOT touch WO gross. Do NOT touch TDS** (bounced PR's TDS stays voided; the retry's TDS is the real one). |
| **B — Paid externally (manual)** | No retry PR in the app; settled from another account / over WhatsApp. WO gross was reversed on bounce and never restored. | **Treat as paid.** Restore WO gross (re-add, re-mark period, recalc status) **and reinstate the original TDS** (un-void), unless paid with no TDS. |

The dialog picks the default from WO state and lets the user confirm (see §4).

---

## 2. Data model — `PaymentRequest` (additive migration)

Keep `status='Payment Bounced'` (the historical fact). Add the resolution layer:

```python
# payments/models.py — new fields
bounce_resolved      = models.BooleanField(default=False)
bounce_resolution    = models.CharField(max_length=20, blank=True, default='')
                       # '' | 'in_system' | 'external'
bounce_resolved_note = models.CharField(max_length=300, blank=True, default='')
bounce_resolved_at   = models.DateTimeField(null=True, blank=True)
bounce_resolved_by   = models.ForeignKey('accounts.User', null=True, blank=True,
                                          on_delete=models.SET_NULL)
bounce_tds_retained  = models.BooleanField(null=True)   # Case B only; needed so un-resolve
                                                        # knows whether to re-void the TDS
```

Six fields, one migration, all additive. No status enum change, so existing rows are untouched.

---

## 3. Flow edits (what changes in the lists)

1. **Needs Resolution count + bounced periods** — BOTH sibling methods in
   `workorders/serializers.py` filter on bounced status and BOTH must exclude resolved, or the
   count drops but the period still renders bounced:
   ```python
   # get_bouncedPaymentCount (:121)
   obj.payment_requests.filter(status='Payment Bounced', bounce_resolved=False).count()
   # get_bouncedPeriods (:124) — SAME filter, easy to miss
   obj.payment_requests.filter(status='Payment Bounced', bounce_resolved=False,
                               period_number__isnull=False).values_list('period_number', flat=True)
   ```
2. **Past Payments** — surface PRs where `bounce_resolved=True` with a
   **"Bounced → Resolved"** badge (and the note + who/when).
3. The destructive **Remove** (`resolve-bounced`, hard delete) is **retired from the normal
   flow** — kept only behind super-admin for a genuinely all-bounced junk WO, or removed
   entirely. "Resolved" is the everyday action.

---

## 4. Backend — new endpoint (reuses the un-bounce engine)

`POST /api/payments/{id}/resolve/`  ·  body `{ mode, tds_retained, note }`
where `mode ∈ {'in_system','external'}`, `tds_retained ∈ bool` (only used for `external`).

```python
# Financial mutation (restores gross, reinstates TDS) → gate on the PAYMENTS grant
# server-side, NOT workorders. The hidden button is not the security boundary.
@action(detail=True, methods=['post'], url_path='resolve',
        permission_classes=[IsAuthenticated, ModulePermission])
# set permission_module = 'payments' on the view (or a per-action check)
def resolve(self, request, pk=None):
    pr = self.get_object()
    if pr.status != 'Payment Bounced' or pr.bounce_resolved:
        return Response({'detail': 'Not an unresolved bounced payment.'}, status=400)

    mode = request.data.get('mode')              # 'in_system' | 'external'
    note = request.data.get('note', '')
    tds_retained = None
    with transaction.atomic():
        if mode == 'external':
            # Case B: payment really happened off-system → restore like un-bounce
            WorkOrder.objects.filter(id=pr.work_order_id).update(
                paid_gross_amount=F('paid_gross_amount') + pr.gross_amount)
            wo = pr.work_order
            if pr.period_number and wo.type == 'Periodic':
                WorkOrderPeriod.objects.filter(
                    work_order=wo, period_number=pr.period_number).update(is_paid=True)
            wo.refresh_from_db()
            wo.status = ('Fully Paid' if wo.paid_gross_amount >= wo.amount
                         else 'Partially Paid')
            wo.save(update_fields=['status'])
            tds_retained = bool(request.data.get('tds_retained', True))
            if tds_retained:
                # the deduction really happened → reinstate the ORIGINAL record (single update)
                TDSRecord.objects.filter(payment_request=pr).update(voided=False)
            # else: leave it voided (paid full gross, no TDS taken)
        # Case A ('in_system'): dismiss only — touch NOTHING financial.

        pr.bounce_resolved = True
        pr.bounce_resolution = mode
        pr.bounce_tds_retained = tds_retained          # persisted for un-resolve
        pr.bounce_resolved_note = note
        pr.bounce_resolved_at = timezone.now()
        pr.bounce_resolved_by = request.user
        pr.save(update_fields=['bounce_resolved','bounce_resolution','bounce_tds_retained',
                               'bounce_resolved_note','bounce_resolved_at','bounce_resolved_by'])
    return Response({'detail': 'Resolved.'}, status=200)
```

The `external` branch is literally the existing un-bounce logic (`serializers.py:223-241`) —
restore gross, re-mark period, recalc status, un-void TDS — just triggered by Resolve and
recorded as resolved instead of silently flipped to "Payment Done".

### TDS — the rule, stated once
- **One disbursement → one TDS record.** We **never create a new TDS** on resolve.
- Case A: the retry already booked the real TDS; the bounced PR's TDS stays **voided**.
- Case B + `tds_retained`: **un-void the original** record → it counts again (correct month,
  section, amount — exactly as first computed). No double-count (this is the same `voided`
  mechanism that fixed #5).
- Case B + paid full gross with no TDS: leave it **voided**.

---

## 5. Frontend

**Card (`WorkOrderCard.jsx`)** — on a bounced WO, replace the red destructive **Remove** with
a **Resolved** button (`canEdit('workorders')`). Keep View/Edit/PDF/Raise Payment as-is.

**Resolve dialog** (opens on click), context-aware default:
- If `wo.status === 'Fully Paid'` (paid by another PR) → default **Case A**:
  *"This work order is already fully paid. Mark the bounced payment as Resolved and move it to
  Past Payments? No amount or TDS will change."*
- Else → default **Case B**:
  *"Mark as Resolved — paid externally? This records the work order as paid and reinstates the
  TDS deduction."* with a toggle **[ TDS was deducted ✓ | Paid in full, no TDS ]** and an
  optional note field.

**Past Payments** — bounced+resolved PRs appear with a grey/green **"Bounced → Resolved
(manual)"** chip, showing the note, resolver, and date. Read-only history.

`api.js`: add `paymentRequestsAPI.resolve(id, body)` → `POST /payments/{id}/resolve/`.

---

## 6. Edge cases

- **Un-resolve** (mistake): allow reverting `bounce_resolved=False`. For a Case B resolve, fully
  mirror the restore: subtract the gross back off the WO, **re-unmark the period** (`is_paid=False`),
  recalc WO status, and **re-void the TDS only if `bounce_tds_retained` was True** (that's why we
  persist it). Keep it super-admin.
- **Multiple bounced PRs on one WO**: resolve acts per PR; the WO leaves Needs Resolution only
  when **all** its bounced PRs are resolved.
- **Partial external payment**: `external` re-adds the PR's gross; if it doesn't fully cover the
  WO, status becomes `Partially Paid` (handled by the recalc).
- **Audit**: `bounce_resolved_by` + `_at` + `_note` give a trail of who resolved what and why,
  without tracking the off-system WhatsApp process you don't want to record.

---

## 7. Build steps

1. Migration: add the 5 `PaymentRequest` fields.
2. `get_bouncedPaymentCount` → filter `bounce_resolved=False`.
3. `resolve` endpoint (above) + `paymentRequestsAPI.resolve`.
4. Card: swap Remove → Resolved; build the context-aware dialog with the TDS toggle.
5. Past Payments: resolved-bounced badge + note/resolver/date.
6. Tests: Case A (no gross/TDS change), Case B with TDS (gross restored + TDS un-voided once),
   Case B no-TDS (stays voided), un-resolve reversal, count drops out of Needs Resolution.
7. Retire/guard the destructive `resolve-bounced` Remove.

**Net effect:** the bounced list reflects *open* work, not history; resolving is one click and
non-destructive; the work order shows correctly paid; and TDS stays exactly right — one record,
reinstated only when the money truly moved.

---

## 8. Downstream consumers & gaps (found by code audit)

Every place that keys off `status='Payment Bounced'` must become resolve-aware, or the symptom
moves instead of clearing. Verified in code:

**Mandatory (or the list/flags won't actually clear):**

1. **`get_bouncedPeriods`** (`workorders/serializers.py:124`) — patched in §3 alongside its
   sibling. Miss it and the count drops but the **period still renders bounced** on the WO.
2. **Payment-Audit flag engine** (`src/components/reports/flagEngine.js`) keys on raw status:
   - `RETRY_OF_BOUNCED` (`:204-206`) — retry PR stays badged "Retry of bounced" forever.
   - `DOUBLE_BOUNCE` (`:214-216`) — red "Multi-bounce" flag fires forever.
   Fix: pass `bounce_resolved` through to the PR objects the engine reads and **exclude resolved
   bounces** from both `bouncedSiblings` and `allBouncedHere`.

**Decisions — RESOLVED (owner, this turn):**

3. **Reports treat-as-paid: YES.** Owner: *"when resolved it was paid; when deleted it was just
   rotten."* So a `bounce_resolution='external'` PR **counts as paid** in Payment-Audit /
   Vendor-Audit / Trial-Spend — those reports check `bounce_resolved + resolution`, not just
   status. **Delete** remains the "never happened / junk it" path (no paid credit).
4. **Backend permission: `payments` grant.** `resolve` is a financial mutation, so it's gated on
   the `payments` grant server-side (not workorders). Set `permission_module='payments'` on the
   action.
5. **TDS month: ORIGINAL month.** The reinstated record keeps its original month (ledger-accurate).
   Note for whoever files TDS: a late resolution reactivates a deduction in a possibly-already-
   filed month — reconcile manually if needed.
6. **Auto-resolve: NO — manual.** Every clear is a deliberate human click; no auto-resolve hook
   on successful retry.

### TDS — registered once, never twice (owner-confirmed model)

TDS is registered **once**, when the PR is first raised, and stays registered. The system never
creates a second TDS, and the re-payment (retry or external) carries **no new TDS** — it is just
the **net** amount re-sent to the vendor. The only reason the bounce path *voids* the record is
defensive: at bounce time we can't know whether an in-system retry will book a fresh TDS.
- **Case A** (in-system retry): retry books its own TDS; the original stays voided → one TDS.
- **Case B** (external): no retry, so the **original single registration** is un-voided → one TDS.
Either way: **exactly one TDS, ever.** Never two, never zero. "Reinstate" = restore the one
registration the bounce defensively voided, not a new deduction.

**Build-step additions:** patch `get_bouncedPeriods` (step 2), update `flagEngine.js` to exclude
resolved bounces (new step), set `permission_module='payments'` on resolve (step 3), and make
Payment-Audit / Vendor-Audit / Trial-Spend treat `bounce_resolution='external'` as paid (§8.3).
No auto-resolve hook (§8.6 = manual).
