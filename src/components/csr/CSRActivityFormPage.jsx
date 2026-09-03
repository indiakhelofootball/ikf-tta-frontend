// CSR activity form — a PAGE, not a dialog. Follows the pattern set by
// CSRProjectFormPage (5666ded): the previous surface was an MUI <Dialog>,
// outside .csrx, so it carried none of the module's tokens.
//
// Fields, validation, the type cascade and payload shape are carried over
// unchanged from CSRActivityModal; the comments explaining WHY a field behaves
// as it does come with them.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { csrAPI, trialsAPI } from '../../services/api';
import { getWorkshopNames, getTrainingProgrammes } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';
import '../../styles/csrDesign.css';

const STATUS_OPTIONS = ['Planned', 'Completed'];

// Who delivered it. Asked for four times on the 26 Aug review -- "either a self
// or a partner, there will be no option". Blank remains selectable because
// activities recorded before this field existed have no answer.
const DELIVERY_MODES = [
  { value: 'Self', label: 'Self — delivered by TTA' },
  { value: 'Partner', label: 'Partner — delivered by a partner' },
];

// The activity type's own name says what kind of activity this is (26 Aug
// review, item N1: every field showed regardless of type, which read as a
// pile of unrelated dropdowns). Keying off the name rather than adding a
// separate "kind" column means no catalog migration is needed.
function kindOfTypeName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('trial')) return 'trial';
  if (n.includes('workshop')) return 'workshop';
  if (n.includes('training')) return 'training';
  return 'generic';
}

// Which of the five category fields apply to each kind. Delivered By and
// Partner stay on both 'workshop' and 'generic' -- a partner can run either,
// and an activity whose type doesn't match a known keyword shouldn't lose
// the field outright.
const KIND_FIELDS = {
  trial: ['linkedTrialId'],
  workshop: ['workshopId', 'deliveryMode', 'linkedVendorId'],
  // Training carries Self/Partner too. 26 Aug, 15:39-15:47, immediately after
  // listing a training programme's own fields: «उसके बाद जो होगा partner कौन है
  // इसका? self है या कौन है?» — "after that, who is its partner? Is it self or
  // who?" The first cut of this cascade gave the pair to workshop only, which
  // made a partner-delivered training impossible to record at all.
  training: ['trainingProgrammeId', 'deliveryMode', 'linkedVendorId'],
  generic: ['deliveryMode', 'linkedVendorId'],
};
const ALL_KIND_FIELDS = [
  'linkedTrialId', 'workshopId', 'trainingProgrammeId', 'deliveryMode', 'linkedVendorId',
];

const EMPTY = {
  title: '', activityTypeId: '', startDate: '', endDate: '',
  location: '', status: 'Planned', linkedTrialId: '',
  workshopId: '', trainingProgrammeId: '', linkedVendorId: '',
  deliveryMode: '',
};

export default function CSRActivityFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // The grant this activity belongs to. On create it comes from the URL,
  // because the caller (the grant's Activities tab) is the only place that
  // knows it. On edit it comes from the loaded record instead, once it
  // arrives — the query param may be stale or absent on a bookmarked link,
  // and the record's own projectId is never wrong.
  const projectIdFromQuery = searchParams.get('project');

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [activity, setActivity] = useState(null);
  const [activityTypes, setActivityTypes] = useState([]);
  const [trials, setTrials] = useState([]);
  // Partner vendors for a workshop. The spec says a workshop links to a vendor
  // "in the 'partner' category", so an ordinary supplier must not be offered.
  // The narrowing is the endpoint's, not this component's: /csr/partner-vendors/
  // returns partner-flagged vendors only, through the csr grant this operator
  // already holds, so nobody needs the vendors module to fill this picker.
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const projectId = activity?.projectId ?? (projectIdFromQuery ? Number(projectIdFromQuery) : null);

  // The record is loaded here rather than handed down, so the edit route is
  // reachable directly. A form that rendered empty because nothing passed it
  // an activity would silently POST a duplicate on save, so a failed load is
  // a dead end on purpose — same shape as CSRProjectFormPage.
  useEffect(() => {
    if (!isEdit) {
      setActivity(null);
      setForm(EMPTY);
      setErrors({});
      setLoading(false);
      setLoadFailed(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    csrAPI.activities.getById(id)
      .then((data) => {
        if (cancelled) return;
        setActivity(data);
        setForm({
          title: data.title || '',
          activityTypeId: data.activityTypeId ?? '',
          // A row created before the third field went carries only `date`;
          // it loads into Start so the operator sees what was recorded.
          startDate: data.startDate || data.date || '',
          endDate: data.endDate || '',
          location: data.location || '',
          status: data.status || 'Planned',
          linkedTrialId: data.linkedTrialId ?? '',
          workshopId: data.workshopId ?? '',
          trainingProgrammeId: data.trainingProgrammeId ?? '',
          linkedVendorId: data.linkedVendorId ?? '',
          deliveryMode: data.deliveryMode || '',
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

  useEffect(() => {
    let active = true;
    csrAPI.activityTypes.getAll()
      .then((data) => { if (active) setActivityTypes(Array.isArray(data) ? data : data?.results || []); })
      .catch(() => { if (active) setActivityTypes([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    trialsAPI.getAll()
      .then((data) => { if (active) setTrials(Array.isArray(data) ? data : data?.results || []); })
      .catch(() => { if (active) setTrials([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    csrAPI.partnerVendors.getAll()
      .then((data) => {
        if (!active) return;
        setPartners(Array.isArray(data) ? data : data?.results || []);
      })
      // Still caught: the catalog can be empty, the request can fail, and an
      // empty picker with its own helper text is the honest outcome either
      // way. It must not take the page down.
      .catch(() => { if (active) setPartners([]); });
    return () => { active = false; };
  }, []);

  // Re-read the catalogs when refreshAllFromAPI lands, instead of freezing
  // whatever was cached at mount.
  const cfgVersion = useConfigVersion();
  const workshops = useMemo(() => getWorkshopNames(), [cfgVersion]);
  const programmes = useMemo(() => getTrainingProgrammes(), [cfgVersion]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Changing the type changes which category fields apply. Clearing the ones
  // that no longer belong (rather than just hiding them) matters because the
  // serializer validates these per-category -- a stale workshop id surviving
  // under a trial would submit clean and come back as a confusing 400.
  const handleTypeChange = (e) => {
    const newId = e.target.value;
    const newType = activityTypes.find((t) => t.id === Number(newId));
    const keep = new Set(KIND_FIELDS[kindOfTypeName(newType?.name)]);
    setForm((f) => {
      const next = { ...f, activityTypeId: newId };
      ALL_KIND_FIELDS.forEach((k) => { if (!keep.has(k)) next[k] = ''; });
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Required';
    if (!form.activityTypeId) next.activityTypeId = 'Pick an activity type';
    // Mirrors the serializer's rule. Caught here too so the user is told
    // before the round trip, not after it.
    if (form.deliveryMode === 'Partner' && !form.linkedVendorId) {
      next.linkedVendorId = 'Name the partner, or set delivery to Self.';
    }
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
      activityTypeId: Number(form.activityTypeId),
      // `date` is deliberately still sent. An activity EDITED after this
      // change would otherwise keep a stale single date the form no longer
      // shows and the user cannot correct — so the start date becomes the
      // authority for both, and the two can never disagree again.
      date: form.startDate || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      location: form.location.trim(),
      status: form.status,
      linkedTrialId: form.linkedTrialId === '' ? null : Number(form.linkedTrialId),
      workshopId: form.workshopId === '' ? null : Number(form.workshopId),
      trainingProgrammeId:
        form.trainingProgrammeId === '' ? null : Number(form.trainingProgrammeId),
      linkedVendorId: form.linkedVendorId === '' ? null : Number(form.linkedVendorId),
      deliveryMode: form.deliveryMode,
    };
    if (!isEdit) payload.projectId = projectId;
    setSaving(true);
    setSaveError('');
    try {
      if (isEdit) await csrAPI.activities.update(id, payload);
      else await csrAPI.activities.create(payload);
      leave(isEdit ? 'Activity updated.' : 'Activity logged.');
    } catch (err) {
      // Stay on the page. Navigating away on a failed save is how typed work
      // gets thrown out — the activity is gone and the person has nothing to
      // retry.
      setSaveError(err?.message || 'Could not save this activity. Please try again.');
      setSaving(false);
    }
  };

  const noTypes = activityTypes.length === 0;
  const selectedType = activityTypes.find((t) => t.id === Number(form.activityTypeId));
  const kind = kindOfTypeName(selectedType?.name);
  const showField = (name) => KIND_FIELDS[kind].includes(name);

  if (loading) {
    return (
      <div className="csrx csrx-page">
        <p className="pform-state">Loading activity…</p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>Activity not found</h2>
          <p>
            No activity could be loaded for reference {id}. It may have been
            deleted, or you may not have access to it.
          </p>
          <button type="button" className="ghostbtn" onClick={() => leave()}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // An activity with nothing to belong to would post as an orphan — the create
  // route needs ?project=<id>, and a bookmarked create link without one is a
  // dead end rather than a silent write. Edit can never hit this: a loaded
  // record always carries its own projectId.
  if (!isEdit && !projectId) {
    return (
      <div className="csrx csrx-page">
        <div className="pform-state pform-state-bad">
          <h2>No grant selected</h2>
          <p>An activity has to belong to a grant. Open it from the grant's Activities tab.</p>
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
          {activity?.projectName || 'Grant'}
        </button>
        <span aria-hidden="true">/</span>
        <span className="pform-crumb-now">{isEdit ? 'Edit Activity' : 'New Activity'}</span>
      </nav>

      <form className="pform" onSubmit={handleSubmit} noValidate>
        <section className="pform-sec pform-sec--grant">
          <h2 className="pform-legend">What happened</h2>
          <p className="pform-sub">The activity's own name, and what kind it is.</p>

          <div className="pform-field">
            <label htmlFor="a-title">Title <span className="pform-req" aria-hidden="true">*</span></label>
            <div className={`pform-input${form.title.trim() ? ' ok' : ''}`}>
              <input
                id="a-title" type="text" value={form.title} onChange={setField('title')}
                aria-invalid={Boolean(errors.title)} aria-describedby="a-title-help"
              />
            </div>
            <p id="a-title-help" className={`pform-help${errors.title ? ' bad' : ''}`}>
              {errors.title || ' '}
            </p>
          </div>

          <div className="pform-field">
            <label htmlFor="a-type">Activity Type <span className="pform-req" aria-hidden="true">*</span></label>
            <select
              id="a-type" className="sel" value={form.activityTypeId} onChange={handleTypeChange}
              disabled={noTypes}
              aria-invalid={Boolean(errors.activityTypeId)}
              aria-describedby="a-type-help"
            >
              <option value="">—</option>
              {activityTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.isMaster ? ' · master template' : ''}
                </option>
              ))}
            </select>
            <p id="a-type-help" className={`pform-help${errors.activityTypeId ? ' bad' : ''}`}>
              {noTypes
                ? 'No activity types defined yet — add them in the catalog first.'
                : (errors.activityTypeId || ' ')}
            </p>
          </div>
        </section>

        <section className="pform-sec pform-sec--dates">
          <h2 className="pform-legend">Term &amp; status</h2>
          {/* TWO dates, not three. The form used to ask a single "Date" AND a
              start/end pair, and the 26 Aug review caught it: «Activities का एक
              date है। उसके नीचे फिर start date है। दोनों क्या लिख रहे हो?»
              (10:10) — "activity has one date, below it a start date, why are
              you writing both?" — and «I think यहाँ पर कुछ गलती हुआ है» (11:26).
              A single-day activity sets start and leaves end blank; nothing
              needs a third field to say so.

              `date` is no longer collected. It stays on the model for rows that
              already carry one, and every reader already falls through to
              startDate — see sortKey and whenLabel in CSRActivitiesPage. */}
          <p className="pform-sub">Leave End blank for a single-day activity.</p>

          <div className="pform-row pform-row3">
            <div className="pform-field">
              <label htmlFor="a-start">Start Date</label>
              <input id="a-start" type="date" value={form.startDate} onChange={setField('startDate')} />
            </div>
            <div className="pform-field">
              <label htmlFor="a-end">End Date</label>
              <input id="a-end" type="date" value={form.endDate} onChange={setField('endDate')} />
            </div>
            <div className="pform-field">
              <label htmlFor="a-status">Status</label>
              <select id="a-status" className="sel" value={form.status} onChange={setField('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pform-field">
            <label htmlFor="a-location">Location</label>
            <input id="a-location" type="text" value={form.location} onChange={setField('location')} />
          </div>
        </section>

        {/* What this activity actually was. Which of these show is driven by
            the activity type selected above (26 Aug review, item N1) -- a
            trial gets the trial link, a workshop gets the catalog entry plus
            who delivered it, a training gets the programme. Showing all four
            regardless of type was the exact complaint. */}
        {(showField('workshopId') || showField('deliveryMode')
          || showField('linkedVendorId') || showField('trainingProgrammeId')
          || showField('linkedTrialId')) && (
          <section className="pform-sec pform-sec--detail">
            <h2 className="pform-legend">Delivery</h2>
            <p className="pform-sub">What this {kind === 'generic' ? 'activity' : kind} was, and who ran it.</p>

            {showField('workshopId') && (
              <div className="pform-field">
                <label htmlFor="a-workshop">Workshop</label>
                <select
                  id="a-workshop" className="sel" value={form.workshopId} onChange={setField('workshopId')}
                  disabled={workshops.length === 0} aria-describedby="a-workshop-help"
                >
                  <option value="">— none —</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <p id="a-workshop-help" className="pform-help">
                  {workshops.length === 0
                    ? 'No workshops in the catalog yet — an admin adds them in TTA Admin → Setup.'
                    : 'For a workshop activity. Leave blank otherwise.'}
                </p>
              </div>
            )}

            {showField('trainingProgrammeId') && (
              <div className="pform-field">
                <label htmlFor="a-programme">Training Programme</label>
                <select
                  id="a-programme" className="sel" value={form.trainingProgrammeId}
                  onChange={setField('trainingProgrammeId')}
                  disabled={programmes.length === 0} aria-describedby="a-programme-help"
                >
                  <option value="">— none —</option>
                  {programmes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p id="a-programme-help" className="pform-help">
                  {programmes.length === 0
                    ? 'No training programmes in the catalog yet — an admin adds them in TTA Admin → Setup.'
                    : 'For a multi-month training. Pair it with the start and end dates above.'}
                </p>
              </div>
            )}

            {showField('linkedTrialId') && (
              <div className="pform-field">
                <label htmlFor="a-trial">Linked Trial (optional)</label>
                <select
                  id="a-trial" className="sel" value={form.linkedTrialId}
                  onChange={setField('linkedTrialId')} aria-describedby="a-trial-help"
                >
                  <option value="">— none —</option>
                  {trials.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.trialCode ? `${t.trialCode} — ` : ''}{t.trialName || `#${t.id}`}
                    </option>
                  ))}
                </select>
                <p id="a-trial-help" className="pform-help">
                  Link an existing trial, if this activity is one.
                </p>
              </div>
            )}

            {(showField('deliveryMode') || showField('linkedVendorId')) && (
              <div className="pform-row">
                {showField('deliveryMode') && (
                  <div className="pform-field">
                    <label htmlFor="a-delivery">Delivered By</label>
                    <select
                      id="a-delivery" className="sel" value={form.deliveryMode}
                      onChange={setField('deliveryMode')} aria-describedby="a-delivery-help"
                    >
                      <option value="">—</option>
                      {DELIVERY_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <p id="a-delivery-help" className="pform-help">
                      Whether TTA ran this itself or a partner did.
                    </p>
                  </div>
                )}

                {showField('linkedVendorId') && (
                  <div className="pform-field">
                    <label htmlFor="a-partner">Partner</label>
                    <select
                      id="a-partner" className="sel" value={form.linkedVendorId}
                      onChange={setField('linkedVendorId')}
                      disabled={form.deliveryMode === 'Self'}
                      aria-invalid={Boolean(errors.linkedVendorId)}
                      aria-describedby="a-partner-help"
                    >
                      <option value="">— none —</option>
                      {partners.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName || `#${v.id}`}{v.partnerCategory ? ` · ${v.partnerCategory}` : ''}
                        </option>
                      ))}
                    </select>
                    <p id="a-partner-help" className={`pform-help${errors.linkedVendorId ? ' bad' : ''}`}>
                      {errors.linkedVendorId || (form.deliveryMode === 'Self'
                        ? 'Not needed — this one was delivered by TTA.'
                        : partners.length === 0
                          ? 'No vendors carry a partner category yet. An admin flags them in TTA Admin, under Vendors.'
                          : 'The partner who delivered this. Only vendors flagged with a partner category appear.')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {saveError ? <p className="pform-error" role="alert">{saveError}</p> : null}

        <div className="pform-actions">
          <button type="button" className="ghostbtn" onClick={() => leave()} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="newbtn" disabled={saving || noTypes}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
