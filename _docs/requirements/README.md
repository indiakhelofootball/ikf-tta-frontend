# Requirements — primary source

Auto-transcribed recordings of the client's own requirement calls. Every planning
document in `_docs/planning/` is a derived reading of these; this folder is the
source they were read from.

**Source audio lives outside the repo at `D:\CSR\` and is not backed up anywhere
else.** The `.m4a` / `.mp4` files are 50+ MB and stay out of git deliberately.
If that drive is lost, the transcripts here become the only record of what was asked for.

Transcribed with `transcribe_csr_v2.bat` (Whisper). An earlier v1 run is in
`D:\CSR\transcrip[t\transcripts\` and mostly produced 0-byte files — ignore it.

---

## Read this before quoting anything

These are machine transcripts of phone audio, in mixed Hindi/English, and they
are **garbled in load-bearing places**. Known artefacts:

- **"passed away twice in a day"** (2026-05-16) almost certainly means *"has been
  paid twice in a day"* — `passed` = a payment passing. This one matters; see the
  duplicate-payment note below.
- **"TTIP"** appears where **TTA** is meant.
- **"RETF partners"** (`csr-rec-2`) — unidentified. Could be an organisation, a
  vendor category, or a mis-transcription. **Still blocking the partner model.**
- **"brush" / "Braj"** (2026-05-16) is a vendor name mangled beyond recovery.
- Trailing **"Welcome to our Channel"** and **"Thank you for watching this video,
  please subscribe"** are Whisper hallucinations on silence. Not content.

Treat a transcript as evidence that a topic was discussed, not as a verbatim quote.
Where a requirement is load-bearing, re-listen to the source audio before acting.

---

## The recordings

| File | Covers | Drove |
|---|---|---|
| `2026-03-06_0848_vendor-wo-payment-spec.txt` | **The fullest single spec in existence.** Walks the entire vendor → work order → payment request → batch → TDS chain end to end | Vendor form shape, WO one-time vs periodic, partial payment with running remainder, TDS deposit rule, bounce → edit account → retry |
| `2026-05-16_2001_reports-dashboard-review.txt` | Live demo review of the payment audit report and dashboard | Report sorting/filtering, dashboard report tiles. Also contains the double-payment sighting |
| `2026-05-22_1926_csr-project-scope.txt` | What a CSR project *is* — activities beyond trials, client-facing visibility | CSR project wrapper, work order + contract attachment per project |
| `2026-05-22_1927_csr-utilisation-and-audit-rule.txt` | Utilisation certificate, expense tagging, the three-app routing | `INV-AUDIT`, `csr_certificate` grant separation, `/csr` + `/client` routes |
| `undated_csr-rec-1_bifurcate-view.txt` | "Bifurcate the CSR view" — hide financials from some viewers | The partner tier (unbuilt) |
| `undated_csr-rec-2_two-modules-partners.txt` | Two CSR modules; partners under the funder | The partner tier (unbuilt) |

Two further transcripts dated `2026-05-23 09.14.09` / `09.14.10` are **byte-identical
duplicates** (md5-verified) of the two 05-22 files. Not copied.

### Coverage is NOT complete — 85 seconds of client audio has never been heard

> **CORRECTION 2026-08-15.** The paragraph below is **wrong** and is kept only to show what was
> believed. `_docs/review/CSR_INTENT_VS_BUILD_2026-08-13.md` §F1 settles it: `03.43.43` /
> `04.47.13` (md5 `a4ea79cf`) match **nothing** in the May set. `ffprobe` gives **543.3 s vs
> 458.3 s at an identical 131 kbps** — not a re-encode, but **85 seconds of extra audio appended to
> the most important recording in the corpus** (the utilisation-certificate / audit-uniqueness /
> three-routes call). The tail is *not* silence: measured peaks reach **−5.4 dB and −9.1 dB** in the
> speech range, ~15-20 dB below the call — a phone held away, a speakerphone, or a second
> conversation. Whisper hallucinates on that exactly as on silence, so the begging-bowl / "Elizabeth
> Banks" output is evidence of **unresolvable, not empty**.
>
> **A transcript-only check cannot settle this.** Comparing the two transcripts and finding they
> diverge into hallucination proves the *transcription* failed; it says nothing about the *audio*.
> That mistake was made twice — once when this README was written, and again on 2026-08-15 by a
> session that "verified" the claim with a common-prefix diff and declared coverage complete.
> **Someone should play those 85 seconds.** RETF may be in them.

### (Superseded) Coverage is complete — everything in `D:\CSR` has been read

A set of `2026-06-27` transcripts sits unextracted inside `transcrip[t/transcripts_v2 (1).zip`.
They are **re-sends of the May audio**, not new material: `03.43.41`/`03.43.42` match the 05-22
pair by md5, and `03.43.43`/`04.47.13` are identical to each other and share their first **5,565
characters** with `2026-05-22_1927`. The extra ~1,060 bytes are Whisper hallucination — an advert
about begging bowls, then "Elizabeth Banks" lines — on trailing silence. Nothing copied.

> **Gotcha if you add recordings:** `transcribe_csr_v2.bat` globs `*.m4a *.aac *.mp3 *.mp4` in the
> CSR root only — no `/r`. Files in subfolders like `new_inputs/` are silently skipped. That is why
> the 06-27 batch was transcribed separately and its output never unpacked.

### `non-CSR/` — out of scope, confirmed by the owner (2026-08-15)

The folder holds four unique recordings (~41 MB) that are **not CSR material** and have
deliberately never been transcribed. Owner-confirmed; do not re-raise this as a coverage gap.

| File | Size | Transcript |
|---|---|---|
| `Voice 260323_163142.m4a` | 17.5 MB | none |
| `WhatsApp Audio 2026-05-16 at 8.01.44 PM.mp4` (+ `(1)` dup) | 8.7 MB | see note |
| `WhatsApp Audio 2026-05-16 at 8.01.55 PM.mp4` (+ `(1)` dup) | 15.2 MB | none |
| `WhatsApp Ptt 2026-06-22 at 12.37.01.mp4` | 288 KB | none |

*Note on 8.01.44:* `2026-05-16_2001_reports-dashboard-review.txt` carries that timestamp, but was
produced from the **root `.mp3`** (19.6 MB, md5 `15866752`) — the `non-CSR/.mp4` is 8.7 MB,
md5 `8b7844ad`. Same call, different file. Not re-transcribed.

**The full drive has been enumerated** (43 files, 9 directories, all four zips opened, md5-verified
2026-08-15). Every `.txt` in `D:\CSR` — across `transcripts/`, `transcripts (1)/`,
`transcripts_v2/` and all four zips — belongs to the same six recordings above.

That is a statement about **text**, not about **audio**. It does not mean everything has been heard:
see the correction above — 85 seconds at the tail of `a4ea79cf` remains untranscribed and unheard.

---

## Requirements traced to source

Marked `verified` where checked against code on 2026-08-13; `transcript only` where not.

### Built as asked

- **PAN belongs on vendor, not REP** — *"remove the PAN from the REP management,
  because we are giving the PAN in the vendor"* (03-06). No `pan` field on the REP
  model. `verified`
- **Payment tagging stays out of CSR staff's hands** — *"the payment will not be in
  the CSR. If we give it to the CSR person, he will say, tomorrow you show it, how
  will you change it?"* (05-22b). Implemented as a separate `csr_certificate` grant
  on `CSRExpenseTagViewSet`, distinct from the `csr` grant. `verified`
- **Three routes, one backend** — *"our app is TTA slash management operation, this
  will be TTA slash CSR, TTA slash client"* (05-22b). `verified`
- **Multi-month trainings** — *"if you want to give training to a child for six
  months"* (05-22b). Resolved via `start_date`/`end_date` on `CSRActivity`
  (migration `0004`), and `CSRReport.activity` is an FK so an activity takes many
  reports. This closes Q3 of `CSR_Module_Design_Review.docx`, which is still
  written as open. `verified`

### Asked for, not built

- **The partner tier.** *"In CSR there are many multiple partners... they want to
  give a view to it, but in that they don't want to show the contract"* (`csr-rec-2`),
  and *"can you bifurcate the CSR view?... he doesn't want to show the financials to
  everyone"* (`csr-rec-1`). Cross-referencing 05-22a — *"his work order will be put
  in it, there will be a contract"* — the thing to hide is the **work order and its
  contract attachment**, which is more specific than the planning docs record.

  No `CSR_PARTNER` in `ROLE_CHOICES`; `EXTERNAL_ROLES` holds only `CSR_CLIENT`;
  `ClientProjectSerializer` ships `sanctionedAmount` to every external viewer. So no
  financials-free project view exists at any tier. `verified`

  Correctly deferred rather than guessed — `CSR_ARCHITECTURE.md:149` and
  `CSR_COMPLETE_REFERENCE.md` §7 both flag it. **Blocked on identifying "RETF".**

### Decided by the source — not an open question

- **What counts as "utilised" on the Utilisation Certificate: `Payment Done` only.** Not a
  preference call — it follows from the material. The certificate is an at-close artefact
  (*"until that project is over, there is no need to give them certificates"*; design review §3:
  *"at project close, the Utilisation Certificate is generated from tagged expenses"*) evidencing
  actual spend against sanctioned money for a government audit (*"in one year, we have to show the
  expense against the money that has been given"*). A bounced payment is not an expense — the money
  came back. A draft never left. `Sent to Accounts` is a bank file, not a confirmed disbursement.
  **Implemented** in `csr/certificate_rules.py` — `counts_toward_certificate()`, read by both
  `csr/certificate.py` and the expense-tag serializer so the document and the operator's running
  total cannot diverge. A manual amount always counts: it is a typed figure with no PaymentRequest
  behind it, so there is no status to check. The certificate also **freezes** on the Active→Closed
  transition (`CSRProject.save()`, migration `csr/0006`), so a certificate the funder has already
  filed cannot silently change; reopening retains the snapshot and re-closing bumps its version.
  *(This line previously read "the code currently applies no status filter at all". That was true
  when written and stopped being true with the 2026-08-13 build. Verified in code 2026-08-16.)*

### Not addressed anywhere in the source

- **Funder off-boarding.** The documented lifecycle runs seven stages and stops at project close +
  certificate; `CSRProject.status` offers only `Active`/`Closed`. Nothing says what happens to the
  funder's login afterwards. Note a closed project should NOT auto-revoke — the funder still needs
  to pull their certificate and reports. Treat off-boarding as a separate deliberate act.

### Asked for, built wrong

- **TDS deposit deadline.** *"the amount you deduct between 1 to 30, you have to
  deposit within 1 to 7 days of the next month"* (03-06). So TDS deducted in month M
  is due on the 7th of M+1.

  `BankManagementPage.jsx:283` computes the due date from **today**, not from the
  month of each pending record:
  ```js
  const due = new Date(now.getFullYear(), now.getMonth() + 1, 7);
  ```
  On 13 Aug it renders "7 September" while July's TDS was due **7 August and is
  overdue**. The component builds `pendingMonths` two lines earlier and ignores it.
  Statutory deadline, ~5-line fix. Matches audit finding R8. `verified`

---

## The double-payment sighting

From `2026-05-16_2001`, reviewing the payment audit report live:

> "Vikram Gore has passed away twice in a day. It has been passed twice, it has gone
> quickly, it has gone correctly, but the amount is not the same."

Explained away in the moment as partial work — *"sometimes half the work is done,
half is not finished"* — which is plausible and may be correct.

But the duplicate-payment path is real in code, independently traced 2026-08-13:
`PaymentManagementPage.jsx:360` writes the bank file **before** the server is
consulted, and `PaymentBatchSerializer.create:377` filters on `id__in` with no
status and no `batch__isnull` guard. A same-day double payment for one vendor is
therefore both *observed in the data* and *reachable in the code* — two facts that
came from different sources months apart and were never connected.

**Unresolved.** The queries in `_docs/review/FINDINGS.md` §"Queries to run" settle
it in minutes; run them against Vikram Gore specifically.

---

## Unresolved terms

- **RETF** — appears once, in `csr-rec-2`, as "RETF partners". Blocks the partner model.
- The vendor name rendered "brush"/"Braj" in `2026-05-16`. Recoverable only from audio.

---

## Note on `SPEC.md`

`2026-03-06_0848_vendor-wo-payment-spec.txt` **is** the operational spec for the
money chain, in the client's own voice. Any SPEC.md for this project should be
drafted from it rather than from a generic task-tracker template — the object graph
here is Trial → Trial City → REP alongside Vendor → Work Order → Payment Request →
Payment Batch → TDS, which no off-the-shelf template fits.
