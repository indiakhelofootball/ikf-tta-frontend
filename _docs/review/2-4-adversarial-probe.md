# Pass 2.4 — Adversarial probe (the one that PROVES it)

**Date prepared:** 2026-08-03 · **CORE pass** · **Status: ready to run — this is the
one pass you execute yourself**

**Rules of engagement, non-negotiable:**

- **Your own test accounts only.** Never probe with a real funder's or a real
  staff member's login.
- **Reads only.** Every request below is a `GET`. Do not send POST/PATCH/DELETE.
- **Nothing here changes data.** If a command in this file would modify
  something, it is a mistake — stop and don't run it.
- Run it against **staging if you have one**, production if you don't (these are
  reads; the risk is the throttle, not the data).

**Why this pass exists:** Passes 2.1, 2.2 and 2.3 read the code and concluded the
endpoints are enforced. That conclusion is worth something, but it is a *belief*.
This pass converts it into a fact — or destroys it. It is the single highest-value
hour in the whole plan, because a 200 here overrides every "✅ server" in the
tables above.

---

## Setup (5 minutes)

**Base URL:** `https://tta.indiakhelofootball.com/api`

**Accounts you need** (create in advance, via the Users & Access screen as
SUPER_ADMIN):

| Label | Role | Grants | Purpose |
|---|---|---|---|
| **CSR-A** | `CSR_CLIENT` | linked to project A | probes 1, 3 |
| **CSR-B** | `CSR_CLIENT` | linked to project B | provides the target IDs |
| **LOW** | `REP` or `ADMIN` | **`report_trials` only** — nothing else | probes 2, 4, 5, 6 |

CSR client accounts are created from **CSR → Clients** (admin only). The LOW
account matters most: give it exactly **one** report grant and no operational
module. Everything it can reach beyond that grant is a finding.

**Get a token** (repeat per account, keep them in separate shell variables):

```bash
TOKEN_A=$(curl -s -X POST https://tta.indiakhelofootball.com/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"csr-a@yourtest.example","password":"..."}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")

echo "$TOKEN_A" | cut -c1-20    # sanity check: should print a JWT prefix
```

Do the same for `TOKEN_B` and `TOKEN_LOW`.

> Login is throttled at **10/min per IP**. If you get `429`, wait a minute — that
> throttle working is itself a small positive result.

**Log every attempt in the results table at the bottom of this file as you go.**
An unrecorded probe did not happen.

---

## How to read every response

| Status | Meaning |
|---|---|
| **200 with data** | 🔴 **LEAK** — record it, note exactly what came back |
| **200 with `[]` / `{"count":0}` / `{"results":[]}`** | 🟡 **AMBIGUOUS** — the filter worked, but the endpoint answered. Note it; it's the right outcome for list endpoints |
| **403** | 🟢 SAFE — permission denied |
| **404** | 🟢 SAFE **and better than 403** — the object isn't even acknowledged to exist |
| **401** | Your token expired — re-login and redo that probe |
| **429** | Throttled — wait, retry. Not a result |
| **500** | 🟠 **Record it.** A crash on a hostile input is its own finding |

Add `-i` to any curl to see the status line, or use the `-w` form below which
prints just the code.

---

## Probe 1 — CSR client A reads CSR client B's project

**What Pass 2.2 predicts:** 404, because `ClientProjectViewSet.get_queryset()`
returns only project A, so DRF cannot find B's ID inside it.

**Step 1 — find your own project ID as A:**

```bash
curl -s https://tta.indiakhelofootball.com/api/client/project/ \
  -H "Authorization: Bearer $TOKEN_A"
```

Note the `id`. Call it `A_ID`.

**Step 2 — find B's real project ID** (log in as CSR-B, same call). Call it `B_ID`.
Using the real ID rather than guessing removes all doubt from the result.

**Step 3 — the probe. As A, ask for B:**

```bash
curl -s -o /tmp/p1.json -w "%{http_code}\n" \
  https://tta.indiakhelofootball.com/api/client/project/$B_ID/ \
  -H "Authorization: Bearer $TOKEN_A"
cat /tmp/p1.json
```

**Step 4 — walk the ID space** (the "increment the ID" attack proper):

```bash
for id in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    https://tta.indiakhelofootball.com/api/client/project/$id/ \
    -H "Authorization: Bearer $TOKEN_A")
  echo "project $id -> $code"
done
```

**Expected:** `200` for `A_ID` only; `404` for every other id, including `B_ID`.

**🔴 If any id other than A_ID returns 200, stop the audit and fix that first.**
That is a confirmed cross-client data leak and it outranks every other finding in
this plan.

**Step 5 — same walk on the child collections**, which is where this class of bug
usually actually lives:

```bash
curl -s -w "\n%{http_code}\n" "https://tta.indiakhelofootball.com/api/client/activities/?project=$B_ID" -H "Authorization: Bearer $TOKEN_A"
curl -s -w "\n%{http_code}\n" "https://tta.indiakhelofootball.com/api/client/reports/?project=$B_ID"    -H "Authorization: Bearer $TOKEN_A"
```

**Expected:** `200` with **only A's** activities/reports — the `?project=` param
is not honoured on the client surface, so it should be ignored entirely. **Check
the body, not just the code.** If B's items appear, that is a leak even though
the status is 200.

---

## Probe 2 — a low-privilege user calls a report endpoint they don't hold

`LOW` holds `report_trials` and nothing else.

```bash
for r in social-media payment-audit vendor-audit trial-spend trials; do
  code=$(curl -s -o /tmp/r_$r.json -w "%{http_code}" \
    https://tta.indiakhelofootball.com/api/reports/$r/ \
    -H "Authorization: Bearer $TOKEN_LOW")
  size=$(wc -c < /tmp/r_$r.json)
  echo "$r -> $code (${size} bytes)"
done
```

**Expected:** `403` on all four, `200` on `trials` only.

**Also record the byte size of the one that succeeds** — you are measuring Pass
4.3's payload problem for free while you're here.

---

## Probe 3 — a CSR funder reaches the internal surface

This tests `EXTERNAL_ROLES`, the structural guarantee that a funder can never
touch an internal module.

```bash
for p in vendors work-orders payment-requests payment-batches reps trials tds \
         reports/vendor-audit reports/payment-audit csr/projects; do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    https://tta.indiakhelofootball.com/api/$p/ \
    -H "Authorization: Bearer $TOKEN_A")
  echo "$p -> $code"
done
```

**Expected: `403` on every single line.**

**Now the known-reachable set** (Pass 2.2, finding C-1 — these are *expected* to
return 200; you are confirming the finding, not discovering it):

```bash
curl -s -w "\n%{http_code}\n" https://tta.indiakhelofootball.com/api/permissions/modules/ -H "Authorization: Bearer $TOKEN_A"
curl -s -o /dev/null -w "banks: %{http_code}\n"         https://tta.indiakhelofootball.com/api/banks/          -H "Authorization: Bearer $TOKEN_A"
curl -s -o /dev/null -w "company-types: %{http_code}\n" https://tta.indiakhelofootball.com/api/company-types/  -H "Authorization: Bearer $TOKEN_A"
curl -s -o /dev/null -w "categories: %{http_code}\n"    https://tta.indiakhelofootball.com/api/categories/     -H "Authorization: Bearer $TOKEN_A"
```

A `200` from `/permissions/modules/` **confirms C-1**: an external funder can read
your complete internal module registry and dependency map. Record it as confirmed
rather than predicted.

---

## Probe 4 — a low-privilege user GETs a Payment Batch

```bash
curl -s -o /dev/null -w "batches list: %{http_code}\n" \
  https://tta.indiakhelofootball.com/api/payment-batches/ -H "Authorization: Bearer $TOKEN_LOW"

for id in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    https://tta.indiakhelofootball.com/api/payment-batches/$id/ -H "Authorization: Bearer $TOKEN_LOW")
  echo "batch $id -> $code"
done

curl -s -o /dev/null -w "payment-requests: %{http_code}\n" \
  https://tta.indiakhelofootball.com/api/payment-requests/ -H "Authorization: Bearer $TOKEN_LOW"
```

**Expected:** `403` throughout — `LOW` holds no `payments` grant, and
`MODULE_DEPENDENCIES` grants read-through only from `workorders` and `vendors`,
neither of which `LOW` has.

---

## Probe 5 — the read-dependency edge (the subtle one)

`MODULE_DEPENDENCIES` deliberately lets a grant on one module unlock **read** on
its dependencies. This probe checks the boundary is read-only and no wider than
declared.

Create a second low account, **PAY**, with `payments` view+edit and **nothing
else**. Per the registry it should be able to *read* vendors, work orders and
TDS — and nothing more.

```bash
# should be 200 — declared read-dependency
curl -s -o /dev/null -w "vendors:     %{http_code}\n" https://tta.indiakhelofootball.com/api/vendors/     -H "Authorization: Bearer $TOKEN_PAY"
curl -s -o /dev/null -w "work-orders: %{http_code}\n" https://tta.indiakhelofootball.com/api/work-orders/ -H "Authorization: Bearer $TOKEN_PAY"
curl -s -o /dev/null -w "tds:         %{http_code}\n" https://tta.indiakhelofootball.com/api/tds-records/ -H "Authorization: Bearer $TOKEN_PAY"

# should be 403 — NOT declared
curl -s -o /dev/null -w "reps:        %{http_code}\n" https://tta.indiakhelofootball.com/api/reps/        -H "Authorization: Bearer $TOKEN_PAY"
curl -s -o /dev/null -w "trials:      %{http_code}\n" https://tta.indiakhelofootball.com/api/trials/      -H "Authorization: Bearer $TOKEN_PAY"
curl -s -o /dev/null -w "csr:         %{http_code}\n" https://tta.indiakhelofootball.com/api/csr/projects/ -H "Authorization: Bearer $TOKEN_PAY"
curl -s -o /dev/null -w "grantlog:    %{http_code}\n" https://tta.indiakhelofootball.com/api/permissions/grant-log/ -H "Authorization: Bearer $TOKEN_PAY"
```

**The one that matters:** `vendors` returning `200` for a payments-only user is
*correct by design* — but **look at the body**. It contains PAN numbers and bank
account numbers. Confirm you are comfortable with "can raise a payment" implying
"can read every vendor's PAN". That is a policy call, not a bug, and it needs
your signature either way.

---

## Probe 6 — confirm R-1 in thirty seconds (browser, no curl needed)

1. Log in as **LOW** with **only `report_vendor_audit`** granted.
2. Open **Reports → Vendor Audit**.
3. Open DevTools → Network → click the `vendor-audit/` request → **Response**.
4. `Ctrl-F` for `"panNumber"`.

**A hit proves Pass 2.3 finding R-1**: a view-only report tick box hands over
every vendor's PAN. While you are in that tab, note the **Size** and **Time**
columns — that is your Pass 4.3 measurement for this endpoint, taken from the
real production dataset.

---

## Results table — fill this in as you go

| # | Probe | Command run | HTTP status | Body summary | Verdict |
|---|---|---|---|---|---|
| 1a | CSR-A → project B by ID | | | | |
| 1b | CSR-A → project ID walk 1–25 | | | | |
| 1c | CSR-A → activities/reports `?project=B` | | | | |
| 2 | LOW → 4 ungranted reports | | | | |
| 2b | LOW → granted report (size in bytes) | | | | |
| 3a | CSR-A → 10 internal endpoints | | | | |
| 3b | CSR-A → `/permissions/modules/` | | | | |
| 4 | LOW → payment batches (list + ID walk) | | | | |
| 5a | PAY → declared read-deps | | | | |
| 5b | PAY → undeclared modules | | | | |
| 6 | `panNumber` present in vendor-audit response | | | | |

---

## ✓ Pass complete when

- **Do I have a number?** Every row above has a status code in it.
- **Have I seen one with my own eyes?** By definition — you ran them.
- **Do I know what the user experiences?** For any 🔴, you know exactly what a
  hostile user gets and how they'd get it.

**The sentence this pass earns you**, and the reason it is worth the hour:
not *"the endpoints should be safe"* but ***"I tried to break in from three
different accounts and here is exactly what happened."*** That is the sentence a
paid auditor sells, and it is the only claim in this whole audit that survives
contact with a sceptic.

**If every probe comes back 403/404 as predicted:** Passes 2.1, 2.2 and 2.3 are
now verified rather than believed, and the access tier of this audit is genuinely
closed. Write that down in the tracker — it is a real result, not a null one.
