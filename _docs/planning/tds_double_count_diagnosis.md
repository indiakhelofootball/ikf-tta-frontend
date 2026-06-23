# TDS Double-Count — Full Diagnosis (item #5)

**Date:** 2026-06-20
**Method:** read every TDSRecord/PaymentRequest.tds write and read site in both repos
(no inference from greps). Files cited with line numbers.

## Root cause (architecture)

TDS is stored in **two parallel, un-reconciled places**:

1. **`PaymentRequest.tds_amount`** — written onto **every** PR in
   `PaymentRequestSerializer.create()` (`payments/serializers.py:125`),
   including a retry-of-bounced PR. **Never deduplicated.**
2. **`TDSRecord.tds_amount`** — the booked deduction, created in the **same**
   `create()` (line 171) but guarded: skipped when a bounced sibling exists
   (lines 154–168, the `cf7b0d5` fix). **Deduplicated.**

So `cf7b0d5` only deduped ledger (2). Ledger (1) still carries TDS on **both**
the bounced PR and its retry. Any total built from `PaymentRequest.tds_amount`
that includes both rows double-counts.

### The only write/delete/read sites
- **Create:** `payments/serializers.py:171` (only TDSRecord creation; guarded).
- **Delete:** CASCADE only — PR `destroy` (`payments/views.py:75–102`) and
  `resolve_bounced` (`workorders/views.py:126`, deletes bounced PRs → cascades).
- **Update:** `payments/views.py:184` `mark_deposited` (status only).
- **Read/sum:** `payments/views.py:162` summary, `:131` list,
  `reports/views.py:62` (`TDSRecord.objects.all()` in payment_audit/vendor_audit).

## `cf7b0d5` scope and limits
Skip fires only when an existing TDSRecord is attached to a PR whose status is
exactly `'Payment Bounced'`, matched by **period_number** (Periodic) or
**gross_amount equality** (Fixed). After the skip, the surviving TDSRecord sits
on the **bounced** PR; the successful retry PR has **no** TDSRecord.

## Vectors (each TDS total, its source, verdict)

**Correction (2026-06-20, after reading the batch serializer + page render):**
V1/V2 were initially called "LIVE" but are **NOT** in normal operation. Once a PR
is batched it keeps its batch link permanently — bounce does **not** clear it
(`update()` 207–229 never touches `batch`), and the batch serializer returns
**all** its PRs incl. bounced (`payments = ...source='payment_requests'`,
`serializers.py:308`). So `sentIds` (`PaymentManagementPage.jsx:283`) contains
bounced PRs and `activePayments` (`:295`) excludes them. The active footer and
send-queue therefore do **not** see bounced PRs in the normal flow. Verdicts
below are corrected.

| # | Surface | Source | Double? |
|---|---------|--------|---------|
| **V1** | PaymentManagementPage active-list TDS footer (`:583`) / `totalTds` (`:394`) | `pr.tdsAmount` over `filtered` (un-batched PRs) | **LATENT, not live.** Bounced PRs are excluded via `sentIds`. Only bites in **degraded mode** (if `paymentBatchesAPI.getAll()` fails → `sentIds` empty) or a PR marked bounced that was never batched. |
| **V2** | Payment batch `total_tds` (`serializers.py:~349`) + bulk `prs.update(... 'Sent to Accounts')` | PR `tds_amount`, no status guard | **LATENT, not live** for the same reason (send-queue = `filtered`, bounced excluded). Still a real integrity gap if a bounced PR ever reaches batch creation (silent un-bounce without re-adding WO gross). Worth a defensive guard, low priority. |
| **V3** | Bank "Total TDS Liability" + TDS list + reports `tdsRecords` | `TDSRecord` (deduped) | **PRIMARY.** **(a)** legacy rows created before `cf7b0d5` deployed (fix never cleaned old data) — most likely cause of the client report; **(b)** Fixed-WO retry with a **changed gross** escapes the gross-equality sibling match → 2nd TDSRecord (rare). |
| **V4** | `getVendorStatement.totalTDS` (`paymentData.js:42`) | `pr.tdsAmount` over `status==='Payment Done'` only | **LOW.** Bounced excluded; safe unless a retry is recorded without flipping the original to bounced. |
| **V5** | TDSRecord vs PR attribution | both | Not a sum error, but TDSRecord-based reports show TDS against a **bounced** payment while PR-based views show it against the **retry** → reconciliation/labeling confusion. |

## Most likely what the client sees
**V3(a) — legacy duplicate TDSRecords** in the Bank → Total TDS Liability and
reports, created before `cf7b0d5` shipped. The code fix stopped new doubles but
never cleaned existing rows. Confirm with `audit_tds_duplicates`; remove with
`dedupe_tds_records` (dry-run by default).

## Why the plan's original fix was wrong
The plan proposed `.exclude(payment_request__status='Payment Bounced')` in
`summary()`. After `cf7b0d5` the single surviving TDSRecord usually sits **on**
the bounced PR, so that exclusion would drop legitimate TDS to zero
(**undercount**). Do not apply it.

## Recommended fix (priority order, corrected)

1. **V3(a) — PRIMARY.** Run `audit_tds_duplicates` (read-only) on prod to see
   how many legacy duplicate TDSRecords exist and their dates. Then run
   `dedupe_tds_records` (dry-run by default, `--apply` to act) to delete the
   extra record per disbursement, keeping the earliest. This corrects the
   client's wrong TDS total at the source. **No destructive change before the
   audit.**
2. **V3(b) — careful.** Fixed-WO sibling match is gross-equality
   (`serializers.py:163`); a changed-gross retry escapes it. Fix needs a unit
   test first — "match any bounced sibling on the WO" risks wrongly skipping a
   legitimate second Fixed-WO payment's TDS. Defer until covered by a test.
3. **V1/V2 — latent, low priority.** Defensive only: filter the send-queue
   (`filtered`) and batch `create()` to exclude `Payment Bounced`, and stop the
   bulk `prs.update(... 'Sent to Accounts')` from silently un-bouncing. Guards
   degraded-mode / manual-bounce edges; not the live bug.
4. **V4/V5 — no action** beyond awareness.

Tooling delivered (uncommitted, backend repo):
- `payments/management/commands/audit_tds_duplicates.py` — read-only finder.
- `payments/management/commands/dedupe_tds_records.py` — guarded cleanup
  (dry-run default, `--apply`, transactional).

## Open questions for the client/user
1. Which exact screen + number is "wrong" — the **Payments table TDS footer**
   (V1) or the **Bank → Total TDS Liability** (V3)? This tells us whether the
   live bug is PR-ledger (V1/V2) or TDSRecord-ledger (V3).
2. Is prod showing doubles on **old** bounced payments (→ legacy data, V3a) or
   only on **new** ones created recently (→ active code path)?
3. Retry workflow confirmation: always "mark bounced, then raise new PR for the
   same WO/period"? (UI implies yes via `bouncedPeriods`/`bouncedPaymentCount`.)

**No code changed. This is diagnosis only.**
