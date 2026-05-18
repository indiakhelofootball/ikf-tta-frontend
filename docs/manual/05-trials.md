# Trials and Cities

## What this module is

A trial is a single on-ground event run by the organisation in a specific city under a specific project. The Trials module is where every trial is set up, scheduled, monitored and closed. Cities are not managed as a separate page anymore — they are built into the trial creation flow itself.

A trial usually pulls in several other parts of the system. It needs a project name (from Admin and Configuration), a season, one or more cities, one or more REPs (from the REP module), and downstream it kicks off work orders (for venue, printing, logistics) and courier shipments. The Trials module is the operational anchor that ties everything together.

## Who uses it

Super Admin and Admin can create, edit and close trials. REPs can see trials they have been assigned to but cannot create or edit them.

## Where to find it

Click "Trials" in the sidebar. The Trials list opens. From there you can open any trial's detail view, or click "Create New Trial" to launch the wizard.

## What you see when you open it

The Trials list looks similar to the Vendors list:

- A header with "Trial Management" and a button to create a new one.
- Search bar, filter and sort controls.
- Cards laid out in a grid. Each card shows the trial name, the project type, the season, an assigned-city summary, and the current status (Draft, Active, Completed, Cancelled).
- Click any card to open the trial's full detail view.

## Features at a glance

- Create a new trial through a guided wizard.
- Auto-generate a unique trial code from the project name and season.
- Attach one or more cities to a single trial.
- Attach one or more REPs to each city.
- Edit a trial's basic fields, status, cities and REPs at any time.
- Open the Project Dashboard view to see all related activity (work orders, payments, courier) for a trial in one place.
- Delete a trial (only allowed if no work orders are attached).
- Search across trial name, code, season, project type, comments and assigned cities.
- Filter by project type and by season.
- Sort by newest, oldest, name or code.

## How to create a new trial

The trial creation flow is wizard-style — it walks you step by step.

1. Click "Create New Trial".
2. Step one — basic identity:
   - Pick the Project Name from the dropdown. This list comes from Admin and Configuration. If the project you need is not there, ask an admin to add it first.
   - Pick the Season. Same dropdown source.
   - As soon as both are set, the system auto-generates a Trial Code based on the project name (a short three-letter code) and the season. The code is displayed below the field so you can see it.
   - The system also warns you if a trial with the same project and season already exists, so you do not accidentally create a duplicate.
3. Step two — schedule:
   - Pick the trial date.
   - Optionally set a "next trial date" if you already know when the follow-up will be.
   - Add a comment if there is anything special about this trial.
4. Step three — cities:
   - Add each city the trial will run in. For each city, enter the city name, state, region, and the ground location.
   - Mark the ground as "verified" once it has been physically inspected.
5. Step four — REPs:
   - For each city, pick the REP responsible. Only REPs assigned to that project and city in the REP module appear here.
6. Click "Create Trial" at the end.
7. A confirmation popup shows the generated trial code. Click "Open Trial" to go straight to its detail view, or "Done" to return to the list.

## How to view a trial in detail

1. Click any trial card.
2. The detail view shows:
   - Basic info: name, code, project, season, status, dates.
   - Cities table: one row per city, with state, region, ground, assigned REP.
   - Linked work orders: every WO whose project field matches this trial.
   - Linked courier shipments.
   - Comments and history.

The detail view is also where you change a trial's status (move it from Draft to Active, mark it Completed when the event is over, or Cancel it).

## How to edit a trial

1. Open the trial's detail view.
2. Click "Edit" at the top right.
3. The wizard opens with the existing values pre-filled.
4. Change what needs changing — basic fields, cities, REPs.
5. Save.

Editing the project name or season after the trial code is generated does not change the code. The code is fixed once created, to avoid breaking links to work orders and shipments.

## How to delete a trial

1. Open the trial's detail view.
2. Click "Delete" at the top right.
3. Confirm.

The system blocks deletion if any work orders, payments or shipments are attached. You will need to clear those first, or just mark the trial as Cancelled instead.

## How cities work inside a trial

Cities live inside the trial record. They are not a separate master list anymore. This was a deliberate decision — a city only matters in the context of a specific trial, and the same city across two trials can have different grounds, different REPs and different verification states.

If the same city is used in many trials, you re-enter it for each one. This is intentional, and keeps the data simple.

## Important rules and behaviour

- The trial code is unique. The system enforces this by combining the project's short code with the season — if that combination already exists, the create button is blocked.
- Trial dates are not enforced — you can create a trial dated in the past or in the future.
- A trial in Draft status is hidden from the REP's dashboard. It only becomes visible to the assigned REP when its status is Active.
- Trial codes appear on work orders and shipments. Renaming a trial does not change the code, so existing documents remain linked.

## Common questions

The REP I want to assign is not in the dropdown.

The trial form only shows REPs who have an assignment row in the REP module for that project and that city. Open the REP module, add an assignment for the right combination, then come back to the trial.

The Project Dashboard says no payments, but I raised one.

A payment is linked to a trial only if the work order's project field matches the trial code. Open the work order, confirm the project label is correct, and the payment will show up.

How many cities can one trial have?

There is no hard limit. In practice three to five is normal, but the system lets you add as many rows as you need.
