# Admin and Configuration

## What this module is

The Admin section is where the dropdowns and master lists used everywhere else in the system are controlled. If a vendor form asks you to pick a "Service Type" and the option you need is not there, this is where someone goes to add it. The same applies to project names, seasons, vendor names, bank names, entity types and account types.

In short, this module decides what the rest of the system lets users pick from.

Whatever lives here is the single source of truth. Once a new item is added, every form across the system sees it the next time it loads.

## Who uses it

Super Admin and Admin can open the Admin section. REPs cannot. The Admin section also has a "User Management" area inside it. Only Super Admin can use User Management. Admin cannot create or delete other accounts.

## Where to find it

Click "Admin" in the sidebar. The Admin page opens. It is divided into clearly labelled panels, one per master list.

## What you see when you open it

The page shows several panels stacked vertically. Each panel manages one kind of list. Every panel works the same way:

- A title and a one-line description at the top.
- The existing items in that list.
- An input box at the bottom where you can type a new item.
- An "Add" button next to the input.
- Each existing item has an Edit pencil icon and a Delete trash icon next to it.

The panels available are:

- Project Names. The list of project labels used when creating a trial.
- Seasons. The list of trial seasons (for example, 2025-26).
- Service Types. The kinds of services a vendor provides (Printing, Venue, Logistics, etc.). Used in the Vendor module.
- Entity Types. The corporate forms a vendor can be (Pvt Ltd, Proprietorship, Partnership, etc.).
- Vendor Names. Pre-approved vendor business names that show up when adding a new vendor. Each name can optionally be tagged with a Service Type and Entity Type so it only appears under the right filter.
- Bank Names. The banks that appear in the vendor bank dropdown.
- Account Types. Savings, Current, and any others your organisation uses.

## How to add an item to any list

1. Scroll down to the panel for the list you want to extend.
2. In the input box at the bottom of that panel, type the new value exactly as you want it to appear in dropdowns.
3. Click the "Add" button next to the input.
4. The new value appears in the list above. It is now live everywhere across the system.

The system blocks duplicates. If you try to add a name that already exists in that list, an error appears under the input and the item is not added.

## How to edit an existing item

1. Find the item in the list.
2. Click the pencil icon next to it.
3. The row turns into an editable field.
4. Type the new name.
5. Click the tick icon to save, or the cross icon to cancel.

A renamed item is updated everywhere across the system from that moment on. Existing records that already referenced the old name continue to show the new name automatically, because the link is by ID, not by text.

## How to delete an item

1. Find the item in the list.
2. Click the trash icon next to it.
3. The item disappears.

There is no soft-delete. A deleted item is gone. If existing records were using that value, those records will keep their old value as plain text, but no new record will be able to pick it.

## How to add a vendor name with service and entity tags

The Vendor Names panel is slightly richer than the others. Each vendor name can be filtered by what kind of vendor it represents.

1. In the Vendor Names panel, type the vendor's business name.
2. Optionally pick a Service Type from the dropdown next to the name.
3. Optionally pick an Entity Type as well.
4. Click Add.

In the Vendor module, when someone is adding a new vendor, the system filters this list using the service and entity types the person has selected. If you tag a name with Service Type "Printing" and Entity Type "Pvt Ltd", that name will only appear when someone is creating a Printing + Pvt Ltd vendor. Names with no tags appear under every filter.

## User Management (Super Admin only)

User Management is a tab inside the Admin section. Only Super Admin sees it. It is where new accounts are created and roles are assigned.

- View all users with their email, role and active status.
- Create a new user: enter name, email, phone, choose Super Admin, Admin or REP, set a starter password.
- Edit a user: change name, phone, role.
- Disable a user: their login stops working but their records stay.
- Delete a user: removes the account permanently.

## Important rules and behaviour

- Always add new dropdown values before the operations team needs them, not during. Adding a Service Type while five people are waiting on a vendor form interrupts everyone.
- Renaming is fine. Deleting is risky. If you are not sure whether a value is in use somewhere, rename it rather than delete it.
- The dropdown lists are cached on each user's browser when they log in. If someone added a value while another user was logged in, that other user may need to refresh the page once to see the new value.

## Common questions

A new Service Type I just added is not appearing in the Vendor form.

Refresh the Vendor page. The dropdown values are loaded once when the user logs in. A refresh forces a re-fetch.

Can I have two Service Types with the same name?

No. The system rejects duplicates. The check is case-insensitive, so "Printing" and "printing" count as the same.

I deleted a Vendor Name by accident. How do I get it back?

Add it again with the same spelling. It will be a new record but for users it will look identical. Old vendors that were using that name continue to work unchanged.
