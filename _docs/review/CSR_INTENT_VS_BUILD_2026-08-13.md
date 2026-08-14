# CSR — Asked vs Built

**Date:** 2026-08-13 · **Method:** every file in either repo that mentions CSR, read against every
conversation-bearing source in the repo — the six requirement transcripts, the WhatsApp chat
export, and the four conversation-analysis planning docs — plus the eight CSR planning documents
and the 2026-08-03 audit. Analysis only — no code was changed to produce this.

Each verdict below carries a `file:line` citation. Where a claim is about framework behaviour
rather than about this repo's text, it was reproduced in an isolated Django/DRF harness rather
than asserted — those are marked **[reproduced]**. §1a records what the conversation sweep covered
and, importantly, what it found to be empty.

---

## 0. The short version

The build is faithful to the intent in its **structure** and unfaithful in its **enforcement**.

Every architectural instruction the client gave was followed: one system not two, CSR as routes
inside TTA, the funder walled into a read-only view of one project, the money decision split away
from the person who faces the funder. Those hold up, and the isolation is genuinely well built.

The conflicts you are sensing are almost all in one band: **rules that were stated as absolute by
the client, then implemented as something weaker than absolute.** The clearest case is the
audit-uniqueness rule — the client's own words were *"one payment will always be unique"* — which
is enforced by a database index and by nothing else. It holds, but it holds by crashing.

There is also one whole guardrail (the separate funder build) that is scaffolded at both ends and
connected at neither, and one whole audience (partners) that does not exist at any level.

Counts: **11 requirements match**, **6 diverge**, **2 are absent**, **3 are defects where the
build contradicts itself**, **3 were built without ever being asked for**.

---

## 1. What matches the ask

These are not filler — several are the load-bearing rules, and they are correct.

| # | Asked | Built | Evidence |
|---|---|---|---|
| M1 | *"Don't make a parallel system. Reuse existing resources — just change the routing."* | One `csr` Django app, one database, routes inside the existing React app | `csr/urls.py`, `src/App.js:181-209` |
| M2 | *"His work order will be put in it. There will be an attachment, a contract."* | `CSRProject.work_order` → `OneToOneField(WorkOrder)` | `csr/models.py:19-25` |
| M3 | *"5-6 events… boys' trial, girls' trial, workshop, training"* | `CSRActivity` + `CSRActivityType`, any mix per project | `csr/models.py:33-71` |
| M4 | *"Before it is done, we should not plan it. If it is done, then it will be filled."* | Reactive logging. Status is only `Planned`/`Completed`; nothing schedules or sequences | `csr/models.py:42-45` |
| M5 | *"If you want to give training to a child for six months…"* | `start_date`/`end_date` span on the activity; reports are an FK so one activity takes many | `csr/models.py:64-65`, `csr/models.py:74-84` |
| M6 | *"A person will put a report in it, so that if the client wants to see it, he will view it"* | `visible_to_client`, defaults to `False` — hidden until deliberately published | `csr/models.py:96` |
| M7 | *"There will be a separate dashboard for the client… he will see by logging in"* | `/client` portal, own shell, no TTA sidebar | `src/App.js:226-231` |
| M8 | *"Vendor payment will not be here… you don't have to show the payment here"* | Client serializers are allowlists. No vendor, payment, work-order or contract field is reachable | `csr/client_serializers.py:5-8, 27-57` |
| M9 | Funder sees only their own project | Every client queryset scoped to the caller's one project, fail-closed with no link | `csr/client_views.py:22-36`, `csr/client_permissions.py:11-18` |
| M10 | *"If we give it to the CSR person, he will say, tomorrow you show it, how will you change it? So the payment will not be in the CSR."* | Two separate grants: `csr` for delivery, `csr_certificate` for the money | `permissions/registry.py:30-31`, `csr/views.py:152` |
| M11 | *"Our app is TTA slash management operation, this will be TTA slash CSR, TTA slash client"* | One login, one token; only the post-login redirect forks | `src/App.js:89` |

### 1a. The conversation sweep — including what turned out to be empty

Every conversation-bearing artefact in the repo was checked, not just the CSR transcripts. Three
results are worth recording, because two of them are negative findings that matter.

**The WhatsApp chat contains no CSR requirements.** `WhatsApp Chat with IKF TTA 2026 x Abhishek.zip`
holds a 979-line export spanning 27/03/26 → 24/07/26 — the entire CSR build window. It mentions
CSR three times, and none of the three is a requirement: a passing question about Drive storage, a
note that reports would be cleaned up *"once csr will be built"*, and *"I will be busy with CSR
today. Have to launch it tomorrow"* (24/06/26). Searches for *utilisation*, *certificate*,
*sanction*, *contract* and *funder* return zero. The channel is TTA operations — logos, courier,
bugs, payment sheets.

**The four conversation-analysis planning docs contain no CSR either.** `convo_reference.md` (825
lines), `CONVERSATION_ANALYSIS.md` (603), `FEATURES_FROM_CONVERSATION.md` (169) and
`session_2026-06-20_full_log.md` (168) each match `csr` **zero** times. They are TTA-side.

**Consequence:** the four CSR transcripts really are the *entire* requirement record. There is no
written corroboration anywhere — no chat message, no analysis doc — for any CSR requirement.
Everything in §2 and §3 rests on machine transcriptions of phone audio whose source files exist in
one place, unbacked-up. This makes §8 considerably more urgent than a generic housekeeping note.

Two things the sweep did add:

- **The earliest CSR mention is 2026-03-06**, ten weeks before the scope calls, at the tail of the
  vendor/WO/payment spec: *"If this happens to you, then you will get confused if you enter CSR…
  We will collect all the information related to this and plan and meet tomorrow morning… How will
  you show the front-end? We don't show the front-end now, sir. We will write it first. Document in
  one place."* That is the origin of the document-first process this whole planning corpus follows.
- **The Google Drive decision, 24/05/26** — two days after the CSR scope calls, and directly
  relevant to D3 below. Abhi: *"which email id should I use for the google drive image storage?"* →
  operations id given → **Phani Bhushan: *"This will contain all images, CSR work order CSR reports
  etc. Right?"*** → redirected to `indiakhelofootball@gmail.com`. The thread immediately above it
  is about image storage hitting space constraints and 2 MB upload limits.

### 1b. `D:\CSR` — the primary sources, examined directly

The transcripts in the repo are derived artefacts. `D:\CSR` holds what they were derived *from*.
Five findings, three of them new.

**F1 — 85 seconds of client audio has never been verified by anyone, and it is not silence.**

The README states the 2026-06-27 batch in `new_inputs/` are *"re-sends of the May audio, not new
material."* Verified by md5 — **half true**:

| File | md5 | Verdict |
|---|---|---|
| `06-27 at 03.43.41.mp4` | `c036332d…` | ✅ identical to `05-22 7.27.20 PM` |
| `06-27 at 03.43.42.mp4` | `cea6bb1d…` | ✅ identical to `05-22 7.26.43 PM` |
| `06-27 at 03.43.43.mp4` | `a4ea79cf…` | ❌ **matches nothing in the May set** |
| `06-27 at 04.47.13.mp4` | `a4ea79cf…` | identical to 03.43.43, not to May |

`ffprobe` on the odd pair: **543.3 s vs 458.3 s**, at an identical 131 kbps. That is not a
re-encode — it is **85 seconds of additional audio** appended to the most important recording in
the corpus (the utilisation-certificate / audit-uniqueness / three-routes call).

Whisper's output for those 85 seconds is the begging-bowl and "Elizabeth Banks" loop the README
correctly identifies as hallucination — and reasonably assumed meant trailing silence. Measured,
it does not:

| Window | mean | peak |
|---|---|---|
| Conversation body (60–120 s) | −18.9 dB | 0.0 dB |
| Tail 450–460 s | −33.7 dB | −15.4 dB |
| Tail 460–470 s | −32.2 dB | **−5.4 dB** |
| Tail 500–510 s | −39.2 dB | −16.6 dB |
| Tail 530–540 s | −38.1 dB | **−9.1 dB** |

Continuous low-level audio with speech-range peaks throughout — roughly 15–20 dB below the call,
which is what a phone held away from the mouth, a speakerphone at distance, or a second
conversation sounds like. Whisper hallucinates on that exactly as it does on silence, so its output
is evidence of *unresolvable*, not of *empty*.

I could not settle it here: the container's proxy blocks the Whisper model hosts, so a boosted
re-transcription was not possible. **What is established: 85 seconds of audible, never-heard,
never-resolved client audio sits at the tail of the money-and-routing call.** Someone should play
it. It is 85 seconds.

**F2 — your own client-facing document already defines "partner", and no planning doc noticed.**

`CSR_Module_Design_Review.docx` — the artefact prepared for client review — says, twice:

> §3 Activity types · **Workshop → *"A vendor in the 'partner' category (financial, health, etc.)"***
>
> §6 Reused from TTA · ***"Workshop partners = vendors flagged with partner category"***
>
> §7 build stage 3 · *"TTA Admin additions: Workshop names, training programme names,
> **workshop-partner vendor categories** — dropdown entries only."*

So "partner" in the design review is a **vendor category for the organisations that deliver
workshops.** "Partner" in `CSR_REC_2` is an **audience that needs a view with the contract
hidden.** Every planning document treats the second as an unidentified third tier and never
connects it to the first — understandably, since none of the Generation-1 docs mention partners at
all (the transcription failure).

But the two readings fit: the organisations delivering your workshops are precisely the people who
would want to see the project and must not see the contract. **That is a concrete, testable
hypothesis for the RETF question, and it has been sitting in your own client-facing document since
May.** It does not answer what "RETF" stands for — but it turns the question from *"who is this?"*
into *"is RETF one of these workshop-partner organisations?"*, which is a far easier call to make.

**F3 — the partner category was never created, and there is no edge to scope it on.**

Two things block a partner tier even after the question is answered:

- `Vendor.vendor_type` is a free `CharField` fed by `config_configoption`. The values present are
  `Contractor`, `Consultant`, `Vendor`, `Photographer` — **no partner category exists.** (Read from
  the two dev SQLite DBs in the repo; production may differ and is worth confirming.) Build stage 3
  of the design review was never done.
- `CSRActivity` carries `linked_trial` and nothing else (`csr/models.py:53-59`). **There is no
  vendor or partner foreign key.** A Workshop activity cannot record who delivered it.

So even granted an answer tomorrow, a partner view has no relationship to scope on. This is a
second blocker on A1 that no document records.

**F4 — the docx confirms all three stale items, and adds a fourth.** `CSR_OPS` appears as a role in
Table 2, the staff journey, and build stage 2 — a role the codebase never had. §3 opens *"The
lifecycle has seven sequential stages"* while its own Q1 asks whether recording is reactive or
sequential. Q3 leaves the training report model open. And the cover page reads **"May 2025"** where
it means May 2026 — on the document prepared for the client.

**F5 — the corpus is 14 minutes long.** `CSR_REC_1` 176.4 s + `CSR_REC_2` 75.5 s + `05-22 7.26`
149.0 s + `05-22 7.27` 458.3 s = **858.5 s — 14 min 19 s of audio is the entire requirement basis
for this module**, plus the 85 unverified seconds. The v1 failure is confirmed forensically:
`transcrip[t/transcripts (1)/CSR_REC_2.txt` is **52 bytes** (the `CSR CSR CSR…` loop) against 473
bytes on the v2 rerun.

One thing was answered **better** than it was asked. Open question Q7 in the reference doc asked
whether publishing should require a report to exist first, so a funder never sees an empty
activity row. The build went further and made a published report the *precondition for the
activity being visible at all* (`csr/client_views.py:46-54`). That is the right call. (Its
loophole is D3 below.)

---

## 2. Where the build diverges from the ask

### D1 — The audit rule is enforced by a crash, not by a check **← the most important item here**

The client stated this one more forcefully than anything else in the recordings:

> *"They cannot show me the same thing again… it is a forgery, isn't it? When the government
> audits, they cannot tell you how they have shown it twice. One person will always be unique."*

Your own architecture doc turned that into invariant **INV-AUDIT**, and specified how it must be
proven (`CSR_ARCHITECTURE.md:129`):

> One payment tags **at most one** project · made structural by DB `unique` **and an API check** ·
> proof test: tag a `PaymentRequest` to project A, then attempt project B → **rejected at DB and API**

What is actually built:

- The DB half is real. `CSRExpenseTag.payment` is a `OneToOneField`, so a unique index exists
  (`csr/models.py:106-112`). **Your data cannot become wrong.** That matters and it is the half
  worth having.
- The API half does not exist. `paymentId` is declared explicitly on the serializer
  (`csr/serializers.py:94-97`). DRF only auto-attaches its `UniqueValidator` to fields it
  generates itself; an explicitly declared field gets no validators unless you pass them.

**[reproduced]** — an isolated harness with the same model and the same two serializer shapes:

```
EXPLICIT paymentId validators: []
AUTO     payment   validators: [<UniqueValidator(queryset=Tag.objects.all())>]

EXPLICIT is_valid on already-tagged payment -> True  {}
  -> save raised: IntegrityError | UNIQUE constraint failed
AUTO     is_valid on already-tagged payment -> False {'payment': ['tag with this payment already exists.']}
```

So tagging a payment that already belongs to another project passes validation, reaches the
database, and raises an unhandled `IntegrityError` — an HTTP **500** with no message, not a 400
saying *"this payment is already tagged to project X."* The operator sees a generic failure and
has no way to learn which project holds it.

And there is no test. `csr/tests.py:31` opens `class InvAuditTests` — but every test in it
(`tests.py:40-70`) exercises the *XOR* rule (payment **or** manual amount, not both). Nothing in
the 51 tests in that file tags one payment to two projects. The name makes the gap invisible: a
reader greps `INV-AUDIT`, finds a passing test class, and concludes the rule is covered.

**Consequence:** the rule holds, but the product cannot explain itself at the moment it matters
most, and the one invariant the whole compliance story rests on is unproven.

### D2 — The certificate is live, never frozen

Reference §5.5: *"The certificate is generated at project end, not during."* The recording agrees:
*"Until that project is over, there is no need to give them certificates."*

Built as a live aggregation, recomputed on every request, with no snapshot and no lock
(`csr/views.py:327-373`, and the view's own comment at `csr/views.py:322-324` acknowledges this).
Closing a project changes nothing. Two certificates generated a week apart for the same closed
project can differ if anyone touched a tag or a payment status in between, and there is no record
that a certificate was ever issued, when, or with what figures on it.

For a document filed with a government audit, "what did we tell them last March" is a question the
system currently cannot answer.

### D3 — "Upload a report" became "paste a link", and a blank link still publishes

Every planning document says *upload*. The codebase has no `FileField` and no media root, so
`CSRReport` stores `file_name` + `file_url` (`csr/models.py:85-88`). The architecture doc records
the substitution (`CSR_ARCHITECTURE.md:197-200`).

**The conversation sweep upgrades this from "reasonable substitution" to "matches a decision the
client's own side made."** On 24/05/26 — two days after the CSR scope calls — the team settled
Google Drive as the store, and Phani Bhushan confirmed in the same thread that it *"will contain
all images, CSR work order CSR reports etc."* So a Drive link was the intended home for a CSR
report, in writing, before the model was designed. Server-side upload was also already a known sore
point in that channel (image space constraints and a 2 MB ceiling, 21–22/05/26). Link-paste is not
a degradation here; it is the agreed design.

That reframes what is actually missing. It is not uploads. It is that nothing connects the link to
that decision: no validation that the URL is a Drive URL, no check that it resolves, no record of
which account owns it — and the hole below.

The consequence nobody recorded: `fileUrl` is `allow_blank=True` (`csr/serializers.py:79`). A
report saved with a name and no URL, then published, satisfies the visibility precondition — so
the funder sees a report row, and an activity row behind it, with nothing to open
(`ClientPortalPage.jsx:137-147` renders the link only when `fileUrl` is set). This is precisely
the empty-row failure Q7 was written to prevent, surviving one level below where it was fixed.

### D4 — The certificate is a four-line PDF

The Utilisation Certificate is the product's deliverable — the artefact the funder files as
statutory evidence. What is generated (`CSRProjectDetailPage.jsx:224-241`) is: a title, project
name, funder name, sanctioned amount, total utilised, and a three-column table.

No letterhead, no signature block, no reference to the sanctioning contract or work order, no
period covered, no certificate number, no "we certify that…" statement. No planning document ever
specified what the document should contain, so it was specified by whoever wrote the jsPDF call.

Related but **not** a defect: the funder has no API access to the certificate at all — there is no
certificate route under `/api/client/` (`csr/urls.py:37-40`), and external roles are refused on
internal modules before any grant lookup (`permissions/enforcement.py:64-67`). That is *correct*
against intent — the client was explicit that the certificate stays under your control until
project close. The gap is that no delivery path exists either: the PDF downloads to the operator's
machine and leaves the system by whatever means they choose, unlogged.

### D5 — Three apps became one app with extra routes

Every document leads with "three apps, one backend", and `CSR_IMPLEMENTATION.md` §3.4 specifies
`CSRSidebar` and `ClientSidebar` beside the existing `Sidebar`. Neither exists. CSR is two nav
items in the TTA sidebar (`Sidebar.jsx:121-122`), and the funder portal collapsed from three
planned screens to one page with three tabs (`ClientPortalPage.jsx:87-91`).

For the operator this is arguably better — no app-switching. But it means the "three apps" framing
in every document, including the client-facing design review, now describes routes rather than
anything a user perceives. **This is the direct cause of the "why are there two CSRs" confusion:**
`CSR Projects` (grant-gated) and `CSR Clients` (admin-only) sit at the same level in one flat
sidebar, so a sub-function reads as a peer.

### D6 — Six project tabs became five; the Work Order tab is gone

Reference §6 lists the operator's tabs as Overview, Work Order, Contacts, Activities, Reports,
Utilisation Certificate. Built: Overview, Contacts, Activities, Reports, Utilisation
(`CSRProjectDetailPage.jsx:271-277`).

The work order did not move into Overview as a link — it appears as a plain, non-clickable text
field reading `#<id>` (`CSRProjectDetailView.jsx:29`). So the contract and its attachments, which
`M2` establishes as the reason the work order is attached to a CSR project in the first place, are
**not reachable from anywhere inside the CSR module**. An operator has to leave CSR and open the
Work Orders module, which is a separate grant they may not hold.

Two things follow. The client's *"his work order will be put in it, there will be an attachment,
a contract"* is satisfied at the data layer and not at the UI layer. And the object carrying the
single most restrictive future requirement — the contract is precisely what the unbuilt partner
tier must hide — currently has the least prominent home in the product.

---

## 3. What was asked for and is absent

### A1 — The partner tier does not exist at any level

Two recordings ask for it:

> *"In CSR there are many multiple partners, which are RETF partners, they want to give a view to
> it, but in that they don't want to show the contract."*

> *"Can you bifurcate the CSR view? … He doesn't want to show the financials to everyone."*

`User.ROLE_CHOICES` is `SUPER_ADMIN`, `ADMIN`, `REP`, `CSR_CLIENT` (`accounts/models.py:46-51`).
No partner role, no partner flag, no field-stripping variant of the client serializers. Note also
that `ClientProjectSerializer` ships `sanctionedAmount` to every external viewer
(`csr/client_serializers.py:29-31`) — so the current external surface is shaped for a funder, not
for someone who must not see financials.

It is blocked on one unidentified word. **"RETF"** appears exactly once, in the recording that the
first transcription pass lost entirely, in machine-transcribed phone audio in mixed Hindi and
English. The planning docs refuse to guess (`CSR_COMPLETE_REFERENCE.md:129-132`).

That refusal is the right call — a partner tier is defined entirely by what it must *not* see, so
guessing the audience means guessing the redaction, and a wrong guess shows a contract to someone
who was never meant to see it. But it has now been open since May.

**§1b changes the shape of this question.** Your own design review defines "partner" as a **vendor
category for workshop-delivery organisations** (F2), which the planning corpus never connected to
the "RETF partners" audience. If those are the same people — and they plausibly are — the question
narrows from *"who is this third audience?"* to *"is RETF one of the organisations already
delivering our workshops?"*

And F3 adds a blocker no document records: even with an answer, there is no partner vendor category
in the config data and **no vendor/partner foreign key on `CSRActivity`** — so a workshop cannot
record who delivered it, and a partner view would have no relationship to scope on. Answering RETF
unblocks the design; it does not unblock the build.

**Still one phone call, and still the highest-value unblocking question in the project — but the
call now has a specific question to ask.**

### A2 — Guardrail G3 (the separate funder build) is scaffolded at both ends, connected at neither

`CSR_ARCHITECTURE.md:76-86` reframes this from a deploy convenience to a security decision:

> One React build means the corporate client's browser downloads the compiled JS of your entire
> internal TTA + CSR-org app… Route-gating protects *data*, not *code*. For an external party that
> is **information disclosure.**

The build half was done:

- `src/client-index.js` and `src/ClientApp.jsx` exist; `ClientApp` imports only the portal, auth
  and theme, and its header states the intent verbatim (`ClientApp.jsx:1-7`).
- `package.json:48` — `build:client` emits to `build-client`.
- `public/client.html` exists.

The serving half was never wired:

- `Dockerfile:25` runs `npm run build` only. `build:client` is never invoked.
- `nginx.conf:50-52` — a single catch-all `try_files $uri $uri/ /index.html`. Every path,
  including `/client` and `/client/acme/login`, resolves to the same `index.html` and therefore
  the same bundle.

`nginx.conf:44` sets a cache header for `^/(index|client)\.html$` — someone anticipated
`client.html`. The rule is live; nothing can currently match it.

**Correction to how this looks.** This is not an oversight. `_docs/deployment/CLIENT_BUILD.md`
documents the whole thing deliberately and states the handoff in its own Status section: *"Source
split + entry + HTML template + craco config + `build:client` script: in repo, additive, main build
untouched. Compile/deploy/nginx + the session-expiry wiring: **your side** — they need a machine
that builds and your nginx in front, which is why this is a deploy task, not a verified code
change."* It gives both routing options and recommends **subdomain** (`portal.…`) over path-based,
plus a validation step worth keeping:

```bash
grep -rl "VendorManagement\|PaymentManagement\|workOrdersAPI" build-client/static/js   # must return nothing
```

Two follow-ups from that doc: the one integration risk it flagged — that `APIService` force-
redirects an expired session to `/login`, which does not exist in the client bundle — **has since
been closed** (`src/services/api.js:38-53` now reads the expired user's role and sends a
`CSR_CLIENT` to `/client/<slug>/login`). And note the recommended option is a subdomain, which
would retire the stored-slug workaround entirely, but changes every link already given to a funder.

**Consequence today, regardless of intent:** data isolation holds and is tested. Code isolation
does not exist. A corporate funder's browser downloads your payments logic, permissions model and
internal API shapes. The exposure is live whether or not the remaining work is someone else's task.

---

## 4. Defects found this pass — the build contradicting itself

These are not intent-vs-build gaps; they are places where two parts of the built system disagree
with each other.

Worth stating for calibration: the 2026-08-03 audit was thorough — 22 passes, 96 findings, and it
specifically praised the CSR isolation (*"Pass 2.2 found zero cross-client leaks"*) and the
permissions layer (*"zero unenforced endpoints out of ~60"*). That assessment stands; nothing below
contradicts it. E1 and E3 are new because both live in the seam **between** the layers the audit
examined separately — a registry rule versus a button, a serializer field versus a DB index —
rather than inside either one. E2's swallowed error was already known (see its note).

### E1 — The "Remove this expense tag" button can never succeed

- `permissions/registry.py:31` — `csr_certificate` is declared `can_delete: False`, deliberately:
  *"the utilisation certificate is audit-bound, so it is never hand-deleted."*
- `permissions/rules.py:29-30` — `DELETE` requires `can_edit` **and** `registry.can_delete(module)`.
- `CSRProjectDetailPage.jsx:472-476` — the UI renders a delete icon for anyone with
  `canEdit('csr_certificate')`, and `deleteExpense` (`:194-203`) calls
  `csrAPI.expenseTags.delete`.

Every non-`SUPER_ADMIN` who clicks it gets a 403 and a red toast. `SUPER_ADMIN` bypasses
`ModulePermission` entirely (`enforcement.py:68-69`), so it works for exactly one class of user —
which is why it would survive testing by an owner account. No test covers this.

The server rule is the correct one. The button is the bug.

### E2 — The dedicated certificate operator sees an empty payment list

This is the sharpest one, because it defeats the client's own separation-of-duties instruction.

`CSRExpenseTagModal.jsx:25-27` populates the payment picker from
`paymentRequestsAPI.getAll({ limit: 1000 })`, and swallows any failure:

```js
paymentRequestsAPI.getAll({ limit: 1000 })
  .then((d) => { ... })
  .catch(() => { if (active) setPayments([]); });
```

That endpoint requires the `payments` grant (`payments/views.py:50-51`). Read-dependency relief
does not apply: `MODULE_DEPENDENCIES` (`permissions/registry.py:96-102`) has no `csr` or
`csr_certificate` entry, so `read_dependents('payments')` resolves to `{workorders, vendors}` only.

So a user granted `csr` + `csr_certificate` and nothing else — **exactly the person the
separation-of-duties design creates** — gets a 403, which the `.catch` turns into an empty array.
No error, no toast, no "you don't have access". Just a dropdown with nothing in it and a helper
line reading *"A payment can be tagged to only one project."*

To tag anything, that person must additionally hold `payments`, `vendors` or `workorders` — which
re-concentrates in one person the access the client asked to keep apart. Combined with E1 they
cannot untag either. **As currently granted, the certificate role is unusable; as made usable, it
is no longer separated.**

*Attribution:* the swallowed error itself was already catalogued by the August audit
(`_docs/review/4-1-silent-empty.md:91` — *"`csr/CSRExpenseTagModal.jsx:27` · `.catch(() =>
setPayments([]))` · Payment picker blank"*), as one row in a list of ten. What is new here is the
collision: that this particular blank picker is not a generic UX wart but the exact point where the
grant model and the client's separation-of-duties instruction contradict each other. The audit
treated it as a display bug; it is a design conflict.

### E3 — Duplicate tagging returns a 500

Covered as D1 above; listed here because it is also a straightforward defect independent of the
intent argument.

---

## 5. Built without being asked for

Not criticism — decisions made in the absence of a requirement, which is worth knowing when you
next talk to the client, because these are the parts he has never seen or approved.

- **Funder off-boarding** (`csr/views.py:271-314`). No recording discusses what happens to a
  funder's login after project close. The design inference — that closing a project must *not*
  auto-revoke, because the funder still needs the reports afterwards — is sound but unconfirmed.
- **White-label branding and slug URLs** (`csr/models.py:175-195`, `csr/client_views.py:68-79`).
  An elaboration of *"a separate dashboard for the client"*. The client never asked for per-funder
  branding.
- **The Contacts tab** (`csr/models.py:161-172`). Present in the visual flow, absent from the
  spec; the reference doc records it as New-in-CSR (`CSR_COMPLETE_REFERENCE.md:331-332`).

---

## 6. Two silences that will bite later

- **One funder, many projects.** Asked as an open question in three documents
  (`CSR_COMPLETE_REFERENCE.md:279`) and never answered. `CSRClientUser.user` is a `OneToOneField`
  (`csr/models.py:150-153`) — one login, one project, at the database level. If a corporate funder
  ever runs two programmes with IKF, this needs a migration, not a patch. Branding inherits the
  same assumption: it hangs off the project (`csr/models.py:181-182`).
- **How a funder learns a report exists.** Every journey diagram ends at "client views the
  published report". There is no email, no notification, no badge. They have to log in and check.

---

## 7. Ranked, with what each costs to resolve

| Rank | Item | Why it ranks here | Shape of the fix |
|---|---|---|---|
| 1 | **D1/E3** — audit rule unproven at the API | It is the one rule the client stated as absolute, and the invariant registry claims a proof that does not exist | A validator on the serializer + the test the architecture doc already specifies. No schema change; the data is already safe |
| 2 | **E2** — certificate operator can't see payments | Silently defeats the separation of duties the client asked for in his own words | A decision: add a read-dependency, or accept that the role needs a payments-read grant. Also stop swallowing the 403 |
| 3 | **A2** — G3 unwired | Your own doc calls this information disclosure; it is live in production today | Routing, not architecture. An nginx `location /client` serving the `build-client` artefact, plus the Dockerfile step |
| 4 | **A1** — partner tier | Blocked since May on one unidentified word | One phone call: what is RETF, and is a partner a role or a restricted client view |
| 5 | **E1** — dead delete button | Small, but it is a button that fails for every user except the owner | Hide it, or decide deletion should be allowed and change the registry |
| 6 | **D2/D4** — certificate not frozen, and thin as a document | Matters at the first real audit, not before | A design conversation about what the document must contain and whether issuance is recorded |
| 7 | **D3** — blank-URL report publishes | Reintroduces the empty row Q7 fixed | Require a URL before `visibleToClient` can be set |
| 8 | **D5/D6** — sidebar and tab reductions | Explains the "two CSRs" confusion; no correctness impact | Grouping/labelling, or update the client-facing docs to match what shipped |

---

## 8. On the evidence itself

Worth restating, because every judgement above rests on it — and §1a made it sharper than it first
appeared.

The requirement transcripts are machine transcriptions of phone audio in mixed Hindi and English,
garbled in load-bearing places. The README documents the known artefacts
(`_docs/requirements/README.md`): "TTIP" for TTA, a vendor name mangled beyond recovery, Whisper
hallucinating YouTube outros over trailing silence, and "RETF" itself.

The sweep in §1a establishes that **nothing corroborates them.** The WhatsApp channel covering the
entire CSR build window contains no CSR requirement, and neither do the four conversation-analysis
documents. There is no second copy of what was asked for, in any form, anywhere in the repo.

The source audio lives only at `D:\CSR`, is not in git, and is backed up nowhere — I verified the
folder contents directly (§1b). **The entire requirement basis for this module is 14 minutes 19
seconds of phone audio in one place**, of which 85 seconds has never been successfully transcribed
or heard by a person. If that drive fails, four garbled machine transcripts become the sole record,
and "RETF" becomes permanently unanswerable — turning A1 from *blocked* into *unresolvable*.

**Copying `D:\CSR` somewhere else is the cheapest risk reduction available in this project, and
after §1a and §1b it is not a housekeeping note.** Two actions, both under an hour:

1. Copy `D:\CSR` to any second location.
2. Play `new_inputs\WhatsApp Audio 2026-06-27 at 03.43.43.mp4` from **7:38** to the end (85 s) and
   write down whether it contains speech. That is the only unexamined primary source in the
   project, and it sits on the recording that defines the money rule.

---

## 9. Verdict

You did not get a mixed-up build. You got a structurally faithful one with soft enforcement.

Every instruction about *shape* was followed — one system, three doors, funder walled off, money
decision separated. What slipped is that three of the client's absolute statements were
implemented as approximations: *"one payment will always be unique"* became a database index with
no API voice, *"generated at project end"* became a live recompute, and the separation of duties
became two grants that cannot actually be held alone.

Add the one guardrail your own architecture doc marked mandatory and that was never wired to
nginx, and the one audience nobody could identify, and that accounts for the conflict you are
seeing. None of it is drift or confusion between products — the CSR module and the `CSR Project
Trial` trial-type label remain genuinely unrelated, and nothing in the CSR app reaches into trials
except the deliberate `linked_trial` foreign key (`csr/models.py:53-59`).
