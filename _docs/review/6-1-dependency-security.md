# Pass 6.1 — Dependency security

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** any dependency with a known vulnerability?

## Answer

**Yes — 59 advisories from `npm audit`: 2 critical, 31 high, 16 moderate, 10 low.**

But that headline is misleading, and the plan explicitly asks me not to mislead
you with it. **53 of the 59 are build-time only** — the transitive dependency tree
of `react-scripts@5.0.1`. They never reach a browser, never run in production, and
patching them individually is impossible without ejecting from Create React App.

**Only 6 vulnerable packages actually ship to your users' browsers. Two of those
you do not use at all and can simply delete.**

The backend has **1 finding, and it is the more serious one**: Django is pinned to
a version series that no longer receives security patches.

---

## Backend

### DEP-1 · Django is pinned to a series past end-of-life — **HIGH**

`tta_backend/requirements.txt`:

```
Django>=3.2,<4.0
```

**Django 3.2 was the LTS whose extended support ended in April 2024.** The pin
`<4.0` means `pip install -U` can never move you onto a supported series — you are
locked to a branch that receives no security releases at all. Any Django CVE
published from mid-2024 onward has no patch available to you.

This is precisely the plan's second criterion: *"so old a needed security patch is
unavailable."* It is not a "newer version exists" nit.

There is corroborating evidence the pin is load-bearing rather than accidental —
`settings.py:36–38` carries this comment:

> *"NOTE: on Django 3.2 these are bare hostnames, NOT scheme-qualified origins —
> the scheme-prefixed form only became valid in Django 4.0 and would silently
> never match here."*

So someone knew about the 3.2 boundary and worked within it. Moving to 4.2 LTS or
5.x will require changing `CSRF_TRUSTED_ORIGINS` to the scheme-qualified form,
among other things. **Not a one-line upgrade — but it is the most consequential
dependency item in this audit.**

Other backend pins, for completeness (none currently flagged):
`djangorestframework>=3.13,<3.15` · `djangorestframework-simplejwt>=5.2,<5.4` ·
`django-cors-headers>=3.13,<4.4` · `mysqlclient>=2.1` · `gunicorn>=21.2` ·
`python-decouple>=3.8` · `requests>=2.31` · `legacy-cgi>=2.6`.

Note the **upper bounds on three of them**. Same trap as Django, one series later:
these will silently stop receiving patches when their current series goes EOL.
Container base is `python:3.12-slim`, which is current and fine.

> I could not run `pip list --outdated` — that needs the live environment, not the
> repo. Run it on the server; the pins above tell you what it will find.

---

## Frontend — the 6 that matter

| # | Package | Severity | Advisory summary | Fix |
|---|---|---|---|---|
| 1 | **`xlsx` (SheetJS)** `^0.18.5` | **HIGH** | Prototype Pollution, ReDoS. **`fixAvailable: false`** — SheetJS left npm; every npm-published version is permanently vulnerable | **Delete it — it is imported 0 times** |
| 2 | **`axios`** `^1.13.4` | **HIGH** | 30 advisories: SSRF via NO_PROXY bypass, prototype-pollution auth bypass, credential leakage on redirect, CRLF injection, ReDoS | **Delete it — it is imported 0 times** |
| 3 | **`react-router-dom`** `^7.13.0` | **HIGH** | Vulnerable range `7.0.0-pre.0 – 7.14.1`. XSS via unescaped Location header, open redirect via `//` and backslash in `<Link>`/`useNavigate`, CSRF on PUT/PATCH/DELETE document requests, DoS via inefficient route matching | Upgrade past 7.14.1 — `fixAvailable: true` |
| 4 | `dompurify` (transitive, via `jspdf`) | MODERATE | Multiple sanitisation bypasses → XSS | `fixAvailable: true` — bump `jspdf` |
| 5 | `exceljs` `^4.4.0` | MODERATE | — | ⚠️ npm's only "fix" is **downgrading to 3.4.0, a major-version rollback**. Do **not** take it: `exceljs` builds your IDFC and ICICI bank files and `blkpayExcel.test.js` pins the output byte-for-byte |
| 6 | `jspdf` `^4.2.1` / `jspdf-autotable` | (carries #4) | | Bump to clear `dompurify` |

### DEP-2 · Two vulnerable runtime packages you do not use — **HIGH severity, trivial fix**

I checked every import across all 109 source files:

```
xlsx:                 0 files
axios:                0 files
@tanstack/react-query: 0 files
react-hook-form:      0 files
zod:                  0 files
lucide-react:         0 files
dayjs:                0 files
web-vitals:           0 files
prop-types:           0 files   (devDependency)
```

`xlsx` carries a **HIGH with no fix available, ever**, and `axios` carries **30
advisories** — and neither is imported by a single line of your code. The app uses
`fetch` (via `apiService`) and `exceljs`.

**Nine unused dependencies.** Removing them:

- eliminates two HIGH-severity runtime advisories outright,
- removes `xlsx` — the one vulnerability in the entire report that **cannot** be
  fixed by upgrading,
- shrinks the production bundle (`@tanstack/react-query`, `lucide-react`,
  `country-state-city` and `dayjs` are not small),
- and takes about ten minutes.

**This is the single best effort-to-risk trade in the whole audit.** Verify with
`npm run build` and the existing test suite afterwards.

### DEP-3 · `react-scripts@5.0.1` is the source of 53 advisories and is unmaintained — **MEDIUM (do not rush this)**

Create React App is no longer maintained. `react-scripts` transitively pulls
`webpack-dev-server`, `svgo`, `postcss`, `terser`, `workbox`, `shell-quote`
(**critical**), `websocket-driver` (**critical**), `lodash`, `underscore`,
`minimatch`, `js-yaml`, `nth-check`, `jsonpath`, `serialize-javascript` and ~40
more.

**Both criticals are here, and neither ships to a browser.** `shell-quote` and
`websocket-driver` run in the dev server and the build pipeline. The realistic
threat is a compromised build machine or a developer visiting a malicious site
while `npm start` is running (`webpack-dev-server` has advisories for exactly
that) — not your production users.

`npm audit fix --force` will try to "fix" this by mangling the `react-scripts`
version and **will break your build**. Do not run it.

The real fix is migrating to Vite, which is a project, not a chore. **Tier 6 is
last for a reason and your plan is explicit: do not let this talk you into a
rewrite.** Meanwhile: don't run `npm start` on a machine you're browsing the web
from, and keep CI build agents ephemeral.

---

## What to actually do

**This week (30 minutes, low risk):**

1. `npm uninstall xlsx axios @tanstack/react-query react-hook-form zod lucide-react dayjs web-vitals prop-types`
2. `npm install react-router-dom@latest jspdf@latest jspdf-autotable@latest`
3. `npm run build && npm test` — the bank-format parity tests are your safety net.

**This quarter (planned):** migrate Django off the 3.2 pin to 4.2 LTS. Budget for
`CSRF_TRUSTED_ORIGINS` and the other 3.2→4.x breaking changes; the codebase
already documents one of them.

**Do not do:** `npm audit fix --force`, downgrading `exceljs`, or a CRA→Vite
migration as part of this audit.

---

## ✓ Pass complete

- **Do I have a number?** 59 npm advisories (2 critical / 31 high / 16 moderate /
  10 low); **6 runtime-relevant**, 53 build-time; 9 unused dependencies; 1 backend
  EOL pin.
- **Have I seen one with my own eyes?** Yes — `npm audit --package-lock-only` run
  against your real `package-lock.json`, and every import checked across all 109
  source files.
- **Do I know what the user experiences?** For the runtime six, nothing until
  exploited — `react-router`'s open-redirect and XSS advisories are the only ones
  a visitor could plausibly trigger against your production app.

**The honest summary:** your dependency situation looks alarming and mostly isn't.
Two thirds of it is one unmaintained build tool. The genuinely actionable items are
**delete nine unused packages** and **get off Django 3.2** — and the first of those
removes the only unfixable vulnerability in the report.
