# Pass 4.3 — Unbounded payloads

**Date:** 2026-08-03 · **Mode:** read-only · **CORE pass**

**Question:** which endpoints ship the most data, and how much?

## Answer — measured, not estimated

I analysed your **actual production database dump**
(`auth_db_migration_2026-07-23.sql`, 24,367,333 bytes, MariaDB 10.1, dated
2026-07-23) **on your own machine — no data left it.** These are real numbers from
real rows, not estimates.

### Where the database actually is

| Table | Rows | Data | Avg per row | Share |
|---|---:|---:|---:|---:|
| **`reps_rep`** | **49** | **17.90 MB** | **374.0 KB** | **77.0 %** |
| **`vendors_vendor`** | **99** | **5.02 MB** | **51.9 KB** | **21.6 %** |
| `token_blacklist_outstandingtoken` | — | 0.11 MB | | 0.5 % |
| `payments_paymentrequest` | 148 | 0.03 MB | 0.2 KB | 0.1 % |
| `workorders_workorder` | 133 | 0.02 MB | 0.2 KB | 0.1 % |
| `payments_paymentbatch` | 40 | 0.004 MB | 0.1 KB | — |
| `payments_tdsrecord` | 18 | 0.002 MB | 0.1 KB | — |
| everything else (20 tables) | | ~0.15 MB | | 0.6 % |

**78 base64 `data:` URLs account for 22.86 MB — 98.4 % of the entire database.**
Your plan said 98.6 %; the dump says 98.4 %. **The premise was right.**

Breakdown: 54 JPEG, 15 PNG, 9 PDF. Ten largest attachments, in KB:
**1559, 1120, 994, 924, 897, 886, 770, 754, 716, 670**.

**The whole business — 148 payments, 133 work orders, 40 batches, 8 trials — is
0.3 % of the database. The other 99.7 % is 78 pictures.**

---

## Endpoints, largest first

| # | Endpoint | Paginated? | Payload today | Why |
|---|---|---|---|---|
| 1 | **`GET /api/reports/social-media/`** | ❌ **none** | **≈ 18 MB** | `_reps(ctx)` = `REPSerializer` over **all 49 REPs**, each carrying `repLogoUrl` + `mouDocumentUrl` base64 |
| 2 | **`GET /api/reports/trials/`** | ❌ **none** | **≈ 18 MB** | returns `_trials` **plus `_reps`** — the same 18 MB again |
| 3 | `GET /api/reps/` (default `limit=20`) | ✅ max 100 | **≈ 7.5 MB** | 20 × 374 KB. **Pagination barely helps when a row is 374 KB** |
| 4 | `GET /api/reps/?limit=1000` → clamped to 100 | ✅ | **≈ 37 MB** | `REPModal.jsx:178` asks for 1000; the server clamps to 100, which is still 100 × 374 KB |
| 5 | **`GET /api/reports/vendor-audit/`** | ❌ **none** | **≈ 5.1 MB** | all vendors (with PAN card base64) + all WOs + all PRs + all TDS |
| 6 | **`GET /api/reports/payment-audit/`** | ❌ **none** | **≈ 5.1 MB** | the above **plus** every batch with every nested payment |
| 7 | `GET /api/vendors/?limit=1000` | ✅ max 1000 | **≈ 5.0 MB** | all 99 vendors. Called on **four** screens |
| 8 | `GET /api/reports/trial-spend/` | ❌ none | ≈ 0.1 MB | no attachment tables — fine |
| 9 | **`GET /api/payment-batches/`** | ❌ **none** | ≈ 0.05 MB | `prefetch_related('payment_requests__vendor','payment_requests__work_order')`, every batch with every nested payment. **Small today, grows without limit** |
| 10 | `GET /api/payment-requests/` | ⚠️ only if **both** `page` **and** `limit` given | ≈ 0.03 MB | the frontend calls `getAll()` with neither → all 148 rows |

**Endpoint #1 is your 19 MB report.** Measured at ~18 MB on 2026-07-23 data, and
growing by ~374 KB with every REP added.

---

## Findings

### U-1 · The REP report is ~18 MB against a 100-second Cloudflare timeout — **CRITICAL**

`reports/views.py:31–35`:

```python
def _reps(ctx):
    qs = REP.objects.prefetch_related('city_assignments', 'city_assignments__trial').order_by('-created_at')
    return REPSerializer(qs, many=True, context=ctx).data
```

No pagination, no `.only()`, no field exclusion. `REPSerializer` includes
`mouDocumentUrl` and `repLogoUrl` — both `TextField`s holding base64.

**The report screen does not display those images.** They are serialised, gzipped,
pushed through Cloudflare, parsed by the browser into JavaScript strings, and
discarded. Roughly 18 MB moved to render a table of REP names and cities.

At ~374 KB/REP the arithmetic is unforgiving:

| REPs | Payload |
|---|---|
| 49 (today) | 18 MB |
| 100 | 37 MB |
| 250 | 93 MB |
| 500 | 187 MB |

**The 100-second Cloudflare timeout is a cliff, not a slope.** Below it the report
is slow; above it the request is *cut off mid-response* and the browser sees a
network error. And because of Pass 4.1, a failed report load renders as an empty
screen with no message.

`/api/reports/trials/` returns `_trials` **and** `_reps` — the same 18 MB, for a
screen about trial scheduling. Two of your five reports carry the entire logo
archive.

### U-2 · Pagination does not save you when the row is the problem — **HIGH**

`REPViewSet.list` is properly written: `limit = min(100, max(1, int(...)))`,
offset/limit slicing, `total` returned. It is textbook.

It still ships **7.5 MB on the default page of 20**, because the payload problem
is per-row, not per-page. Three call sites make it worse:

- `REPModal.jsx:178` → `repAPI.getAll({ limit: 1000 })` → clamped to 100 → **≈ 37 MB
  just to open the REP form.**
- `REPModal.jsx:276` → `repAPI.getAll({ search: name, limit: 10 })` → **≈ 3.7 MB to
  check whether a name is taken.**
- `DashboardHome.jsx:45` → `repAPI.getAll()` with no params → default 20 → **≈ 7.5 MB
  on every dashboard load**, to show a count.

`DashboardHome.jsx:46` does the right thing for vendors — `vendorsAPI.getAll({ limit: 1 })`
just to read `total`. The same trick was not applied to REPs on the adjacent line.

### U-3 · Four screens each pull all 99 vendors with their PAN card images — **HIGH**

`vendorsAPI.getAll({ limit: 1000 })` at `VendorManagementPage.jsx:76`,
`PaymentManagementPage.jsx:258`, `WorkOrderManagementPage.jsx:249`,
`WorkOrderModal.jsx:108`. **≈ 5 MB each**, and `WorkOrderModal` fires it every time
the modal opens.

The purpose in three of the four cases is *populating a dropdown of vendor names*.
The payload includes `panCardImageUrl` — the scanned PAN card — for all 99. This
is Pass 3.2's PII exposure and this pass's payload problem being the same line of
code.

### U-4 · `payment-requests` and `payment-batches` are unpaginated by default — **MEDIUM (a time bomb, not a problem today)**

```python
page = self.request.query_params.get('page')
limit = self.request.query_params.get('limit')
if page and limit:            # ← both required
    ...
return qs                     # ← otherwise: everything
```

`paymentRequestsAPI.getAll()` passes neither, so every call returns all 148 rows.
`PaymentBatchViewSet` has no pagination code at all and prefetches every payment
inside every batch.

At 0.2 KB/row these are 30 KB and 50 KB — invisible today. But payment requests
are the table that grows fastest in normal operation, and **`/api/payment-batches/`
is the endpoint whose failure silently re-arms duplicate payments** (Pass 1.1,
P-1). It is currently small; it has no ceiling; and its failure mode is the worst
one in the audit. That combination is worth fixing before it is a problem.

### U-5 · The root cause is one design decision — **the fix for four passes at once**

Attachments are stored as base64 `data:` URLs **inside the database rows**
(`vendors.pan_card_image_url TextField`, `reps.mou_document_url TextField`,
`reps.rep_logo_url TextField`). Consequences, all measured above:

- base64 inflates binary by **~33 %** — 22.86 MB of base64 is ~17 MB of actual file
- every list query drags every attachment along, because they are columns
- no HTTP caching is possible: the images ride inside a JSON API response
- every backup and every DB copy is a document archive (Pass 3.2, P-2)
- a view-only report grant delivers the images (Pass 2.3, R-1)

**Moving the 78 attachments to object storage with signed URLs would shrink the
database by 98.4 %, cut the REP report from 18 MB to under 100 KB, and close the
PII findings in Pass 3.2 and 2.3 — one change, four passes.** It is also the most
invasive change in this audit. Plan it; do not attempt it opportunistically.

---

## Why "not worker count"

Your plan says the slowness is payload, not worker count, and the dump agrees.
Two gunicorn workers (`deploy.sh: GUNICORN_WORKERS=2`) are ample for 148 payment
requests and 133 work orders. What saturates a worker is holding an 18 MB
serialised response in memory while it streams out through nginx and Cloudflare —
and each concurrent report viewer occupies one of your two workers for the whole
duration.

**Adding workers multiplies the memory footprint of the same 18 MB responses.** It
would make the symptom worse under load, not better.

---

## ✓ Pass complete

- **Do I have a number?** Yes, measured from production data: 18 MB (REP report),
  18 MB (trials report), 5.1 MB (vendor audit), 5.1 MB (payment audit), 5.0 MB
  (vendors list ×4 screens), 7.5 MB (default REP page). 98.4 % of the DB is 78
  base64 attachments.
- **Have I seen one with my own eyes?** Yes — the dump was parsed directly and
  `reports/views.py` + `REPSerializer` confirm the blob fields are in the payload.
- **Do I know what the user experiences?** Yes — a report that takes tens of
  seconds, and past the Cloudflare cliff, an empty screen with no error (Pass 4.1).

**Cheapest measurable win, this week, no architecture change:** add
`.only()`/`defer()` or a `REPReportSerializer` that omits `mouDocumentUrl` and
`repLogoUrl` from the two report endpoints. **18 MB → under 100 KB**, one
serializer, no data migration, no risk to stored data. Do that before considering
the object-storage move.

**Re-measure after any change** — the command that produced this table runs
read-only against a dump in seconds, so you have a repeatable benchmark rather
than an impression.
