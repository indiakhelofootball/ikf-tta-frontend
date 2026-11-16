// CSR report form — a PAGE, not a dialog. Follows the pattern set by
// CSRProjectFormPage (5666ded) and CSRActivityFormPage.
//
// "Reports should be simple: I upload, the report is made." So the form asks
// for a name, a type, and one thing to attach (a file or a link). The payload
// shape is unchanged from CSRReportModal; the comments explaining WHY a field
// behaves as it does come with it.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { csrAPI } from '../../services/api';
import { getReportTypes } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';
import {
  REPORT_FILE_ACCEPT,
  formatFileSize,
  openDownloadedFile,
  reportFileError,
} from '../../utils/reportFile';
import { reportFormFunderLine } from './activityVisibility';
import { GRANT_TABS, grantTabState } from './grantTabs';
import '../../styles/csrDesign.css';

const EMPTY = {
  title: '', reportType: '', documentDate: '', fileName: '', fileUrl: '', activityId: '',
  visibleToClient: true,
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
  // The file chosen in this visit, not yet sent. It travels with the report in
  // the same request, so the report and its file are saved together or not at all.
  const [pickedFile, setPickedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [removeUpload, setRemoveUpload] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [downloadError, setDownloadError] = useState('');

  const projectId = report?.projectId ?? (projectIdFromQuery ? Number(projectIdFromQuery) : null);

  // Report types are an Admin catalogue. Re-read it when refreshAllFromAPI
  // lands instead of freezing whatever was cached at mount.
  const cfgVersion = useConfigVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const catalogueTypes = useMemo(() => getReportTypes().map((t) => t.name), [cfgVersion]);
  // A report can hold a type Admin has since retired. It stays selectable for
  // that report, so an edit does not silently clear it.
  const storedType = report?.reportType || '';
  const typeOptions = storedType && !catalogueTypes.includes(storedType)
    ? [...catalogueTypes, storedType]
    : catalogueTypes;

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
          documentDate: data.documentDate || '',
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

  const hasStoredFile = isEdit && Boolean(report?.hasFile);
  const showStoredFile = hasStoredFile && !removeUpload && !replacing;
  // With a file on show, the link input only appears when the report already
  // has a link too, so that link stays editable.
  const showLink = !showStoredFile || Boolean(report?.fileUrl);

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Required';
    const keepsUpload = hasStoredFile && !removeUpload;
    if (!form.fileUrl.trim() && !pickedFile && !keepsUpload) {
      next.fileUrl = 'Upload the report, or paste a Drive link.';
    }
    setErrors(next);
    return Object.keys(next).length === 0 && !fileError;
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0] || null;
    const problem = reportFileError(file);
    setFileError(problem);
    setPickedFile(problem ? null : file);
    if (!problem && file) setErrors((prev) => ({ ...prev, fileUrl: undefined }));
  };

  const clearPickedFile = () => {
    setPickedFile(null);
    setFileError('');
    setFileInputKey((k) => k + 1);
  };

  const keepStoredFile = () => {
    setRemoveUpload(false);
    setReplacing(false);
    clearPickedFile();
  };

  const downloadCurrent = async () => {
    setDownloadError('');
    try {
      const file = await csrAPI.reportFile.download(id);
      openDownloadedFile(file, report?.uploadedFileName);
    } catch (err) {
      setDownloadError(err?.message || 'Could not download the file.');
    }
  };

  const leave = useCallback(
    (saved) => {
      if (!projectId) { navigate('/csr/projects'); return; }
      navigate(`/csr/${projectId}`, grantTabState(GRANT_TABS.reports, saved));
    },
    [navigate, projectId],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      title: form.title.trim(),
      reportType: form.reportType,
      documentDate: form.documentDate.trim(),
      // No field for it any more: the uploaded file's own name when one is
      // chosen, otherwise whatever the report already held.
      fileName: pickedFile ? pickedFile.name : form.fileName.trim(),
      fileUrl: form.fileUrl.trim(),
      activityId: form.activityId === '' ? null : Number(form.activityId),
      visibleToClient: form.visibleToClient,
    };
    // Sent on edits too: the update is a PUT, and the server requires the grant
    // on every full write, so leaving it out made every edit fail with a 400.
    payload.projectId = projectId;
    setSaving(true);
    setSaveError('');
    const removing = isEdit && removeUpload && report?.hasFile;
    try {
      if (pickedFile || removing) {
        await csrAPI.reports.saveWithFile(
          isEdit ? id : null, payload, pickedFile ? { file: pickedFile } : { removeFile: 'true' },
        );
      } else if (isEdit) {
        await csrAPI.reports.update(id, payload);
      } else {
        await csrAPI.reports.create(payload);
      }
      leave(isEdit ? 'Report updated.' : 'Report filed.');
    } catch (err) {
      // Stay on the page. Navigating away on a failed save is how typed work
      // gets thrown out — the report is gone and the person has nothing to
      // retry. A file the server refused (a 4xx) takes the report back with it,
      // so nothing is half-saved and Save simply tries the whole thing again.
      // A timeout proves nothing either way, so it is not called "nothing saved".
      const reason = err?.message || 'Could not save this report. Please try again.';
      const refused = err?.response?.status >= 400 && err.response.status < 500;
      setSaveError(pickedFile && refused ? `Nothing was saved. ${reason}` : reason);
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
          <p className="pform-sub">Name it, pick its type, and attach the document.</p>

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

          <div className="pform-field">
            <label htmlFor="r-type">Report Type</label>
            <select
              id="r-type" className="sel" value={form.reportType} onChange={setField('reportType')}
              aria-describedby="r-type-help"
            >
              <option value="">—</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <p id="r-type-help" className="pform-help">Managed in Admin &gt; Report Types.</p>
          </div>

          <fieldset className="pform-field" aria-describedby="r-attach-help">
            <legend>Attach <span className="pform-req" aria-hidden="true">*</span></legend>

            {showStoredFile ? (
              <>
                <p className="pform-attach-file">
                  {report.uploadedFileName} ({formatFileSize(report.uploadedFileSize)})
                </p>
                <div className="pform-actions">
                  <button type="button" className="ghostbtn tight" onClick={downloadCurrent}>
                    Download
                  </button>
                  <button type="button" className="ghostbtn tight" onClick={() => setReplacing(true)}>
                    Replace
                  </button>
                  <button type="button" className="ghostbtn tight" onClick={() => setRemoveUpload(true)}>
                    Remove
                  </button>
                </div>
                {downloadError ? <p className="pform-help bad" role="alert">{downloadError}</p> : null}
              </>
            ) : (
              <>
                {hasStoredFile ? (
                  <div className="pform-actions">
                    <p className="pform-help">
                      {removeUpload
                        ? `${report.uploadedFileName} will be removed on save.`
                        : `${report.uploadedFileName} is replaced by the file you choose.`}
                    </p>
                    <button type="button" className="ghostbtn tight" onClick={keepStoredFile}>
                      Keep current file
                    </button>
                  </div>
                ) : null}
                <div className="pform-attach-part">
                  <label htmlFor="r-file">Upload a file</label>
                  <input
                    key={fileInputKey} id="r-file" type="file" accept={REPORT_FILE_ACCEPT} onChange={pickFile}
                    aria-invalid={Boolean(fileError)} aria-describedby="r-file-help"
                  />
                  <p id="r-file-help" className={`pform-help${fileError ? ' bad' : ''}`}>
                    {fileError
                      || (pickedFile
                        ? `${pickedFile.name} (${formatFileSize(pickedFile.size)}) will be uploaded on save.`
                        : 'PDF, image, Word, Excel or PowerPoint, up to 15 MB.')}
                  </p>
                  {pickedFile ? (
                    <div className="pform-actions">
                      <button type="button" className="ghostbtn tight" onClick={clearPickedFile}>
                        Clear chosen file
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {showLink ? (
              <div className="pform-attach-part">
                <label htmlFor="r-url">{showStoredFile ? 'Link' : 'or paste a link'}</label>
                <div className={`pform-input${form.fileUrl.trim() ? ' ok' : ''}`}>
                  <input
                    id="r-url" type="text" value={form.fileUrl} onChange={setField('fileUrl')}
                    aria-invalid={Boolean(errors.fileUrl)} aria-describedby="r-attach-help"
                  />
                </div>
              </div>
            ) : null}

            <p id="r-attach-help" className={`pform-help${errors.fileUrl ? ' bad' : ''}`}>
              {errors.fileUrl || 'A file or a link, either is enough'}
            </p>
          </fieldset>

          <div className="pform-field">
            <label htmlFor="r-docdate">Date shown to funder (optional)</label>
            <input
              id="r-docdate" type="text" maxLength={50} value={form.documentDate}
              onChange={setField('documentDate')} aria-describedby="r-docdate-help"
            />
            <p id="r-docdate-help" className="pform-help">
              As printed on the document, e.g. December 2025 or FY 2025-26. The funder sees this instead of the upload date.
            </p>
          </div>

          <div className="pform-field">
            <label className="chk">
              <input
                type="checkbox"
                checked={form.visibleToClient}
                aria-describedby="r-visible-help"
                onChange={(e) => setForm((f) => ({ ...f, visibleToClient: e.target.checked }))}
              />
              Show to funder
            </label>
            <p id="r-visible-help" className="pform-help">
              The funder sees this title on their portal.
            </p>
          </div>

          <details className="pform-more" open={Boolean(report?.activityId)}>
            <summary>More</summary>
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
          </details>
        </section>

        {saveError ? <p className="pform-error" role="alert">{saveError}</p> : null}

        <div className="pform-actions">
          <button type="button" className="ghostbtn" onClick={() => leave()} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="newbtn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <p className="pform-help" aria-live="polite">{reportFormFunderLine(form)}</p>
        </div>
      </form>
    </div>
  );
}
