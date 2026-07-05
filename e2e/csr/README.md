# CSR Operator E2E

Playwright end-to-end suite for the **internal CSR operator** flow (`/csr`), built against the
`csr-foundation` branch. Client/funder portal is out of scope.

## Contents
- `PLAN.md` — the full test plan (scenarios S1–S10, flow map, selectors).
- `tests/csr-operator.spec.js` — the Playwright suite.
- `playwright.config.js` — base URL, trace/screenshot on failure.
- `scripts/bootstrap.sh` — one-command stack bring-up (SQLite) + run.

## Run it (in your env or CI — where servers persist)

```bash
FRONTEND_SRC=/path/to/tta_frontend-main \
BACKEND_SRC=/path/to/tta_frontend-main/tta_backend \
bash scripts/bootstrap.sh
```

This clones both repos to a scratch dir, checks out `csr-foundation`, runs the backend on
SQLite, seeds the demo (`csr.admin@example.com` / `Demo-Pass-2026`), builds+serves the
frontend, then runs the suite. Report lands in `playwright-report/`.

### Or against an already-running stack
```bash
npm install
npx playwright install chromium
BASE_URL=http://localhost:3000 npx playwright test
```
Requires the seeded operator login to exist (`python manage.py seed_csr_demo`).

## What was already verified (backend, executed on csr-foundation)
- `python manage.py test csr` → **40/40 pass** (grant gating, expense XOR, server-summed
  Utilisation Certificate, catalog gate, onboarding, branding+throttle).
- `migrate` applies cleanly (89 steps incl. CSR `0001`–`0005`); `seed_csr_demo` creates the
  operator login + demo project/activity/reports/expense tag.

## Note on selectors
The CSR components ship no `data-testid`, so the suite uses role + accessible-label + text.
If a label is tweaked during the merge, update the matching selector in the spec. The MUI
`Select`/date fields are the most likely to need a small adjustment on first run — that first
run is exactly what shakes them out.
