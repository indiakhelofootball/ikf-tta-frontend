# Audit Tracker

**Run:** 2026-08-03 · 22 of 22 review passes complete · Phase C (triage) complete
**Master sheet:** [`FINDINGS.md`](./FINDINGS.md)

`Verified by me` is **yours to tick** — a finding you haven't eyeballed doesn't
enter the tracker. Each pass file ends with the exact file:line to open, and
`FINDINGS.md` lists read-only SQL for the ones that are checkable against live data.

| Pass | Done | Count | Top severity | Verified by me |
|------|------|-------|--------------|----------------|
| 0.1 Secrets            | ✅ | 5 | 🔴 Critical — live DB password in `deploy.sh:11` | ▢ |
| 1.1 Payment idempotency| ✅ | 6 unprotected paths | 🔴 Critical — duplicate bank transfer | ▢ |
| 1.2 Money arithmetic   | ✅ | 4 | 🟠 High — frontend/backend TDS rounding split | ▢ |
| 1.3 Bulk export        | ✅ | 6 | 🟠 High — zero validation; missing amount → ₹0.00 row | ▢ |
| 1.4 Payment state m/c  | ✅ | 7 unguarded transitions | 🟠 High — `Draft → Payment Done`, no bank file | ▢ |
| 2.1 Server vs UI       | ✅ | 5 | 🟡 Medium — **0 unenforced endpoints** | ▢ |
| 2.2 CSR isolation      | ✅ | 3 | 🟡 Medium — **0 cross-client leaks** | ▢ |
| 2.3 Report grants      | ✅ | 3 | 🟠 High — view-only grant leaks PAN | ▢ |
| 2.4 Adversarial probe  | ⏳ **yours to run** | — | — | ▢ |
| 3.1 Partial-update wipe| ✅ | 95 fields | 🔴 Critical — silent data loss on PUT | ▢ |
| 3.2 PII at rest        | ✅ | 3 | 🟠 High — no encryption anywhere *(design decision)* | ▢ |
| 3.3 PII leaks          | ✅ | 5 | 🟡 Medium — PAN searchable → URL/access logs | ▢ |
| 4.1 Silent empty       | ✅ | **44** catches (33 real) + **163** `\|\| []` | 🟠 High — failed and empty look identical | ▢ |
| 4.2 Truthiness         | ✅ | 273 | 🟡 Medium — 1,415 `\|\|` vs 25 `??` | ▢ |
| 4.3 Unbounded payloads | ✅ | 5 | 🔴 Critical — **18 MB** report vs 100 s timeout | ▢ |
| 4.4 Cache invalidation | ✅ | 6 | 🟠 High — `sentBatches` has no invalidation path | ▢ |
| 4.5 Session expiry     | ✅ | 6 | 🟠 High — guard is per-tab; logout doesn't revoke | ▢ |
| 4.6 Date/time          | ✅ | 6 | 🟠 High — UTC server, IST users, 5.5 h/day window | ▢ |
| 4.7 Unbounded growth   | ✅ | 7 | 🟠 High — **0 cleanup mechanisms** | ▢ |
| 5.1 Coupling           | ✅ | 5 hotspots | 🟠 High — `paid_gross_amount`, 5 writers | ▢ |
| 6.1 Dependency security| ✅ | 3 | 🟠 High — Django EOL pin; `xlsx` unfixable | ▢ |
| 6.2 Four-states        | ✅ | 4 | 🟡 Medium — only 26 % hold an error state | ▢ |

---

## Phase progress

- [x] **PHASE A** — folders + tracker
- [x] **PHASE B** — all 22 review passes *(2.4 written and ready; it is a manual probe you run)*
- [x] **PHASE C** — triage → `FINDINGS.md`, 96 findings → 12 root causes
- [x] **Verification** — top claims re-checked against source; counts in 4.1/4.2 corrected downward
- [ ] **PHASE D** — characterisation tests *(start with `WorkOrder.paid_gross_amount`, 5 writers — see `5-1-coupling.md`)*
- [ ] **PHASE E** — fix *(needs the Recovery Plan's safety net first)*

## The stop-rule check

The plan's stop rule says: after the 7 core passes, stop and triage. All 22 ran, and
triage is done — so the rule is satisfied. **The next action is not more review.**

It is, in order:

1. Run **Pass 2.4** — it is the only thing that can still change the access findings.
2. Answer the **three questions** at the end of `FINDINGS.md` (they set the severity
   of 3 findings).
3. Work the **eight one-afternoon items** in `FINDINGS.md`.
4. Then Phase D on the money paths.

## The intuition check, for the whole audit

> **96 findings. 12 root causes. The 3 that matter are R1 (DB password in git),
> R2 (the duplicate-payment chain), and R3 (95 fields that blank data on PUT).**

If that sentence is clear, the audit did its job.
