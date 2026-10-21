# Courier live updates: test cases (2026-10-21)

What changed: an open courier screen asks `/api/changes/?areas=courier` every
15 s whether anything it shows has changed, and reloads the list only when it
has. Returning to the tab after 30 s still reloads the list, as before. The list
no longer carries delivery photos.

Every case is something a person can do, or something that happens to them.
"Where" says how it is tested:

- **BE**: backend unit test (`courier/test_changes.py`, `courier/test_speed.py`), run on SQLite and MySQL 8.4
- **FE**: frontend unit test (`useLiveUpdates.test.js`, `courierWiring.test.js`, `rowChanges.test.js`)
- **Browser**: real browsers on a local copy of the production data (MySQL 8.4, prod collation), two or more people logged in at once

Results are in `CASES_COURIER_LIVE_RESULTS.md`.

## A. My own work on the courier screen (one person)

Each must work exactly as before, and my own change must never be tagged
"New" or "Updated" as if someone else made it.

| ID | I do | Expected | Where |
|---|---|---|---|
| A1 | Open Courier | Spinner, then the list; "Up to date as of" under the title; counts on the cards | Browser |
| A2 | Click a status card, Active, Past, All | Rows filter as before | Browser |
| A3 | Search by ref, REP, city, AWB | Rows filter as before | Browser |
| A4 | Create a shipment (REP, city, items, notes) | Appears at the top; never tagged New afterwards | Browser |
| A5 | Edit a draft's items and notes | Saved; never tagged Updated afterwards | Browser |
| A6 | Dispatch (courier, AWB) | Status Dispatched; never tagged Updated | Browser |
| A7 | Mark delivered with a photo | Status Delivered; photo stored; the list still carries no photo | Browser, BE |
| A8 | Mark returned | Status Returned | Browser |
| A9 | Delete a shipment | Leaves the list and does not come back on the next check | Browser |
| A10 | Deleted view, restore (super admin) | Deleted view shows only deleted; restored one goes back to the live list | Browser |
| A11 | Print a slip | PDF downloads with the REP logo; works without the photo in the list | Browser |
| A12 | Click Refresh | List reloads, time updates | Browser |
| A13 | Save while a background reload is downloading | My save stays on screen; not shown as undone | FE |

## B. A colleague's work reaching my open screen (two people)

I never touch my screen. Each change must appear by itself within about 15 s, tagged.

| ID | Colleague does | Expected on my screen | Where |
|---|---|---|---|
| B1 | Creates a shipment | Appears, tagged New | Browser, BE |
| B2 | Edits items or notes | Row changes, tagged Updated | Browser, BE |
| B3 | Dispatches, delivers, returns | Status and counts change, tagged Updated | Browser, BE |
| B4 | Deletes, then restores | Leaves, then comes back | Browser, BE |
| B5 | Edits the REP city assignment's courier address (REPs screen) | Draft/dispatched rows of that city show the new address | Browser, BE |
| B6 | Renames a REP | In-flight rows show the new name | Browser, BE |
| B7 | Changes the trial's start date or name (Projects) | In-flight rows show it | Browser, BE |
| B8 | Edits the address of a REP whose shipment is already Delivered | Delivered row keeps the address it was delivered to | Browser, BE |
| B9 | Changes something the list does not show (REP logo) | Nothing reloads | BE |
| B10 | Any other column of any table the list reads | The check notices whenever the list output changes | BE (property test) |
| B11 | Someone adds a new table to what the list reads, without the check | The backend test fails and names the table | BE |

## C. Two people on the same shipment

| ID | Situation | Expected | Where |
|---|---|---|---|
| C1 | I'm editing X; colleague saves X first | My row tags Updated behind the dialog, my typing is kept; my save is refused with "Someone else changed this shipment", their version loaded | Browser |
| C2 | I have Dispatch open on X; colleague deletes X | Row leaves; my dispatch is refused with a message, no crash | Browser |
| C3 | I picked a delivery photo; a background reload happens | Photo and fields in the dialog are kept | Browser |
| C4 | Both of us create shipments at the same moment | Both appear on both screens with different ref numbers | Browser |

## D. Tabs, connection, login

| ID | Situation | Expected | Where |
|---|---|---|---|
| D1 | Tab hidden | No requests while hidden | FE, Browser |
| D2 | Back within 30 s | One check only | FE |
| D3 | Back after 30 s | List reloads silently, no spinner; changes tagged | FE, Browser |
| D4 | Connection drops | "Couldn't check for updates" warning; list stays; clears when back | FE, Browser |
| D5 | Server error during a background reload | Warning, list stays | FE |
| D6 | Login expires while two windows are open and checking | Neither window is logged out | Browser |
| D7 | Leave the courier page | Checks stop | Browser |
| D8 | Switch to Deleted view while a reload is downloading | Deleted view never shows live rows | FE (newest-reload rule), Browser |

## E. Who may see it

| ID | User | Expected | Where |
|---|---|---|---|
| E1 | Super admin | Everything | Browser, BE |
| E2 | Courier view-only | Sees list and live updates; no edit buttons | Browser, BE |
| E3 | No courier grant | Check returns nothing for courier; no errors | BE |
| E4 | Funder (CSR client), even with a stray courier grant | Nothing | BE |
| E5 | Not logged in | 401 | BE |

## F. Production data and load

| ID | Check | Expected | Where |
|---|---|---|---|
| F1 | New list vs old list on prod data | Identical except the photo field, every row, live and deleted views | Prod copy |
| F2 | Detail still carries the photo | Both delivered photos come back from the detail | Prod copy |
| F3 | List size on prod data | Well under 1.65 MB | Prod copy |
| F4 | Check size and speed on prod data | Tens of bytes; fast; query count does not grow with rows | Prod copy, BE |
| F5 | One idle open screen for 5 minutes | Only checks, no list downloads | Browser |

## G. Rest of the app (dependencies)

| ID | Check | Expected | Where |
|---|---|---|---|
| G1 | `useRefetchOnFocus` and the other 12 screens using it | Untouched | git diff |
| G2 | `api.js` | Only `changesAPI` added | git diff |
| G3 | Backend: anything else using courier serializers | Nothing outside courier | grep |
| G4 | REPs and Projects screens still save | Unchanged code; exercised in B5 to B7 | Browser |
| G5 | Full backend and frontend suites | Green | BE, FE |
