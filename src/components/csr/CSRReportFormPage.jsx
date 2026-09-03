// CSR report form — a PAGE, not a dialog. Follows the pattern set by
// CSRProjectFormPage (5666ded) and CSRActivityFormPage.
//
// Fields, validation and payload shape are carried over unchanged from
// CSRReportModal; the comments explaining WHY a field behaves as it does come
// with them.
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { csrAPI } from '../../services/api';
import '../../styles/csrDesign.css';

// The kinds the 26 Aug review asked to distinguish: "what is the report of the
// trial, what is the report of the workshop... what will be the type of report".
// 'Overall' added per 26 Aug review, 16:21: a grant-wide report is distinct
// from 'Other' (uncategorised) -- every other value here is an activity kind.
const REPORT_TYPES = ['Trial', 'Workshop', 'Training Programme', 'Overall', 'Other'];

const EMPTY = {
  title: '', reportType: '', fileName: '', fileUrl: '', activityId: '',
  visibleToClient: false,
};

export default function CSRReportFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const projectIdFromQuery = searchParams.get('project');

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [report, setReport] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const projectId = report?.projectId ?? (projectIdFromQuery ? Number(projectIdFromQuery) : null);

  useEffect(() => {
    if (!isEdit) {
      setReport(null);
      setForm(EMPTY);
      setErrors({});
      setLoading(false);
      setLoadFailed(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    csrAPI.reports.getById(id)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setForm({
          // Reports created before `title` existed put the report's name in
          // fileName -- this page literally used to label that field "Report
          // Name" in the modal. Falling back to it keeps the name the user
          // actually typed rather than showing them an empty required field.
          title: data.title || data.fileName || '',
          reportType: data.reportType || '',
          fileName: data.fileName || '',
          fileUrl: data.fileUrl || '',
          activityId: data.activityId ?? '',
          visibleToClient: !!data.visibleToClient,
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

  // The Activity picker is scoped to the grant this report belongs to. On
  // create that grant is known from the URL immediately; on edit it only
  // becomes known once the record itself loads, so the fetch waits on
  // `projectId` rather than firing once with nothing to filter by.
  useEffect(() => {
    if (!projectId) { setActivities([]); return undefined; }
    let active = true;
    csrAPI.activities.getAll({ project: projectId })
      .then((data) => { if (active) setActivities(Array.isArray(data) ? data : data?.results || []); })
      .catch(() => { if (active) setActivities([]); });
    return () => { active = false; };
  }, [projectId]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Required';
    if (!form.fileUrl.trim()) next.fileUrl = 'Paste the document link';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const leave = useCallback(
    (saved) => {
      if (!projectId) { navigate('/csr/projects'); return; }
      navigate(`/csr/${projectId}`, saved ? { state: { saved } } : undefined);
    },
    [navigate, projectId],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      title: form.title.trim(),
      reportType: form.reportType,
      fileName: form.fileName.trim(),
      fileUrl: form.fileUrl.trim(),
      activityId: form.activityId === '' ? null : Number(form.activityId),
      visibleToClient: form.visibleToClient,
    };
    if (!isEdit) payload.projectId = projectId;
    setSaving(true);
    setSaveError('');
    try {
      if (isEdit) await csrAPI.reports.update(id, payload);
      else await csrAPI.reports.create(payload);
      leave(isEdit ? 'Report updated.' : 'Report filed.');
    } catch (err) {
      // Stay on the page. Navigating away on a failed save is how typed work
      // gets thrown out — the report is gone and the person has nothing to
      // retry.
      setSaveError(err?.message || 'Could not save this report. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="csrx csrx-page">
        <p className="pform-state">Loading report…</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>Report not found</h2>
          <p>
            No report could be loaded for reference {id}. It may have been
            deleted, or you may not have access to it.
          </p>
          <button type="button" className="ghostbtn" onClick={() => leave()}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!isEdit && !projectId) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>No grant selected</h2>
          <p>A report has to belong to a grant. Open it from the grant's Reports tab.</p>
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
        <button type="button" className="pform-back" onClick={() => leave()}>
          {report?.projectName || 'Grant'}
        </button>
        <span aria-hidden="true">/</span>
        <span className="pform-crumb-now">{isEdit ? 'Edit Report' : 'New Report'}</span>
      </nav>

      <form className="pform" onSubmit={handleSubmit} noValidate>
        <section className="pform-sec pform-sec--grant">
          <h2 className="pform-legend">The report</h2>
          <p className="pform-sub">What this report is, and where the document lives.</p>

          <div className="pform-field">
            <label htmlFor="r-title">Report Name <span className="pform-req" aria-hidden="true">*</span></label>
            <div className={`pform-input${form.title.trim() ? ' ok' : ''}`}>
              <input
                id="r-title" type="text" value={form.title} onChange={setField('title')}
                aria-invalid={Boolean(errors.title)} aria-describedby="r-title-help"
              />
            </div>
            <p id="r-title-help" className={`pform-help${errors.title ? ' bad' : ''}`}>
              {errors.title || 'What this report is.'}
            </p>
          </div>

          <div className="pform-row">
            <div className="pform-field">
              <label htmlFor="r-type">Report Type</label>
              <select id="r-type" className="sel" value={form.reportType} onChange={setField('reportType')}>
                <option value="">—</option>
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <p className="pform-help">Trial, workshop, training programme, or other.</p>
            </div>

            <div className="pform-field">
              <label htmlFor="r-filename">File Name (optional)</label>
              <input id="r-filename" type="text" value={form.fileName} onChange={setField('fileName')} />
              <p className="pform-help">The document's own file name, if it differs.</p>
            </div>
          </div>

          <div className="pform-field">
            <label htmlFor="r-url">Document Link <span className="pform-req" aria-hidden="true">*</span></label>
            <div className={`pform-input${form.fileUrl.trim() ? ' ok' : ''}`}>
              <input
                id="r-url" type="text" value={form.fileUrl} onChange={setField('fileUrl')}
                aria-invalid={Boolean(errors.fileUrl)} aria-describedby="r-url-help"
              />
            </div>
            <p id="r-url-help" className={`pform-help${errors.fileUrl ? ' bad' : ''}`}>
              {errors.fileUrl || 'External link (e.g. Drive), per the app convention.'}
            </p>
          </div>
        </section>

        <section className="pform-sec pform-sec--detail">
          <h2 className="pform-legend">Linkage &amp; visibility</h2>
          <p className="pform-sub">Optional. Attach this to one activity, and set who can see it.</p>

          <div className="pform-field">
            <label htmlFor="r-activity">Activity (optional)</label>
            <select id="r-activity" className="sel" value={form.activityId} onChange={setField('activityId')}>
              <option value="">— None —</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <p className="pform-help">Attach this report to a specific activity.</p>
          </div>

          <label className="chk">
            <input
              type="checkbox"
              checked={form.visibleToClient}
              onChange={(e) => setForm((f) => ({ ...f, visibleToClient: e.target.checked }))}
            />
            Visible to client
          </label>
        </section>

        {saveError ? <p className="pform-error" role="alert">{saveError}</p> : null}

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
