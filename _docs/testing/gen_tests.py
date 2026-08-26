# Test-case document generator. Case data is hand-written; field counts come from
# the measured inventory so "how many blanks" is not guessed.
import json, pathlib, collections

SP = r"C:/Users/abhis/AppData/Local/Temp/claude/D--tta-frontend-main/2231773a-438b-4a7b-8387-de75daaf27ce/scratchpad"
inv = json.load(open(f"{SP}/inventory.json", encoding="utf-8"))
typed = {a: sum(1 for v in f.values() if v["ui"] == "TYPED") for a, f in inv.items()}
BOXES = {"Admin dropdowns":8, "Projects":29, "Trial Cities (town master list)":13,
         "Local partners (REPs)":57, "Courier":19, "Vendors":36, "Work Orders":25,
         "Payments and TDS":13, "Reports":22, "User Management":13}

OK, DEF, NB, DATA = "ok", "defect", "notbuilt", "data"
BADGE = {OK: ("should pass", "t-good"), DEF: ("known defect", "t-gap"),
         NB: ("not built", "t-silent"), DATA: ("needs live data", "t-dupe")}

# (id, use case, steps, expected result, status, note)
M = [
 ("Getting in", "login", 0, [
  ("TC-LOG-01", "Sign in as SUPER_ADMIN", "Open /login. Enter email and password. Submit.",
   "Lands on /dashboard. Sidebar shows every module.", OK, ""),
  ("TC-LOG-02", "Sign in as an ADMIN with two module grants",
   "Sign in as a user granted only Reports and Courier.",
   "Sidebar shows exactly two modules. Any other URL typed by hand lands on /unauthorized.", OK, ""),
  ("TC-LOG-03", "Dashboard module count matches the grants",
   "As the TC-LOG-02 user, read the dashboard count.",
   "Count reads 2, matching the sidebar.", DATA,
   "Legacy aggregate grant keys survive in the database. Code now excludes them, but a user granted before that fix can still read high. Settle by querying the permission rows."),
  ("TC-LOG-04", "Sign in by OTP", "Request an OTP on a registered phone. Enter it.",
   "Signed in.", DATA, "Reported not working 11 Aug. Depends on the SMS provider, not on app logic."),
  ("TC-LOG-05", "Session expires mid-task", "Leave a screen open until the token expires, then act.",
   "Token refreshes silently. If refresh fails, redirect to the login you came in through.", OK, ""),
 ]),

 ("Admin dropdowns", "config", 3, [
  ("TC-CFG-01", "Add a project name", "Admin, add a value under project_name.",
   "Appears in every project picker without a reload.", OK, ""),
  ("TC-CFG-02", "Rename a project name",
   "Rename an existing project_name value used by trials and work orders.",
   "Trials, the town master list and work orders all follow the rename.", OK,
   "Only through this screen. A rename by any other route leaves the copies behind."),
  ("TC-CFG-03", "Rename a vendor service type",
   "Rename e.g. Volunteer to Scout while vendors carry the old value.",
   "Every vendor shows the new label.", OK, "This is the fix for the 29 Jun report."),
  ("TC-CFG-04", "Rename a city", "Rename a town that REP assignments already reference.",
   "Assignments follow the rename.", DEF,
   "Nothing cascades to city names. The assignments are stranded silently. This is how four orphans were created. Treat a city rename as a migration, not an edit."),
  ("TC-CFG-05", "Correct a mis-tagged vendor name",
   "A vendor name row was saved with the wrong service type. Change it.",
   "The tag updates.", NB, "Tags are set when a vendor is created and are never editable afterwards."),
 ]),

 ("Projects", "trials", 6, [
  ("TC-PRJ-01", "Create a project", "Projects, Create. Fill name and season. Save.",
   "Project appears at the top of the list.", OK, ""),
  ("TC-PRJ-02", "Find a project older than the 20 newest",
   "With more than 20 projects, look for an early one.",
   "It is listed, and the Total Projects card counts every project.", OK,
   "Fixed 21 Aug. Before that the screen loaded only the 20 newest with no pagination — the Season 6 complaint, raised 7 Jul and 16 Jul."),
  ("TC-PRJ-03", "Add a town to a project", "Open a project, add a town, set month and date.",
   "Town is listed against the project.", OK, ""),
  ("TC-PRJ-04", "Add a town already present under a different spelling",
   "Add a town stored as 'Town, Sub-area' by picking the bare town name.",
   "System recognises it and refuses a duplicate.", DEF,
   "The check is an exact name match, so the bare name reads as absent and a second row is inserted with a new code. Deleting one does not stop it recurring. Whether the comma form exists in production is unverified."),
  ("TC-PRJ-05", "Remove a town that a REP still covers", "Remove it.",
   "Blocked, naming the REP.", OK, "Guard added after this went wrong once."),
  ("TC-PRJ-06", "Bulk import towns", "Use the bulk form for several towns at once.",
   "All are added, duplicates skipped and counted.", OK, ""),
  ("TC-PRJ-07", "Record a venue when adding a town",
   "Supply a ground location as the town is added.",
   "It is stored against the town.", OK,
   "Fixed 21 Aug. The endpoint previously overwrote it with blank."),
 ]),

 ("Trial Cities (town master list)", "trialcities", 7, [
  ("TC-TWN-01", "Add a town with every box filled", "Fill all fields. Save.",
   "Saved, appears in the list.", OK, ""),
  ("TC-TWN-02", "Add a town leaving Ground Location blank",
   "Fill only the required boxes. Save.",
   "Saved.", DEF,
   "The form sends an empty marker the server rejects for five fields — assigned REP, ground location, trial type, month, comment. The save fails with 'Failed to save city. Please try again.' and never names the field."),
  ("TC-TWN-03", "Read the reason a save failed", "Trigger any validation failure.",
   "The message names the field and the reason.", DEF,
   "Every failure renders the same sentence. The server's explanation is discarded before it reaches the screen. This affects the whole app, not only this form."),
  ("TC-TWN-04", "Enter a Ground Location and see it on the Trials Report",
   "Fill Ground Location here. Open the Trials Report.",
   "The venue appears.", DEF,
   "This box writes the town master list; the report reads the REP's record for that town. Enter the venue on the REP screen instead."),
  ("TC-TWN-05", "Bulk import towns from a sheet", "Import a CSV with the template columns.",
   "Rows are created, bad rows reported.", OK, ""),
 ]),

 ("Local partners (REPs)", "reps", 24, [
  ("TC-REP-01", "Create a REP with one town",
   "REP Management, Add. Pick project and town, fill org details, courier block and ground block. Save.",
   "REP created with one town record.", OK, "24 boxes across the whole form."),
  ("TC-REP-02", "Add a second town to the same REP in the same project",
   "Edit the REP, Add assignment, pick another town in the same project.",
   "Both towns listed, each with its own courier and ground details.", OK,
   "This is the REP-scarcity case. Reported broken on 29 Mar, works now."),
  ("TC-REP-03", "Give two towns different venues under one REP",
   "Fill a different Ground Name for each town.",
   "Each town keeps its own venue.", OK,
   "The record is keyed by REP, project and town, so this holds."),
  ("TC-REP-04", "Edit a REP that already has a logo, changing only a phone number",
   "Open, change the phone, save. Reopen.",
   "Logo, MOU and logo link are all still there.", DEF,
   "The logo link is blanked. It is not pre-filled when an existing REP is matched by name, and the merge writes the blank over the stored value. Reported six times as 'logo disappeared again'."),
  ("TC-REP-05", "Record a venue name", "Edit a town record. Fill Ground Name. Save. Reopen.",
   "The name is stored and shown.", OK,
   "Fixed 21 Aug. Previously the ground address had a box and the ground name did not."),
  ("TC-REP-06", "Record the ground PIN that the report prints",
   "Fill the PIN under Trial Ground Location. Check the report.",
   "The PIN appears on the report row.", DEF,
   "Two PIN fields exist. The form writes one, the report reads the other, and the second has no input anywhere. 51 records hold the first, none the second."),
  ("TC-REP-07", "Set a reporting time when editing an existing REP",
   "Open an existing town record and look for Reporting Time.",
   "The box is there.", NB,
   "The box exists only when adding a REP, never when editing. Time was part of the 29 Jun request."),
  ("TC-REP-08", "Remove a town record from a REP", "Delete one assignment.",
   "Removed, the REP and its other towns survive.", OK, ""),
 ]),

 ("Courier", "courier", 3, [
  ("TC-CUR-01", "Raise a shipment for a town",
   "Courier, new. Pick the REP and the town. The courier address fills from that record.",
   "Draft created with the right address.", OK, ""),
  ("TC-CUR-02", "Add items and quantities", "Add items, set quantities.",
   "Saved against the shipment.", OK, ""),
  ("TC-CUR-03", "Clear a quantity back to empty", "Backspace a quantity to nothing.",
   "The box is empty.", DEF, "It snaps back to 0 and cannot be cleared."),
  ("TC-CUR-04", "Two people edit one shipment's items",
   "A adds an item. B, whose screen loaded earlier, saves.",
   "Both items survive.", DEF,
   "Saving deletes every item and re-adds only what that screen held. B silently erases A's item. This is the missing-item report."),
  ("TC-CUR-05", "Dispatch, then change the REP's address",
   "Dispatch, then edit the courier address on the REP record.",
   "The dispatched shipment keeps the address it was sent to.", OK,
   "Snapshots are frozen at dispatch. Correct by design."),
  ("TC-CUR-06", "Delete a dispatched shipment as SUPER_ADMIN",
   "Open a dispatched shipment as super admin. Find delete.",
   "Delete is offered and works.", DEF,
   "The backend is complete — soft delete, a super-admin view and a restore endpoint. The button renders only inside the Draft block and is gated on edit rights, not on super admin. Dispatched, In Transit and Delivered rows offer no delete to anyone."),
  ("TC-CUR-07", "One parcel covering three towns under one REP",
   "One REP covers three towns from one office. Record the single dispatch.",
   "All three towns show the dispatch.", NB,
   "A shipment ties to one town record. Only one town gets a courier history; the other two show none."),
  ("TC-CUR-08", "Print the packing slip", "Generate the slip for a shipment with several items.",
   "Every item appears.", OK, "Slip composition is clean; the risk is TC-CUR-04 upstream."),
 ]),

 ("Vendors", "vendors", 22, [
  ("TC-VEN-01", "Create a vendor", "Search, confirm the name, fill details and bank block. Save.",
   "Vendor created and selectable in work orders.", OK, "22 boxes."),
  ("TC-VEN-02", "Find a vendor added long ago",
   "Search an older vendor in the vendor picker dialog.",
   "It is offered.", DEF,
   "That dialog caps at the first 15 matches of a newest-first list, so older vendors are unreachable there. The main vendor list is unaffected."),
  ("TC-VEN-03", "Edit a vendor's phone only", "Change the phone. Save. Reopen.",
   "Only the phone changed.", DEF,
   "Status is forced to Verified on every save, whatever it was before."),
  ("TC-VEN-04", "Create two vendors with the same PAN", "Save a second vendor with an existing PAN.",
   "Refused, or at least flagged.", DEF,
   "No uniqueness rule exists on the vendor name or on PAN. Both save. PAN is the identity used for TDS filing."),
 ]),

 ("Work Orders", "workorders", 20, [
  ("TC-WO-01", "Raise a work order against a vendor",
   "Pick the vendor, amount, type, and tag the project and city. Save.",
   "Created and listed.", OK, "20 boxes."),
  ("TC-WO-02", "Tag a work order to a project that does not exist",
   "Type a project name with a typo.",
   "Refused or flagged.", DEF,
   "The project is free text with no link, so the typo saves. Two parts of the system also disagree on whether this holds a project name or a project code."),
  ("TC-WO-03", "Set the tax section on the work order itself",
   "Open a work order and look for its own TDS section.",
   "The box is there.", NB,
   "The field exists and the server serves it; no screen offers it. Classification always falls back to the vendor's."),
  ("TC-WO-04", "Delete a work order that has payments", "Try it.",
   "Refused.", OK, "Correctly protected."),
  ("TC-WO-05", "Edit project and city on a work order that has sent payments",
   "Change the tags after payments exist.",
   "Allowed.", OK, ""),
 ]),

 ("Payments and TDS", "payments", 18, [
  ("TC-PAY-01", "Raise a payment request against a work order",
   "Pick the work order, amount and period. Save.",
   "Created; the work order's remaining amount drops.", OK, ""),
  ("TC-PAY-02", "Batch payments and download the bank file",
   "Select payments, create a batch, download.",
   "File matches the bank's format exactly, debit account pre-filled.", OK, ""),
  ("TC-PAY-03", "Mark a payment bounced",
   "Set status to Payment Bounced.",
   "Amount comes back off the work order, the period un-marks, status recalculates, the TDS is cancelled.", OK, ""),
  ("TC-PAY-04", "Retry a bounced payment", "Raise a new request for the same slot.",
   "The form warns that TDS was already deducted and books no second deduction.", OK, ""),
  ("TC-PAY-05", "Reverse a bounce that was marked in error",
   "Set it back to Payment Done after a retry already exists.",
   "Refused, with a reason.", OK, "Correctly guarded against double counting."),
  ("TC-PAY-06", "Resolve a bounce that was settled outside the system",
   "Use Resolve and record that it was paid externally.",
   "Recorded as external, and the money is restored to the work order.", DEF,
   "The screen sends no reason, so every resolve is stored as 'settled by a retry'. The external path was designed to restore the amount and was never built, so the work order still shows it unpaid."),
  ("TC-PAY-07", "Read the TDS total after a bounce",
   "Bounce a payment, then open the Payment Audit report.",
   "The bounced deduction is excluded from the total.", DEF,
   "The backend excludes it correctly; the report screen does not use that flag and sums every row. This is the double-TDS complaint, raised four times."),
  ("TC-PAY-08", "Mark TDS deposited", "Mark a month's TDS as deposited.",
   "Recorded with the correct deadline for that month.", OK, ""),
 ]),

 ("Reports", "reports", 0, [
  ("TC-RPT-01", "Trials Report shows project, address and map",
   "Open the Trials Report.",
   "Project, address and map link populate.", OK, "Address fills on 55 records."),
  ("TC-RPT-02", "Trials Report shows the venue",
   "Fill a Ground Name on a REP town record, then open the report.",
   "The Venue column shows it.", OK,
   "Fixed 21 Aug. Rows saved before then stay blank until filled."),
  ("TC-RPT-03", "Trials Report shows the reporting time",
   "Look for a time column.",
   "Time is shown.", NB,
   "There is no time column. Time was part of the 29 Jun request and is the one element still undelivered."),
  ("TC-RPT-04", "Filter the report and read the summary cards",
   "Apply any filter.",
   "The cards move with the table.", DEF,
   "The cards are computed from the unfiltered rows. The table moves and the cards do not."),
  ("TC-RPT-05", "A town appears once per project",
   "Check a project whose town was added twice.",
   "One row.", DEF, "See TC-PRJ-04. Duplicate town rows both render."),
  ("TC-RPT-06", "Export to Excel and to CSV",
   "Export both. Open in Excel.",
   "Columns line up with the headers; no shifted cells.", OK,
   "Shape guards throw if a row does not match its header. Uncommitted."),
  ("TC-RPT-07", "Venue and Address differ on the export",
   "Compare the two columns.",
   "They hold different values.", OK,
   "The fallback that made them identical was removed. Uncommitted."),
 ]),

 ("User Management", "permissions", 1, [
  ("TC-USR-01", "Create a user and grant one module",
   "Create the user, grant a single module.",
   "They see exactly that module.", OK, ""),
  ("TC-USR-02", "Grant a module that needs another to work",
   "Grant Payments only.",
   "Read access to its dependencies comes with it.", OK, ""),
  ("TC-USR-03", "Review who changed whose access",
   "Open the audit log.",
   "Actor, target and the before/after are listed.", OK,
   "The only part of the system with a real change history."),
  ("TC-USR-04", "Find out who cleared a REP's address",
   "Ask the same question of a REP, town, vendor or project.",
   "A history is available.", NB,
   "No change log exists on any of those tables, and no field records who last edited. The question cannot be answered."),
 ]),
]

CROSS = """
<section class="sheet">
  <p class="eyebrow">Cross-cutting</p>
  <h2>The address cases, examined on their own</h2>
  <hr class="rule">
  <p class="lede">Addresses caused more reports than anything else, so they are worth testing as a set
  rather than module by module. Four real addresses exist, plus one frozen copy.</p>
  <table>
    <tr><th style="width:9%">ID</th><th style="width:26%">Case</th><th style="width:30%">Expected</th><th style="width:35%">Notes</th></tr>
    <tr><td class="mono">TC-ADR-01</td><td>The courier address and the ground address hold different text</td>
        <td>They are independent. Neither ever fills from the other.</td>
        <td><span class="tag t-good">should pass</span> The fallback that made them identical was removed.</td></tr>
    <tr><td class="mono">TC-ADR-02</td><td>One REP, three towns, one office</td>
        <td>The same courier address is recorded on all three town records.</td>
        <td><span class="tag t-good">should pass</span> It is entered three times. There is no single organisation address anywhere on a REP.</td></tr>
    <tr><td class="mono">TC-ADR-03</td><td>One REP, three towns, three stadiums</td>
        <td>Each town record keeps its own ground name and address.</td>
        <td><span class="tag t-good">should pass</span> The record is keyed by REP, project and town.</td></tr>
    <tr><td class="mono">TC-ADR-04</td><td>Change a REP's courier address after dispatch</td>
        <td>Dispatched shipments keep the old address; drafts read the new one.</td>
        <td><span class="tag t-good">should pass</span> Frozen snapshots, correct by design.</td></tr>
    <tr><td class="mono">TC-ADR-05</td><td>A town in a project with no REP assigned yet</td>
        <td>A known venue can still be recorded.</td>
        <td><span class="tag t-silent">not built</span> Every address lives on the REP's town record, so there is nowhere to put it until someone is assigned.</td></tr>
    <tr><td class="mono">TC-ADR-06</td><td>Enter a venue in the town master list and expect it on the report</td>
        <td>It appears.</td>
        <td><span class="tag t-gap">known defect</span> Three tables hold a field called ground location. The town master list has an input nothing reads; the report reads the other two.</td></tr>
    <tr><td class="mono">TC-ADR-07</td><td>An address exists but the row shows blank on the report</td>
        <td>Blank means nobody entered one.</td>
        <td><span class="tag t-dupe">needs live data</span> 45 of 100 town records have no ground address. A blank is a worklist item, not a bug.</td></tr>
    <tr><td class="mono">TC-ADR-08</td><td>Rename a town that REP records reference</td>
        <td>The records follow.</td>
        <td><span class="tag t-gap">known defect</span> Nothing cascades. Four assignments are stranded this way today, with two dispatch-ready courier drafts hanging off them.</td></tr>
  </table>
  <div class="callout c-gap">
    <p><strong>TC-ADR-08 is the one to run before anything else.</strong> Two courier drafts point at
    towns their projects no longer contain, and in-flight shipments re-read the address live. Standing
    instruction: do not dispatch, do not delete, until it is settled whether those trials should be
    running in those towns.</p>
  </div>
</section>
"""

out = []
for i, (title, app, nfields, cases) in enumerate(M, 1):
    rows = []
    for cid, uc, steps, exp, st, note in cases:
        lab, cls = BADGE[st]
        rows.append(f'<tr><td class="mono">{cid}</td><td><strong>{uc}</strong></td><td>{steps}</td>'
                    f'<td>{exp}</td><td><span class="tag {cls}">{lab}</span>'
                    f'{"<br><span class=\'sub\'>" + note + "</span>" if note else ""}</td></tr>')
    cc = collections.Counter(c[4] for c in cases)
    nb = BOXES.get(title)
    fieldline = (f'<span class="tag t-flow">{nb} input controls on screen</span>' if nb else '')
    out.append(f"""
<section class="sheet">
  <p class="eyebrow">Module {i} of {len(M)}</p>
  <h2>{title}</h2>
  <hr class="rule">
  <div class="statline">
    <span><strong>{len(cases)}</strong> cases</span>
    {fieldline}
    <span class="tag t-good">{cc[OK]} should pass</span>
    <span class="tag t-gap">{cc[DEF]} known defect</span>
    <span class="tag t-silent">{cc[NB]} not built</span>
    <span class="tag t-dupe">{cc[DATA]} needs live data</span>
  </div>
  <table>
    <tr><th style="width:9%">ID</th><th style="width:18%">Use case</th><th style="width:26%">Steps</th>
        <th style="width:22%">Expected result</th><th style="width:25%">Status</th></tr>
    {''.join(rows)}
  </table>
</section>""")

tot = collections.Counter()
for _, _, _, cases in M:
    for c in cases: tot[c[4]] += 1
pathlib.Path(f"{SP}/tc_sections.html").write_text("".join(out) + CROSS, encoding="utf-8")
print("modules:", len(M), "cases:", sum(len(c[3]) for c in M) + 8)
print("status:", dict(tot), "(+8 address cases)")
print("box counts used:", BOXES)
