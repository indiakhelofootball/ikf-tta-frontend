# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Hard rules — read every turn

- **Migration / schema / "DB change" questions:** open the migration file in `tta_backend/backend/<app>/migrations/` and quote the operation type (AddField / AlterField / RemoveField) before answering. Memory is not authoritative for DB state.
- **"Last push" / "what shipped" questions:** run `git log --oneline -10` on BOTH repos (frontend root and `tta_backend/`). Don't answer from memory alone.
- **Deploy questions:** `_docs/deployment/DEPLOYMENT.md` is the source of truth. Read it before quoting steps.
- **Never run `git push`** unless the user explicitly asks in that turn. Approval doesn't carry across turns.
- **Never combine frontend + backend commits.** Two separate repos sharing one folder; `tta_backend/` is in the frontend's `.gitignore`.
- **Confirm intent before coding** when the user describes a feature/bug. One-sentence restatement, wait for ack.
- **Don't propose changes to code you haven't read.** Open the file first.
- **Read `.ai/` before proposing changes.** `vision.md` (product boundaries that must not break) · `design.md` (why the architecture is what it is, and the deploy traps) · `design-system.md` (the three theme scopes, with measured contrast) · `current.md` (what is in flight) · `pending.md` (questions awaiting the owner). Where `.ai/` and this file disagree, **this file wins**.
- **Never hand-write current state into a memory index.** It rots and is then read as fact. In-flight work goes in `.ai/current.md`; live git state is computed by `.claude/hooks/session_start.py`.

## Repository layout

This directory contains **two independent repos** that share a local folder:

- `D:\tta_frontend-main\` — React frontend → pushed to `ikf-tta-frontend`
- `D:\tta_frontend-main\tta_backend\` — Django backend → pushed to `ikf-tta-backend`

`tta_backend/` is in the frontend's `.gitignore`. Never mix commits. Frontend changes go to the frontend repo; backend changes go to the backend repo.

## Frontend commands

```bash
npm start           # dev server (http://localhost:3000)
npm run build       # local production build only — NOT the deploy artefact
npm test            # run all tests (Jest / React Testing Library)
npm test -- --testPathPattern=blkpayExcel   # run a single test file
npm run lint        # eslint src/
npm run lint:fix    # eslint --fix
npm run format      # prettier --write src/
```

Deploy: **`deploy.bat` is retired** (2026-08-15) and there is no `scp` step. The frontend is built **inside the Docker image on the server**; your local `build/` is never uploaded. Read `_docs/deployment/DEPLOYMENT.md` before quoting any step.

**Unresolved contradiction — check before deploying, do not assume either side.** `DEPLOYMENT.md` begins with `git pull` in both repos on the server. A measurement on the box (2026-08-17, hash-comparing the live containers against `origin/main`) found `/root/tta` is **not a git repo** — `git log` fails there and the files carry the Windows UID, i.e. it arrived as a tarball. If that still holds, step 1 of `DEPLOYMENT.md` cannot run and the image must be rebuilt from the source already on the box. Neither claim has been re-checked since; verify on the server first.

## Environment

```
REACT_APP_API_URL=https://tta.indiakhelofootball.com/api
```

For local dev, override to `http://localhost:8000/api`.

## Architecture

### Auth flow

`AuthProvider` (src/auth/AuthContext.jsx) wraps the entire app. On login it calls `api.login()`, receives `{ success, user, token, tokens }` from Django, maps the role to `ROLE_PERMISSIONS` from `src/auth/roles.js`, and stores `tta_token` / `tta_refresh` / `tta_user` in localStorage. The `APIService` singleton (src/services/api.js) automatically refreshes the access token on 401 and force-redirects to `/login` if refresh fails.

Three roles: `SUPER_ADMIN`, `ADMIN`, `REP`. Route-level access uses `RoleBasedRoute`; component-level uses `ProtectedByPermission` / `usePermission` from `src/auth/ProtectedComponent.jsx`.

### API layer

Single `APIService` class in `src/services/api.js` — all domain APIs (`trialsAPI`, `vendorsAPI`, `workOrdersAPI`, `paymentRequestsAPI`, `paymentBatchesAPI`, `tdsAPI`, `repAPI`, `trialCitiesAPI`, `courierAPI`, `configAPI`, `paymentsAPI`) delegate to its `request()` method. Import them as named exports from that file.

### Admin-managed dropdowns

`src/utils/adminStorage.js` maintains an in-memory cache of config values (project names, seasons, vendor types, entity types, bank names, account types). On login it calls `refreshAllFromAPI()` to populate from `configAPI`. Components call sync getters like `getVendorTypeNames()` — never fetch directly from configAPI in components.

### Module pattern

Each feature module under `src/components/<module>/` follows: `<Module>ManagementPage` (list + filters) → `<Module>Card` (row/card) → `<Module>DetailView` (expanded view) → `<Module>Modal` (create/edit form). Work orders also have `workOrderData.js` for shared status constants and business logic helpers (`isWOFullyPaid`, `getWORemainingGross`, `getPeriodLabel`).

### Payment flow

Vendor → Work Order → Payment Request → Payment Batch. Payment requests are raised against a specific WO and track remaining gross. `VendorStatementDialog` shows a vendor's full payment history by pulling `paymentRequestsAPI` and `tdsAPI`.

### Excel exports

Three parallel export utilities in `src/utils/`:
- `blkpayExcel.js` — IDFC bulk payment format
- `iciciExcel.js` — ICICI bulk payment format
- `fullDetailsExcel.js` — internal full-details export

Reference bank format files are in `_docs/excel/`.

### MUI version

Using MUI v7. Use `slotProps.input` instead of deprecated `InputProps`. For Autocomplete, use `params.slotProps?.input` not `params.InputProps`.

## Backend (tta_backend/)

Django 3.2, DRF, SimpleJWT. **Production is MySQL 8.4 running natively on the host** `47.237.115.74`, reached from the backend container over `host.docker.internal`. DB name defaults to `auth_db` (`DB_NAME` in settings) — access on the box with `mysql -u root -p auth_db`.

Backend commands run **inside the container**: `docker compose exec backend python manage.py <cmd>`. There is no venv on the server any more. `MariaDB 10.1.48`, `/root/TTA/backend/venv/bin/python` and `systemctl restart tta` are **old-box facts** that stopped being true at the 24 Jul 2026 move — see the "Old-box facts that no longer apply" section of `_docs/deployment/DEPLOYMENT.md`.

Schema, every relationship and every unenforced reference: `.ai/schema-integrity.md`, with the drawn version at `E:\TTA_Study\TTA-Schema-and-Architecture-2026-08-21.pdf`.

Apps: `accounts`, `trials`, `reps`, `trialcities`, `vendors`, `workorders`, `payments`, `config`, `courier`, `otp`.

Backend deploy: same image-rebuild path as the frontend, not `systemctl`. `sudo systemctl restart tta` is an old-box fact — the same one this file already retires four paragraphs above. `_docs/deployment/DEPLOYMENT.md` is the source of truth.
