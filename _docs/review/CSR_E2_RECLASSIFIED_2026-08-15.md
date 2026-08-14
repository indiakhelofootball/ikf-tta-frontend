# E2 reclassified — the tagging affordance is on the wrong side of the wall

**Supersedes** the E2 entry in `CSR_INTENT_VS_BUILD_2026-08-13.md` §4 and its #2 ranking in §7, and
the E2 line in `CSR_LIVE_RUN_ASSESSMENT_2026-08-15.md` §3. Raised by the owner 2026-08-15:
*"payments happen in tta app… but some csr manager will need to see it."* Correct, and it inverts
the finding.

---

## 1. What E2 said

> A user granted `csr` + `csr_certificate` and nothing else — exactly the person the
> separation-of-duties design creates — gets a 403 on `payment-requests/`, which the `.catch` turns
> into an empty array… **As currently granted, the certificate role is unusable; as made usable, it
> is no longer separated.**

Proposed fix, in both documents: give `csr_certificate` a read-dependency on `payments`, or accept
that the role needs a payments grant.

**That fix would have built the wrong thing.** It takes the presence of a payment picker inside CSR
as correct and treats the missing permission as the defect. The source says the opposite.

## 2. What the source specifies

`_docs/requirements/transcripts/2026-05-22_1927_csr-utilisation-and-audit-rule.txt`:

> *"vendor payment will not be here, vendor payment will be normal"*
>
> *"You don't have to show the payment here. Here, you just have to show that you are giving
> Rs. 10 lakhs… We will put it in manually."*
>
> *"the payment will be made there itself… **We will show it in finance, not in CSR.**"*
>
> *"**If you tag him from there**, he will not come to another place."*
>
> *"But it will not be in the section of the CSR. If we give it to the CSR person, he will say,
> tomorrow you show it, how will you change it? So, the payment will not be in the CSR. **Even if we
> make a screen there, the person will just type whatever is there in the [utilisation]
> certificate.**"*

The division of labour:

| Actor | Responsibility |
|---|---|
| TTA finance | executes payments **and tags them to a CSR project** — *"tag him from there"*, *"we will control the payment according to ourselves and tag it"* |
| CSR manager | sees the project and its utilisation; where a CSR screen exists, **types a manual amount** |
| Certificate | sums what finance tagged |

The `csr_certificate` grant was named correctly — it is the **finance-side** tagger's grant. It was
mounted on the wrong screen.

## 3. What was built — verified 2026-08-15

| Claim | Evidence |
|---|---|
| Tagging exists **only** inside CSR | `grep -rln "csr\|CSR" src/components/payments/ src/components/bank/ src/components/workorders/` → **zero hits**. Only `src/components/csr/CSRExpenseTagModal.jsx` |
| CSR manager cannot see utilisation | `CSRExpenseTagViewSet.permission_module = 'csr_certificate'` (`csr/views.py:156`) gates **every verb including GET** |
| …nor in the UI | `CSRProjectDetailPage.jsx:31` — `canViewCert = canView('csr_certificate')` hides the tab |
| …and no read-through rescues it | `MODULE_DEPENDENCIES` (`permissions/registry.py:96-102`) has no `csr` / `csr_certificate` entry |

So a `csr`-only manager sees no Utilisation tab and receives a 403 from the endpoint. **The one thing
the client asked for — that the CSR side can see the spend — is the thing absent.**

## 4. The reclassification

**E2 is not "the certificate operator cannot tag."** A CSR-side actor seeing a payment picker is
itself the deviation; the empty picker is *closer* to intent than a working one. E2 splits into
three findings:

### E2a — No finance-side tagging affordance exists *(missing feature, not a permission bug)*
The actor the client designated as the tagger has no UI anywhere in payments, banking or work
orders. Everything downstream — the certificate, INV-AUDIT, the utilisation total — depends on an
action no screen offers to the person meant to perform it.

### E2b — The CSR manager has no read on utilisation *(missing grant)*
`csr` should carry READ on expense tags. This is the **opposite** of the previously proposed fix:
not `csr_certificate → payments`, but `csr → read own tags`. Nothing about it grants sight of the
payments ledger.

### E2c — The swallowed 403 *(real, independent of the above)*
`CSRExpenseTagModal.jsx:25-27` turns any failure into `setPayments([])`. Whoever ends up using that
screen, a permission failure must not render as an empty dropdown. Catalogued in
`4-1-silent-empty.md:91`.

**Note on the E2E suite.** `csr-operator.spec.js:149-150` — *"Modal defaults to 'Link a payment';
switch to manual so the Amount field renders"* — accidentally exercised the **correct** path for a
CSR-side actor. Right behaviour, wrong reason, recorded as a rendering quirk.

## 5. Consequence for the architecture

The read-port proposed on 2026-08-15 (CSR reads TTA payments) had the arrow backwards. Corrected:

- **Write:** a *"Tag to CSR project"* action on the payments screen, POSTing to
  `/api/csr/expense-tags/`. The **frontend** crosses the boundary; the backend dependency stays
  one-way, so `InvDepTest.test_core_apps_do_not_import_csr` is untouched. No TTA→CSR import ever.
- **Grants:** `csr_certificate` sits with finance (who tag). `csr` gets read on tags (to see).
- **Snapshot on tag:** finance writes vendor / amount / status into CSR's own row, so CSR never
  reads TTA payment tables — which retires the `csr_certificate → payments` dependency question
  entirely rather than deciding it, and starts dissolving the cross-boundary FKs.

## 6. Ranking change

E2 sat at **#2**, described as a permission problem with a permission fix. Corrected:

- **E2a** stays high — it is a missing feature blocking the product's core deliverable, and it is
  larger than a grant edit.
- **E2b** is small and should ship first; it is a one-line registry change and it delivers exactly
  what the owner asked for.
- **E2c** is small and independent.

D1/E3 — the audit rule returning a 500 — is unaffected and remains #1.

## 7. Open

Whether a CSR-side manual-amount entry should remain at all. The source permits it (*"even if we
make a screen there, the person will just type"*) but the link mode on that same modal is what
should not be there. Decide: remove link mode from the CSR modal, or default it to manual.
