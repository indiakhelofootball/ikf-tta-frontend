# Pass 4.7 — Unbounded growth

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** what grows forever?

## Answer

**Seven things, and no cleanup mechanism exists anywhere** — no cron, no Celery,
no scheduled management command, no `logrotate` entry in `deploy.sh`, no retention
policy in code. Every table in this system is append-only in practice.

The one that matters is the base64 attachment store, because it grows at
**~374 KB per REP** and it is 98.4 % of the database already (measured in Pass 4.3
from your 2026-07-23 dump).

**Count: 7 growth vectors (1 high, 2 medium, 4 low).**

---

### G-1 · Base64 attachments — 374 KB per REP, 52 KB per vendor, forever — **HIGH**

Measured from `auth_db_migration_2026-07-23.sql`:

| | Rows | Size | Per row |
|---|---:|---:|---:|
| `reps_rep` | 49 | 17.90 MB | **374.0 KB** |
| `vendors_vendor` | 99 | 5.02 MB | **51.9 KB** |
| everything else | ~500 | 0.32 MB | ~0.6 KB |

Projection at current per-row sizes:

| REPs / Vendors | DB size |
|---|---|
| 49 / 99 (today) | 23 MB |
| 100 / 200 | 48 MB |
| 250 / 500 | 120 MB |
| 500 / 1000 | 239 MB |

There is **no deletion, archival, or compression path** for any attachment. A REP
deleted via `REPViewSet.destroy` takes its blobs with it — but nothing else does,
and nothing ever compacts or thins them. The largest single attachment in your
data is **1.56 MB**, and there is **no size limit enforced server-side** —
`mou_document_url` and `rep_logo_url` are plain `TextField`s (MySQL `LONGTEXT`,
4 GB ceiling).

`REPModal.jsx` and `VendorModal.jsx` read files with `FileReader.readAsDataURL`
and post the result. Worth checking whether a client-side size cap exists on those
inputs — the serializer imposes none.

**This is the same root cause as Pass 4.3 (payloads) and Pass 3.2 (PII at rest).
One structural fix — object storage with signed URLs — closes all three.**

---

### G-2 · The JWT blacklist tables grow with every token rotation — **MEDIUM**

`token_blacklist_outstandingtoken` is **0.11 MB** in the dump — the third-largest
table, and larger than every business table combined.

With `ROTATE_REFRESH_TOKENS = True` and `BLACKLIST_AFTER_ROTATION = True`, **every
single token refresh writes two rows** (one outstanding, one blacklisted). At
`ACCESS_TOKEN_LIFETIME = 24 hours`, each active user generates at least one
rotation per day, plus one per parallel-401 storm.

`django-rest-framework-simplejwt` ships a management command for exactly this —
`python manage.py flushexpiredtokens`. **Grep confirms it is never invoked**: no
cron entry, no scheduler, no mention in `deploy.sh`. These tables have never been
flushed.

This is the cheapest item in the whole audit to fix: one cron line, running a
command that already exists.

---

### G-3 · Audit and log tables are append-only with no retention — **MEDIUM**

| Table | Written by | Ever pruned? |
|---|---|---|
| `workorders_workorderchangelog` | every WO edit to a tracked field | ❌ never |
| `grant_change_logs` | every permission change | ❌ never |
| `courier_shipmentlog` | every courier status transition | ❌ never |
| `otp_codes` | every OTP request (5/min/IP allowed) | ❌ never |

Small today. Two notes:

- **`otp_codes` is the one an attacker can grow.** The throttle is 5/min per IP,
  so a distributed source can insert rows faster than anything removes them
  (nothing removes them). Used and expired codes are never deleted. `OTPVerifyView`
  filters on `used=False, expires_at__gt=now`, so correctness is fine — but the
  table is an unbounded write target reachable **without authentication**.
- `WorkOrderChangeLog` is prefetched by `_work_orders(ctx)` in **every one of the
  three report endpoints that include work orders** (`prefetch_related('change_logs',
  'change_logs__changed_by')`). So log growth is also payload growth: an old work
  order edited fifty times ships fifty log rows on every report load.

**Do not delete the audit tables** — `GrantChangeLog` and `WorkOrderChangeLog` are
the only forensic trail this system has, and Passes 1.4 and 3.1 both recommend
querying them. Cap `otp_codes`; keep the audit logs; just stop prefetching change
logs into report payloads.

---

### G-4 · Soft-deleted courier shipments are never purged — **LOW**

`courier/models.py:92–93` — `is_deleted` / `deleted_at`, with a `restore`
endpoint. A deliberate, well-built soft-delete (super admins can soft-delete any
shipment *because the action is reversible*).

But nothing ever hard-deletes them, and there is no age threshold after which a
soft-deleted row is gone for good. The tombstones accumulate indefinitely. Tiny
rows, so this is a hygiene note, not a problem.

Note the related destructive pattern in `courier/views.py:92`:
`shipment.items.all().delete()` then recreate, on every PATCH that includes
`items`. That is *shrinkage*, not growth — but it means item IDs churn on every
edit and any FK pointing at a shipment item would break.

---

### G-5 · `localStorage` grows per user, per browser, forever — **LOW**

`tta_profile_<email>` keys are written per login email and **never removed** —
`logout()` deliberately preserves them (*"Profiles stay in localStorage (per-user
keys)"*), and `clearConfigCache()` only touches `tta_config_cache_v1`.

`ProfilePage.jsx:92–96` stores an avatar via `readAsDataURL`, so each key can be
hundreds of KB. On a shared machine the ~5 MB origin quota fills. `saveProfileData`
catches the quota exception and returns `false`; **no caller checks the return
value**, so profile saves then silently do nothing — Pass 4.1's shape applied to
storage.

### G-6 · Application logs go to stdout with no rotation configured — **LOW**

`LOGGING` is console-only (`StreamHandler`, level `INFO`). No `FileHandler`, no
`RotatingFileHandler`.

In the Docker deployment this means logs go to the container's stdout and are
handled by the Docker log driver — which by default is `json-file` **with no size
limit**, so `/var/lib/docker/containers/*/​*-json.log` grows until the disk fills.
Nothing in `docker-compose.yml` sets `logging.options.max-size`.

Not a code fix — a two-line compose change. Listed because "the server ran out of
disk" is the kind of outage that looks like an application bug.

### G-7 · Payment requests, batches and TDS records accumulate — **LOW (by design, correctly)**

148 payment requests, 40 batches, 18 TDS records, at ~0.2 KB each. These are
financial records and **must** be retained. There is no archival path, which for
this data is the right answer.

The only reason to name it: `PaymentBatchViewSet` has **no pagination at all** and
prefetches every payment inside every batch, so this correct retention feeds an
endpoint with no ceiling — and that endpoint's failure is what re-arms duplicate
payments (Pass 1.1, P-1). Retention is right; the endpoint needs a limit.

---

## ✓ Pass complete

- **Do I have a number?** 7 growth vectors; DB grows ~374 KB/REP and ~52 KB/vendor;
  0 cleanup mechanisms exist.
- **Have I seen one with my own eyes?** Yes — table sizes measured from your
  production dump; grep confirms no cron, no Celery, no `flushexpiredtokens`, no
  logrotate.
- **Do I know what the user experiences?** Progressive slowdown, then the Pass 4.3
  Cloudflare cliff — and eventually a full disk.

**Do these three this month; none of them touches application logic:**

1. Cron `python manage.py flushexpiredtokens` weekly (G-2).
2. Add `logging: options: max-size: "10m", max-file: "3"` to `docker-compose.yml` (G-6).
3. Add a purge for `otp_codes` older than a day (G-3).

Then plan G-1 properly, together with Pass 4.3 and Pass 3.2 — it is one change and
it is the only one that matters at scale.
