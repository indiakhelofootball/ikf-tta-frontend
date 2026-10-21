# Courier live updates: results (2026-10-21)

Cases: `CASES_COURIER_LIVE.md`. Code: FE `fix/courier-live-fe` at `eb31962`,
BE `fix/courier-live-be` at `845a3a6`.

Where it ran:

- **Prod copy:** a read-only `dumpdata` of live (courier, reps, trials,
  trialcities, config: 1,926 rows, 113 shipments) loaded into local MySQL 8.4
  with the live collation (utf8mb3_general_ci) and READ-COMMITTED, plus 30
  isolated `E2E Rxx` REPs so no real shipment was touched. Nothing ran on the
  server.
- **Test data:** the same scenarios on generated data first.
- Three real browsers at once: me (super admin, mouse only), a colleague
  (courier/REPs/projects edit), and a viewer (courier view-only).

## Summary

| Area | Result |
|---|---|
| A. My own work (A1-A13) | All pass. No own change ever labelled New/Updated |
| B. Colleague's work reaching open screens (B1-B11) | All pass, 0-16 s |
| C. Two people on one shipment (C1-C4) | C1-C3 pass. **C4 fails: pre-existing bug, not this change** (below) |
| D. Tabs, connection, login (D1-D8) | All pass |
| E. Who may see it (E1-E5) | All pass |
| F. Prod data and load (F1-F5) | All pass |
| G. Rest of the app (G1-G5) | All pass |

Browser run on the prod copy: 65 passed, 2 failed (both the C4 bug).

## Found and fixed during this testing

**A13 - a save could look undone for up to 15 s (this change; fixed `eb31962`).**
A background reload already downloading when the user saved was read before the
save; applied after it, the row showed its old state, labelled Updated, until
the next check. Every save the page shows itself now drops that download first.
Unit test reverse-checked: with the fix off it fails.

## Found, not fixed (pre-existing, outside this change)

**C4 - two shipments created at the same moment get the same reference number,
and the second save fails with a 500.** `courier/models.py` `CourierCounter.next_ref`
reads `last_seq`, adds one and saves, with no lock. Seen twice: test data
(`CR-2026-0129`) and prod copy (`CR-2026-0139`), `IntegrityError 1062 Duplicate
entry ... for key 'courier_shipment.ref_number'`. The user sees a save error
and has to save again. Fix: take the number under `select_for_update` inside a
transaction. Waiting on the owner.

## Evidence

| Case | Measured |
|---|---|
| F1 | Old live code (f06c2c8) and new code side by side on the prod copy: 99 live + 14 deleted rows, identical field for field except `deliveryImageUrl` |
| F2 | Detail of all 113 shipments identical between old and new, photos included |
| F3 | Live list 1,653,264 bytes (old) -> 183,962 bytes (new) on prod data |
| F4 | Change check 54 bytes; median 44 ms, p95 92 ms (local MySQL, prod data); list server time unchanged (~205 ms) |
| F5 | 40 s with nothing changing: 0 list downloads on either open screen |
| B1-B7 | Colleague's create / notes / dispatch / deliver / delete / restore / REP address / REP rename / city trial date each reached both open screens, labelled, without anyone touching them |
| B8 | Delivered shipment kept `House 13, Lane 13` after its REP's address was changed |
| C1 | My typing kept behind the dialog; my save refused with "Someone else changed this shipment", their version loaded |
| C2 | Shipment deleted while my Dispatch was open: row left, dispatch refused with "Not found.", no crash |
| C3 | Name and photo in my open Delivered dialog kept through a background reload |
| D1 | Hidden 35 s: 0 requests |
| D2 | Back after 5 s: 1 check, 0 list downloads |
| D3 | Back after 35 s: list reloaded, change labelled, page never blanked |
| D4 | Offline: "Couldn't check for updates" in 12 s, list stayed; online: cleared in 15 s |
| D6 | Access tokens forced to 20 s, two windows of one browser, 4 min: 8 expiries, 8 refreshes, 0 failures, never logged out |
| D7 | Left the courier page: 0 checks in 32 s |
| E2 | View-only: no New Shipment / Edit / Dispatch; live updates still arrive |
| A6 | On prod data, Add All Items includes Volunteer Tshirts at qty 0 and Dispatch stays disabled until a reason is picked: unchanged behaviour |
| G | No script errors in any browser; the only 500 was C4 |
| G5 | FE 1,038/1,038 (4 suites time out only under full-suite load and pass alone, as before). BE unchanged since 845a3a6: courier 106/106 SQLite + MySQL; full 1,143 on both at 4736b08 |

## Not covered

- **Real phones and Safari:** Chromium only.
- **The live server's load:** measured locally. The check is one small query
  set per open screen every 15 s; 13 users is about 1 request/second at most.
- **D6 under prod timings:** tokens last 24 h on prod, so expiry happens at most
  once a day per user. The cross-window refresh race was not seen in 8 forced
  expiries, which is evidence, not proof.
