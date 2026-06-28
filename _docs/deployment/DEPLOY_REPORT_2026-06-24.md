# Deploy & Test Report — 2026-06-23 / 24

Everything built, deployed, and fixed this session, with **how to test each item**.

**Critical split before you test:**
- **Backend is LIVE** on prod (deployed + migrated + restarted + TDS data cleaned).
- **Frontend is NOT live yet** — it's committed and pushed to GitHub, but the frontend
  deploys by **local `npm run build` + upload**, which hasn't happened. So any *UI* change
  below (courier slip, report rename, Trials Report tile, REP detail dates) will **not appear
  on the live site until the build is uploaded**. Backend/data changes are testable now.

---

## 1. What is LIVE on production right now (backend)

Backend repo `ikf-tta-backend`, deployed to `db6600f → 9596608`, migrated, gunicorn restarted.

| Commit | What |
|---|---|
| `9bdd1a4` | TDS cleanup tooling (`audit_tds_duplicates`, `dedupe_tds_records`) + 10-test regression suite |
| `5842401` | #12 `report_trials` grant + `/reports/trials/` endpoint |
| `db6600f` | #8 `backfill_trial_dates` command |
| `6928187` | **TDS double-count fix** — void TDS on bounce, drop the leaky guard, exclude voided from all totals (migration `0004_tdsrecord_voided`) |
| `9596608` | recovered the prod-only migration `0003_auto_20260403_1213` into git and rebased ours as `0004` (fixed a migration-graph conflict) |

**Migrations applied:** `payments` `[X] 0001 … 0004_tdsrecord_voided`.
**TDS data cleanup run:** 1 legacy duplicate removed (WO-FR-AB-001, ₹3,500), re-audit → **ledger clean**.

---

## 2. What is PUSHED but NOT yet deployed (frontend)

Frontend repo `ikf-tta-frontend`, pushed to `93fceef`. **Needs `npm run build` + upload to go live.**

| Commit | What |
|---|---|
| `0338bb5` | Courier package slip → new TYGER-IKF design |
| `e46f7b7` | #9 trial date in REP detail · #11 REP-report extra fields · #12 Trials Report tile · #13 "Social Media" → "REP Report" rename |
| `c8829ec` | REPModal fix (city dropdown / persist pending assignment) — already running live from a manual deploy; now also in git |
| `d1aae4a`, `93fceef` | docs |

**Held back on purpose (NOT pushed):** `AdminPage.jsx` #4 project-rename lock (conflicts with the undecided D-1 cascade-vs-lock question).

---

## 3. The big fix — TDS double-count (#5). How to test.

**What was wrong:** TDS on a bounced-then-retried payment was counted twice in Bank → Total
TDS Liability. Root cause: the bounced payment's TDS record lingered and was summed alongside
the retry's.

**What we did:** (a) on bounce, the TDS record is now *voided* and excluded from every total;
(b) removed the old order/gross-dependent guard that leaked duplicates; (c) cleaned the one
existing legacy duplicate from prod.

**Test A — the number is corrected (live now, existing Bank page):**
1. Log in, open **Bank → Total TDS Liability**.
2. The total should be **₹3,500 lower** than before (the phantom double for WO-FR-AB-001 is gone).
3. The TDS list should show **one** ₹3,500 record for that WO/May 2026, not two.

**Test B — new bounces don't double (live now):**
1. Pick/create a Work Order, raise a Payment Request with TDS > 0, mark it **Payment Done**.
2. Note the Bank Total TDS Liability.
3. Mark that PR **Payment Bounced**. → The Bank TDS total should **drop by that PR's TDS**
   (its record is now voided).
4. Raise a **retry** PR on the same WO and complete it. → TDS total returns to a **single**
   count, not double.
5. (Optional) Un-bounce the original (set back to Payment Done) → its TDS is restored; total
   stays correct (no double).

**Test C — API sanity (live now):**
```
curl -s -o /dev/null -w "%{http_code}\n" https://tta.indiakhelofootball.com/api/tds/
```
Expect `401`/`200` (not `500`).

---

## 4. Courier package slip — new design (#1). NOT live until frontend upload.

**What we did:** rebuilt the downloaded slip to the new TYGER-IKF artwork — SHIP TO block,
"Trial kit for <REP>", PIN/MOB, QTY numbers centered in the badge circles, REP logo pulled
from the REP record. (Also fixed the `indiahelofootball.com` → `indiakhelofootball.com` typo
in the reference files.)

**How to test (after frontend deploy):**
1. Courier → a Draft shipment → **Download packing slip PDF**.
2. Verify: header "INDIA KHELO FOOTBALL" + "Trial kit for <REP name>"; SHIP TO shows the SPOC
   name, address, PIN, mobile; the 6 CONTENTS rows show the right quantities centered in the
   circles; footer reads **indiakhelofootball.com**; REP logo appears (if that REP has one).
3. **Client sign-off still needed** — the client said v1 was "wrong" but never said what; confirm
   this new layout is what they want before relying on it.

---

## 5. Reports changes (#9 / #11 / #12 / #13). NOT live until frontend upload.

**Backend half (#12) is live; the UI is not.**

**How to test (after frontend deploy):**
- **#13 rename:** the report tile/label that said "Social Media Report" now reads **"REP Report"**.
  Existing access still works (the underlying key/grant is unchanged).
- **#11 fields:** open the REP Report — each REP shows **trial date, reporting time, ground
  contact** where present.
- **#9:** open a REP → assignment detail shows the **Trial Date**.
- **#12 Trials Report:** a new **Trials Report** tile appears. It lists assigned trials with city
  + date, month-wise counts per project, and assigned vs unassigned REPs.
  - **Grant required:** non-super users need the `report_trials` grant (User Management UI, or
    `backfill_report_grants --skip-checks`). SUPER_ADMIN sees it already.
  - API check (live now): `GET /api/reports/trials/` returns data for an authorized user.

---

## 6. Trial date in courier (#8). Partially live.

- The courier **Trial Date column** ships with the frontend (test after upload).
- `backfill_trial_dates` (fills NULL trial dates on old shipments) is **available but NOT run**.
  If old courier rows show blank trial dates and you want them filled:
  ```
  /root/TTA/backend/venv/bin/python manage.py backfill_trial_dates --skip-checks            # preview
  /root/TTA/backend/venv/bin/python manage.py backfill_trial_dates --skip-checks --apply
  ```

---

## 7. Still pending / not built (for completeness)

| Item | Status |
|---|---|
| #1 courier slip | built; **client sign-off** pending |
| #2 logo → Google Drive | not built — needs Google account/OAuth decision |
| #3 courier delete/retrieve | not built — needs client decision (archive vs hard-delete) |
| #4 project rename | built as a **lock**, held — conflicts with D-1 (client wants cascade) |
| #6 / #15 bounced WO → past | not built — on hold |
| #14 WO↔project/city linkage | not built — needs the concrete rule |

---

## 8. Remaining deploy steps (yours)

1. **Frontend:** `npm run build` locally → upload `build/` to `/root/TTA/frontend/ikf-tta-frontend/build/`
   (this makes sections 4 & 5 live). Backend is already up, so #12 won't 404.
2. **#12 grant:** assign `report_trials` to the users who need it.
3. (Optional) **#8 backfill** if you want old courier trial dates filled.

---

## 9. Known caveats

- Frontend has **no automated UI tests** — the screens above are verified by code review only;
  the manual tests in this doc are the real check.
- The new courier slip is **not client-confirmed**.
- A migration (`0003_auto_20260403_1213`) had been run on prod months ago but never committed —
  now recovered into git. If anyone runs `makemigrations` directly on the server again, the same
  drift can recur; generate migrations locally and commit them.
