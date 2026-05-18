# Courier

## What this module is

A trial usually needs physical items delivered to the ground a few weeks before the event — t-shirts for volunteers, banners, scout dockets, numbered bibs, the matchsheet. The Courier module tracks these shipments from "we are getting it printed" through to "REP confirms delivered".

Each shipment is a record of: what is going, where, when it left, which courier company is carrying it, what the tracking number is, and what the status is right now. The module also flags shipments that are at risk of arriving late.

## Who uses it

Super Admin and Admin can create and manage shipments. REPs can see shipments addressed to them but cannot edit them.

## Where to find it

Click "Courier" in the sidebar.

## What you see when you open it

A table of shipments, one row per parcel. Each row shows the trial code, the destination city and REP, the items being shipped, the courier company, the tracking number (clickable), the status, and a warning flag if the shipment is at risk.

The top of the page has the usual search, filter, sort and "Create Shipment" controls. A summary strip shows the count of shipments by status.

## Features at a glance

- Create a new shipment with a predefined or custom set of items.
- Track production status of each item (Pending, Sent for Printing, Received from Printer).
- Assign a courier company from a curated list (Blue Dart, DTDC, Delhivery, FedEx, India Post, Ekart, Professional Couriers, XpressBees) or pick "Other".
- Enter the airway bill number and get a click-through tracking link for the major couriers.
- Move shipment through status states: Draft → Dispatched → In Transit → Delivered (or Returned, Lost).
- See automatic warning flags: custom items not ready as the trial date approaches, or shipment still in Draft when the trial is close.
- Export a shipment list as a PDF for sharing with the warehouse or vendor.
- Quick links to WhatsApp and call the receiving REP from inside the row.

## How to create a new shipment

1. Click "Create Shipment".
2. Pick the trial. Only currently-active trials appear.
3. The REP and destination address auto-fill from the trial's city and the REP assigned to that city. Confirm them.
4. The items list pre-fills with the standard six predefined items:
   - Volunteer T-shirts
   - Banners
   - Matchsheet
   - Scout Dockets
   - Numbered Bibs Orange
   - Numbered Bibs Green
5. For each predefined item, set the quantity and any remarks. If you do not need an item, remove the row.
6. To add a custom item (something that is not in the predefined list, for example flags or signage for a special trial), click "Add Custom Item", give it a name and a quantity. Custom items have a production status of their own — useful when something is being printed and not yet ready.
7. Click Save. The shipment is created in Draft status.

## How to dispatch a shipment

A shipment in Draft is ready to be sent but has not left yet.

1. Open the shipment row.
2. Click "Mark Dispatched".
3. A small form asks for:
   - Courier company (pick from the list).
   - Airway bill / tracking number.
   - Date dispatched (defaults to today).
4. Save.

The status changes to Dispatched. If the courier company is one of the supported ones, the tracking number becomes a clickable link that opens the courier's tracking page in a new tab with the AWB pre-filled.

## How to update a shipment in transit

1. Open the row.
2. Click "Update Status".
3. Pick the new status: In Transit, Delivered, Returned or Lost.
4. For Delivered, the date received auto-fills with today.
5. Save.

The REP themselves can confirm receipt from their own dashboard, which moves the status to Delivered without you needing to do it.

## How the warning flags work

The system looks at each shipment and the date of its trial. It compares:

- Whether any custom items are still not in the "Received from Printer" state.
- Whether the shipment is still in Draft.
- How many days remain until the trial date.

Based on this it shows:

- A red flag for shipments where custom items are not ready and the trial is within 60 days, or where the shipment is still in Draft within 30 days of the trial.
- An amber flag for the same conditions but at 75 days (custom items) or 45 days (Draft).
- No flag once the shipment is Delivered, Returned or Lost — the situation is resolved either way.

These flags are visual prompts; they do not change any data on their own. They exist to make sure the right shipments rise to the top of attention.

## How to call or message the receiving REP

Each shipment row has a small phone icon and a WhatsApp icon next to the REP's name. Click the phone icon to dial the REP from your device (works on phones; on a desktop it opens whatever app handles tel: links). Click the WhatsApp icon to start a chat with them on WhatsApp Web or the WhatsApp app.

This is a convenience link — the system itself does not send any messages.

## How to export a shipment list

1. Filter the list to whatever you want to export (for example, all shipments for a specific trial).
2. Click the Export PDF button at the top.
3. A PDF is generated with the table contents.
4. Useful for sharing with a warehouse team, the print vendor, or the REP for cross-check.

## Important rules and behaviour

- The list of supported courier companies is fixed in the system. Adding a new one requires a code change. For couriers not in the list, pick "Other" and store the tracking link manually if needed.
- A shipment cannot be created against a trial that does not have a REP assigned to its city. Fix the REP assignment first.
- Production status of custom items has to be updated manually. The system has no link to the print vendor.
- Once a shipment is marked Delivered, the row becomes read-only. Use Returned or Lost states if something goes wrong afterwards.

## Common questions

The tracking link does not open the right page.

The link is built using the airway bill number you entered. Confirm you have entered it correctly with no spaces. For some couriers (India Post in particular) the tracking page does not accept the AWB in the URL; you will have to paste it manually on the page that opens.

The REP says they have not received the parcel even though the courier shows delivered.

The system can only reflect what was entered. Talk to the courier company first. Update the shipment to Lost or Returned only when it is operationally confirmed.

We use a courier that is not in the dropdown.

Pick "Other". You will still be able to enter the AWB but the link will not be auto-generated. Pasting the courier's public tracking page in the remarks helps the REP track it manually.
