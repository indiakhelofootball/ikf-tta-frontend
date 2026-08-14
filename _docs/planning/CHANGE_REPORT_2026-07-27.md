# Change Report — everything uncommitted, what it does, what users will see

Covers the full uncommitted state of both repos as of 2026-07-27: the post-migration
fixes, the PWA work, and the older client-issue wave that has been sitting in the tree
since 2026-07-10. Every file below was read and diffed, not recalled.

---

## STOP — read this before deploying anything

`deploy.bat` is a single line, and it points at the **old server**:

```bat
scp -r D:\tta_frontend-main\build\* root@47.245.98.149:/root/TTA/frontend/ikf-tta-frontend/build/
```

`47.245.98.149` is the decommissioned box. The migration moved TTA to `47.237.115.74`.

It is also the wrong *model*, not just the wrong host. The old box served the React build
from a directory on disk, so copying files into it was a deploy. The new box builds the
frontend **into a Docker image** — `Dockerfile` runs `npm run build` inside the image and
bakes the output into nginx. Files copied into a path on the host are not read by anything.

So running `deploy.bat` today does one of two things, both bad: it silently pushes a new
frontend onto the old server, or it fails. Neither ships anything to production.

**The new deploy is a rebuild on the server**, roughly:

```bash
cd /root/tta          # wherever the stack lives — confirm first
docker compose up -d --build frontend
```

`deploy.bat` needs to be rewritten or deleted before anyone follows the old habit. Until
that happens, treat every "deploy this" instruction in earlier notes as unsafe.

---

## Group A — post-migration fixes

| File | Change | Runtime behaviour | What a user sees |
|---|---|---|---|
| `nginx.conf` *(untracked)* | Regex location claims `/static/js\|css\|media` for React; Django static falls through; `no-store` on SPA shells | React's hashed bundle stops resolving into Django's `collectstatic` dir | Nothing today — the live server was already hand-patched. This stops a rebuild from re-breaking it into a **white screen** |
| `backend/settings.py` | `SECURE_PROXY_SSL_HEADER`, `CSRF_TRUSTED_ORIGINS` | `request.is_secure()` finally true behind Cloudflare→nginx→gunicorn | HSTS now actually sent; CSR pagination `next`/`previous` become `https://` instead of being blocked as mixed content past 100 rows; Django admin login keeps working once HTTPS is detected |
| `tta_backend/Dockerfile` *(untracked)* | gunicorn 2 → 4 workers, `--max-requests 200 --max-requests-jitter 50` | Four concurrent requests instead of two; workers recycle before RSS balloons | Fewer hangs and Cloudflare 524s when two people load a report at once. **Headroom, not a cure** |
| `vendors/serializers.py` | Dropped `default=''` from `panCardImageUrl` / `panCardImageName` | An omitted field on PUT no longer overwrites the stored image with a blank | Nothing today — masked because `VendorModal.jsx:207` always re-sends the image. Prevents PAN cards being wiped the day list payloads get slimmed |
| `src/services/api.js` | Single-flight token refresh | Concurrent 401s share one refresh instead of each rotating and blacklisting the others | **Stops the random logouts.** Roughly once every 24h a user was being thrown to `/login` mid-work with a valid session |
| `.gitignore` (both repos) | `*.sql`, `*.sql.gz`, `*.dump` | — | Nothing. Stops the 24 MB production dump being committed by an `git add -A` |

Backend suite: **300/300 pass** with all of the above applied.

---

## Group B — PWA / installable app

| File | Change | Runtime behaviour | What a user sees |
|---|---|---|---|
| `public/service-worker.js` *(new)* | Cache-first for `/static/js\|css\|media`, 60-entry cap, never caches `index.html` or `/api/` | Registers on load in production; serves build assets from local cache | Repeat visits load noticeably faster and survive a weak connection |
| `public/manifest.json` | `TTA` / `TTA — Trial Tracking App`, `start_url` `/`, `scope` `/`, `orientation: portrait-primary`, `#FBBF24` / `#F9FAFB` | Satisfies Chrome's installability criteria | Chrome's menu changes from "Add to home screen" to **"Install app"** — that wording flip is the confirmation it worked |
| `src/index.js` | Production-gated `serviceWorker.register()` on `window.load` | Skipped entirely in dev | None directly |
| `public/index.html` | Title, description, `theme-color` `#000000` → `#FBBF24`, three iOS standalone meta tags | — | **Everyone**, installed or not: browser tab reads "TTA — Trial Tracking App" instead of "React App"; mobile toolbar tints amber |

Installed, the app launches with no address bar, its own launcher icon and its own entry
in the app switcher.

### Three things worth changing before this ships

**1. The icon is still React's logo.** `logo192.png` / `logo512.png` were never replaced.
Installed today, users get a React atom labelled "TTA". Send a logo and this is a
five-minute fix.

**2. `orientation: portrait-primary` is wrong for this app.** TTA is table-heavy — work
orders, payment batches, vendor lists, Excel exports. Landscape is genuinely useful on a
phone or tablet, and this line forbids it in the installed app. Recommend deleting it.

**3. The cache cap is counted, not sized.** `MAX_ENTRIES = 60` with 6 asset files per
build and **13 MB per build** means the cache can hold roughly ten deploys' worth —
about **130 MB on the user's phone** before anything is evicted. `CACHE` is also a fixed
string (`tta-static-v1`), so the `activate` handler never clears the previous deploy's
assets; they just accumulate until the count trips. Either cap around 12–15 entries, or
version the cache name per build so each deploy starts clean.

**Also worth knowing:** a service worker is sticky. Once registered it persists in users'
browsers until explicitly unregistered. This one is conservative — it refuses to cache the
HTML shell, which is the correct lesson from the blank-page incident — but you are adding a
permanent caching layer to an app whose last outage was a stale-asset problem.

---

## Group C — the older wave, still uncommitted since 2026-07-10

These are **not** from the recent sessions. They have been sitting in the tree and will
ship with anything you deploy.

| Item | Files | What a user sees |
|---|---|---|
| **#19** bounced WO unidentifiable in Past | `WorkOrderCard.jsx`, `WorkOrderDetailView.jsx`, `workorders/serializers.py`, `workorders/views.py` | Grey "Bounced · resolved" chip on the card; full bounce history panel in the detail view |
| **#20** invoice Drive link | `WorkOrderModal.jsx`, `WorkOrderDetailView.jsx`, `workorders/models.py`, `serializers.py`, **migration `0005` (untracked)** | New "Invoice Link (Google Drive)" field; "Open invoice ↗" in the detail view |
| **#21** Season 6 Trials invisible | `config/views.py`, `config/tests.py` | Re-adding a deleted project name revives it instead of silently staying hidden |
| **#22** REP logo/MOU wiped on edit | `REPModal.jsx`, `reps/serializers.py`, `reps/tests.py` | Logos stop disappearing after an edit — **and see the upload note below** |
| **#23** "2 mod" grant count | `PermissionsManagementPage.jsx`, `permissions/views.py`, `tests.py` | Module count matches what the grid actually shows |
| MySQL 8.4 compat | `payments/migrations/0003_...`, `config/test_rename_scenarios.py` | Nothing visible. Lets a fresh `migrate` succeed on MySQL 8 |
| Containerisation | `Dockerfile`, `.dockerignore`, `docker-compose*.yml`, `docker-entrypoint.sh`, `project_tta/` | Nothing visible. The deployment mechanism itself |

---

## Deploy order — this is not optional

Items **19, 20 and 23 each need their backend half.** `bouncedPayments` and
`invoiceDriveLink` are serializer fields that exist only in the uncommitted backend tree,
and `invoiceDriveLink` additionally needs migration `0005`, which is **still untracked**.

Ship the frontend alone and: the bounce history panel renders empty, and the invoice link
field accepts input and silently discards it on save.

```
1. Fix or delete deploy.bat                    (nothing is safe until this is done)
2. Commit + deploy BACKEND  — including migration 0005
3. Commit + deploy FRONTEND — rebuild the container, not scp
4. Verify on the box: docker compose ps, showmigrations, hard-refresh the app
```

Backend and frontend are **separate repos**. Never one commit.

---

## Open issues

### Confirmed — measured, unfixed

**Attachment blobs in list responses.** The dominant cause of slow pages. Measured from
the dump: `reps_rep` 18.77 MB, `vendors_vendor` 5.26 MB of a 24.37 MB database — **98.6%**.
78 base64 payloads, 22.9 MB total, largest 1.56 MB. `reports/views.py` has no pagination at
all, and `REPSerializer` / `VendorSerializer` include the blob fields in list output. Eight
frontend screens pull the full set. Fixing it properly means a slim list serializer plus
fetch-by-id in `REPDetailView`, `REPModal`, `VendorDetailView`, `VendorModal`, and
`CourierManagementPage.jsx:511` which needs `repLogoUrl` for the package slip. ~6 files.
Expected effect: REP Management drops from ~19 MB to under 100 KB.

**No code splitting.** Main bundle is **12.83 MB** uncompressed (~3.99 MB brotli), no
`React.lazy` anywhere, `xlsx` / `jspdf` / `@mui/icons-material` all bundled eagerly. A
second, independent cause of slowness. Mitigated by Cloudflare caching, so it is a
first-load-per-deploy cost — but every deploy changes the hash and forces all users to
re-download.

**utf8mb3 + MySQL 8.4 strict mode.** All 33 tables are `DEFAULT CHARSET=utf8` (3-byte) and
`DATABASES` pins no charset. MariaDB 10.1 ran non-strict; MySQL 8.4 does not. An emoji in
any free-text field is now a 500 instead of silent mangling. Needs `CONVERT TO CHARACTER
SET utf8mb4` in a maintenance window, **then** pinning the connection charset — not before.

**Rename cascade can abort.** `ConfigOption.value` is `max_length=255` but cascades via
`.update()` into `TrialCityLocation.trial_type` (100), `Vendor.vendor_type` (100),
`Vendor.company_type` (50). Under strict mode a long rename now raises 1406 and rolls back,
where it used to truncate silently.

### Disproven

**Host nginx was not blocking uploads.** The `tta` server block already has
`client_max_body_size 25M`. That diagnosis in the health audit was a hypothesis stated with
too much confidence and it is wrong. Corrected.

**The blank page is not currently broken in production.** Live `index.html` references
resolve 200. The bug was real and was fixed on the server on 2026-07-24; only the
repo-vs-server drift remained, and `nginx.conf` now closes it.

**`.env` is not committed.** Only `.env.example` is tracked. The real exposure was the
untracked 24 MB dump, now gitignored.

### Unverified — needs the box or a real failure

**The actual upload failure cause.** The symptom is real — it came from you directly — but
the mechanism is still unknown. Current best candidate, verified in code: `settings.py`
sets no `DATA_UPLOAD_MAX_MEMORY_SIZE`, so Django's **2.5 MB** default governs the whole
JSON body, and because attachments ride as base64 in JSON rather than multipart, that limit
binds before nginx's 25 MB ever does. The **currently deployed** `REPModal` re-sends *both*
the MOU and the logo on every edit regardless of whether a new file was chosen — a REP with
a 1.5 MB logo plus an MOU comfortably exceeds 2.5 MB and Django raises `RequestDataTooBig`.

Note the consequence: **item #22, already sitting in your tree, may fix this as a side
effect**, since it stops re-sending unchanged attachments.

I have deliberately not patched `DATA_UPLOAD_MAX_MEMORY_SIZE`. That would be a second guess
at the same problem after the first one was wrong. One failed save with the backend log
tailed settles it.

**Container config drift.** Never completed — the `docker ps` output never came back. Still
unknown whether the running frontend container matches the repo's `nginx.conf`. Also
unresolved: the live bundle hash differed from the local `build/`, meaning the deployed
frontend was built from different source than what is on disk here.

### Client issues still open from `new_track.xlsx`

#6 / #17 TDS counted twice on bounced payments (marked "Not Done") · #11 users given access
Admin did not grant · #13 trial report location still not visible · #14 courier trial date
visible for only 3 cities · #24 bulk project change for cities already in TTA.

### Product decisions still waiting on you

From `.ai/pending.md`: WO-PR-NE-001 (Neelkanth, ₹32,020) and WO-RE-FA-001 (Fast FC,
₹24,284) — retry the payment, or add a Super-Admin "Mark as Paid (manual)" override?

From `OPEN_ITEMS_AND_DECISIONS.md`: project-name rename strategy · TDS audit on prod ·
Google Drive credentials for REP logos · the self-contradicting courier delete/retrieve
requirement.
