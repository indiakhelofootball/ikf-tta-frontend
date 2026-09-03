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

export default function CSRExpenseTagFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('project') ? Number(searchParams.get('project')) : null;

  const [manualAmount, setManualAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setManualAmount('');
    setNote('');
    setError('');
    setSaveError('');
  }, [projectId]);

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
        paymentId: null, manualAmount, note: note.trim(), projectId,
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
