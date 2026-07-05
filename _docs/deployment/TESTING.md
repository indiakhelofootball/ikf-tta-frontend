# CSR — Complete Test Runbook

Run top to bottom. Steps 1–2 reveal the truth about the stack today; 3–6 gate go-live.

> All of this must run on a real machine. It was **not** runnable in the build sandbox
> (no Django there, and the sandbox's repo copy lagged behind the edits), so none of the
> tests below have been executed yet — that's the point of this runbook.

## 1. Backend unit suite (SQLite — fast)

```bash
cd tta_backend/backend
/root/TTA/backend/venv/bin/python manage.py test csr --settings=backend.test_settings -v 2
```

Expect the csr suite (INV-AUDIT, grant walls, INV-LEAK/SCOPE, certificate total,
visibility gate, catalog gate, onboarding, branding, throttle, duration round-trip).
Fix anything red before trusting the rest.

## 2. Backend suite on prod-parity MariaDB 10.1 — DO NOT SKIP

SQLite **enforces** the `CSRExpenseTag` XOR CheckConstraint; MariaDB 10.1 does **not**.
The green SQLite run hides that. Point a settings file at a dev MariaDB 10.1 and:

- run the suite again, then
- in Django admin (`/admin/`), try saving a `CSRExpenseTag` with **both** a payment and a
  manual amount. Confirm `model.clean()` rejects it (the serializer guard won't fire on the
  admin path). This is the H1 risk; verify it on the real engine.

## 3. Migration safety (before any prod migrate)

```bash
manage.py makemigrations --check --dry-run     # must say "No changes detected"
manage.py migrate --plan                        # review csr 0001–0005 + accounts 0003 on a DEV db first
```

## 4. Frontend

```bash
npm ci
npm run lint
npm test -- --watchAll=false
npm run build          # the real import/compile check
```

## 5. Seed + manual smoke (the cross-cutting flows units don't cover)

```bash
manage.py seed_csr_demo        # creates the whole scenario; prints logins + URLs
```

Then walk it:
1. `/client/acme/login` renders in-brand (logo + colours) **before** login.
2. Funder (`funder@example.com`) logs in → sees only this project, only the published
   report, the training's `Jan 15 → Jul 15` span, and **no** vendor/payment/WO/contract data.
3. Generate the Utilisation Certificate → total **₹2,50,000** (matches the server endpoint).
4. Staff (`csr.admin@example.com`) → `/csr` manages projects; `/admin` → Activity Types +
   Client Portal Branding.

## 6. Security / invariant checks

```bash
# INV-SCOPE: funder A cannot read another project
curl -H "Authorization: Bearer <funderA-token>" /api/client/project/<other-id>/   # → 404

# Public branding: works without a token, throttles past 60/min
for i in $(seq 1 61); do curl -s -o /dev/null -w "%{http_code}\n" /api/client/branding/acme/; done | tail -1   # → 429

# G3 isolation: the funder bundle must contain no internal code
npm run build:client
grep -rl "VendorManagement\|PaymentManagement\|workOrdersAPI" build-client/static/js   # → empty
```

## 7. End-to-end (Phase 9, optional but the acceptance test)

A Playwright/Cypress run of: create project → activity → publish report → tag a payment →
log in as funder → assert payment invisible + audit-uniqueness. Not yet scaffolded — ask if
you want it.

---

### Status of the tests themselves
- Backend csr tests: **written**, not yet executed (see the note up top).
- Frontend: modal/theme/dialog tests written; the big pages (portal, onboarding, branding)
  are **not** covered yet.
- e2e: not built.
