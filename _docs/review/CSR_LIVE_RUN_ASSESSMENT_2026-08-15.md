# Assessment of the 2026-08-14/15 live-run session

Review of the session that enumerated `D:\CSR`, ran the app locally as non-admin users, and wrote
`CSR_SHELL_PLAN_2026-08-14.md` §9a. Every claim below was re-verified against source in this
session; nothing is accepted on report alone.

---

## 1. The three new findings — all hold

**Blank dashboard for a `csr`-grant user — confirmed structurally, not just visually.**
`DashboardHome.jsx:84-95` builds stat cards by filtering `canView(stat.module)` over
trials / reps / vendors / workorders / payments — **no `csr` entry**. The quick-actions block
(`:218`) is gated on the same four modules. The reports block (`:317`) needs a `REPORT_KEYS` grant.
So a `csr`-only user renders the welcome banner and the role chip and **nothing else**, on every
login. This is stronger evidence than the screenshot: it is not a data-loading accident, it is that
the dashboard has no concept of the CSR module.

**`pageTitles` gap — confirmed, and materially wider than reported.**
`DashboardLayout.jsx` maps eight paths and falls back to `"Dashboard"`. Missing are not just the
five `/csr*` routes but also `/vendors`, `/work-orders`, `/bank-tds`, `/reports`, `/courier`,
`/user-management`, `/admin`, `/request-access` — **twelve-plus routes**, each rendering an `<h1>`
and breadcrumb reading "Dashboard". Filing this as "the CSR gap in §2, worth fixing in the same
pass" would fix CSR and leave the rest broken. It is a stale global map, not a CSR omission.

**Role chip reading "REP" — mechanism confirmed, but classification is wrong.**
`DashboardHome.jsx:108` renders `label={user?.role}` raw, and `User.role` defaults to `'REP'`
(`accounts/models.py:60`). So the chip is truthful — the account genuinely *was* a REP. This is a
property of how the throwaway test account was created, not necessarily a product defect. It
becomes a real finding only if User Management lets an admin create a CSR operator without forcing
a role choice. **That check was not done and should be, before it enters any plan as a defect.**

## 2. The correction it made to my report is right — with one qualification

*"Two CSRs is an ADMIN-only symptom"* is correct: `Sidebar.jsx:122` gates `CSR Clients` on
`isAdminOrSuper`, so a plain `csr` operator sees exactly one item. My D5 framing — that a
sub-function reads as a peer *to operators* — was wrong, and being corrected by someone who
actually logged in is the right way for that to happen.

The qualification: the observation is not retired. The owner is admin, saw it, and asked about it.
What changes is the **rationale** (it does not confuse operators) and therefore the **priority**
(lower), not the existence of the issue.

## 3. What that session missed — and it is the best finding in this thread

**A committed Playwright suite already exists.** Commit `7dc1340` added `e2e/csr/` — 526 lines:
`tests/csr-operator.spec.js` (10 scenarios, 180 lines), `tests/client-portal.spec.js` (6
scenarios), `playwright.config.js`, `scripts/bootstrap.sh`, `PLAN.md`, `README.md`. The session
wrote throwaway Playwright scripts into `%TEMP%\claude\…` instead. The durable home for exactly
that work was already in the repo.

**And reading that suite produces the finding that explains everything else.**

`csr-operator.spec.js` declares its actor on line 2:

```
// Actor: csr.admin@example.com / Demo-Pass-2026 (role ADMIN, grants csr + csr_certificate).
```

`ADMIN` does **not** bypass `ModulePermission` — only `SUPER_ADMIN` does
(`permissions/enforcement.py:68-69`). That actor therefore has no read on `payments`. Now S8:

```js
test('S8 — tag a manual expense (XOR: amount only)', async ({ page }) => {
  ...
  // Modal defaults to "Link a payment"; switch to manual so the Amount field renders.
  await dialog.getByRole('button', { name: /manual amount/i }).click();
```

**E2 was met during E2E authoring, worked around, and recorded as a rendering quirk.** The payment
picker was empty for that actor; the author switched to manual mode and wrote a comment explaining
the click as a UI detail rather than asking why the picker was unusable.

The consequence compounds one test later. S9 — *"generate the Utilisation Certificate (server-summed
total)"* — then sums a single manual figure. So across **51 unit tests and 17 E2E scenarios, not
one test ever links a real `PaymentRequest`.**

The entire payment-linked path — the core of the money rule, of INV-AUDIT, and of finding D1 — has
zero coverage at every level. That is why a duplicate tag returning HTTP 500 has survived two test
suites and a 22-pass audit.

## 4. Other gaps in the run

- **The #1-ranked finding was never tested, with a live stack running.** One `POST` of an
  already-tagged payment to a second project would have confirmed the 500. E1 and E2 were
  confirmed; D1/E3 was not.
- **SQLite over-reports safety on the XOR rule.** SQLite enforces `CheckConstraint`; production
  MariaDB 10.1.x parses and ignores it (`CSR_ARCHITECTURE.md:191-196`). Anything verified locally
  about the payment-XOR-manual rule proves nothing about production. The `OneToOne` unique index
  holds on both, so D1's 500 *would* reproduce locally — which makes not testing it a larger miss.
- **`CSR_CLIENT` was never exercised.** The external boundary — the riskiest surface, the reason
  G1/G2/G3 exist — still has no use-based evidence, despite `client-portal.spec.js` already
  covering F1–F6 including the no-financial-data assertion.
- **D3 untested.** Publish a report with a blank `fileUrl` and look at the funder's Reports tab. Two
  minutes, and it either confirms or kills a finding.
- **The evidence self-deletes.** Screenshots and scripts live in a session-scoped temp directory.

## 5. Where the session's judgement was right

The ordering call — *"fixing navigation before the operator can complete their task is the wrong
order"* — is correct and matches this report's ranking (E2 at #2, navigation at #8). And the
observation that the empty dashboard is a better argument for the shell than the duplicate sidebar
entry is one that could only have been earned by using the product. That is exactly the value a
live run was supposed to add, and it delivered it.

## 6. Next actions, in order

1. **Run `e2e/csr` as it stands.** It has not been run in this thread; it may already be failing.
2. **Write the INV-AUDIT test the architecture doc specified** — tag a real `PaymentRequest` to
   project A, attempt project B, assert a 400 with a readable message. It does not pass today.
3. **Decide the `csr_certificate` → `payments` read dependency**, then delete the S8 workaround
   comment and let the test use the payment path it was always meant to use.
4. **Move the scratchpad Playwright scripts into `e2e/csr/tests/`** before the temp directory
   clears.
5. **Check whether User Management forces a role on account creation** before the "REP chip" enters
   any plan as a defect.
