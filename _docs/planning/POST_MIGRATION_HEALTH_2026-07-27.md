# Post-Migration Health Audit — 2026-07-27

Full code + config sweep after the move to `47.237.115.74` (Docker, MySQL 8.4), prompted
by reported glitches: failing uploads, slow/timing-out pages, and blank screens.

Every claim below is backed by a measurement or a file:line. Where I could not verify
something from here (host nginx, live server state) I say so rather than guessing.

**Verified healthy before anything else:** 300/300 backend tests pass on the current
working tree, both before and after my changes. `makemigrations --check` reports no
model/migration drift. No raw SQL anywhere. No `__date` / `Trunc*` / `Extract*` lookups,
so the missing MySQL timezone tables cannot silently break date filtering. No hardcoded
hosts or IPs in the frontend.

---

## P0-1 — Blank page: nginx was serving Django's static dir over the React bundle

**Status: FIXED in `nginx.conf`.**

`build/index.html` loads:

```
/static/js/main.a729584e.js
/static/css/main.a3b65288.css
```

`nginx.conf` had a single catch-all:

```nginx
location /static/ { alias /staticfiles/; }
```

`/staticfiles/` is Django's `collectstatic` output — it contains `admin/` and
`rest_framework/`, and nothing else. So every request for the React bundle resolved to a
path that does not exist → 404 on both JS and CSS → white page. CRA's `STATIC_URL`
collides with Django's by default and nothing separated them.

The fix adds a regex location (regex outranks prefix in nginx) claiming
`/static/js|css|media` for the React root and letting everything else fall through to
Django, plus immutable caching on the content-hashed assets and `no-store` on the SPA
shells so a cached `index.html` can never point at assets that no longer exist.

**Important:** the note from 2026-07-24 says this was fixed *on the server*. The repo copy
was never updated. The next `docker compose up --build` would have re-introduced the blank
page. That drift is now closed — but check the running server's config still matches.

---

## P0-2 — Slow pages and timeouts: the API ships the database's blob columns on every load

This is the largest finding, and it is a code defect, not a server defect.

### Measured, from `auth_db_migration_2026-07-23.sql`

| Table | Bytes | Share of a 24.4 MB database |
|---|---|---|
| `reps_rep` | 18,766,090 | **77%** |
| `vendors_vendor` | 5,261,801 | **22%** |
| everything else combined | ~340,000 | 1.4% |

78 base64 data-URL payloads, **22.9 MB total**. Largest single payload **1.56 MB**, median
195 KB. They live in `reps_rep.mou_document_url`, `reps_rep.rep_logo_url`,
`reps_rep.rep_logo_link` and `vendors_vendor.pan_card_image_url`.

Put plainly: **98.6% of this database is attachments stored as base64 text**, and the API
returns them in list responses.

### Where they leak

`REPSerializer.Meta.fields` includes `mouDocumentUrl`, `repLogoUrl` and `repLogoLink`, and
the list endpoint uses the same serializer as detail. `VendorSerializer` likewise includes
`panCardImageUrl`.

Report endpoints are worse — `reports/views.py` has no pagination at all:

- `_reps()` (`reports/views.py:31`) serializes **every** REP → `/api/reports/social-media/`
  and `/api/reports/trials/` each return roughly the full 19 MB.
- `_vendors()` (`reports/views.py:42`) serializes **every** vendor → `/api/reports/vendor-audit/`
  and `/api/reports/payment-audit/` each carry ~5.3 MB on top of work orders, payment
  requests, batches and TDS records.

Frontend callers that pull the whole set:

| Caller | Request |
|---|---|
| `rep/REPManagementPage.jsx:107` | `repAPI.getAll({ limit: 100 })` |
| `rep/REPModal.jsx:178` | `repAPI.getAll({ limit: 1000 })` (server caps at 100) |
| `courier/CourierManagementPage.jsx:488` | `repAPI.getAll({ limit: 100 })` |
| `dashboard/DashboardHome.jsx:45` | `repAPI.getAll()` |
| `vendors/VendorManagementPage.jsx:76` | `vendorsAPI.getAll({ limit: 1000 })` |
| `payments/PaymentManagementPage.jsx:258` | `vendorsAPI.getAll({ limit: 1000 })` |
| `workorders/WorkOrderManagementPage.jsx:246` | `vendorsAPI.getAll({ limit: 1000 })` |
| `workorders/WorkOrderModal.jsx:107` | `vendorsAPI.getAll({ limit: 1000 })` |

The vendor list cap is 1000, so all 99 vendors and their PAN images ship on four different
screens, every load.

### Why it got worse after the migration, not before

The request now traverses **Cloudflare → host nginx → container nginx → gunicorn**, and
gunicorn was configured with **2 workers**. Two concurrent report loads saturated the
entire backend. Cloudflare enforces a hard **100-second** origin timeout (error 524) that
the old direct-to-nginx setup never applied.

**Partially fixed:** `tta_backend/Dockerfile` now runs 4 workers with
`--max-requests 200 --max-requests-jitter 50` (these endpoints build very large responses
in memory and RSS never returns), overridable per host via `GUNICORN_CMD_ARGS`.

**Not fixed — needs your decision, see §Decisions.** Raising worker count treats the
symptom. The fix is to stop sending blobs in list responses.

---

## P0-3 — Uploads failing: almost certainly `client_max_body_size` on the host nginx

Attachments travel as base64 inside JSON. A 1.5 MB image becomes roughly 2 MB of request
body. The container nginx allows 25 MB:

```nginx
client_max_body_size 25m;   # nginx.conf:9
```

But the **host nginx** block added during the migration sits in front of it, and nginx's
default is **1 MB**. Anything larger is rejected with **413** before it ever reaches the
container — which matches "uploads worked before, fail now" exactly, because the old box's
nginx had been tuned over time and the new vhost is fresh.

I cannot read the host config from here. Verify and fix on the server:

```bash
nginx -T | grep -n client_max_body_size          # expect nothing, or a small value
# in the TTA server{} block, add:
#   client_max_body_size 25m;
nginx -t && systemctl reload nginx
```

Also confirm Cloudflare's upload cap for the plan in use (100 MB on Free) — not the
binding limit here, but worth knowing.

---

## P1-1 — Random logouts: concurrent token refreshes blacklist each other

**Status: FIXED in `src/services/api.js`.**

`SIMPLE_JWT` is configured with `ROTATE_REFRESH_TOKENS: True` and
`BLACKLIST_AFTER_ROTATION: True`. `refreshToken()` had no in-flight deduplication.

Every screen fires several requests in parallel on load. When the access token expires
(`ACCESS_TOKEN_LIFETIME` is 24 hours) they all receive 401 in the same tick, and each one
independently POSTed the *same* refresh token. The first rotation blacklisted it; every
sibling then got a 401 back from `/auth/token/refresh/`, returned `false`, and hit the
force-logout branch — throwing a perfectly valid session out to `/login`.

Symptom: unexplained logouts roughly once a day per user, more likely on heavy screens
(Work Orders, Dashboard, Payments) which issue the most parallel calls.

Fix: concurrent callers now share one in-flight refresh promise, so rotation happens once
and everyone reads the same result.

---

## P1-2 — Django never knew requests were HTTPS

**Status: FIXED in `backend/settings.py`.**

TLS terminates at Cloudflare and again at the host nginx; gunicorn only ever sees plain
HTTP, and `SECURE_PROXY_SSL_HEADER` was not set. Consequences:

- `request.is_secure()` was always `False`, so `SecurityMiddleware` never emitted the HSTS
  header despite `SECURE_HSTS_SECONDS` being configured.
- Any absolute URL Django builds came out as `http://`. The CSR viewsets are paginated
  (`CSRPagination`, `page_size = 100`), so `next`/`previous` links are `http://` and a
  browser on an https page blocks them as mixed content. Bites once any CSR list exceeds
  100 rows.

Added `SECURE_PROXY_SSL_HEADER` (safe — every proxy in the chain sets `X-Forwarded-Proto`
explicitly) and `CSRF_TRUSTED_ORIGINS`, because once HTTPS is correctly detected the Django
admin's referer check activates and would otherwise start rejecting admin logins.

Note the value is a **bare hostname**, not `https://…` — Django 3.2 expects hosts; the
scheme-qualified form only became valid in 4.0 and would silently never match.

---

## P1-3 — Vendor PAN card carries the same wipe bug that hit REP logos

**Status: FIXED in `vendors/serializers.py`.**

Client issue #22 ("logos disappeared again") was traced to `default=''` on the REP
attachment serializer fields: an omitted field on a PUT became a blank that overwrote the
stored value. That fix was applied to `reps/serializers.py` — but `vendors/serializers.py`
had the identical pattern on `panCardImageUrl` and `panCardImageName` and was left alone.

It is currently masked only because `VendorModal.jsx:207` always re-sends the existing
base64 (`data.panCardImageUrl = vendor?.panCardImageUrl || ''`). That masking is fragile in
both directions: every vendor edit re-uploads the whole image, and the moment any caller
loads a vendor from a lighter payload the PAN card is silently destroyed. Since the
recommended perf fix is exactly "stop sending blobs in list responses", this would have
become a live data-loss bug the day that change landed.

Removed the defaults so an omitted field is simply absent from `validated_data`.

---

## P1-4 — MySQL 8.4 runs STRICT mode; MariaDB 10.1 did not

This is the single biggest behavioural difference between the two servers and it has not
bitten yet only because the triggering inputs are uncommon.

MariaDB 10.1's default `sql_mode` is empty. Strict mode became the default in MariaDB
10.2.2 — after the version you were on. MySQL 8.4 defaults to `STRICT_TRANS_TABLES`. So
writes that used to be silently mangled now raise errors and surface as HTTP 500:

| Condition | MariaDB 10.1 | MySQL 8.4 |
|---|---|---|
| String longer than the column | truncated silently | error 1406 |
| 4-byte character into a 3-byte column | truncated/mangled | error 1366 |
| Decimal out of range | clamped | error 1264 |

### Trap A — every table is `utf8` (3-byte), and no connection charset is set

All 33 tables in the dump declare `DEFAULT CHARSET=utf8`, which in MySQL means **utf8mb3**.
`DATABASES` has no `OPTIONS` entry, so no charset or `sql_mode` is pinned.

Any emoji — or any 4-byte character — typed into a remark, comment, vendor name, or
courier note now throws `Incorrect string value` and returns a 500, where the old server
quietly stored mangled text. Users paste emoji into free-text fields routinely.

This needs a data operation, so I have not run it. Per table:

```sql
ALTER TABLE <table> CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Take a dump first, run it in a maintenance window, then pin the connection:

```python
'OPTIONS': {'charset': 'utf8mb4'},
```

Do **not** add the `OPTIONS` line before converting the tables — a utf8mb4 connection
against utf8mb3 columns makes the failure more likely, not less.

### Trap B — the rename cascade can now abort instead of truncating

`ConfigOption.value` is `max_length=255`. `config/views.py` cascades a rename with
`.update()`, which bypasses serializer validation, into columns that are shorter:

| Target | max_length |
|---|---|
| `Trial.trial_type` | 255 — safe |
| `WorkOrder.project_ref` | 255 — safe |
| `TrialCityLocation.trial_type` | **100** |
| `Vendor.vendor_type` | **100** |
| `Vendor.company_type` | **50** |

A service-type rename longer than 100 characters, or an entity-type rename longer than 50,
now raises 1406 and rolls the whole rename transaction back. Previously it truncated
silently — which was itself corruption, producing orphaned values that no longer matched.
Either widen the columns to 255 or validate length against the narrowest target before
cascading.

---

## P2 — Structural issues (not migration regressions, but they amplify everything above)

**Config cache is fire-and-forget with swallowed errors.** `AuthContext.jsx` calls
`refreshAllFromAPI().catch(() => {})` without awaiting it, and `adminStorage.js:72`
`fetchCategory` logs failures to the console and then falls back to a hardcoded default
list. It also treats a legitimately-empty category as a failure and substitutes those same
defaults. Net effect: a single transient API hiccup at login leaves a user with blank or
stale dropdowns for their whole session, with no error shown and no retry. This is the
mechanism behind the recurring "service types missing / wrong values" reports.

**No pagination on any report endpoint.** All five return whole tables. Even without the
blob problem this scales linearly with the business.

**Correction to the earlier migration briefing.** `OPUS_CONTEXT_PROMPT.md` states "a real
`.env` is committed in the backend tree". It is not — `git ls-files` shows only
`.env.example` is tracked. The real `.env` exists on disk but is gitignored. The genuine
exposure was the 24 MB production dump sitting untracked and un-ignored at the repo root;
that is now covered by `*.sql` in both `.gitignore` files. The hardcoded password in
`deploy.sh` and the credentials shared over WhatsApp remain valid concerns.

---

## What I changed

| File | Change |
|---|---|
| `nginx.conf` | React assets no longer shadowed by Django static; immutable caching on hashed assets; `no-store` on SPA shells |
| `tta_backend/backend/backend/settings.py` | `SECURE_PROXY_SSL_HEADER`, `CSRF_TRUSTED_ORIGINS` |
| `tta_backend/Dockerfile` | gunicorn 2 → 4 workers, `--max-requests` recycling |
| `tta_backend/backend/vendors/serializers.py` | dropped `default=''` on PAN card fields |
| `src/services/api.js` | single-flight token refresh |
| `.gitignore` (both repos) | `*.sql`, `*.sql.gz`, `*.dump` |

Backend suite re-run after these edits: **300/300 pass**. `nginx -t` could not be run here
(no nginx binary in this environment) — run it on the server before reloading.

---

## Decisions I need from you

**1. Stop sending attachments in list responses.** This is the real fix for the slowness,
and it is not a safe unilateral change: `REPDetailView`, `REPModal`, `VendorDetailView` and
`VendorModal` all read the blob straight off the object handed down from the list, and
`CourierManagementPage.jsx:511` needs `repLogoUrl` to draw the package slip. Doing it right
means a slim list serializer plus a fetch-by-id in each detail/edit path. Roughly six
files. Expected effect: REP Management drops from ~19 MB to well under 100 KB.

**2. Move attachments out of the database.** Base64-in-a-text-column is why the database is
98.6% blobs, why edits re-upload whole images, and why list endpoints are unsalvageable
without §1. Storing files on disk (or object storage) and keeping a URL is the structural
fix. Larger change; worth scheduling rather than rushing.

**3. utf8mb4 conversion.** Needs a maintenance window and a fresh dump. Until it happens,
expect intermittent 500s on emoji input.

**4. Deploy point.** Still unverified. Before any of this ships, confirm what is actually
running:

```bash
cd /path/to/tta && git log --oneline -1        # both repos
docker compose ps
docker compose exec backend python manage.py showmigrations | grep -v '\[X\]'
nginx -T | grep -A5 'server_name.*tta'
```
