# Staging / post-deploy smoke checklist

Run after deploying **frontend** and/or **backend** to staging or production. Complements `python manage.py test` and [TTA_Module_Documentation.md](../TTA_Module_Documentation.md) (end-to-end flow).

## Auth

1. Log in as **ADMIN** (or SUPER_ADMIN).
2. Confirm dashboard loads without console errors.

## Read-only as REP (if applicable)

1. Log in as **REP**.
2. Open **Payments**, **Work Orders**, **Vendors** — lists should load (**200**).
3. Attempt **Raise Payment** or **Add vendor** — should **not** succeed (expect **403** or UI hidden); aligns with `accounts.tests.test_permission_matrix`.

## Money path (admin)

1. **Vendors:** open list; open one vendor detail.
2. **Work orders:** filter by vendor; create or view WO; confirm `vendorId` / `workOrderNumber` present in JSON (Network tab).
3. **Payments:** **Raise Payment** — submit without client-generated `requestNumber` (backend auto-number); expect **201** or clear validation **400** (JSON), not HTML **500**.
4. **Send to payment:** create batch; confirm PRs move to **Sent to Accounts**.
5. **Bank / TDS:** open TDS list and summary; no hard errors.

## API health

1. `GET /health/` — `{"status":"ok"}`.
2. `GET /api/payment-requests/` with `Authorization: Bearer …` — **200** and JSON shape `paymentRequests` + `total`.

## Frontend ↔ API

1. Confirm `REACT_APP_API_URL` on the built site points at the intended host (e.g. `https://tta.indiakhelofootball.com/api`).
2. Optional: run [test-e2e-flow.js](../test-e2e-flow.js) against staging with `API_URL` env set.

## If something fails

- Browser **Network** tab: failed request **status** and **response body** (first 500 chars).
- Server: `journalctl -u tta -n 100` (or your unit name) for Django tracebacks.
