# Sub-City & REP Assignment — Behaviour Notes (for later work)

**Captured:** 2026-06-21
**Status:** Reference only. No decision made, no code to change yet. Captured so we
can decide what (if anything) to do.

This documents how "city", "sub-city", and "region" behave today, the REP
assignment granularity, and the open risks — so we don't re-derive it.

---

## 1. "Sub city" is THREE different things (name collision)

| Concept | Where | What it is |
|---|---|---|
| **Trial "Sub City"** | `ProjectDashboard.jsx` add-city form, field `addForm.region`, label "Sub City (opt)" (`:556`, `:998`) | Free-text suffix to disambiguate trial locations in one city. Folded into the city **name** as `"City, SubCity"`. |
| **REP/trial `region`** | `REPCityAssignment.region`, `TrialCityLocation.region` (`REGION_CHOICES`) | A fixed **zone**: North / South / East / West / Central. NOT a sub-city. Shares the name `region` with the field above but is unrelated. |
| **Courier `sub_area`** | `REPModal.jsx` "Sub-Area / Locality", `REPCityAssignment.courier_sub_area` (`:83`) | Delivery **locality within a PIN**, auto-filled from the PIN lookup. Part of the courier address; snapshotted to shipments as `snap_sub_area`. |

These are independent. Most confusion comes from `region` meaning "sub-city free
text" in trials but "zone choice" in REP/trialcities.

---

## 2. Trial-level Sub City behaviour

- `ProjectDashboard.handleAddCity` (`:190-193`): `cityName = subCity ? "City, SubCity" : "City"`.
- Submitted via `trialsAPI.addCity` as `{ cityName, region: cityName, ... }`.
  **Quirk:** `region` is set to the FULL city name (`:214`, `:316`), not the
  sub-city alone — so `TrialCity.region` duplicates the city name instead of
  holding a zone. Latent inconsistency.
- Cities come from the `country-state-city` library (fixed dataset), not free
  entry. For Maharashtra it offers: **Mumbai, Mumbai Suburban, Navi Mumbai,
  Sion, Mumbai** — there is **no "South Mumbai"**.

---

## 3. REP assignment granularity

- Model: `REPCityAssignment`, `unique_together = ('rep', 'trial', 'city')`.
- Create path: `get_or_create(rep=, trial_id=, city=)` (`reps/serializers.py:~270`).
- **A REP is assigned per (REP, Project/Trial, City).** Trial = the project.
- **Sub-city is NOT a separate column** — it lives inside the `city` string
  (`"Mumbai, South"`). Uniqueness/matching happen on that exact string.
- So practical identity = **project + city(+subcity-in-name)**.
- **Re-add / edit overwrite rule:** on `get_or_create`, an existing assignment's
  fields are only overwritten with **non-blank** submitted values — a partial
  re-add never wipes existing data (`reps/serializers.py`, the `if not created`
  branch). Relevant when re-adding or editing a sub-city assignment.
- **Snapshot propagation:** the folded city string rides into the shipment as
  `snap_city` (e.g. `"Mumbai, South"`), alongside `snap_sub_area` (the PIN
  locality) and `snap_state`/`snap_district`. So sub-city-in-name is frozen onto
  each shipment at dispatch via `Shipment.refresh_snapshot()`.

---

## 4. The "Mumbai vs South Mumbai" case

- "South Mumbai" is not in the dropdown → add it as **Mumbai + Sub City "South"**
  → stored as **"Mumbai, South"**, a distinct string from **"Mumbai"**.
- **No system problem / no unique-constraint clash.** Both are independent
  cities: each assignable to REPs, each with its own PIN + courier address +
  snapshot. Add-city dedup (exact name + state) won't falsely block either.
- **They never auto-relate:** a REP on `"Mumbai"` does NOT cover `"Mumbai, South"`.
  Cover both = two separate assignments.

---

## 5. Open risks / things to decide later

1. **No linkage between city variants.** `"Mumbai"`, `"Mumbai, South"`,
   `"Sion, Mumbai"`, `"Mumbai Suburban"` are all separate to the system.
   Affects any "group/filter by city" (e.g. #12 Trials Report counts).
2. **Naming consistency is manual.** Same area entered differently → fragmented,
   unrelated rows. No enforced convention.
3. **`region` overload** — zone-choice vs the `region: cityName` quirk in trials.
   Worth cleaning if we ever formalize sub-city as structured data.
4. **Decision to make:** keep sub-city as a folded string (current), OR promote
   it to a real structured field on the trial city + REP assignment. The latter
   would fix grouping/linkage but is a model + migration change touching trials,
   reps, courier snapshots.

---

## 6. Related memory (already stored)

- `courier-address-one-truth` — REP City Assignment is the ONLY address source
  (incl. sub_area); never per-shipment overrides.
- `persistence-audit-findings` — courier district/state/sub_area weren't
  persisted on create/add-city; fixed `a47620c`/`b8e0f84`, live 2026-06-18.
  Prod PIN backfill blocked (no outbound route to api.postalpincode.in); blanks
  self-heal when a REP is edited in the UI (client-side PIN lookup).

---

## 7. Files to touch if/when we formalize sub-city

- `src/components/trials/ProjectDashboard.jsx` — add-city form + city-name folding
- `src/components/rep/REPModal.jsx` — assignment city selection + courier sub-area
- `tta_backend/backend/reps/models.py` — `REPCityAssignment` (city/region/courier_sub_area)
- `tta_backend/backend/trials/models.py` — `TrialCity` (city_name/region)
- `tta_backend/backend/trialcities/models.py` — `TrialCityLocation`
