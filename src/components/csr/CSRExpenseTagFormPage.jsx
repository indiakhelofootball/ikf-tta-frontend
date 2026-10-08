// CSR expense-tag form — a PAGE, not a dialog. Follows the pattern set by
// CSRProjectFormPage (5666ded) and the other form pages that replaced modals.
//
// Create only. CSRProjectDetailPage carries a comment (near its expense-tag
// list) that no edit view exists for a tag because the server keeps them
// audit-bound and write-once — the modal this replaces never loaded an
// existing tag either, only ever rendered blank and posted a new one. There is
// no :id route here for the same reason.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { csrAPI } from '../../services/api';
import '../../styles/csrDesign.css';

/** Today as `YYYY-MM-DD` in the operator's own timezone — `toISOString()` would
 *  hand back UTC and shift the date by a day for anyone east of Greenwich. */
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whether `value` sits inside the grant's stated period. Either bound may be
 *  absent, which means unbounded on that side — the same rule the server
 *  applies in certificate_rules.within_certificate_period. */
function outsideGrantPeriod(value, grant) {
  if (!value || !grant) return false;
  const { startDate, endDate } = grant;
  if (startDate && value < startDate) return true;
  if (endDate && value > endDate) return true;
  return false;
}

export default function CSRExpenseTagFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('project') ? Number(searchParams.get('project')) : null;

  const [manualAmount, setManualAmount] = useState('');
  // WHEN the money was spent — not when this row is being typed. The
  // certificate files the expense under this date and compares it against the
  // grant's own period, so a tag entered months after the fact, or against a
  // grant that ran last year, lands where it belongs instead of dropping off
  // the document. Defaulted to today so the common case is unchanged; never
  // left blank, because blank falls back to the typing date and that is the
  // behaviour being corrected.
  const [expenseDate, setExpenseDate] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  // The grant's own period. Owner, 8 Oct 2026: "do not let them take past
  // dates" — a typed expense dated outside its grant is refused, here before
  // the save and by the server on it.
  const [project, setProject] = useState(null);

  useEffect(() => {
    setManualAmount('');
    setExpenseDate(today());
    setNote('');
    setError('');
    setDateError('');
    setSaveError('');
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setProject(null); return undefined; }
    let cancelled = false;
    csrAPI.projects.getById(projectId)
      .then((data) => { if (!cancelled) setProject(data); })
      .catch(() => { if (!cancelled) setProject(null); });
    return () => { cancelled = true; };
  }, [projectId]);

  const outside = outsideGrantPeriod(expenseDate, project);
  const grantPeriod = project
    ? `${project.startDate || 'open'} to ${project.endDate || 'open'}`
    : '';
  const periodError = outside
    ? `The expense date must fall within the grant period (${grantPeriod}).`
    : '';

  const leave = useCallback(
    (saved) => {
      if (!projectId) { navigate('/csr/projects'); return; }
      navigate(`/csr/${projectId}`, saved ? { state: { saved } } : undefined);
    },
    [navigate, projectId],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (manualAmount === '' || Number.isNaN(Number(manualAmount))) {
      setError('Enter an amount');
      return;
    }
    if (!expenseDate) {
      setDateError('Enter the date this expense was incurred');
      return;
    }
    if (outside) return;
    setSaving(true);
    setSaveError('');
    try {
      // paymentId stays null from this surface by construction, not by choice
      // of mode. This screen used to offer a "Link a payment" toggle that
      // fetched the whole payment ledger; it is gone, not just defaulted off —
      // reading the ledger from CSR was itself the leak the client's split
      // exists to prevent. Tagging a real payment is a FINANCE action, done
      // from the payment itself via "Tag to CSR".
      await csrAPI.expenseTags.create({
        paymentId: null, manualAmount, expenseDate, note: note.trim(), projectId,
      });
      leave('Expense tagged.');
    } catch (err) {
      // Stay on the page. Navigating away on a failed save is how typed work
      // gets thrown out — the figure is gone and the person has nothing to
      // retry.
      setSaveError(err?.message || 'Could not tag this expense. Please try again.');
      setSaving(false);
    }
  };

  if (!projectId) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>No grant selected</h2>
          <p>An expense tag has to belong to a grant. Open it from the grant's Utilisation tab.</p>
          <button type="button" className="ghostbtn" onClick={() => navigate('/csr/projects')}>
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="csrx csrx-page">
      <nav className="pform-crumb" aria-label="Breadcrumb">
        <button type="button" className="pform-back" onClick={() => leave()}>Grant</button>
        <span aria-hidden="true">/</span>
        <span className="pform-crumb-now">Tag an Expense</span>
      </nav>

      <form className="pform" onSubmit={handleSubmit} noValidate>
        <section className="pform-sec pform-sec--grant">
          <h2 className="pform-legend">Tag an expense</h2>
          <p className="pform-sub">
            This records a typed figure. To tag an actual payment, open the payment and use{' '}
            <strong>Tag to CSR</strong> — that is done by the finance team, from the payment itself.
          </p>

          <div className="pform-field">
            <label htmlFor="x-amount">Amount (₹) <span className="pform-req" aria-hidden="true">*</span></label>
            <div className={`pform-input${manualAmount !== '' && !Number.isNaN(Number(manualAmount)) ? ' ok' : ''}`}>
              <input
                id="x-amount" type="number" value={manualAmount}
                onChange={(e) => { setManualAmount(e.target.value); setError(''); }}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'x-amount-help' : undefined}
              />
            </div>
            {error ? <p id="x-amount-help" className="pform-help bad">{error}</p> : null}
          </div>

          <div className="pform-field">
            <label htmlFor="x-date">Expense Date <span className="pform-req" aria-hidden="true">*</span></label>
            <div className={`pform-input${expenseDate && !outside ? ' ok' : ''}`}>
              <input
                id="x-date" type="date" value={expenseDate}
                onChange={(e) => { setExpenseDate(e.target.value); setDateError(''); }}
                aria-invalid={Boolean(dateError || periodError)} aria-describedby="x-date-help"
              />
            </div>
            <p id="x-date-help" className={`pform-help${dateError || periodError ? ' bad' : ''}`}>
              {dateError || periodError
                || 'When the money was spent. The certificate files it under this date.'}
            </p>
          </div>

          <div className="pform-field">
            <label htmlFor="x-note">Note (optional)</label>
            <input id="x-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>

        {saveError ? <p className="pform-error" role="alert">{saveError}</p> : null}

        <div className="pform-actions">
          <button type="button" className="ghostbtn" onClick={() => leave()} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="newbtn" disabled={saving}>
            {saving ? 'Saving…' : 'Tag'}
          </button>
        </div>
      </form>
    </div>
  );
}
