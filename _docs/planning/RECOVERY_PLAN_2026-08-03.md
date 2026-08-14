# Recovery Plan — 2026-08-03

> **Status: PLAN ONLY. Nothing in this document has been executed.**
> No files changed, no commits made, no deploys run.
>
> Supersedes the "next steps" sections of `ANOMALY_FIX_PLAN_2026-07-29.md` and
> `CICD_ASSESSMENT_2026-07-27.md`, which assumed a clean tree that no longer exists.

---

## 1. Situation

Three sessions of diagnostic work (2026-07-10, 07-27, 07-29) produced correct fixes
for real production bugs. **None of it is committed. None of it is deployed.**

| | Last commit | Modified | Real content changes | Line-ending churn | Untracked |
|---|---|---|---|---|---|
| Frontend | `6891f79` | 96 | **19** | 77 | 18 |
| Backend | `222f0a6` | 81 | **15** | 66 | 4 |

Both repos are clean against `origin/main` — no divergence, no rebase needed. This is
purely a "large uncommitted tree" problem, which is the good version of this problem.

### The core issue

The bugs the user is still experiencing in production — intermittent blank dropdowns,
random logouts roughly once a day — are **already root-caused and already fixed in the
working tree**. They persist because the fixes never left this machine.

The bottleneck is not diagnosis. It is that the path from "fixed locally" to "running in
production" is blocked at three points:

1. 143 of 177 modified files are pure CRLF churn, making the diff unreviewable
2. Three unrelated workstreams are tangled in one tree with no commit boundaries
3. `deploy.bat` points at a decommissioned server

Phases 0–3 below clear those three blocks. Phases 4–5 are the follow-on work.

---

## 2. Phase 0 — Make the tree reviewable

**Blocking. Nothing else is safe until this is done.**

### Why first

`backend/csr/models.py` reports 195 insertions and 195 deletions. `git diff -w` on the
same file reports **zero** difference. Every line "changed" because the line endings
flipped. Neither repo has a `.gitattributes`.

Committing through this state risks silently burying a real change inside a 195-line
whitespace diff that nobody can read. It also means code review — human or AI — is
useless right now.

### Steps

1. Confirm the current real-change file lists are captured (Section 3 below) **before**
   touching anything, so there is a written record if renormalization goes wrong.
2. Add a `.gitattributes` to **each** repo independently:
   ```
   * text=auto eol=lf
   *.bat text eol=crlf
   *.png binary
   *.pdf binary
   *.xlsx binary
   *.zip binary
   ```
   `deploy.bat` must stay CRLF — Windows batch files can misbehave with LF.
3. Renormalize: `git add --renormalize .` in each repo.
4. Verify the churn is gone: modified-file count should drop from 96 → ~19 (FE) and
   81 → ~15 (BE). **If it does not drop, stop and re-assess — do not proceed.**
5. Commit the normalization **on its own, in each repo separately**:
   `chore: normalize line endings (.gitattributes)`

### Risk

Low, but non-zero. Renormalization rewrites working-tree files. Take a full folder copy
of `D:\tta_frontend-main` (including `tta_backend/`) to a separate drive before step 3.
This is the one irreversible-feeling step in the plan; the backup makes it reversible.

### Exit criteria

Both repos show only files with genuine content changes in `git status`.

---

## 3. Phase 1 — Split and commit

Four workstreams are tangled together. They go in as **separate commits, in separate
repos**, oldest first. Backend before frontend within each wave, so the API contract
exists before the UI that calls it.

### Wave A — 2026-07-10 client work

*Oldest, uncommitted longest. Highest risk of being lost.*

**Backend first:**
- `workorders/models.py`, `workorders/serializers.py` — `invoice_drive_link`
- `workorders/migrations/0005_workorder_invoice_drive_link.py` — **UNTRACKED**
- `reps/serializers.py` — REP logo/MOU preserve on partial update
- `config/views.py` — reactivate
- `permissions/views.py`
- Accompanying test files

> ⚠️ Migration 0005 is untracked. It must go in the **same commit** as the model change.
> Committing the model without the migration ships a backend that fails on startup.

**Then frontend:**
- `WorkOrderCard.jsx`, `WorkOrderDetailView.jsx` — bounced payments
- `REPModal.jsx` — logo preserve
- `PermissionsManagementPage.jsx`

### Wave B — 2026-07-27 post-migration fixes

*Highest production value. This is what stops the daily logouts.*

- `src/services/api.js` — single-flight token refresh
- `backend/backend/settings.py` — `SECURE_PROXY_SSL_HEADER`, `CSRF_TRUSTED_ORIGINS`
- `backend/vendors/serializers.py` — PAN card wipe on partial update
- `backend/payments/migrations/0003_auto_20260403_1213.py` — index ops reordered for
  MySQL 8.4 error 1553. Already applied on prod under MariaDB; affects fresh migrates
  (CI, new setups) only. The in-file comment explains this correctly — keep it.
- `nginx.conf` — **UNTRACKED**. The `/static/` blank-page fix. Exists on the server but
  not in the repo, so the repo copy has drifted. A `docker compose up --build` without
  this would re-break production.

### Wave C — 2026-07-29 config cache

- `src/utils/adminStorage.js` (+141) — per-key `_status`, no cache write on failure,
  `_bump()`/`subscribeConfig`, localStorage hydrate
- `src/hooks/useConfigVersion.js` — **UNTRACKED**
- `src/auth/AuthContext.jsx` — config load decoupled from `permissionsAPI.getMine()`
- `src/utils/adminStorage.test.js`, `WorkOrderModal.configCache.test.jsx` — **UNTRACKED**
- Build stamp: `scripts/genBuildId.js`, `src/index.js`, `Sidebar.jsx`, `Sidebar.css`,
  `public/index.html`, `public/manifest.json`, `public/service-worker.js`, `package.json`

### Wave D — Docker / containerization

- FE: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-compose.local.yml`
- BE: `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`

### ⚠️ Files that carry changes from two waves

These cannot be split by filename. They need `git add -p` to stage hunks selectively:

| File | Wave A hunk | Wave C hunk |
|---|---|---|
| `src/components/workorders/WorkOrderModal.jsx` | `invoice_drive_link` field | `useConfigVersion` rewire |
| `src/components/vendors/VendorModal.jsx` | config reactivate | `useConfigVersion` rewire |
| `src/components/workorders/WorkOrderManagementPage.jsx` | — | `useConfigVersion` rewire |
| `src/components/trials/TrialWizard.jsx` | — | `useConfigVersion` rewire |

If hunk-splitting proves fiddly, the acceptable fallback is folding these four files into
Wave C wholesale and noting it in the commit message. Do **not** fold them into Wave A —
Wave C depends on them, Wave A does not.

### Housekeeping (separate commit)

Extend `.gitignore` for the scratch artifacts sitting at the repo root:
`WhatsApp Chat with IKF TTA 2026 x Abhishek.zip` (39 MB), `new_track.xlsx`,
`project_tta/`. The uncommitted `.gitignore` edit already covers `Untitled.txt`,
screenshots, and the `.docx` files — that edit rides along here.

> The 39 MB zip should be **moved out of the repo folder entirely**, not just ignored.
> An accidental `git add -A` would embed it in history permanently.

### Exit criteria

Both repos have clean working trees. Five or six readable commits per repo, each with a
single coherent subject. Nothing pushed yet.

---

## 4. Phase 2 — Restore the deploy path

Currently:
```
deploy.bat →  scp -r D:\tta_frontend-main\build\* root@47.245.98.149:...
```

`47.245.98.149` is the **decommissioned** box. Live host is `47.237.115.74`. The deploy
model also changed — `docker-compose.yml` documents the new one:

```
docker compose up -d --build          # on the server
BUILD_ID=$(git rev-parse --short HEAD) docker compose up -d --build
```

**Decision required (see Section 8):** repoint `deploy.bat` at the new host, or delete it
and document the compose flow in `_docs/deployment/DEPLOYMENT.md`.

Leaving it as-is is not an option — a stale `scp` against a recycled IP is worse than no
script at all.

### Also in this phase

- `tta_backend/.github/workflows/django-tests.yml:25` — add
  `--settings=backend.test_settings`. CI has **never passed a test** without it. One-line fix.
- No frontend workflow exists. Adding one is cheap: `npm ci && npm run lint && npm test && npm run build`.

---

## 5. Phase 3 — Ship

Order matters; do not batch these.

1. **Verify locally first.** FE: `npm test`, `npm run build`. BE: `manage.py test
   --settings=backend.test_settings`, `manage.py makemigrations --check` (must report no
   changes — if it wants a new migration, Wave A is incomplete).
2. **Push backend first**, then frontend. The FE build calls APIs that Wave A adds.
3. On the server: pull, run migrations, `docker compose up -d --build`, restart.
4. **Confirm the build stamp.** The Sidebar version chip exists precisely so a running
   bundle is identifiable. Check it matches the pushed hash — this is how you know the
   deploy actually took, rather than assuming.
5. Watch for the two bugs to stop: dropdowns should survive a failed config fetch, and
   the once-a-day logout should disappear.

> `git push` requires explicit approval in the turn it happens. It is not implied by
> approval of this plan.

---

## 6. Phase 4 — Spec and conformance audits

Only worth doing on a clean, committed tree — otherwise the audit describes code that is
about to change.

### 4.1 Write a domain-accurate SPEC.md

The generic task-tracker template (Task / Project / Assignee / Sprint) does **not** fit
this app. The real object graph is:

```
Trial → Trial City → REP
                  ↘
        Vendor → Work Order → Payment Request → Payment Batch → TDS
                                                      ↘ IDFC / ICICI bulk export
        Courier Shipment
        CSR Project → CSR Client (external portal)
```

Real roles: `SUPER_ADMIN`, `ADMIN`, `REP`, `CSR_CLIENT`, plus five independently
grantable report keys (`REPORT_KEYS` in `src/auth/roles.js`).

Approach: draft from the codebase, then the user corrects it. Faster than a blank page,
and the ambiguities surface as `??` flags.

### 4.2 What NOT to re-audit

The generic advice "vibe-coded apps hide the button but leave the API open" **does not
apply here.** This codebase already has:

- `permissions/` as a full Django app — `registry.py`, `rules.py`, `enforcement.py`,
  `selftest_rules.py`, plus tests
- `IsCSRClient` — explicitly fail-closed, with object-level scoping to a single project
- Commit `6891f79` — "keep funders out of the internal shell", i.e. this class of bug was
  already found and closed

A blanket permission audit would re-derive solved work. **Targeted** checks are still
worth it (Section 7), but the blanket sweep is not.

### 4.3 Priority order for audits, given this is a production financial app

This app moves real money (bulk payment file exports) and stores PII (PAN cards, bank
account numbers, as base64 blobs). Audit priority follows blast radius, not convenience:

1. Money paths — duplicate submit, WO → PaymentRequest → Batch state transitions
2. Access paths — targeted, per Section 4.2
3. Data integrity — the `default=''` partial-update wipe class of bug, which has now bitten
   **twice** (REP logos, vendor PAN). Worth a systematic sweep of all serializers.
4. Four-states UI polish — real, but last

---

## 7. Phase 5 — Known open work

Carried forward, not yet started:

| Item | Source | Notes |
|---|---|---|
| **Fix 6** — `.catch(() => setThing([]))` sweep | 07-29 | ~110 occurrences across 34 files. Same root cause as the config bug: failure silently becomes an empty array. Large but mechanical. |
| **DB is 98.6% base64 attachments** | 07-27 | `reps_rep` 18.77 MB + `vendors_vendor` 5.26 MB of a 24.37 MB dump. Blob fields sit in list serializers; `reports/views.py` has **no pagination**. Report endpoints ship ~19 MB per call against Cloudflare's 100s origin timeout. **This is the real slowness.** Worker count was a band-aid. Needs a decision — see Section 8. |
| **utf8mb3 across all 33 tables** | 07-27 | MySQL 8.4 runs STRICT mode; MariaDB 10.1 did not. One emoji in a free-text field throws. Needs a `CONVERT TO CHARACTER SET utf8mb4` window. |
| **Upload failure mechanism unverified** | 07-27 | `client_max_body_size` theory disproven. Best remaining candidate: Django's 2.5 MB `DATA_UPLOAD_MAX_MEMORY_SIZE` binding on base64-in-JSON. Deliberately unpatched pending one tailed failure — do not guess-fix. |
| Duplicate-submit guards | 08-03 | `PaymentRequestModal` has guards. `PaymentManagementPage` and `PaymentDetailDialog` have none. In a payments app this warrants a look. |

---

## 8. Decisions needed

These block execution and are not mine to make:

1. **`deploy.bat`** — repoint at `47.237.115.74`, or delete and document the compose flow?
2. **Base64 attachment storage** — this is the architectural decision behind the slowness.
   Options: move to filesystem/S3 with URL references, or keep in DB but strip blobs from
   list serializers and add pagination. The second is much cheaper and probably enough.
3. **utf8mb4 conversion** — needs a maintenance window. When?
4. **Wave D (Docker)** — commit now alongside the rest, or hold until the compose flow is
   actually validated on the server?
5. **Push approval** — Phase 3 step 2 requires explicit sign-off at the time.

---

## 9. Sequencing summary

```
Phase 0  Backup → .gitattributes → renormalize → verify → commit      [blocking]
Phase 1  Wave A (BE→FE) → Wave B → Wave C → Wave D → housekeeping
Phase 2  deploy.bat decision · CI one-liner · FE workflow
Phase 3  Test → push (approval) → deploy → verify build stamp
Phase 4  SPEC.md → targeted audits (money → access → integrity → UI)
Phase 5  Fix 6 sweep · attachment architecture · utf8mb4 · upload repro
```

Phases 0–3 are mechanical and low-judgement. They are also the entire distance between
three sessions of correct diagnostic work and a production system that stops misbehaving.

Phase 4–5 is where the remaining real engineering is.

---

## 10. Explicitly out of scope for this plan

- Any code fix. This document changes nothing.
- The empty `D:\tta_frontend-main\tta` folder — it is a stale connected folder shadowing
  the real repo path. Worth disconnecting, unrelated to the above.
- New features.
