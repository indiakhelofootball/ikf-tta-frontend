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

  // The four passes a grant is entered in. Each names what it is for, and the
  // rail reports back what actually landed in it -- a step reading
  // "Rs 12,00,000 - Bharat Forge" beats a tick, because it lets someone confirm
  // the figure without scrolling back up to the field it came from.
  const money = form.sanctionedAmount === '' || Number.isNaN(Number(form.sanctionedAmount))
    ? '' : `\u20b9${Number(form.sanctionedAmount).toLocaleString('en-IN')}`;
  const steps = [
    {
      n: 1, label: 'Project details', hint: 'Name & description',
      done: progress.name, summary: form.name.trim(),
    },
    {
      n: 2, label: 'Funder & grant', hint: 'Who pays, and how much',
      done: progress.clientName && progress.sanctionedAmount,
      summary: [money, form.clientName.trim()].filter(Boolean).join(' \u00b7 '),
    },
    {
      n: 3, label: 'Term & status', hint: 'When it runs',
      done: progress.startDate && progress.endDate,
      summary: form.startDate && form.endDate ? `${form.startDate} \u2192 ${form.endDate}` : '',
    },
    {
      n: 4, label: 'TTA link', hint: 'Optional',
      done: form.projectRefId !== '',
      summary: selectedTTAProject ? selectedTTAProject.name : '',
    },
  ];
  // The ring is drawn from the same count the steps read, so the number and the
  // ticks can never disagree. 2*pi*r, r=26.
  const RING = 163.4;

  return (
    <div className="csrx csrx-page">
      <nav className="pform-crumb" aria-label="Breadcrumb">
        <button type="button" className="pform-back" onClick={() => leave()}>Projects</button>
        <span aria-hidden="true">/</span>
        <span className="pform-crumb-now">{isEdit ? 'Edit Project' : 'New Project'}</span>
      </nav>

      <div className="pform-shell">
        <form className="pform" onSubmit={handleSubmit} noValidate>

          <section className="pform-sec pform-sec--grant">
            <h2 className="pform-legend">Project details</h2>
            <p className="pform-sub">Name the initiative and describe what it sets out to do.</p>

            <div className="pform-field">
              <label htmlFor="csr-name">Project name <span className="pform-req" aria-hidden="true">*</span></label>
              <div className={`pform-input${progress.name ? ' ok' : ''}`}>
                <input
                  id="csr-name" type="text" value={form.name} onChange={setField('name')}
                  aria-invalid={Boolean(errors.name)} aria-describedby="csr-name-help"
                />
              </div>
              <p id="csr-name-help" className={`pform-help${errors.name ? ' bad' : ''}`}>
                {errors.name || 'Appears on the project card and every funder report.'}
              </p>
            </div>

            <div className="pform-field">
              <label htmlFor="csr-desc">Description</label>
              <textarea
                id="csr-desc" rows={4} value={form.description} onChange={setField('description')}
                placeholder="What the initiative does, where, and for whom."
              />
            </div>
          </section>

          <section className="pform-sec pform-sec--funder">
            <h2 className="pform-legend">Funder &amp; grant</h2>
            <p className="pform-sub">Who is funding this, and how much is sanctioned.</p>

            <div className="pform-row">
              <div className="pform-field">
                <label htmlFor="csr-client">Client / Funder <span className="pform-req" aria-hidden="true">*</span></label>
                <div className={`pform-input${progress.clientName ? ' ok' : ''}`}>
                  <input
                    id="csr-client" type="text" value={form.clientName} onChange={setField('clientName')}
                    aria-invalid={Boolean(errors.clientName)}
                    aria-describedby={errors.clientName ? 'csr-client-help' : undefined}
                  />
                </div>
                {errors.clientName ? (
                  <p id="csr-client-help" className="pform-help bad">{errors.clientName}</p>
                ) : null}
              </div>

              <div className="pform-field">
                <label htmlFor="csr-amount">Sanctioned amount (₹) <span className="pform-req" aria-hidden="true">*</span></label>
                <div className={`pform-input${progress.sanctionedAmount ? ' ok' : ''}`}>
                  <input
                    id="csr-amount" type="number" value={form.sanctionedAmount}
                    onChange={setField('sanctionedAmount')}
                    aria-invalid={Boolean(errors.sanctionedAmount)}
                    aria-describedby={errors.sanctionedAmount ? 'csr-amount-help' : undefined}
                  />
                </div>
                {errors.sanctionedAmount ? (
                  <p id="csr-amount-help" className="pform-help bad">{errors.sanctionedAmount}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="pform-sec pform-sec--dates">
            <h2 className="pform-legend">Term &amp; status</h2>
            <p className="pform-sub">The period the grant covers, and where it stands today.</p>

            {/* Two dates, and only ever two. A grant has a term; anything else a
                date could describe here belongs to a report or an activity. */}
            <div className="pform-row pform-row3">
              <div className="pform-field">
                <label htmlFor="csr-start">Start date</label>
                <div className={`pform-input${progress.startDate ? ' ok' : ''}`}>
                  <input id="csr-start" type="date" value={form.startDate} onChange={setField('startDate')} />
                </div>
              </div>
              <div className="pform-field">
                <label htmlFor="csr-end">End date</label>
                <div className={`pform-input${progress.endDate ? ' ok' : ''}`}>
                  <input id="csr-end" type="date" value={form.endDate} onChange={setField('endDate')} />
                </div>
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
          </section>

          <section className="pform-sec pform-sec--detail">
            <h2 className="pform-legend">TTA link</h2>
            <p className="pform-sub">Optional. Connects this grant to an existing TTA project.</p>

            <div className="pform-field">
              <label htmlFor="csr-tta">TTA project</label>
              <select
                id="csr-tta" className="sel"
                value={form.projectRefId === '' ? '' : String(form.projectRefId)}
                onChange={(e) => setForm((f) => ({ ...f, projectRefId: e.target.value }))}
                aria-describedby="csr-tta-help"
              >
                <option value="">None</option>
                {options.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              {/* Not "Runs Under" -- the 26 Aug review (03:27-04:17) called out
                  exactly this phrasing on the CSR project screen: a grant does
                  not run under a trial catalogue entry, the relationship reads
                  backwards. This is a link to the catalogue row, not a container. */}
              <p id="csr-tta-help" className="pform-help">Which existing TTA project this grant funds.</p>
            </div>
          </section>

          {saveError ? <p className="pform-error" role="alert">{saveError}</p> : null}

          <div className="pform-actions">
            <button type="button" className="ghostbtn" onClick={() => leave()} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="newbtn" disabled={saving}>
              {saving ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </form>

        <aside className="pform-rail" aria-label="Setup progress">
          <h2 className="pform-rail-h">Setup progress</h2>

          <ol className="pform-steps">
            {steps.map((s) => (
              <li key={s.n} className={`pform-step${s.done ? ' done' : ''}`}>
                <span className="pform-step-mark" aria-hidden="true">
                  {s.done ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                         strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
                  ) : s.n}
                </span>
                <span className="pform-step-body">
                  <span className="pform-step-label">{s.label}</span>
                  <span className="pform-step-hint">{s.summary || s.hint}</span>
                </span>
              </li>
            ))}
          </ol>

          <div
            className="pform-ring-card"
            role="progressbar"
            aria-label="Required fields completed"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={TRACKED_COUNT}
            aria-valuetext={`${done} of ${TRACKED_COUNT} fields complete`}
          >
            <svg className="pform-ring" viewBox="0 0 60 60" aria-hidden="true">
              <circle cx="30" cy="30" r="26" className="pform-ring-track" />
              <circle
                cx="30" cy="30" r="26" className="pform-ring-fill"
                strokeDasharray={`${(pct / 100) * RING} ${RING}`}
              />
            </svg>
            <p className="pform-ring-pc">{pct}% complete</p>
            <p className="pform-ring-note">
              {done === TRACKED_COUNT
                ? 'Everything a funder report needs is recorded.'
                : 'A complete grant links faster to funders and reports.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
