# The complete picture: what the client asked for, and where it stands today

**Date:** 2026-08-16 · **What this is:** the transcripts, the design doc, the nine planning-doc
generations, and the whole `_docs/review/CSR_*` audit chain (2026-08-13 → 2026-08-15), read as one
connected story instead of eleven separate files. Nothing new was verified here — this traces the
chain that already exists and states what it adds up to.

Sources folded in: `D:\CSR` (raw transcripts, read directly), `CSR_Module_Design_Review.docx`,
`CSR_INTENT_VS_BUILD_2026-08-13.md`, `CSR_TRANSCRIPT_TRACEABILITY_2026-08-13.md`,
`CSR_DOCS_VS_BUILD_2026-08-13.md`, `CSR_USER_FLOW_2026-08-13.md`, `CSR_UIUX_REVIEW_2026-08-13.md`,
`2-2-csr-isolation.md`, `CSR_LIVE_RUN_ASSESSMENT_2026-08-15.md`, `CSR_CLAIM_VERIFICATION_2026-08-15.md`,
`CSR_E2_RECLASSIFIED_2026-08-15.md`, `CSR_VERIFICATION_2026-08-15.md`, `CSR_SHELL_PLAN_2026-08-14.md`.

---

## 0. The one-paragraph version

The client asked for a filtered, audit-safe skin over TTA in fourteen minutes of phone calls. The
build is structurally faithful to that ask — one system, not two; the funder walled into a
read-only view of one project; the money decision kept away from the person who faces the funder.
Where it slips is a single, repeated pattern: **every rule the client stated as absolute was built
as something softer than absolute**, and **every permission boundary the design correctly drew now
has nobody able to stand on the CSR side of it and do their job.** Two of those soft spots have
since been hardened (the audit-uniqueness rule, the funder's own JS bundle); most have not; two new
ones were found while checking the fixes. Nothing in this has to do with confusion or drift — every
gap traces to one specific line, in one specific document, that a later step didn't carry forward.

---

## 1. The chain, in order

```
D:\CSR (14m19s of phone audio, 4 recordings + 85s unheard)
        │  transcribed, machine-translated, one word ("RETF") never recovered
        ▼
CSR_Module_Design_Review.docx  — the client-facing artefact, May 2026
        │  read back correctly, mostly — but "May 2025" typo, CSR_OPS role invented, "seven
        │  sequential stages" written against a client instruction that says the opposite
        ▼
9 planning-doc generations (_docs/planning/CSR_*.md)  — May → August
        │  progressively better — catches its own CSR_OPS error, corrects strip-list to
        │  allowlist — but drops: the dashboard, the third upload surface, the REP/vendor FK
        │  on activities, the post-login slug, "deliverables" (invented, never real, still in
        │  the client-facing doc)
        ▼
The build (csr/ Django app + src/components/csr, src/components/client)
        │  structurally correct; every "absolute" client rule implemented as soft enforcement
        ▼
22-pass security audit (2026-08-03) + CSR-specific chain (2026-08-13 → 08-15)
        │  finds the gaps, some get fixed and verified, two new defects surface in the fixes
        ▼
Where it stands right now — this document
```

---

## 2. What the client actually asked for, and how faithfully each piece was built

This is the reconciliation of my own read of `D:\CSR` (done cold, without seeing any of the build)
against what the audit chain — which read the same transcripts against the actual code — found.
They converge almost exactly, which is itself worth noting: nothing here required new
interpretation of what the client meant. The ambiguity was never in the transcripts.

| Client said (verbatim or close) | Built as | Status |
|---|---|---|
| "Don't make a parallel system — change the routing" | One Django app, one DB, one React build with route-scoped shells | **Holds** |
| "TTA slash CSR, TTA slash client — everything will be routed" | One login, one JWT; only the post-login redirect forks | **Holds** |
| "Before it is done, we should not plan it" (reactive, not scheduled) | `Planned`/`Completed` only; no scheduling engine | **Holds** — and this retroactively confirms the design doc's "seven sequential stages" diagram was wrong, not the client |
| "Training is six months" | `start_date`/`end_date` span, multi-report FK per activity | **Holds** |
| "The client will view it" once a report exists | Built stricter than asked: a published report is the precondition for the *activity itself* being visible, not just a toggle | **Exceeds ask** |
| "You don't have to show the payment here… vendor payment will be normal" | Client serializers are allowlists; no vendor, payment, WO or contract field reachable externally | **Holds** |
| Funder sees only their own project | Every client queryset scoped at the source, fails closed, wrong ID returns 404 not 403 | **Holds — independently audited, zero cross-client leaks** |
| **"One payment will always be unique… when the government audits, it is a forgery"** | DB unique index (real) + **no API validator** → duplicate tag was an unhandled 500 | **Was soft. Fixed 2026-08-15**: `_validate_payment_not_already_tagged` now returns 400 naming the holding project, with a proof test |
| **"Certificate generated at project end"** | Live recompute, no snapshot, no issuance record | **Still soft** — unresolved |
| **"If we give it to the CSR person, he will say tomorrow you show it… payment will not be in the CSR"** (separation of duties) | Correctly kept out of CSR — but this was read backwards on 2026-08-13 as a missing *permission*. The owner corrected it 2026-08-15: the missing piece is a **"Tag to CSR project" action on the payments screen itself**, not a payment picker inside CSR | **Redesigned mid-flight** — see §4 |
| **"He doesn't want to show the financials to everyone… CSR partners… don't want to show the contract"** (a third audience) | No partner role, no partner category, no FK to scope one on | **Missing** — blocked 3 months on one word ("RETF") that the client's *own* design-review doc may have already answered — see §5 |
| TDS type should move off the vendor onto the work order (said twice, explicitly) | Left on the vendor for 5 months; production TDS records fell back to `'Unknown'` for multi-service vendors | **Was the one outright contradiction in six recordings. Fixed 2026-08-15**, with a fallback for legacy work orders and 4 dedicated tests |
| "Three apps, one backend" | Two of three routes correct; the CSR staff side is two flat sidebar items, not its own shell | **Partially built** — a plan exists (`CSR_SHELL_PLAN`), not started |
| Funder's browser must not download the internal app | Bundle split built, wired to nginx, verified: 26 MB → 3.6 MB, no internal component code | **Fixed and verified 2026-08-15** — but see §6 for what's still leaking |

---

## 3. What softened, and why it's the same failure shape every time

Six separate findings, five different files, one pattern: **a DB-level guarantee with no
API-level voice.**

- Duplicate expense tag → `IntegrityError` → unhandled 500 (fixed 08-15)
- Delete an in-use activity type, work order, or payment → `ProtectedError` → unhandled 500 (still open — 3 instances, same class as the one above)
- A 403 on the work-order picker, the trial picker, and the payment picker → all three silently
  `.catch()` into an empty array with no message (open — this is the single most repeated defect
  in the module, hit at 4 of the 10 steps in the operator's own lifecycle)

None of these are missing rules. Every one of them is a correct rule with nowhere to speak. The
fix in each case is the same shape: a serializer validator, or a caught error that renders a
message instead of nothing.

---

## 4. The separation-of-duties story — corrected mid-audit, worth understanding in full

This is the clearest example of how a wrong read gets caught, and it happened inside this very
audit chain, which is why it's worth walking through rather than just stating the final answer.

The client's words: *"vendor payment will not be here… we will show it in finance, not in
CSR… if we tag him from there, he will not come to another place… but it will not be in the
section of the CSR."*

**First reading (2026-08-13):** a `csr` + `csr_certificate` operator — the person the
separation-of-duties design was meant to create — hits a 403 on the payment picker inside CSR,
which a `.catch()` turns into an empty dropdown with no error. Read as: *the certificate role is
broken, give it a read-dependency on payments.*

**Correction (2026-08-15, from the owner):** *"payments happen in tta app… but some csr manager
will need to see it."* That inverts the finding. The transcript specifies **finance does the
tagging, from the payments side** — *"we will control the payment according to ourselves and tag
it"* — and the CSR side's job is to **see** the result, not perform the tag. A payment picker
inside the CSR app was never specified; it's the deviation, not the empty state.

So the actual gap is the opposite of what it looked like: there is **no "Tag to CSR project"
action anywhere in the payments UI at all** (`grep` across `src/components/payments/`,
`src/components/bank/`, `src/components/workorders/` returns zero CSR references). The
`csr_certificate` grant was named correctly — it belongs to the finance-side tagger — it was just
mounted on the wrong screen. The CSR side is missing a **read** grant on the tags it should be
allowed to see.

This matters beyond the specific fix, because it's a case study in why the transcripts have to
stay the reference, not the first reading of them. The correction came from someone who had
actually been in the room for the original call, catching an inference the document chain had
made from the code outward instead of the transcript outward.

---

## 5. The partner tier — still open, now with a concrete next step

Two recordings ask for a third audience: *"multiple partners, RETF partners… they want a view,
but they don't want to show the contract."* This is the single highest-value open item in the
project, and it has been open since May for one reason: **"RETF" was never transcribed clearly
enough to know what it refers to**, and every planning document correctly refused to guess — a
wrong guess means showing a contract to someone who was never meant to see it.

Two things the audit chain found that change the shape of the question, both worth carrying into
the next client conversation:

1. **The client's own design-review document already defines "partner."** Twice: *"Workshop → a
   vendor in the 'partner' category"* and *"Workshop partners = vendors flagged with partner
   category."* Every downstream planning doc treated "RETF partner" as an unidentified third tier
   and never connected it to this. If they're the same people — plausibly, since a workshop
   partner is exactly an organisation that would want visibility without the contract — the
   question narrows from *"who is this?"* to *"is RETF one of the organisations already delivering
   our workshops?"*
2. **Even with an answer, there's no data to scope a partner view on.** `CSRActivity` has a
   `linked_trial` field and nothing else — no vendor FK, no REP FK. `CSR_VISUAL_FLOW.md` specifies
   a Workshop as linked to a vendor; that link was never built. So a partner tier is blocked twice,
   not once: an undefined audience, and no relationship to filter their view by.

And the primary source that might resolve this has never been fully heard: see §7.

---

## 6. G3 (the funder's separate bundle) — fixed, then found to be 90% fixed

This is the sharpest "verify the fix" story in the chain. The client never stated G3 directly —
it's an inference the architecture doc drew and flagged as a security decision, not a deploy
convenience: *"the corporate client's browser downloads the compiled JS of your entire internal
TTA + CSR-org app — component logic, internal API shapes, business rules."*

- **2026-08-13:** found unwired. `Dockerfile` never ran `build:client`; nginx served one bundle
  for every route.
- **2026-08-15, claimed fixed:** Dockerfile now builds both bundles, nginx routes `/client`
  separately.
- **2026-08-15, independently verified:** genuinely wired. The internal bundle is gone —
  `build-client` shrank from 26 MB / 5 chunks to 3.6 MB / 1 chunk, with no `VendorManagement`,
  `PaymentManagement`, or similar component code inside it.
- **2026-08-15, same verification pass, new finding:** the build also ships
  `main.js.map` — 3 MB, with `sourcesContent` populated, i.e. **plain readable source, not just
  mappings** — right next to the clean bundle. Inside it: 60 internal API endpoints, in full, as
  strings — `/permissions/`, `/banks/`, `/config/bulk/`, `/csr/branding`, `/csr/client-users`, and
  more. The project's own written acceptance test for G3
  (`grep -rl "VendorManagement|PaymentManagement|workOrdersAPI" build-client/static/js`) **fails**
  when run against the real output, because the map matches.

So the component logic is genuinely gone; the API surface it was built to hide is one file over,
readable in plain text. The fix is `GENERATE_SOURCEMAP=false` on `build:client` — minutes of work
— but until it lands, the security guarantee the whole exercise exists for is not yet true in
production.

---

## 7. The evidence problem — and why it's more urgent than a footnote

Every conclusion in this document, and in every file it draws from, rests on **14 minutes 19
seconds of phone audio**, recorded in `D:\CSR`, not in git, not backed up anywhere else. The
sweep across the rest of the repo found nothing that corroborates it: the WhatsApp export covering
the entire CSR build window mentions CSR three times and none is a requirement; the four
conversation-analysis planning docs match `csr` zero times. **The four transcripts are the entire
requirement record for this module — there is no second copy of what was asked, anywhere.**

And one part of that record has never actually been heard. `new_inputs/WhatsApp Audio 2026-06-27
at 03.43.43.mp4` was logged as a duplicate re-send of the May audio. It isn't, quite: `ffprobe`
shows it runs 85 seconds longer than its May counterpart, at an identical bitrate — not a
re-encode, an addition — appended to the tail of **the single most important recording in the
corpus**, the one that carries the audit-uniqueness rule, the utilisation-certificate design, and
the three-routes decision. The extra 85 seconds measures as continuous low-level speech-range
audio, not silence, but Whisper hallucinates on it exactly as it does on silence, so the existing
transcript is not evidence either way. Nobody has played it.

Two actions, under an hour combined, and they're the cheapest risk reduction available anywhere in
this project: copy `D:\CSR` to a second location, and play those 85 seconds. Given §5, there's a
real chance they resolve — or reopen — the RETF question directly.

---

## 8. The funder's actual experience — the part no audit pass owns until this one

Every planning document's user journey ends at *"the client views the published report."*
Walking what that means once you follow it all the way through:

They receive a link outside the product, sign in, and land on three tabs. The activities list and
the reports list are **disconnected** — `CSRReport.activity` is a real foreign key, the operator's
form even asks for it, and the funder's serializer drops it, so *"May Progress Report"* cannot be
matched to which camp or city it covers without opening every file. They see the amount they
sanctioned and never the amount spent — no utilised total, no certificate endpoint under
`/api/client/` at all; that number is computed, gated behind `csr_certificate`, rendered to a PDF
on an operator's machine, and leaves the system however that operator chooses. They are never
notified when something new publishes — they have to log in and check. If they forget their
password, there is no reset flow and no link on the login screen; their only route back in is to
phone IKF. The portal has no responsive layout at all, on the one surface most likely to be opened
on a phone by a corporate executive. And if their white-label brand colour falls in a specific
luminance band — which includes the branding form's *own placeholder values* — their buttons
render illegible, because a contrast-threshold fix landed with different-but-still-wrong math.

None of this contradicts anything the client asked for. It's the opposite problem: the client
specified the wall correctly — the funder should see only their project, only published reports,
only the sanctioned figure until close — and everything on the *inside* of that wall (data
isolation, allowlist serializers, fail-closed permissions) is genuinely well built and
independently verified. Everything on the *outside* of it, where the actual human sits, has had
no design attention at all.

---

## 9. Where a CSR-only staff member stands right now

Separate from the funder, and arguably worse, because this is IKF's own team: a user granted only
`csr` logs in and lands on `/dashboard`, which was built from five modules —
trials, reps, vendors, work orders, payments — with no `csr` entry. Every login: a welcome banner,
a role chip reading "REP" (because the product's own user-creation screen offers only a binary
REP/SUPER_ADMIN toggle — there is no way to create an ADMIN account at all), and nothing else. No
tiles, no quick actions, no CSR content, no navigation into the module they were granted.

Three of the ten steps in the operator's own lifecycle — activity-type setup, funder onboarding,
portal branding — require an ADMIN account, which, per the above, the product cannot issue. So the
one thing a `csr`-only person is supposed to do — run a project — has three points where the
system tells them to fix a blocker they have no account type capable of fixing.

The fix (`CSR_SHELL_PLAN_2026-08-14.md`) is written, staged into five low-risk commits, and
**not started** — the last step needs an owner decision that no document has ever made: does a
CSR-only operator enter through a launcher, a post-login redirect, or both. That's a five-minute
call blocking a two-day plan.

---

## 10. One reconciled ranking, as of today

Superseding the separate rankings in `CSR_INTENT_VS_BUILD` §7, `CSR_E2_RECLASSIFIED` §6, and
`CSR_UIUX_REVIEW` §8 — folding in what's since been fixed and what fixing it revealed.

| # | Item | State | Why it's here |
|---|---|---|---|
| — | Audit-uniqueness rule (D1/E3) | **Fixed, verified, tested** 08-15 | Was #1. Closed. |
| — | TDS type on wrong model | **Fixed, verified, tested** 08-15 | Was the one outright contradiction. Closed. |
| — | Funder bundle unwired (G3) | **Fixed, verified** 08-15 | Was #3. Closed as originally scoped. |
| 1 | **Funder's source map leaks 60 internal API endpoints** | Open, found while verifying the fix above | Defeats the exact guarantee G3 exists to provide; one-line fix, not yet applied |
| 2 | **No finance-side "Tag to CSR project" affordance exists anywhere** (E2a) | Open, redefined 08-15 | The client's core money instruction has no UI on the side of the wall it was specified for |
| 3 | **CSR-only staff have no home page and no path past 3 ADMIN-gated steps** | Open, plan written, not started | Blocks the module's actual users on every login; blocked only on one undocumented decision |
| 4 | **Partner tier (A1)** | Open 3 months | Highest-value single unresolved question; the client's own doc may already answer half of it — see §5 |
| 5 | **White-label contrast — round two** | Open, new bug from the first fix | The one feature with real design intent still ships illegible buttons off its own placeholder values |
| 6 | **E2b/E2c — CSR read grant on tags; swallowed 403s** | Open, small | Two one-line-scale fixes; E2c recurs at 4 separate pickers |
| 7 | **Certificate never frozen, thin as a document, no delivery path** | Open | Matters at the first real audit, not before |
| 8 | **PROTECT-delete 500s** (activity type, work order, payment) | Open, 3 instances | Same defect class as the fixed D1 — DB rule, no API voice |
| 9 | **Funder UX** — no password reset, no responsive layout, no notification, report↔activity link dropped | Open | The least-designed surface is the one external, untrained, unsupported user touches |
| 10 | **85 unheard seconds in `D:\CSR`, no backup** | Open, under an hour to resolve | Cheapest risk reduction in the project; may bear directly on #4 |

---

## 11. What this means for the next conversation with the client

Everything in my original `D:\CSR`-only read (five questions, framed as decisions) still holds and
now has a build-side answer attached to each:

1. **Trainings** — resolved. Built as one activity with a date span and multiple reports, matching
   the recommendation.
2. **Partner access** — still the open one. Now has a concrete next question: *is RETF one of the
   vendor-category "workshop partners" already defined in your own design doc?* — plus a second,
   separate blocker (no FK to scope a partner view on) that answering RETF does not by itself fix.
3. **Report publishing** — resolved, and stricter than recommended: no report, no visible activity.
4. **Project variability** — not further resolved by the audit; still worth asking directly.
5. **Sequencing** — moot now; the CSR build happened. The live question today is narrower and
   internal: who signs off on the shell/navigation change in `CSR_SHELL_PLAN`, and how does a
   CSR-only operator get into the app at all.

The standing constraint is unchanged and, where it was soft, is now mostly hardened: one rupee, one
project, one certificate. What's added since is the second constraint this whole trace surfaces —
**every rule needs an API-level voice, not just a database-level guarantee** — and a third: **the
wall the client asked for is well built on the inside and has had no design attention on the
outside, for both of the people who have to live there — the funder, and your own CSR staff.**
