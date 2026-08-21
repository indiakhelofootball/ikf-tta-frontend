# TTA live test run — 2026-08-21, session halted by account rate limit

Servers: backend (Django/.venv_test, port 8000) and frontend (npm start, port 3000)
both confirmed live at time of writing. Login: super@demo.com / Demo@12345.

## Completed and verified against the database (not just the screen)

- TC-LOG-01  PASS  — sign in as super admin, dashboard renders, role correct
- TC-CFG-01  PASS  — added project name "TC Test Project" via Admin, appeared
                      immediately in the picker
- TC-PRJ-01  PASS  — created real project "IKF Trials — Season 1" (id 17)
- TC-PRJ-03  PASS  — added real town "Kota, Rajasthan" to that project
- TC-PRJ-07  PASS  — ground location no longer discarded on add-city (today's fix)
- TC-REP-01  PASS  — created REP "TC Test REP Kota" with full courier+ground form
- TC-REP-05  PASS, DB-VERIFIED — ground_location = 'Nehru Stadium', independent
                      from physical_address = 'Nehru Stadium Road, Kota'
- TC-REP-06  CONFIRMED DEFECT, DB-VERIFIED — filled "Pin Code" under Trial Ground
                      Location; landed in pin_code='324001', NOT ground_pin_code
                      (stayed ''). Matches documented finding exactly.
- TC-CUR-01  PASS  — new-shipment REP+city picker correctly auto-filled courier
                      address from the REP record: "Office 12, City Mall, Kota,
                      Rajasthan — 324001, Ph: 9876543210"
- TC-CUR-02  PASS, DB-VERIFIED — shipment CR-2026-0007 created, status Draft,
                      item "Volunteer T-Shirts" qty=5
- TC-CUR-03  CONFIRMED DEFECT — selected qty "1", pressed Backspace: box shows
                      "0", never blank. Reproduced twice (triple-click+Backspace,
                      and End+Backspace). Matches Number('')===0 diagnosis exactly.
- TC-CUR-06  IN PROGRESS, INTERRUPTED — had just opened the "Mark as Dispatched"
                      dialog for CR-2026-0007 when the session hit its account
                      rate limit and the browser extension disconnected. Shipment
                      is still Draft in the DB; dispatch was never submitted.

## New findings not in the original 74-case document (surfaced only by running it)

1. **Trials Report has NO Venue column on-screen at all** — only the Excel/CSV
   export does (`TrialsReport.jsx:552` header row has no 'Venue' entry, only
   the export builder does). Today's Ground Name fix reaches the export;
   it never reaches the live report table. Verified by reading the render
   code directly after noticing the column was visually absent.

2. **REPModal save failures are shown nowhere on screen** — three real failed
   saves during REP creation (contactName blank, email blank, mouStatus
   invalid) were all silently swallowed; only console.error carried them.
   Same "mute error" shape as finding F3, on a different screen than
   originally found.

3. (From a now-dead parallel agent, unverified by me directly — re-confirm
   before relying on it) **The Trial Cities screen may have no route/sidebar
   entry at all** — the agent's `/trial-cities` navigation was reportedly
   bounced to `/dashboard`. This would mean TC-TWN-01 through TC-TWN-05 are
   not merely defective but literally unreachable via the product. NEEDS
   RE-VERIFICATION — the agent that found this hit the rate limit immediately
   after and never confirmed it a second way.

4. (From the same dead agent, also unverified by me) **Add Vendor's Vendor
   Name field is a freeSolo Autocomplete that silently fails to commit** a
   typed name unless Enter is pressed — the rest of the form stays disabled
   with no error shown. Contrast: PAN Card Upload on the SAME form DOES show
   a real inline error ("PAN CARD DOCUMENT IS REQUIRED"), so this screen is
   inconsistent within itself, not uniformly bad.

5. (From the same dead agent, also unverified by me) **TC-WO-02 confirmed**:
   work order saved with project_ref='Totally Fake Nonexistent Project
   Xyz123', no validation anywhere.

6. (From the same dead agent, also unverified by me) **TC-WO-03 is more
   precise than the original document**: the on-screen box labeled "TDS
   Type / Section" does NOT write workorders.WorkOrder.tds_type (which stays
   blank, as documented) — it writes a DIFFERENT field, tds_comment
   (WorkOrderModal.jsx ~779-784, serializers.py:70-71). A user filling that
   box reasonably believes they are setting tax classification; they are
   writing an unrelated free-text annotation. DB confirmed by the agent:
   tds_type='', tds_comment='TC-Fork-TDS-comment-test'.

## Not yet run at all

Everything else in the 74-case document + 8 address cases: the rest of
Courier (dispatch completion, transit, deliver, return, lost, PDF slip,
delete-button gating), all of Trial Cities, all of Vendors except the
partial TC-VEN-01 attempt, TC-WO-04/05, TC-PAY-01/03/04/05/06/07/08,
all of User Management, and most of the cross-cutting address set.

## Test data left in the dev DB (safe, identifiable, not cleaned up)

- Project "IKF Trials — Season 1" / IKF-S1-001 (id 17)
- Town "Kota" under that project
- Config: project name "TC Test Project" (unused, orphaned — fine to leave
  or delete), season "Season 1"
- REP "TC Test REP Kota" with full ground/courier data
- Courier item type "Volunteer T-Shirts" in Admin
- Shipment CR-2026-0007, Draft, 1 item qty 5

## Cause of the interruption

Three parallel fork agents (Trial Cities+Admin, Vendors, Work Orders+Payments)
were launched to cover ground faster. All three, and then the main session's
browser tool access, were cut off by the account's session rate limit
(resets 9:40am Asia/Kolkata). This is an account-level limit, not a bug in
the app or the test — it stops all further live testing until it resets.
