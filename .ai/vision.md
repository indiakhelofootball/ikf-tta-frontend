# Vision — what TTA is, and what it must never become

**Source of truth precedence:** code wins over this file; this file wins over
memory notes. Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins — it is
the shorter, harder document.

## The product

TTA is the operations system for **India Khelo Football (IKF)**. It runs the
chain from a football trial being planned to the vendor who serviced it being
paid, and it is the system of record for all of it.

The spine, in order, is:

    Trial → Trial City → REP assignment → Vendor → Work Order
          → Payment Request → Payment Batch → TDS

Nothing in the product may skip a link. A payment that does not descend from a
work order has no audit trail, and the finance team's entire reason for using
this instead of a spreadsheet is the trail.

## Who uses it

| Who | Reality |
|---|---|
| `SUPER_ADMIN` / `ADMIN` | IKF staff. Full internal operations. |
| `REP` | A **module**, not a login identity — see `external-role-boundary` memory. Field representatives are records the office manages, not users who sign in. |
| `CSR_OPS` | Runs CSR grants. Internal, but must never see vendor identity or payment ledgers. |
| `CSR_CLIENT` | **External.** A corporate funder. Structurally denied every internal module. |

The internal RBAC is deliberately **role-blind** — access is gated on grant rows
in `permissions/enforcement.py`, not on role strings. `EXTERNAL_ROLES` contains
`CSR_CLIENT` only. Adding another role there denies it every internal module.

## The boundaries that must not break

These are not preferences. Each one was decided by the client or discovered the
hard way, and each has a memory note behind it.

1. **CSR never learns who a vendor is.** No vendor names, no payment amounts
   attributable to a vendor, on any CSR surface. Client prohibitions D4.1/D4.2.
2. **CSR never tags a live payment.** Tagging stays on the finance side. D4.15.
   Removing the UI control is not enough — the payment-ledger *fetch* has to go
   too, or the boundary is open.
3. **A funder sees their own grant and nothing else.** Cross-grant totals are a
   category error: rupees do not pool across funders.
4. **The REP city assignment is the only address source** — for courier *and*
   for trials. Courier address and ground address are **different facts**;
   neither may fall back to the other. `TrialCity.ground_location` is never
   written. See `courier-address-one-truth`.
5. **REP has no Active/Inactive status.** Asked for, decided against, do not
   re-add.
6. **Two repos, never one commit.** Frontend and backend share a folder and
   nothing else.
7. **No advance scheduling in CSR.** Settled verbatim by the client:
   *"payment aayega when aayega."* Never build a calendar or an "upcoming" pane.

## What the product is not

- Not a scheduler.
- Not a CRM.
- Not a place to store attachments at scale — the database is already **98.6%
  base64 attachments**, and that is the measured cause of the slowness.
- Not multi-tenant. One IKF instance, with funders as guests inside it.

## Related

`.ai/design.md` (how it is built) · `.ai/design-system.md` (how it looks) ·
`.ai/current.md` (what is in flight) · `.ai/pending.md` (questions awaiting you)
