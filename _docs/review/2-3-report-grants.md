# Pass 2.3 — Granular report grants

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** is each report's *endpoint* grant-checked, or only its menu item?

## Answer

**Every endpoint is grant-checked, with its own key.** Not one of the five is
menu-only. The architecture is exactly what the docstring claims.

But the pass surfaces something the question didn't ask for and that matters more:
**two of the five report grants leak more sensitive data than the operational
module they were designed to avoid granting.** A user given only the "Vendor
Audit" report — a read-only tick box on the grant grid — receives every vendor's
PAN number and bank account number, and the base64 PAN card images.

**Count: 5/5 endpoints correctly gated · 3 findings (1 high, 2 medium).**

---

## Per-key table

| # | Grant key | Endpoint | Server gate | Menu gate | Route gate |
|---|---|---|---|---|---|
| 1 | `report_social_media` | `GET /api/reports/social-media/` | `module_permission('report_social_media')` | `Sidebar.jsx:46` `REPORT_KEYS.some(canView)` | `App.js:156` `GrantedRoute module="report_social_media"` |
| 2 | `report_payment_audit` | `GET /api/reports/payment-audit/` | `module_permission('report_payment_audit')` | same hub gate | `App.js:141` |
| 3 | `report_vendor_audit` | `GET /api/reports/vendor-audit/` | `module_permission('report_vendor_audit')` | same hub gate | `App.js:146` |
| 4 | `report_trial_spend` | `GET /api/reports/trial-spend/` | `module_permission('report_trial_spend')` | same hub gate | `App.js:151` |
| 5 | `report_trials` | `GET /api/reports/trials/` | `module_permission('report_trials')` | same hub gate | `App.js:161` |

**All five: server-enforced.** Each report screen calls exactly one endpoint
(`reportsAPI.paymentAudit()` etc. — `src/services/api.js:886–891`), and each
endpoint carries its own distinct permission class. `registry.MODULES` marks all
five `view_only: True`, so `rules.decide` returns `False` for every non-safe
method regardless of grants — the endpoints are read-only at the rules layer, not
just by convention.

The `reports` aggregate key is retired to `legacy: True`, hidden from the grant
grid by `grantable_modules()`, and backfilled into the five children by the
`backfill_report_grants` management command. That migration was done properly.

---

## Findings

### R-1 · A report grant is a wider read than the module grant it replaces — **HIGH**

The design intent, from `registry.py`:

> *"Reports are granted per-report so a user can be given a single report
> **without any operational-module access**."*

The implementation does the opposite of what that sentence promises:

```python
def _vendors(ctx):
    return VendorSerializer(Vendor.objects.all(), many=True, context=ctx).data
```

`VendorSerializer` (`vendors/serializers.py:6–70`) exposes, per vendor:

- `panNumber` — the PAN itself
- `panCardImageName`, **`panCardImageUrl`** — the base64 PAN card image
- `accountNumber`, `ifscCode`, `accountHolderName`, `bankName`, `accountType`
- `gstNumber`, `email`, `phone`, `address`

So:

| Grant given | What the holder can actually read |
|---|---|
| `report_vendor_audit` (view-only tick) | Every vendor's PAN, PAN card image, and full bank details · every work order · every payment request · every TDS record |
| `report_payment_audit` (view-only tick) | The above **plus** every payment batch — effectively the entire financial database in one GET |
| `vendors` module (view) | Every vendor — *the same PII*, but at least the grant is named "Vendors" |

`PaymentRequestSerializer` compounds it: it re-projects `panNumber`,
`accountNumber`, `ifscCode`, `accountHolderName` and `bankName` onto **every
payment request row** as read-only vendor fields. So `report_payment_audit`
delivers the same PII a second time, denormalised across thousands of rows.

**Why this is the finding and not a nitpick:** on the grant grid these five keys
read as the *safe*, *minimal* option — the thing you tick when you want to give
someone a look at the numbers without giving them the system. In fact ticking
`report_vendor_audit` grants strictly more sensitive data than ticking `vendors`,
because it also pulls in payments and TDS. Whoever administers grants is making
that decision with the opposite information.

**Fix shape (Phase E):** a `ReportVendorSerializer` allowlist — exactly the
pattern `csr/client_serializers.py` already uses correctly for funders. The
codebase already knows how to do this; the reports layer just doesn't.

---

### R-2 · Every report is an unbounded whole-table dump — **MEDIUM** *(see Pass 4.3)*

No pagination, no date filter, no `.only()`, no field limiting, on any of the five.

```python
_work_orders  → WorkOrder.objects.select_related('vendor')
                  .prefetch_related('periods', 'change_logs', 'change_logs__changed_by').all()
_batches      → PaymentBatchSerializer(PaymentBatch.objects.all())   # every batch, every nested payment
_payment_requests → PaymentRequest.objects.all()
_vendors      → Vendor.objects.all()                                 # with base64 PAN images
```

`payment_audit` returns **five** of these in one response. With `panCardImageUrl`
carrying base64 blobs and `PaymentBatchSerializer` nesting the full payment list
inside every batch, this is the endpoint behind the ~19 MB / 100-second-timeout
symptom. Full analysis in Pass 4.3; noted here because the grant model and the
payload problem share a root cause: **the report endpoints reuse the operational
serializers wholesale.**

The docstring states this as a feature — *"the endpoints reuse the existing
serializers so the payloads are byte-for-byte what the report screens already
consume"* — which is exactly why both R-1 and R-2 exist.

---

### R-3 · The Reports hub is `anyOf`, so one grant reveals all five report names — **MEDIUM**

`App.js:147` gates `/reports` with `<GrantedRoute anyOf={REPORT_KEYS}>`, and
`Sidebar.jsx:46` shows the Reports menu when `REPORT_KEYS.some(canView)`.

A user holding a single report grant reaches the hub, which lists all five report
cards. Clicking one they don't hold redirects to `/unauthorized` (the per-report
`GrantedRoute` holds), and the endpoint would 403 anyway — **so this is not a data
leak.** It is a UI-consistency finding: the app tells a user that four reports
exist which they cannot open, with no explanation.

Worth checking `ReportsHub.jsx` filters its card list by `canView(key)` rather
than rendering all five unconditionally. It does not call any report endpoint
itself, so nothing beyond report *names* is disclosed.

---

## ✓ Pass complete

- **Do I have a number?** 5 of 5 endpoints grant-checked server-side; 3 findings.
- **Have I seen one with my own eyes?** Yes — `reports/views.py` read in full and
  cross-checked against `vendors/serializers.py:21–70` to confirm PAN and bank
  fields are in the payload.
- **Do I know what the user experiences?** For R-1, nothing — the report renders
  normally; the extra data is in the JSON, not on the screen. That is what makes
  it worth writing down.

**Probe item for Pass 2.4:** log in as a user holding **only**
`report_vendor_audit`, open the browser network tab on `/reports/vendor-audit`,
and search the response body for a PAN. Finding one proves R-1 in about thirty
seconds.
