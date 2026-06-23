# Deploy Postmortem & Study Guide — The venv Segfault (2026-06-18)

A complete walkthrough of the deploy that took hours, written to *teach*: what
broke, why it broke, how we diagnosed it, and **why each fix actually worked**.
Read this before the next deploy and the same problem will cost you ten minutes,
not an evening.

---

## 0. The one-paragraph version

We pulled new backend code and tried to run `manage.py`. It segfaulted. Hours of
diagnosis proved the cause had nothing to do with our code, the database, or the
migrations: the project's **virtualenv contained a stale *copy* of the Python
interpreter binary** that no longer matched the system `libpython3.13.so` it
loads at startup (the global Python had been upgraded/recompiled underneath it).
The fix was to **recreate the venv** from the healthy global Python
(`/usr/local/bin/python3.13 -m venv --clear`) and reinstall the 9 dependencies.
Everything else (a MariaDB JSONField check, a blocked PIN-lookup API) was a side
issue we routed around. After recreating the venv, gunicorn restarted cleanly and
the deploy completed.

---

## 1. Background mental models you must hold

Most of the confusion in this session came from missing these four models. Learn
them once and the whole episode makes sense.

### 1.1 Two independent repos sharing one folder

- `D:\tta_frontend-main\` → the **frontend** repo (React) → deploys to `ikf-tta-frontend`.
- `D:\tta_frontend-main\tta_backend\` → the **backend** repo (Django) → deploys to `ikf-tta-backend`.

`tta_backend/` is in the frontend's `.gitignore`. They never share a commit. A
"deploy" is really *two* deploys with different mechanics (below).

### 1.2 "On disk" ≠ "running" (the gunicorn model)

This is the single most important idea in the whole session.

- `git pull` changes **files on disk**.
- The thing actually answering web requests is the **gunicorn process**, which
  loaded the old code into memory the last time it started.
- Gunicorn keeps running the *old* code until you `systemctl restart tta`.

So you can pull the newest code and *still serve the old code indefinitely*.
"Did I deploy?" is really two questions:

1. Is the new code **on disk**? (did you `git pull`?)
2. Is it **running**? (did you `restart tta`?)

The same split applies to the database: a migration *file* on disk does nothing
until `migrate` *runs* it.

This model also explains the scariest part of the session: gunicorn was happily
serving requests **while the interpreter on disk was broken**, because gunicorn
had a *working* interpreter mapped into memory from its last restart. We were
living on borrowed time — the next restart (or a server reboot) would have loaded
the broken interpreter and taken the site down. The breakage was invisible until
you tried to restart.

### 1.3 The frontend has no build step on the server

There is **no Node, no `git pull`, no build** on the server for the frontend.
What nginx serves is whatever static files sit in
`/root/TTA/frontend/ikf-tta-frontend/build/`. Those change *only* when you build
locally (`npm run build`) and manually upload the `build/` folder (`deploy.bat`
or `pscp`). Pulling the backend repo does nothing for the frontend.

### 1.4 Global Python vs. venv Python (the crux of the bug)

There are two layers, and conflating them is what made this hard:

- **Global interpreter:** `/usr/local/bin/python3.13` — a source-compiled Python
  shared system-wide. Healthy throughout.
- **Project venv:** `/root/TTA/backend/venv` — created *from* that global Python.
  Critically, on this box the venv's `bin/python` is a **34 MB copied binary**,
  not a symlink. A copied interpreter still dynamically links against the system
  `libpython3.13.so` at runtime. If the global Python is later upgraded or
  recompiled in place, that shared library changes — and the stale copied binary
  in the venv now mismatches it and **segfaults the instant it starts**.

```
venv/bin/python  (copy, frozen May 4)  ──dynamically loads──►  /usr/local/.../libpython3.13.so  (upgraded later)
                                                                          ▲
                                                          mismatch = SIGSEGV at startup
```

---

## 2. What we were trying to do

Ship a batch of already-written, already-pushed work to production:

- **Vendors:** load the full vendor list (`limit:1000`) instead of the backend's
  default page size of 20.
- **Reports:** a new `reports` Django app with per-report access grants and
  dedicated endpoints.
- **Courier / REP:** address re-sync and district/state persistence (these had
  actually shipped in an earlier deploy — see §6).

Standard deploy plan: push frontend fix → backend `pull / migrate / backfills /
restart` → build & upload frontend → verify live.

---

## 3. The failure chain — and how each step narrowed it down

This is the part to study. Each command was chosen to *split the hypothesis space
in half*. That's the transferable skill: don't guess fixes, run the cheapest test
that eliminates the most causes.

### Step A — `manage.py migrate` → `ModuleNotFoundError: No module named 'decouple'`

First red herring. The traceback showed Django loading from
`/usr/lib/python3.8/site-packages/` — **system Python 3.8**, not the venv's 3.13.
So the `activate` + bare `python` had resolved to the *wrong interpreter*.

**Lesson:** the project's hard rule "always use the full venv path"
(`/root/TTA/backend/venv/bin/python`) exists precisely because `activate` is
unreliable on this box. We switched to absolute paths from here on.

### Step B — `venv/bin/python manage.py check` → `Segmentation fault`

A segfault (not a Python exception) means a crash in **C code**, below the Python
layer. Could be the DB driver, could be the interpreter. Need to localise it.

### Step C — `python -c "import MySQLdb"` → `Segmentation fault` (exit 139)

This imports *only* the MySQL driver — no Django, no settings, no DB connection.
It still crashed. So the crash is at **import of a C-extension**, before any of
our code runs. Initial (reasonable) hypothesis: the `mysqlclient` C-extension is
broken — its compiled binary no longer matches the system MariaDB/SSL libraries
it links to.

### Step D — `python -V` → `Segmentation fault`

**This is the moment the real cause revealed itself.** `python -V` imports
nothing, opens no database, touches no `mysqlclient`. It just prints a version
string. If *that* segfaults, the problem is not any package — it's the
**interpreter itself**.

**Lesson:** when something fails, find the *simplest possible invocation* that
still fails. `python -V` is about as simple as it gets. The driver theory was
downstream noise; `import MySQLdb` crashed only because *every* startup of this
interpreter crashed.

### Step E — `python -S -V` → still `Segmentation fault`

`-S` skips site initialization (no `.pth` files, no `site-packages` auto-imports).
Still crashed. So it's **not** a broken package auto-imported at startup either.
The crash is in the interpreter's own startup, before user code of any kind.

### Step F — the deciding facts

Two read-only checks split the last fork:

```
ls -la venv/bin/python        → a real 34 MB COPIED binary, dated May 4
cat venv/pyvenv.cfg           → base = /usr/local/bin/python3.13
/usr/local/bin/python3.13 -S -V → Python 3.13.3, exit 0   ← GLOBAL python is HEALTHY
```

Conclusion, now proven rather than guessed: the **global** interpreter is fine;
only the venv's **stale copied** interpreter is broken. That is exactly the
"copied binary vs upgraded libpython" scenario from §1.4.

---

## 4. The fix — and why it worked

### What we tried first (and why it failed)

```
/usr/local/bin/python3.13 -m venv --upgrade /root/TTA/backend/venv
```

`--upgrade` refreshes the venv's stdlib/pip references but **does not always
rewrite a *copied* `bin/python`**. `python -V` still segfaulted. So `--upgrade`
was the right instinct (minimum intervention) but insufficient here.

### What actually worked

```
# 1. recreate the venv — regenerates bin/python from the healthy global interpreter
/usr/local/bin/python3.13 -m venv --clear /root/TTA/backend/venv
/root/TTA/backend/venv/bin/python -V        →  Python 3.13.3   ✓ no segfault

# 2. reinstall the 9 deps (a fresh venv is empty)
/root/TTA/backend/venv/bin/pip install -r /root/TTA/backend/ikf-tta-backend/requirements.txt

# 3. the gate — all three must pass with no segfault
/root/TTA/backend/venv/bin/python -c "import MySQLdb; print(MySQLdb.get_client_info())"  → driver OK 5.7.41
/root/TTA/backend/venv/bin/python manage.py check                                        → no issues
```

**Why `--clear` worked where `--upgrade` didn't:** `--clear` deletes the venv's
contents and writes a *fresh* `bin/python` from the current global interpreter.
The new copy matches the current `libpython3.13.so`, so startup no longer
segfaults. `mysqlclient` reinstalled from a prebuilt `cp313` wheel (no compile
needed), so the driver matched too.

**Why this was safe for the live site:** on Linux, deleting/replacing the venv
files does **not** disturb the already-running gunicorn — it keeps its
interpreter mapped in memory via the open inode. The site stayed up the entire
time. We only restarted gunicorn *after* the gate proved the new venv boots.

**Why this counts as "minimum intervention" (see §7):** we did **not** touch the
global Python, did **not** reinstall system packages, did **not** upgrade
libraries. We replaced exactly the one broken artifact — the venv's interpreter —
and nothing more.

---

## 5. The secondary issues (routed around, not "fixed")

Two more things surfaced. Neither was a deploy blocker; both were handled with the
smallest possible action.

### 5.1 `fields.E180: MariaDB does not support JSONFields`

`manage.py migrate` runs *database-tagged* system checks that `manage.py check`
does not. Two models (`AccessRequest`, `GrantChangeLog`) use `JSONField`, which
needs MariaDB 10.2+; production runs **MariaDB 10.1.48**. So the check aborted the
command.

Key reasoning that made this a non-event:

- It is **pre-existing** — those models shipped in the *previous* deploy; not
  introduced by this pull.
- This pull added **no new migrations**, so `migrate` was a **no-op** anyway. We
  confirmed with `showmigrations usermodperms` → all `[X]`, including
  `0003_grantchangelog`.
- Gunicorn never runs these checks, so it boots fine regardless.

**Route-around:** run the backfills with `--skip-checks` to bypass the
pre-existing check, instead of trying to "fix" the MariaDB/JSONField mismatch
mid-deploy (a much bigger, separate decision).

### 5.2 Courier PIN backfill — `Connection reset by peer` on all 33

`backfill_courier_location` calls the external API `api.postalpincode.in` to
derive **District/State** from each REP assignment's PIN. The production server
(Alibaba Cloud) has no outbound route to that Indian API, so all 33 lookups failed
and `updated: 0, skipped: 33`.

Why this is cosmetic, confirmed from code:

- District/State are stored as **snapshot fields** (`snap_district`,
  `snap_courier_state`), declared `required=False, default=''` in the serializer.
  Empty is explicitly allowed.
- **Couriers route by PIN**, not by the district/state label. The PIN is already
  stored. District/State are just human-readable lines on the slip.

Important nuance the user spotted: the **same API works from a browser**. The REP
modal (`REPModal.jsx:375`) calls `api.postalpincode.in` *client-side* when a PIN
is typed, so when staff edit an existing REP and save, District/State fill in
fine. The 33 blanks are simply **legacy REPs created before** the PIN-autofill
feature shipped. Two ways to clear them: edit each REP in the UI (works, one at a
time) or bulk-resolve the PINs from a machine with internet and apply an `UPDATE`
SQL script.

---

## 6. The "did I already deploy?" confusion — resolved by evidence

Midway through, it was unclear whether the rep/courier work was even live. We did
not argue from memory — we asked the server:

```
curl -s -o /dev/null -w "%{http_code}" https://tta.indiakhelofootball.com/api/reports/vendor-audit/
→ 404   (route absent → running code is older than the reports commit)
```

Then `git pull` on the server reported `5f4d5e1..08a87f1`. That single line
settled it: the server *had* deployed the rep/courier batch (`5f4d5e1`) in an
earlier session; it was only missing the latest reports commit, and gunicorn had
not been restarted. After the full deploy, the same probe returned `401` (route
exists, needs auth) — proof the new code was live.

**Lesson:** "is it deployed" is answerable with one HTTP probe against a route
that exists *only* in the new code. Don't reason from memory; ask the running
system.

---

## 7. The decision principle: minimum-intervention-first

The project has a standing rule (learned from a prior incident): for production
breakage, make the **smallest change that fixes the actual blocker**. Never reach
first for venv rebuilds / package reinstalls / library upgrades; prefer routing
around with raw SQL / `--fake` / `--skip-checks`. Don't "fix" adjacent things
during an emergency.

This session is a useful study in how that rule interacts with reality:

- For the **E180 check** and the **PIN API**, the rule applied cleanly — we routed
  around both (`--skip-checks`; defer the cosmetic backfill).
- For the **venv**, the usual route-around was *unavailable*. The standard escape
  hatch (apply via SQL, then `restart tta`) requires gunicorn to be able to
  restart — but a broken interpreter means gunicorn *cannot* boot. There is no
  SQL route around "the interpreter segfaults." So recreating the venv *was* the
  minimum intervention, not a bundled extra. The discipline showed up in *scope*:
  we replaced only the broken interpreter, touching neither the global Python nor
  system packages nor the DB.

The transferable lesson: "minimum intervention" is about the **smallest change
that resolves the true blocker** — which sometimes is larger than a one-liner, but
should never be *broader* than the blocker requires.

---

## 8. Diagnostic ladder (reusable cheat-sheet)

When `manage.py` misbehaves on this server, run these in order. Each one halves
the search space.

```
# 0. Are you even using the right interpreter? (the decouple red herring)
/root/TTA/backend/venv/bin/python -V

# 1. Exception vs. crash?
#    Python traceback  → app/config problem (read the traceback)
#    "Segmentation fault" → C-level crash, continue down the ladder

# 2. Localise the crash — simplest invocation that still fails
/root/TTA/backend/venv/bin/python -c "import MySQLdb"   # driver only
/root/TTA/backend/venv/bin/python -V                     # interpreter only
/root/TTA/backend/venv/bin/python -S -V                  # interpreter, no site init

#    crashes only on import MySQLdb        → driver/extension mismatch
#    crashes on python -V                  → interpreter itself
#    crashes on python -S -V too           → not a .pth/site-packages issue

# 3. Is the GLOBAL python healthy? (decides recreate-venv vs reinstall-python)
cat /root/TTA/backend/venv/pyvenv.cfg          # find the base interpreter path
/usr/local/bin/python3.13 -S -V                # healthy → recreate venv

# 4. Fix — recreate venv from the healthy base, reinstall deps
/usr/local/bin/python3.13 -m venv --clear /root/TTA/backend/venv
/root/TTA/backend/venv/bin/pip install -r /root/TTA/backend/ikf-tta-backend/requirements.txt

# 5. GATE — never restart gunicorn until all three pass
/root/TTA/backend/venv/bin/python -V
/root/TTA/backend/venv/bin/python -c "import MySQLdb; print(MySQLdb.get_client_info())"
/root/TTA/backend/venv/bin/python manage.py check
```

Notes:
- `--upgrade` is *not* enough when `bin/python` is a copied binary; use `--clear`.
- Deleting/recreating the venv does **not** take down a running gunicorn — safe to
  do live. Only the eventual `restart tta` swaps what's served.
- `python -V` segfaulting is the signature of this specific bug.

---

## 9. Clean end-to-end runbook (what next time should look like)

```
# ── LOCAL: frontend ──────────────────────────────────────────────
git add <changed files>; git commit; git push origin main   # frontend repo only
npm run build                                                # build/ ready to upload

# ── SERVER: backend ──────────────────────────────────────────────
cd /root/TTA/backend/ikf-tta-backend && git pull origin main

# venv sanity gate FIRST (catches the segfault before it bites a restart)
/root/TTA/backend/venv/bin/python -V
# if it segfaults → §8 step 4 (recreate venv), then continue

/root/TTA/backend/venv/bin/python manage.py showmigrations --skip-checks   # any [ ] pending?
# migrate only if something is pending; on MariaDB 10.1 add --skip-checks to dodge E180

/root/TTA/backend/venv/bin/python manage.py backfill_permissions --skip-checks   # MANDATORY
/root/TTA/backend/venv/bin/python manage.py backfill_report_grants --skip-checks

sudo systemctl restart tta && sudo systemctl status tta --no-pager | head -5
curl -s -o /dev/null -w "reports: %{http_code}\n" https://tta.indiakhelofootball.com/api/reports/vendor-audit/
# want: active (running) + reports: 401

# ── LOCAL: upload frontend ───────────────────────────────────────
deploy.bat        # or pscp -r build\* root@<host>:/root/TTA/frontend/ikf-tta-frontend/build/
```

`backfill_permissions` is the one you must never skip: without it, existing users
lose their grants under the new permission model and get locked out.

---

## 10. Glossary of the key facts to remember

| Thing | Value / fact |
|---|---|
| Production DB | MariaDB **10.1.48** — no native JSONField (→ E180) |
| Global Python | `/usr/local/bin/python3.13` (3.13.3) — healthy |
| venv path | `/root/TTA/backend/venv` — `bin/python` is a *copied* binary |
| Segfault signature | `python -V` crashes (interpreter, not package) |
| Root cause | stale copied venv interpreter vs. upgraded global `libpython3.13.so` |
| Fix | `python3.13 -m venv --clear` + reinstall `requirements.txt` |
| Safe during fix? | Yes — running gunicorn unaffected until `restart tta` |
| Deploy proof | `/api/reports/vendor-audit/` 404 → 401 after restart |
| Cosmetic blank | courier District/State (server can't reach `api.postalpincode.in`) |
| Driver source | `mysqlclient` prebuilt `cp313` wheel — no compile needed |

---

*Written 2026-06-18 after the deploy completed and was live-verified via Playwright
(login, full vendor list, courier table, REP management — all rendering, reports
endpoint returning 401).*
