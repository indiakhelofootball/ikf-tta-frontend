# Rebuilding CSR

Compiled 19 August 2026 from the verified portal audit (16 Aug), the intent-register trace
(17 Aug), the Ledger direction (18 Aug) and a measured review of `/csr/login` (19 Aug).
Every file reference below was opened; every closed item was checked against the commit
that closed it.

> **Production is still the July tarball.** None of the closed work below is live yet.

---

## What is actually wrong

Three different problems get called "CSR needs a revamp," and only one of them is about how
it looks. Separating them matters, because the cheap one is visible and the valuable one
isn't — fixing only what you can see leaves a good-looking product that still doesn't do its
job.

**1 · It looks unfinished.** The Ledger theme landed 19 Aug. The screens it applies to were
never re-composed, so colour and type changed underneath a layout built for the old system.
Real, and the cheapest of the three.

**2 · It doesn't persuade.** The funder portal is a data viewer built by the team that owns
the data, for a person who doesn't want data. A CSR head opens it to get ammunition for a
board meeting. It gives them a filename list.

**3 · It counts money, not outcome.** Every figure in the module is rupees or a status.
Nothing anywhere records how many children actually played. That is the number a grant is
renewed on, and it has no home in the schema.

> There is no free trial and nobody signs up. The conversion event is a CSR head renewing and
> expanding next year's grant — and the entire surface that touches them is one file of 159
> lines.
>
> — from the verified portal audit, 16 Aug; every code claim confirmed against source

---

## Where it stands today

The register findings from 17 August have largely been closed. It would be waste to work
them again.

| Area | Status | Evidence |
|---|---|---|
| Vendor names & amounts inside CSR (D4.1/D4.2) | Closed | `4024db0` — vendor identity dropped from CSR |
| CSR tagging live payments (D4.15) | Closed | `919ebc1` — payment mode removed from the CSR modal |
| Certificate annual window (D4.9, statutory) | Closed | `38c9df0` / `55dabc1` — grant contract + frozen certificate |
| TDS type dead in the UI (A2.1) | Closed | `25a6e4a` — classification moved onto the work order |
| Deliverables invisible to funder (C10) | Closed | Deliverables tab live at `ClientPortalPage.jsx:108` |
| Ledger theme | Applied, unbuilt | Tokens in force; screens still on the old rhythm |
| Funder sign-out | **Broken, live** | `ClientApp.jsx:17–29` |
| Outcome data | **No home in the schema** | `CSRActivity` has no reach field |

---

## The list

Ordered by value per unit of effort, not by how interesting the work is. Tiers are
independent except where stated.

### Tier 0 — things that are broken right now
*Hours, not days.*

- **The funder's own "Sign out" strands them.** Sign out calls `logout()` with no navigation,
  so it falls through to a screen reading "Please open your organisation's portal link to
  sign in" — with no link. Reachable through the normal path, not just session expiry. A
  funder who signs out cannot sign back in without digging up an old email.
  **Fix:** `tta_client_slug` is already in localStorage, written at `ClientLogin.jsx:50` and
  already consumed by `loginDoor.js:36`. `ClientApp.jsx:21` carries a comment saying no slug
  is available, which is simply wrong. A few lines redirect to the branded login.

- **One dead logo URL shows a broken-image glyph.** `brand?.logoUrl` has no `onError`. The
  first thing a funder sees on their own branded portal is a broken image icon, on the one
  screen whose entire job is to look like it was made for them.

- **Brand paint waits on the slowest data call.** `Promise.all` blocks the whole portal on
  four calls and `myBranding()` is inside it, so the funder's colours and logo can't render
  until the slowest query returns. Pull branding out and paint immediately.

- **Three dead-end empty states.** Each tells the funder there is nothing and offers nothing
  to do about it. An empty state is where a quarterly visitor most often lands.

- **Theme drift already in `CSRDashboard`.** `StatCard` hardcodes `fontWeight={800}`, which
  fights the serif-at-400 rule the system now rests on, and carries a comment describing a
  12px card radius that is now 10px. Small, but it is the first crack in a system that is one
  day old.

### Tier 1 — the revamp you can see
*Days. The visible win.*

- **Compose `CSRDashboard` to the Ledger rhythm.** The one screen that decides whether the
  rest is worth doing. Serif figures at roughly three times their unit label; the utilisation
  bar split by grant so one ratio becomes three readable quantities; a per-grant ink spine so
  three rows read as three objects rather than one repeated block.
  **Then review it — once.** Not the four screens that follow; they are the same pattern and
  would produce three lists saying the same thing.

- **Roll the resolved pattern to the other three.** Project detail, contract detail,
  certificate. `CSRProjectDetailPage` is 631 lines and is where the module's real density
  lives — most adaptation, least invention.

- **Self-host Source Serif 4.** The system's defining decision currently falls through to
  Constantia and Georgia. Both have true tabular figures so nothing is broken, but the
  specified face has never actually been seen. Two weights, woff2, in `public/`.

- **The login is a landing page and is currently a form.** One word, two fields and a button
  centred in a large empty field. The heading is an `h6` at 15px — one pixel larger than the
  labels beneath it — so the serif never appears on the first screen anyone sees. Give it an
  eyebrow, a serif heading, a lede and the funder-portal door.
  Also here: the footer link is 73×19px and fails WCAG 2.2 SC 2.5.8 (24×24), and Chrome
  autofill paints both fields blue over the theme.

### Tier 2 — make the funder surface do its job
*Weeks. Needs a policy decision first.*

- **Show the funder the one number that defends the spend.** `CSRDashboard` has
  sanctioned-versus-utilised. `clientAPI` exposes project, activities, reports, branding and
  deliverables — no financials. The person being asked to renew a multi-crore grant cannot
  see how much of the last one was used.
  **Be honest about the cost:** the funder payload excludes financials by deliberate
  isolation policy, with tests asserting absence by walking every key and every scalar at any
  depth. This is a policy change with a UI attached, not a UI change — new allowlist
  serializer plus an isolation review.

- **Put outputs on the first tab.** Tab 0 shows funder, sanctioned, status, start, end and a
  description. None of that is an output. Cities covered, trials held, deliverables met
  against promised — all already in the data, none of it on the screen a funder opens first.

- **Let the funder download their own certificate.** Generated inside `CSRProjectDetailPage`,
  not self-serve. This got materially safer once the certificate froze and versioned at close
  — a funder download can no longer silently change under them, which was the real objection.

- **Stop using operations density on a persuasion surface.** `maxWidth="md"` with
  `<List dense>` is right for an operator working a queue all day and wrong for someone who
  visits once a quarter to decide whether to renew. Reports render raw filenames, and the
  highest-intent click on the page — open the report — is a small icon inside a tooltip.

### Tier 3 — the gap nobody has named
*Schema change. Highest value on this page.*

- **Nothing records how many children actually played.** `CSRActivity` carries title, date,
  location and status — no reach, no attendance, no participant count.
  `Trial.expected_participants` exists but is a forecast, never reconciled to an actual. So
  the module can say what was promised and what was spent, and cannot say what happened.
  **Why this matters most:** a CSR head does not defend a grant to their board with a
  utilisation percentage. They defend it with "eleven hundred girls in three districts played
  organised football for the first time." The module cannot currently produce that sentence.

- **The half that already exists is not being told.** `CSRDeliverable` already has
  `target_count` and `completed_count`. Promised-versus-delivered in real units is already in
  the database and is rendered nowhere as a story — only as a status chip. This part costs a
  screen, not a migration.

### Tier 4 — structural debt, no user-visible payoff
*Do when it blocks something.*

- **Retire the work-order substitution.** `CSRWorkOrder` now exists but the old substitution
  still stands. Needs a data migration plus a UI repoint. Nothing breaks while it waits;
  everything built on top of it gets more expensive to move.
- **Two orphaned REP assignments are blocking a team answer.** Two dispatch-ready courier
  drafts point at cities their trials do not have. Do not dispatch, do not delete — needs a
  decision, not code.
- **Entity name has a column, a search and a display — and no input.** Register item A1.5.
- **Excel and PDF export still absent.** Register item B1.9 — asked for in two formats, never
  withdrawn, still CSV only. The repo already ships three Excel writers.

---

## What I would not do

A list of work is only useful if it also says what to leave alone. These are not oversights.

- **Do not automate the TDS split.** A5.9 records this as an explicit client exclusion and
  the code respects it. It will read like an obvious improvement to anyone who has not read
  the register.
- **Do not add a due date, done flag or download to the payment request.** A4.10, same
  reason — respected on purpose.
- **Do not add Active/Inactive to REP.** Settled, repeatedly.
- **Do not re-audit the intent register's sourcing.** All 127 rows traced to code, 13 of 14
  Hindi claims verbatim. Remaining defects are cosmetic.
- **Do not re-propose a dark anchor for CSR.** Rejected 18 August. Depth comes from the
  bone/card/sunk spread and the hairlines.
- **Do not review every screen.** Review the first of a kind. Twelve list pages produce
  twelve copies of one finding and train you to stop reading them.

---

## If you only do three things

1. **Fix the funder sign-out.** Broken for real users today, a few lines, and the information
   needed to fix it is already in localStorage.
2. **Compose the dashboard, then review it once.** It proves the Ledger system or kills it,
   and everything in Tier 1 after it is replication rather than design.
3. **Decide the utilisation policy question.** Not build it — decide it. Whether a funder may
   see utilisation determines the shape of the entire portal, and every week it stays open is
   a week of Tier 2 work that cannot start.
