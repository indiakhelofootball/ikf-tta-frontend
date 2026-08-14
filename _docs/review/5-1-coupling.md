# Pass 5.1 — Shared-state dependency map

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** if I change X, what else is affected? — answerable *before* editing.

## Answer

**Five shared-state hotspots where two or more modules write the same value with
no single owner.** These are your fix-A-breaks-B sites, and every one of them is a
place where something is *both derived and directly settable*.

**Count: 5 hotspots (2 high, 2 medium, 1 low) + 4 one-way dependencies that are
safe.**

---

## The map

```
                    ┌──────────────────────────────────────────────┐
                    │  permissions/  (registry · rules · enforce)   │
                    │  ── code constants, no shared mutable state ──│
                    └───────────────────┬──────────────────────────┘
                                        │ reads only
   ┌────────────────────────────────────┼────────────────────────────────┐
   │                                    │                                │
┌──▼──────────┐   writes   ┌────────────▼─────────┐  writes   ┌──────────▼────────┐
│  vendors    │◄───────────┤   payments (PR/Batch)├──────────►│    workorders     │
│             │  bank-det. │                      │  ★ H-1    │                   │
│  PII source │            │  ★ H-2 status writer │           │ ★ H-1 paid_gross  │
└──┬──────────┘            └──────┬───────────────┘           │ ★ H-3 status      │
   │ read by                      │ writes                    └──────┬────────────┘
   │                        ┌─────▼──────┐                           │ read by
   │                        │ TDSRecord  │                           │
   │                        │ ★ H-4 month│                           │
   │                        └────────────┘                           │
   ▼                                                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│  reports/  — reuses ALL the above serializers verbatim (read-only)      │
│  so any serializer field change silently changes 5 report payloads      │
└────────────────────────────────────────────────────────────────────────┘

FRONTEND
┌──────────────────┐        ┌─────────────────────┐      ┌──────────────────┐
│ AuthContext      │───────►│ adminStorage        │◄─────│ every form's     │
│ perms · user     │ calls  │ _cache (module-level│ reads│ dropdowns        │
│ ★ H-5 fail-open  │        │  mutable) ★ owned   │      │                  │
└──────────────────┘        └─────────────────────┘      └──────────────────┘
```

---

## The five hotspots

### H-1 · `WorkOrder.paid_gross_amount` — five writers, no owner — **HIGH**

| Writer | File | Operation |
|---|---|---|
| PR create | `payments/serializers.py` `create()` | `F('paid_gross_amount') + gross` |
| PR bounce | `payments/serializers.py` `update()` | `Greatest(F(...) - gross, Value(0))` |
| PR un-bounce | `payments/serializers.py` `update()` | `F('paid_gross_amount') + gross` |
| PR delete | `payments/views.py` `destroy()` | `Greatest(F(...) - gross, Value(0))` |
| (read, for validation) | `payments/serializers.py` `validate()` | `remaining = wo.amount - wo.paid_gross_amount` |

Five sites in the **payments** app mutating a column on the **workorders** model,
plus a validator that reads it outside any lock. Nothing in `workorders/` owns it;
nothing recomputes it from the payment requests.

**What breaks what:** any change to how a payment request is created, deleted, or
transitions status must update all five, in step, or `paid_gross_amount` silently
diverges from `SUM(payment_requests.gross_amount)`. The `Greatest(..., 0)` clamp
means divergence shows up as a *plausible* number rather than an obviously wrong
one (Pass 1.1, P-5).

**Before editing any payment flow, run:**

```sql
SELECT wo.id, wo.work_order_number, wo.paid_gross_amount,
       COALESCE(SUM(CASE WHEN pr.status <> 'Payment Bounced' THEN pr.gross_amount END), 0) AS derived
FROM workorders_workorder wo
LEFT JOIN payments_paymentrequest pr ON pr.work_order_id = wo.id
GROUP BY wo.id
HAVING wo.paid_gross_amount <> derived;
```

Any row returned is existing drift. `tta_backend/check_integrity.py` already
implements checks of this shape — **it is the closest thing you have to a
characterisation test for Phase D, and it exists today.**

### H-2 · `PaymentRequest.status` — derived by the engine, writable by the client — **HIGH**

`status` is set by `PaymentBatchSerializer.create` (→ `'Sent to Accounts'`), by the
bounce/un-bounce branches, and by **any client PATCH**, because it sits in
`Meta.fields` with no `read_only` and `update()` does not pop it (Pass 1.4, SM-2).

Three independent authors, no state machine, no transition guard. This is the
canonical shape of "I fixed the bank screen and the payments screen broke":
`BankManagementPage` PATCHes status directly, `PaymentManagementPage` changes it
via batch creation, and the serializer changes it as a side effect of a bounce.

### H-3 · `WorkOrder.status` — same shape, four writers — **HIGH**

Recomputed from `paid_gross_amount` in four places (PR create-via-batch, bounce,
un-bounce, delete) **and** writable by client PATCH (Pass 1.4, SM-5). A client
write sticks until the next payment event silently overwrites it.

`Completed` and `Cancelled` are declared in `STATUS_CHOICES` and written by no code
path — reachable only by PATCH, and understood by nothing downstream. **A
`Cancelled` work order can still be paid.**

### H-4 · `TDSRecord.month` — a denormalised string with no back-reference — **MEDIUM**

Written once at `TDSRecord` creation from `pr.invoice_date.strftime('%b %Y')`.
`PaymentRequest.invoice_date` remains editable afterwards, and nothing updates the
TDS record. `mark_deposited` filters on string equality against this field.

So `payments` owns the value, `bank` (the same module, different screen) queries it,
`reports` aggregates it, and **the source of truth it was derived from can change
underneath all three.** Full analysis in Pass 4.6, D-4.

### H-5 · `AuthContext.perms` — one null value, two opposite failure modes — **MEDIUM**

`perms` is written in exactly one place (`AuthContext.jsx:45`) and read by
`useGrants`, `GrantedRoute`, `Sidebar`, `DashboardHome` and every screen calling
`canView`/`canEdit`. **Single writer — good.**

The coupling problem is the *meaning* of `null`. `perms === null` means both "not
loaded yet" and "load failed", and the two consumers resolve it oppositely:
`legacyAdmin` grants an ADMIN everything, and denies a granted non-admin
everything (Pass 2.1, A-2). One ambiguous value, two contradictory behaviours,
read from a dozen screens.

`permsLoading` exists (`!!user?.email && !permsSettled`) and distinguishes the
cases correctly — it just isn't consulted by `useGrants`.

---

## Dependencies that are one-way and safe

Listed so you can stop worrying about them:

| Edge | Direction | Why it's safe |
|---|---|---|
| `permissions/` → everything | read-only | `registry.MODULES` is a **code constant, not data**, by explicit design: *"no permission screen or bad UPDATE can flip them."* `rules.decide()` is a pure function with no Django, no DB, no DRF. Nothing writes back |
| `MODULE_DEPENDENCIES` | declarative | The cross-module coupling is written down in one dict, with the frontend components that justify each edge named in a comment. **This is what a coupling map looks like when someone maintains it deliberately** |
| `reports/` → all serializers | read-only, but wide | Reports import and reuse `REPSerializer`, `VendorSerializer`, `WorkOrderListSerializer`, `PaymentRequestSerializer`, `PaymentBatchSerializer`, `TDSRecordSerializer` **verbatim**. Safe for state, dangerous for change: **adding one field to `VendorSerializer` changes the payload and the exposure of two report endpoints at once** (Pass 2.3, R-1; Pass 4.3, U-3) |
| `adminStorage._cache` | single owner | Module-level mutable state — the classic hazard — but with a real owner: one writer (`fetchCategory`), a `_status` tri-state, `_bump()` + `useSyncExternalStore` notification, and `clearConfigCache()` on logout. **Correctly managed** |

---

## The rule to work by

Every hotspot above has the same signature:

> **A field that is both computed by the system and writable by the client.**

`paid_gross_amount` (computed, not writable — but by five different computers) ·
`PaymentRequest.status` (computed **and** writable) · `WorkOrder.status` (computed
**and** writable) · `TDSRecord.month` (derived, then orphaned) · `perms` (one value,
two meanings).

**Before changing anything in the payment flow, ask: does this field have exactly
one owner?** If the answer is no, the change will surface somewhere you did not
edit. That question, asked four times, would have predicted every finding in Pass
1.4.

The structural fix for H-2 and H-3 is the same single line each — make `status`
`read_only=True` in both serializers and expose explicit transition actions
(`/send-to-accounts/`, `/mark-paid/`, `/mark-bounced/`) the way `resolve` and
`resolve-bounced` already are. **The pattern is already in this codebase; it just
isn't applied to the field that needs it most.**

---

## ✓ Pass complete

- **Do I have a number?** 5 hotspots, 4 safe edges; `paid_gross_amount` has 5
  writers across a module boundary; `status` has 3 independent authors on two models.
- **Have I seen one with my own eyes?** Yes — all five write sites for
  `paid_gross_amount` located and read across `payments/serializers.py` and
  `payments/views.py`.
- **Do I know what the user experiences?** Yes — a number that changes by itself
  after an unrelated edit, which is the "behaviour relationship" question this pass
  was written to answer.
