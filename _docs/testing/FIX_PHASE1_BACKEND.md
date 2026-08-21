# Phase 1 backend — TDS correctness (N2, N3)

Scope: `payments/views.py` and `payments/serializers.py` only. No migrations,
no data-flow change, no commit, no push.

Baseline before any edit: 143 tests pass (`payments`, dev_local_settings).

## Status

- [x] N2 — cancelled TDS can be marked deposited — DONE
      `payments/views.py` `mark_deposited`: added `voided=False` to the bulk
      update filter, so the update set matches what `get_queryset()` shows and
      the returned `updated` count is accurate to what actually changed.
- [ ] N3 — Bounced -> Draft -> Done loses TDS forever
- [ ] regression tests
- [ ] full `manage.py test payments` re-run

- [x] N3 — Bounced -> Draft -> Payment Done loses TDS forever — DONE
      `payments/serializers.py`: the un-bounce branch condition widened from
      `new_status in ('Payment Done', 'Sent to Accounts')` to "any non-bounced
      status". The gross re-add + its two guards are nested unchanged under an
      inner `if new_status in ('Payment Done', 'Sent to Accounts')`; the TDS
      un-void moved out to the widened branch.

- [x] full `manage.py test payments` re-run after both fixes: **143 tests, OK**

- [x] regression tests — `payments/test_tds_flow_map.py` T11-T15
      - T11 Bounced -> Draft -> Payment Done leaves TDS ACTIVE (the branch that
        was broken and untested)
      - T12 Sent to Accounts exit still restores
      - T13 the retry guard still 400s, gross unchanged, record still voided
      - T14 Draft exit un-voids TDS but re-adds NO gross
      - T15 `mark_deposited` skips voided records; count matches the ledger;
        the voided record stays Pending with no deposited_date

- [x] final run: **148 tests, OK** (143 baseline + 5 new)

---

## N3 reasoning — why the TDS un-void is NOT subject to the money guards

The invariant `voided` is supposed to encode is stated in `views.py:224`:
*"Exclude voided records (their PR bounced)"*. So `voided` means **this payment
request is currently bounced** — a property of the PR's present status, not a
history flag. The defect is that the write side treated it as one-way: set on
entry to Bounced, cleared only on two of the four possible exits.

The two guards at the old `:266-280` protect a different thing: **re-adding
`paid_gross_amount` to the work order**. `bounce_resolved` means the money was
settled some other way; a retry PR on the same slot means another PR already
carries the gross. Adding the gross back in either case double-counts real
money. That risk is entirely specific to the `WorkOrder.paid_gross_amount +=`
statement — so those guards stay welded to it. The gross re-add and both guards
are now nested, byte-for-byte unchanged, under an inner
`if new_status in ('Payment Done', 'Sent to Accounts')`.

Un-voiding on a move to **Draft** does not re-add gross, and does not need the
guards, for three reasons:

1. **It restores a state the system already produces normally.** A newly created
   Draft PR books a non-voided TDS record at creation (`create()`, the fork into
   Store B). Draft + active TDS record is the ordinary baseline. Draft + voided
   record is a state nothing else in the codebase can produce, and nothing reads
   it correctly.
2. **The guards' failure mode does not exist here.** They exist to stop the same
   rupee being counted twice as paid. A Draft PR is not paid, moves no money,
   and does not change the WO total. Applying them would mean raising a
   ValidationError on a Bounced -> Draft transition — that blocks a transition
   the UI offers, i.e. a data-flow/product change, which is out of scope under
   the standing instruction.
3. **Leaving it voided is the strictly worse error.** The measured live case had
   `status: Payment Done, tdsAmount: 1000.00, voided: True` — a statutory
   deduction owed and invisible to every total and every read endpoint. There is
   no corresponding harm on the other side: an over-active record on a Draft PR
   is visible in `/api/tds/` and is caught by the existing
   `audit_tds_duplicates` / `dedupe_tds_records` tooling (already covered by
   T10).

Ordering matters and is deliberate: both guards `raise` **inside** the
`transaction.atomic()` block and **before** the un-void statement, so a blocked
un-bounce (resolved bounce, or a retry occupying the slot) still ends with the
record voided and the gross untouched. T13 asserts exactly that, so the guard
cannot be silently weakened later.

Also unchanged: `new_status` must be truthy and not `'Payment Bounced'`. A PATCH
that omits `status` (a notes-only edit on a bounced PR) is not a transition and
does not un-void.
