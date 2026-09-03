// CSR project form — a PAGE, not a dialog. The previous surface was an MUI
// <Dialog>, the last thing in this module still rendering outside .csrx, which
// is why it arrived unstyled: none of the design tokens live outside that
// scope. A grant is also the largest record the module holds, and a record you
// have to scroll inside a 600px box is a record nobody checks before saving.
//
// Fields, validation and payload shape are carried over unchanged from
// CSRProjectModal; the comments that explain WHY a field behaves as it does
// come with them.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { csrAPI } from '../../services/api';
import { getProjectNames } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';
import '../../styles/csrDesign.css';

const STATUS_OPTIONS = ['Active', 'Closed'];

const EMPTY = {
  name: '', clientName: '', sanctionedAmount: '',
  startDate: '', endDate: '', status: 'Active', description: '',
  projectRefId: '', season: '',
};

// The five fields the completion bar tracks. Three of them are what the form
// actually refuses to save without; start and end date are tracked because a
// grant with no term is the single most common thing that comes back from the
// funder for correction — counting them puts that omission on screen while the
// form is still open, without hardening into a validation rule the office
// cannot get past when a date genuinely is not agreed yet.
const filled = (f) => ({
  name: f.name.trim() !== '',
  clientName: f.clientName.trim() !== '',
  sanctionedAmount: f.sanctionedAmount !== '' && !Number.isNaN(Number(f.sanctionedAmount)),
  startDate: f.startDate !== '',
  endDate: f.endDate !== '',
});
const TRACKED_COUNT = 5;

export default function CSRProjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // The record is loaded here rather than handed down, so the edit route is
  // reachable directly — a bookmark, a refresh, a link in a mail. A form that
  // rendered empty because nothing passed it a project would silently POST a
  // duplicate grant on save, so a failed load is a dead end on purpose.
  useEffect(() => {
    if (!isEdit) {
      setProject(null);
      setForm(EMPTY);
      setErrors({});
      setLoading(false);
      setLoadFailed(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    csrAPI.projects.getById(id)
      .then((data) => {
        if (cancelled) return;
        setProject(data);
        setForm({
          name: data.name || '',
          clientName: data.clientName || '',
          sanctionedAmount: data.sanctionedAmount ?? '',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          status: data.status || 'Active',
          description: data.description || '',
          projectRefId: data.projectRefId ?? '',
          season: data.season || '',
        });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  // Sync getter + version subscription, the documented way admin-managed
  // dropdowns are consumed. Seeded rows carry synthetic string ids that are not
  // ConfigOption primary keys, so they are filtered out — offering one would
  // post a value the backend must reject.
  const cfgVersion = useConfigVersion();
  const ttaProjects = useMemo(
    () => getProjectNames().filter((p) => typeof p.id === 'number'),
    [cfgVersion],
  );

  const setField = (k) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [k]: value }));
  };

  const progress = filled(form);
  const done = Object.values(progress).filter(Boolean).length;
  const pct = Math.round((done / TRACKED_COUNT) * 100);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Required';
    if (!form.clientName.trim()) next.clientName = 'Required';
    if (form.sanctionedAmount === '' || Number.isNaN(Number(form.sanctionedAmount))) {
      next.sanctionedAmount = 'Enter an amount';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // The confirmation toast lives on the list page as local state, so it cannot
  // be raised from here — the save now happens on a different route than the
  // one that reports it. Handing the message through navigation state keeps the
  // old behaviour: before this, a silent redirect was the only signal a save
  // had worked at all.
  const leave = useCallback(
    (saved) => navigate('/csr/projects', saved ? { state: { saved } } : undefined),
    [navigate],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      clientName: form.clientName.trim(),
      sanctionedAmount: form.sanctionedAmount,
      status: form.status,
      description: form.description.trim(),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      projectRefId: form.projectRefId === '' ? null : Number(form.projectRefId),
      // Still SENT, never asked. 26 Aug, 04:35: «तुमको season पूछने की जरूरत ही
      // नहीं रह जाएगा। वो trial तो किसी season का ही आएगा» — you won't need to
      // ask for season at all, the trial carries one anyway. The form stopped
      // asking; the value is carried through untouched so that saving a grant
      // recorded before today does not blank the column, and so the identity
      // pair the model documents (project + season) survives an edit.
      season: form.season,
    };
    setSaving(true);
    setSaveError('');
    try {
      if (isEdit) await csrAPI.projects.update(id, payload);
      else await csrAPI.projects.create(payload);
      leave(isEdit ? 'Project updated.' : 'Project created.');
    } catch (err) {
      // Stay on the page. Navigating away on a failed save is how typed work
      // gets thrown out — the grant is gone and the person has nothing to retry.
      setSaveError(err?.message || 'Could not save this grant. Please try again.');
      setSaving(false);
    }
  };

  // A saved reference whose catalog row has not arrived yet (or is no longer
  // offered) still has to render as itself. Falling back to the server's
  // read-only ttaProjectName keeps editing an unrelated field from silently
  // clearing the identity.
  const selectedTTAProject = form.projectRefId === '' ? null
    : ttaProjects.find((p) => p.id === Number(form.projectRefId))
      || { id: Number(form.projectRefId), name: project?.ttaProjectName || `#${form.projectRefId}` };
  // The native <select> can only offer what it lists, so an orphaned reference
  // is appended as its own option rather than left to fall through to the empty
  // value — which is exactly the silent clearing the fallback exists to stop.
  const options = selectedTTAProject && !ttaProjects.some((p) => p.id === selectedTTAProject.id)
    ? [...ttaProjects, selectedTTAProject]
    : ttaProjects;

  if (loading) {
    return (
      <div className="csrx csrx-page">
        <p className="pform-state">Loading grant…</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>Grant not found</h2>
          <p>
            No CSR project could be loaded for reference {id}. It may have been
            deleted, or you may not have access to it.
          </p>
          <button type="button" className="ghostbtn" onClick={() => leave()}>
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="csrx csrx-page">
      <header className="pform-head">
        <button type="button" className="pform-back" onClick={() => leave()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          CSR Projects
        </button>
        <h2>{isEdit ? 'Edit CSR Project' : 'New CSR Project'}</h2>
        {isEdit && project?.name ? <p className="pform-sub">{project.name}</p> : null}
      </header>

      {/* Driven by the field state itself, not by a step counter or a timer:
          the bar is only worth anything if it answers "what is still missing"
          truthfully at every keystroke. */}
      <section className="pform-prog" aria-label="Required fields completed">
        <div className="pform-prog-row">
          <span className="pform-prog-label">{`${done} of ${TRACKED_COUNT} complete`}</span>
          <span className="pform-prog-pc fig">{`${pct}%`}</span>
        </div>
        <div
          className="pform-prog-track"
          role="progressbar"
          aria-label="Required fields completed"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={TRACKED_COUNT}
          aria-valuetext={`${done} of ${TRACKED_COUNT} fields complete`}
        >
          {/* The width is a class, not a style attribute: there are exactly six
              states, and a step class keeps the rule that nothing in this
              module sets geometry from JSX. */}
          <div className={`pform-prog-fill s${done}`} />
        </div>
      </section>

      <form className="pform" onSubmit={handleSubmit} noValidate>
        <fieldset className="pform-sec pform-sec--grant">
          <legend className="pform-legend">The grant</legend>

          <div className="pform-field">
            <label htmlFor="csr-name">Project Name</label>
            <input
              id="csr-name"
              type="text"
              value={form.name}
              onChange={setField('name')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby="csr-name-help"
            />
            <p id="csr-name-help" className={`pform-help${errors.name ? ' bad' : ''}`}>
              {errors.name || "This grant's own label, e.g. Khelo Girls Initiative — Chhattisgarh."}
            </p>
          </div>

          <div className="pform-row">
            <div className="pform-field">
            <label htmlFor="csr-client">Client / Funder</label>
            <input
              id="csr-client"
              type="text"
              value={form.clientName}
              onChange={setField('clientName')}
              aria-invalid={Boolean(errors.clientName)}
              aria-describedby={errors.clientName ? 'csr-client-help' : undefined}
            />
            {errors.clientName ? (
              <p id="csr-client-help" className="pform-help bad">{errors.clientName}</p>
            ) : null}
          </div>

          <div className="pform-field">
            <label htmlFor="csr-amount">Sanctioned Amount (₹)</label>
            <input
              id="csr-amount"
              type="number"
              value={form.sanctionedAmount}
              onChange={setField('sanctionedAmount')}
              aria-invalid={Boolean(errors.sanctionedAmount)}
              aria-describedby={errors.sanctionedAmount ? 'csr-amount-help' : undefined}
            />
            {errors.sanctionedAmount ? (
              <p id="csr-amount-help" className="pform-help bad">{errors.sanctionedAmount}</p>
            ) : null}
          </div>
          </div>
        </fieldset>

        <fieldset className="pform-sec pform-sec--dates">
          <legend className="pform-legend">Dates &amp; status</legend>

          {/* Two dates, and only ever two. A grant has a term; anything else a
              date could describe here belongs to a report or an activity. */}
          <div className="pform-row pform-row3">
            <div className="pform-field">
              <label htmlFor="csr-start">Start Date</label>
              <input id="csr-start" type="date" value={form.startDate} onChange={setField('startDate')} />
            </div>
            <div className="pform-field">
              <label htmlFor="csr-end">End Date</label>
              <input id="csr-end" type="date" value={form.endDate} onChange={setField('endDate')} />
            </div>
            <div className="pform-field">
              <label htmlFor="csr-status">Status</label>
              <select id="csr-status" className="sel" value={form.status} onChange={setField('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="pform-sec pform-sec--detail">
          <legend className="pform-legend">Detail</legend>

          <div className="pform-row">
        <div className="pform-field">
          <label htmlFor="csr-desc">Description</label>
          <textarea id="csr-desc" rows={4} value={form.description} onChange={setField('description')} />
        </div>

        <div className="pform-field">
          <label htmlFor="csr-tta">TTA Project (optional)</label>
          <select
            id="csr-tta"
            className="sel"
            value={form.projectRefId === '' ? '' : String(form.projectRefId)}
            onChange={(e) => setForm((f) => ({ ...f, projectRefId: e.target.value }))}
            aria-describedby="csr-tta-help"
          >
            <option value="">None</option>
            {options.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
          {/* Not "Runs Under" — the 26 Aug review (03:27-04:17) called out
              exactly this phrasing on the CSR project screen: a grant does not
              run under a trial catalogue entry, the relationship reads
              backwards. This is a link to the catalogue row, not a container. */}
          <p id="csr-tta-help" className="pform-help">Which existing TTA project this grant funds.</p>
        </div>
          </div>
        </fieldset>

        {saveError ? (
          <p className="pform-error" role="alert">{saveError}</p>
        ) : null}

        <div className="pform-actions">
          <button type="button" className="ghostbtn" onClick={() => leave()} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="newbtn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
