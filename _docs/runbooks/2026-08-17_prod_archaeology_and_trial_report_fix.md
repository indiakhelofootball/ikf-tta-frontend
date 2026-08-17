# 2026-08-17 — Production archaeology + the Trials Report address fix

A worked record of one session: what was wrong, how it was found, every command used, and why
each one. Written to be re-read later — the *why* matters more than the commands, because the
commands only make sense once you know what question they were answering.

Two machines are involved throughout. **Getting them confused wasted real time**, so every code
block below is labelled:

| Label | Where it runs |
|---|---|
| **[LOCAL]** | Windows, Git Bash / PowerShell, in `D:\tta_frontend-main` |
| **[SERVER]** | PuTTY ssh session on `47.237.115.74`, usually in `~/tta` |

---

## Part 1 — What was actually wrong

The team reported four symptoms on the Trials Report:

1. Not showing the full trial address
2. Map showing the city, not the ground
3. Location column empty
4. Some entries missing even when filled — same in the Excel export

**All four had one cause.** The report read `TrialCity.ground_location`, and that field is blank
on all 170 rows because `trials/views.py:129` hardcodes it:

```python
TrialCity.objects.create(
    ...
    ground_location='',          # ← ignores the request entirely
```

No screen sends it either. So the field can *never* be populated. Meanwhile the real address
lives on `REPCityAssignment.physical_address` (53 rows) with a real ground map link in
`google_map_link` (53 rows) — and the report already joined to those assignments to find the REP
name, then threw everything else away.

**Fix:** carry the address and map link through the join that already existed. Frontend only.

### Three wrong diagnoses on the way — and why they were wrong

Worth remembering, because each was plausible and each cost a cycle:

1. **"The migration blanked it."** `trials/migrations/0003` adds the fields with
   `AddField(default='')` and no backfill, so pre-existing rows would be blank. True — but
   `blank_city_name = 0` proved every row was created *after* that migration. Not legacy damage.
2. **"Fall back to the city master."** Built and tested it. Then `master_rows = 0` — the
   `TrialCityLocation` table is completely empty. The fix was dead code; reverted.
3. **"Cloudflare is serving a stale page."** Raised twice without reading `nginx.conf`, which
   sends `no-store` on the SPA shell precisely to prevent that. It was speculation.

**The lesson each time was the same: measure the data before writing the fix.** Every wrong turn
came from reasoning about what *should* be true instead of querying what *is*.

---

## Part 2 — Finding out what production actually runs

Production was deployed from a tarball, so there is **no git repo on the box** and no commit to
compare against. This is how it was identified anyway.

### 2.1 Which containers exist

**[SERVER]**
```bash
docker ps
```
Shows `tta-frontend-1` and `tta-backend-1` — plus `football-web-1`, `anant-site-web-1`,
`scout-site-web-1`, which belong to **other applications on the same box**. Never run a bare
`docker compose down` or anything that could restart those.

`CREATED 3 weeks ago` dated the images to roughly 2026-07-27, which matches the migration window.

### 2.2 Read the running code directly

**[SERVER]**
```bash
docker exec tta-backend-1 grep -n "ground_location" trials/serializers.py trials/views.py
```
This is the highest-value command in the whole session. It reads the code that is *actually
serving traffic*, not what git thinks is deployed. It returned line numbers identical to the
local copy, which proved the diagnosis applied to production.

### 2.3 Compare production against git without a git repo

Content hashing both sides. **[LOCAL]** — build a manifest from `origin/main`:
```bash
cd D:/tta_frontend-main/tta_backend
git ls-tree -r --name-only origin/main -- backend/ | grep '\.py$' | grep -v '/migrations/' | sort
# then md5 each blob with:  git show "origin/main:$f" | md5sum
```

**[SERVER]** — the same manifest from the container:
```bash
docker exec tta-backend-1 sh -c 'find . -name "*.py" -not -path "*/migrations/*" \
  -not -path "*__pycache__*" -not -path "./venv/*" | sort | xargs md5sum' | md5sum
```

**They did not match — and the reason is a trap worth internalising.** The tarball was packed on
Windows, so files kept mixed CRLF/LF line endings. `git show` emits LF. Same content, different
bytes. Proof:

**[LOCAL]**
```bash
git show HEAD:backend/accounts/models.py | md5sum              # 88e5165e...  (LF)
git show HEAD:backend/accounts/models.py | sed 's/$/\r/' | md5sum  # d2a6098e...  (CRLF)
```
`d2a6098e` was exactly what the container reported. **Normalise line endings before concluding
anything from a hash comparison.**

### 2.4 Narrow to which app differs

Comparing one aggregate hash tells you *that* something differs, never *what*. Per-directory
hashes, with `tr -d '\r'` to remove the line-ending variable:

**[SERVER]**
```bash
docker exec tta-backend-1 sh -c 'for d in accounts backend config courier csr otp payments \
  permissions reports reps test_support trialcities trials vendors workorders; do \
  h=$(find ./$d -name "*.py" -not -path "*/migrations/*" -not -path "*__pycache__*" | sort | \
  while read f; do tr -d "\r" < "$f" | md5sum | cut -d" " -f1; done | sort | md5sum | cut -d" " -f1); \
  printf "%s  %-14s\n" "$h" "$d"; done'
```

Result: **10 apps identical, 5 differ** — `config`, `payments`, `permissions`, `reps`,
`workorders`. All file *counts* matched, so nothing was added or removed; these are uncommitted
edits captured by the tarball.

**That is the most important finding of the session: five apps of live code exist nowhere in
git.** A backend rebuild from GitHub would silently revert them.

### 2.5 Find the deploy source

**[SERVER]**
```bash
find / -maxdepth 5 -name docker-compose.yml -not -path "*/node_modules/*" 2>/dev/null
# → /root/tta/docker-compose.yml
ls -la ~/tta
```
`~/tta` holds the **full frontend source plus `tta_backend/`**, owned by UID `197609` — a Windows
UID, confirming the tarball origin. This is the real deploy base, not `origin/main`.

---

## Part 3 — Measuring the data before fixing anything

MySQL root needs a password on that box, and putting it in shell history is bad practice. Use
Django's ORM inside the container instead — no credentials in scrollback:

**[SERVER]**
```bash
docker exec tta-backend-1 python manage.py shell -c 'from trials.models import TrialCity as T; \
  print("rows", T.objects.count()); print("blank_location", T.objects.filter(ground_location="").count())'
```

Results that redirected the work:

| Query | Result | What it killed |
|---|---|---|
| `blank_location` | **170 of 170** | — |
| `blank_city_name` | **0** | the migration theory |
| `master_rows` | **0** | the city-master fallback fix |
| `physical_address` filled | **53 of 97** | set the realistic ceiling |
| `pin_code` / `ground_pin_code` | **50** / **0** | revealed two fields for one value |

> **Note on a bug in my own query.** An early match test chained
> `.exclude(ground_location="").exclude(physical_address="")` — requiring *both* to be non-empty.
> Since `ground_location` was 0, the result was always 0 and looked like "nothing matches".
> **When a query returns a suspiciously clean zero, check the query before believing it.**

### The `shell -c` quoting rule

A heredoc into `manage.py shell` breaks — it is a REPL and blank lines end the block. Use a
**single-line `shell -c`** with `;` separators, `lambda` instead of `def`, outer single quotes and
inner double quotes only.

---

## Part 4 — Deploying to a box with no git

### 4.1 Verify before overwriting

Never `cp` over a production file you have not fingerprinted.

**[LOCAL]** — what the server's file *should* hash to:
```bash
git show "origin/main:src/components/reports/TrialsReport.jsx" | sed 's/$/\r/' | md5sum
# → 2dda2142197e98de5a92ed78a69e8a97
```
**[SERVER]** — what it actually is:
```bash
md5sum ~/tta/src/components/reports/TrialsReport.jsx
# → 2dda2142197e98de5a92ed78a69e8a97   ✓ safe to replace
```

A `patch` file was prepared first because `patch` *verifies context and fails loudly*, whereas a
file copy overwrites silently. Once the md5 matched, whole-file copy became provably safe — and
is better in one respect: a patch can apply 3 of 4 hunks and leave a half-fixed file that still
builds.

### 4.2 Snapshot for rollback

**[SERVER]**
```bash
docker tag tta-frontend:latest tta-frontend:pre-trialfix
cp src/components/reports/TrialsReport.jsx ~/TrialsReport.jsx.bak
```

### 4.3 Upload — from Windows, NOT inside the ssh session

**[LOCAL]** (a plain terminal; pasting this into PuTTY does nothing)
```
pscp "C:\path\to\fixed.jsx" root@47.237.115.74:/root/TrialsReport.NEW.jsx
```

### 4.4 Replace, build, restart

**[SERVER]**
```bash
cd ~/tta
ls -l ~/TrialsReport.NEW.jsx                                  # confirm size
cp ~/TrialsReport.NEW.jsx src/components/reports/TrialsReport.jsx
grep -c physicalAddress src/components/reports/TrialsReport.jsx   # must be > 0
docker compose build frontend
docker compose up -d --no-deps frontend
```

**`--no-deps` is mandatory.** Without it, `docker compose up -d --build frontend` also rebuilds
and restarts the **backend**, because `frontend` declares `depends_on: backend` — and
`docker-entrypoint.sh` runs **migrations on every backend start**. That happened accidentally in
this session.

**Proof the build actually took:** the log must show `COPY . .` and `RUN npm run build`
**running (~85 s)**, not `CACHED`. Docker caches on file content; if the source did not change,
you get a byte-identical bundle and a deploy that changed nothing. This caught a no-op deploy
where the patch upload had silently failed.

### 4.5 Rollback, if needed

**[SERVER]**
```bash
cp ~/TrialsReport.jsx.bak ~/tta/src/components/reports/TrialsReport.jsx
docker tag tta-frontend:pre-trialfix tta-frontend:latest
docker compose up -d --no-deps frontend
```

---

## Part 5 — Local verification, before anything is uploaded

**[LOCAL]**
```bash
cd D:/tta_frontend-main
npx --no-install eslint src/components/reports/TrialsReport.jsx
npm run --silent lint:design            # must say "none new. Baseline holding."
CI=true npx --no-install react-scripts test --watchAll=false

cd tta_backend/backend
PYTHONIOENCODING=utf-8 venv/Scripts/python.exe manage.py test --settings=backend.test_settings
PYTHONIOENCODING=utf-8 venv/Scripts/python.exe manage.py makemigrations --check --dry-run --settings=backend.test_settings
```

A shell gotcha that produced a false reading:
```bash
npx eslint file.jsx | grep error; echo "exit=$?"   # WRONG — that is grep's status
npx eslint file.jsx > /tmp/e.txt 2>&1; echo "exit=$?"   # RIGHT
```

### Testing the address logic against real shapes

Rather than trusting one sample, the `addressOf` function was tested against **nine real data
shapes** taken from the production export — full address, bare venue name, PIN already inline,
no PIN, embedded newline, composed city name, no assignment at all, lowercase state, trailing
comma. That is what caught the Karwar row, where `581301` was already inside the address text and
would otherwise have been appended twice.

---

## Part 6 — Verifying in the real browser

The Chrome extension drove the live site to confirm the deploy visually. The useful trick:
**`get_page_text` beats screenshots** for verifying table data — it returns every row as text,
so all 170 could be checked at once instead of scrolling through screenshots.

Confirmed live:
```
PROJECT SEASON STATE CITY ADDRESS DATE MAP REP STATUS
Idukki    Kumily VHSS Ground, Idukki, Kerala - 685509
Mathura   Ganeshra Stadium, Keshonpur Manoharpur Dehat, Mathura, Uttar Pradesh - 281004
Karwar    Maladevi Ground Karwar 581301, Karnataka      ← PIN inline, correctly not doubled
Jaipur    Jaipur, Rajasthan                              ← unassigned fallback
```

---

## Part 7 — What shipped, and what did not

**Deployed to production** (frontend only, four builds):
- Full address from `REPCityAssignment.physical_address`, with city/state completed only where
  the stored text lacks them, and PIN appended from `pin_code`
- Real per-ground `google_map_link` instead of a generated city search URL
- Row height, top alignment, `nowrap` on Date and State so the address gets the width
- Address precomputed once per row instead of on every render (it was being recomputed for all
  170 rows on every keystroke in the search box)
- Column renamed `LOCATION` → `ADDRESS` on screen, and `Location` → `Venue` in the CSV, because
  one name meaning two different things is what made the export look broken

**Built but NOT deployed** — seven CSR/vendor fixes, all local and uncommitted. See the
`csr-fixes-2026-08-17` memory.

---

## Part 8 — Open items

| Item | Why it matters |
|---|---|
| **`~/tta` is not in git** | Five backend apps + this frontend fix exist only on that box. Any rebuild from GitHub reverts them |
| `auth_db_migration_2026-07-23.sql` in `/root` | 24 MB plaintext copy of the live database, on a box shared with three other apps |
| `DEPLOYMENT.md` says `git pull` | Wrong for this server — there is no repo. Fix the doc |
| `BUILD_ID` never passed | The Dockerfile accepts it and the UI shows it; it defaults to the literal `docker`. Passing it would have made this whole investigation unnecessary |
| 117 of 170 rows still have no address | Data entry, not code |
| `ground_pin_code` 0 / `pin_code` 50 | Two fields for one value; the form is filled into the one nothing read |
| `trials/views.py:129` | `ground_location=''` still hardcoded — the field remains permanently dead |

---

## The five habits worth keeping

1. **Query the data before writing the fix.** Three wrong diagnoses died to single queries that
   took seconds. None of them needed to be written first.
2. **Fingerprint before you overwrite.** One `md5sum` turns "probably safe" into "provably safe".
3. **Watch for `CACHED`.** A build that reports cached layers shipped nothing.
4. **Prove a negative before reporting it.** A clean zero is as likely to be a broken query as a
   real absence — positive-control it.
5. **Say which machine a command runs on.** Half the friction in this session was commands pasted
   into the wrong terminal.
