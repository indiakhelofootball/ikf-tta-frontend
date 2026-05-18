# REP Module

## What this module is

A REP is a field representative — the person on the ground in a particular city who runs trials and coordinates with venues and volunteers. The REP module is where these people are registered, assigned to projects and cities, and where their on-ground details (PIN code, district, courier sub-area, phone, ID proof) are stored.

The data here drives two things. First, every trial has at least one REP attached to it. Second, the Courier module uses the REP's address fields to figure out where shipments are going.

## Who uses it

Super Admin and Admin can add, edit and delete REPs. REPs themselves can log in to the system but cannot edit their own profile from the REP module — they only see their assigned work.

## Where to find it

Click "REP Management" in the sidebar.

## What you see when you open it

A list view with one card per REP. Each card shows:

- The REP's name and a short ID code.
- City and state.
- Phone number.
- The projects and cities they are currently assigned to, shown as small tags.
- Buttons to view full details, edit, or delete.

The top of the page has the usual search bar, filter and sort buttons, plus an "Add REP" button and a "Bulk Upload" button.

## Features at a glance

- Add a single REP with full personal, location and assignment details.
- Bulk upload REPs from an Excel file using a template.
- Edit any REP's profile, assignments, courier info or ID proof.
- Delete a REP (the system blocks deletion if the REP is still attached to an active trial or work order).
- Search by name, phone, city, state or assigned project.
- Filter by city or by assigned trial.
- Sort by name, by creation date, by city.
- Assign one REP to multiple projects and multiple cities at once.

## How to add a single REP

1. Click "Add REP".
2. A form opens with several sections.
3. Personal details:
   - Full name as on the ID proof.
   - Phone number (10 digits).
   - Email (optional but recommended).
4. Address:
   - Full address.
   - PIN code. Typing the PIN auto-fills the state for many common cases.
   - State and city.
5. Courier details (used by the Courier module to address parcels):
   - Courier district.
   - Courier state.
   - Courier sub-area.
6. ID proof:
   - Choose the type of ID (Aadhaar, PAN, Driving Licence, etc.).
   - Enter the ID number.
   - Optionally upload a photo of the ID.
7. Project and city assignment. This is the heart of the REP's working scope:
   - Click "Add Assignment".
   - Pick a project from the dropdown.
   - Pick the city for that assignment.
   - Pick the season.
   - Repeat for every project and city this REP is responsible for.
8. Click Save.

## How to bulk-upload REPs

1. Click "Bulk Upload".
2. The dialog shows two buttons: "Download Template" and "Upload File".
3. Click "Download Template" first if you do not have an existing file. A spreadsheet with the required columns is downloaded.
4. Fill the template in Excel. One row per REP. Required columns: name, phone, state, city. Other columns are optional.
5. Save the file.
6. Click "Upload File" and pick your saved file.
7. The system reads each row and shows a preview. Rows with errors (missing name, bad phone, duplicate REP) are highlighted in red with a reason.
8. Fix any errors directly in the preview, or close the dialog, fix the spreadsheet, and re-upload.
9. When all rows are valid, click "Confirm Upload".
10. Each REP is added one by one. A progress bar shows how many have been processed.

## How to edit a REP

1. Find the REP on the list.
2. Click "Edit" on their card.
3. The same form used for Add opens, pre-filled.
4. Change what you need to.
5. Click Save.

Editing a REP's project or city assignment immediately affects which trials and work orders that REP can see when they log in.

## How to delete a REP

1. Find the REP on the list.
2. Click "Delete".
3. Confirm.

The system blocks deletion if the REP is currently attached to an active trial, an active work order, or a pending courier shipment. Move them off those records first.

## How project and city assignment works

A REP is not tied to one project for life. They can have several active assignments at the same time. For example, the same REP can be running the Nari Shakti project in Delhi and also helping the Khelo Football project in Pune.

The assignment table inside the REP profile is the authority on this. Every row is one (project, city, season) combination. Add rows as the REP picks up more work. Remove rows when an assignment ends.

When a trial is created in the Trials module, the system looks at the assignment table to figure out which REPs to suggest for that project and city. The same logic applies to courier shipments — the Courier module pulls the REP's address from here.

## Important rules and behaviour

- Phone numbers must be unique. Two REPs cannot share a phone number.
- Renaming a REP is fine. The system uses internal IDs to link records, so trials and shipments do not lose their connection when the name changes.
- A REP card without any assignments is allowed but rarely useful. It means the REP is in the system but cannot be picked for any operational work yet.
- ID proof images are stored on the server. They are visible to anyone with Admin access. Treat them with the same care as a physical photocopy.

## Common questions

The REP I added is not showing up in the trial creation form.

Check that the REP has an assignment row for that project and city. The trial form only suggests REPs whose assignment matches.

How do I move a REP from one city to another?

Open the REP, remove the old assignment row, add a new one with the new city, save. Active trials in the old city keep the original REP until those trials are closed.

A REP says they cannot see their own work after logging in.

Confirm their email and password are correct, then confirm they have at least one active assignment. A REP with no assignments will see an empty dashboard.
