import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Tabs, Tab, Snackbar, Alert,
  CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

import CSRProjectDetailView, { ttaProjectIdentity } from './CSRProjectDetailView';
import CSRContractManagementPage from './CSRContractManagementPage';
import ConfirmDialog from '../common/ConfirmDialog';
import { certificateFreezeState } from './csrContractRules';
import { DEFAULT_REPORT_SORT, reportDisplayName, reportSortOptions, sortReports } from './reportSort';
import ReportFileButton from './ReportFileButton';
import {
  activityStatusPillClass, funderVisibilityLabel, needsDatePassedPrompt,
} from './activityVisibility';
import DatePassedPrompt from './DatePassedPrompt';
import { csrAPI } from '../../services/api';
import '../../styles/csrDesign.css';
import useGrants from '../../auth/useGrants';
import { downloadCertificatePdf } from '../../utils/certificatePdf';
import { getUtilisationTypes } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';

// The record lists on this page are the module's coloured table (.twrap /
// .lgrid / .lrow), the same one every other CSR screen uses — the owner's
// "when we enter inside you have not properly tabulated". The label/value
// idiom the collapsed panels used to carry survives as .dk / .dv inside
// .ldetail, so the caption-above-value reading is unchanged; what moved is
// that a field which used to hide behind a disclosure is now a column, and a
// disclosure that would only repeat its own row is gone rather than kept for
// symmetry.
//
// COLUMN ORDER is set by the identity band, which the stylesheet binds to the
// 4th cell of a five-track .lgrid. Inside one grant every row shares the same
// funder and the same grant name, so neither can be that column — a band
// repeating one string down the page says nothing. Each tab picks the field
// that actually identifies its own record instead, and a tab with no such
// field uses .lgrid--4 rather than inventing one.

const rupees = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Start and end, never a third date. A span reads as a range; anything else
// the record carries is a single day.
const whenLabel = (a) => {
  if (a.startDate && a.endDate) return `${fmtDay(a.startDate)} → ${fmtDay(a.endDate)}`;
  return fmtDay(a.date || a.startDate || a.endDate);
};

// A row that carries its own buttons — a pencil, a bin, a chevron — cannot
// itself be a <button>, because nested buttons are invalid HTML. An
// interactive row is therefore a div that answers to Enter and Space, exactly
// as CSRUtilisationPage does. Rows with no action at all get no role, so a
// screen reader is not told about a control that does nothing.
// Short forms for the table column. The stored values are unchanged -- only
// what the column shows. "Vendor" reads as Partner because that is the client's
// own word for the relationship (26 Aug review: "vendor is the partner"), and a
// column heading has no room for the full "Partner representative" the form
// offers.
const CONTACT_TYPE_LABELS = { Client: 'Client', IKF: 'IKF', Vendor: 'Partner' };
// A partner's own kind is shown INSIDE the type cell rather than as a seventh
// column: it is a narrowing of the type, not a fact of its own, and the 4th
// column carries the identity band on every table in this module. "Partner"
// alone cannot tell a life-skills partner from an education one, which is the
// whole reason the category was asked for.
// The partner organisation, when recorded, sits between the two: "Partner \u00b7
// A1 Classes \u00b7 Life skill".
const contactTypeLabel = (c) => {
  const base = c.contactType ? CONTACT_TYPE_LABELS[c.contactType] || c.contactType : '\u2014';
  return [base, c.partnerName, c.partnerCategoryName].filter(Boolean).join(' \u00b7 ');
};

// Why a tag is not on the certificate. Payment status first: money that never
// moved is not evidence of utilisation whatever its date.
const uncountedReason = (x) => {
  if (!x.countsTowardCertificate) return x.paymentStatus || 'Not counted';
  return 'Outside period';
};

// The dates behind an "Outside period" pill, so the operator can see which one
// is wrong -- the expense's or the grant's -- without opening either.
const outOfPeriodTitle = (x, project) => {
  if (x.countsTowardCertificate && x.withinCertificatePeriod === false) {
    const from = project?.startDate || 'inception';
    const to = project?.endDate || 'open';
    return `Dated ${x.effectiveDate || 'unknown'}, outside the grant period (${from} to ${to}), `
      + 'so it is not on the Utilisation Certificate.';
  }
  return undefined;
};

const ATHLETE_CATEGORIES = ['U-11', 'U-13', 'U-15', 'U17', 'U19', 'U-21', 'Senior'];

// An athlete's category is fixed by their age when the grant started, not by
// today's date, or every player would move up a band each birthday after the
// trial. Only a suggestion: staff can change it before saving.
const categoryFromDob = (dob, startDate) => {
  const birth = new Date(dob);
  if (!dob || isNaN(birth.getTime())) return '';
  const start = startDate ? new Date(startDate) : null;
  const on = start && !isNaN(start.getTime()) ? start : new Date();
  let age = on.getUTCFullYear() - birth.getUTCFullYear();
  const m = on.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birth.getUTCDate())) age--;
  if (age < 0 || age > 100) return '';
  if (age <= 11) return 'U-11';
  if (age <= 13) return 'U-13';
  if (age <= 15) return 'U-15';
  if (age <= 17) return 'U17';
  if (age <= 19) return 'U19';
  if (age <= 21) return 'U-21';
  return 'Senior';
};

const rowActivation = (label, onActivate) => (onActivate ? {
  role: 'button',
  tabIndex: 0,
  'aria-label': label,
  onClick: onActivate,
  onKeyDown: (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  },
} : {});

const EditGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
  </svg>
);

const DeleteGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);

const ChevronGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// D-019: the grant funds some of a trial's cities, never by default all of them.
const trialCities = (t) => {
  const all = t.cityCount ?? 0;
  const noun = all === 1 ? 'city' : 'cities';
  return `${t.grantCityCount ?? 0} of ${all} ${noun}`;
};

const trialDates = (t) => {
  if (!t.firstCityDate && !t.lastCityDate) return '—';
  if (t.firstCityDate === t.lastCityDate || !t.lastCityDate) return fmtDay(t.firstCityDate);
  if (!t.firstCityDate) return fmtDay(t.lastCityDate);
  return `${fmtDay(t.firstCityDate)} → ${fmtDay(t.lastCityDate)}`;
};

// 26 Aug review, 03:52-05:31: a project can carry several trials, so the grant
// does not "run under" a trial -- the trials are conducted on the project, and
// the screen reads funder, then description, then these. Fetched when the
// Overview is shown rather than with the rest of the grant, so a failure here
// cannot hide the grant, and is stated as a failure rather than as "no trials".
function GrantTrials({ project }) {
  const linked = Boolean(project.projectRefId);
  const [state, setState] = useState({ status: linked ? 'loading' : 'idle', trials: [] });

  const fetchTrials = useCallback(async () => {
    setState({ status: 'loading', trials: [] });
    try {
      const data = await csrAPI.grantTrials(project.id);
      setState({ status: 'ready', trials: Array.isArray(data) ? data : [] });
    } catch (e) {
      setState({ status: 'error', trials: [], message: e.message });
    }
  }, [project.id]);

  useEffect(() => {
    if (linked) fetchTrials();
  }, [linked, fetchTrials]);

  const { status, trials } = state;
  const scope = [project.ttaProjectName, project.season].filter(Boolean).join(' · ');

  return (
    <section className="ovw-trials" aria-labelledby="grant-trials-heading">
      <h3 id="grant-trials-heading">Following trials will be conducted on this project</h3>
      {linked && !project.season && (
        <p className="ovw-note">
          This grant has no season set, so trials from every season
          of {project.ttaProjectName || 'its TTA project'} are listed.
        </p>
      )}
      {linked && (
        <p className="ovw-note">
          {project.cities?.length
            ? `Cities this grant funds: ${project.cities.map((c) => c.cityName).join(', ')}`
            : 'No cities chosen for this grant yet. Edit the grant to pick the cities it funds.'}
        </p>
      )}

      {!linked && (
        <div className="twrap">
          <div className="empty"><h3>Link this grant to a TTA project to list its trials</h3></div>
        </div>
      )}

      {linked && status === 'loading' && (
        <div className="twrap">
          <div className="empty" role="status">
            <CircularProgress size={22} />
            <p>Loading trials…</p>
          </div>
        </div>
      )}

      {linked && status === 'error' && (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={fetchTrials}>Retry</Button>}
        >
          Could not load the trials for this grant{state.message ? `: ${state.message}` : '.'}
        </Alert>
      )}

      {linked && status === 'ready' && (
        <div className="twrap">
          {/* Season takes the 4th cell and its identity band: inside one
              project, the season is what a trial belongs to. Rows open
              nothing -- a CSR operator holds no trials grant to open them in. */}
          <div className="lgrid lgrid--trials lgrid--6 lgrid-head">
            {['Code', 'Trial', 'Cities', 'Season', 'Dates', 'Status'].map((h) => <span key={h}>{h}</span>)}
          </div>

          {trials.length === 0 ? (
            <div className="empty"><h3>No trials found for {scope || 'this project'}</h3></div>
          ) : trials.map((t) => (
            <div className="lwrap" key={t.id}>
              <div className="lgrid lgrid--trials lgrid--6 lrow">
                <span className="fig nowrap">{t.trialCode}</span>
                <span className="t1">{t.trialName}</span>
                <span className="t2">{trialCities(t)}</span>
                <span className="t2">{t.season || '—'}</span>
                <span className="t2">{trialDates(t)}</span>
                <span className="lend">
                  <span className={`pill ${t.status === 'Active' ? 'act' : 'closed'}`}>
                    {t.status || 'Unknown'}
                  </span>
                </span>
              </div>
            </div>
          ))}

          {trials.length > 0 && (
            <div className="tfoot">
              <span className="cnt">
                Showing {trials.length} of {trials.length}
                {' '}{trials.length === 1 ? 'trial' : 'trials'} on this project
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function CSRProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { canEdit, canView, isSuper } = useGrants();
  const editable = canEdit('csr');
  // Seeing the spend and controlling it are different jobs. The CSR manager reads
  // the utilisation total; only the finance-side csr_certificate holder tags or
  // untags (05-22: "We will show it in finance, not in CSR" / "if you tag him from
  // there"). The server mirrors this via MODULE_DEPENDENCIES 'csr': ['csr_certificate'],
  // which unlocks READ only — writes still demand the csr_certificate edit grant.
  const canViewCert = canView('csr_certificate') || canView('csr');
  const canEditCert = canEdit('csr_certificate');

  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportSort, setReportSort] = useState(DEFAULT_REPORT_SORT);
  const [contacts, setContacts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  // null | 'notFound' | 'failed' -- for the grant itself.
  const [loadError, setLoadError] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [athleteModalOpen, setAthleteModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [athleteForm, setAthleteForm] = useState({
    fullName: '',
    jerseyNumber: '',
    dob: '',
    age: '',
    category: '',
    gender: 'Not Mentioned',
    position: '',
    city: '',
    schoolOrClub: '',
    status: 'Participated',
    notes: '',
  });
  const [athleteSaving, setAthleteSaving] = useState(false);
  const [athleteError, setAthleteError] = useState('');
  const [listFailed, setListFailed] = useState({ activities: false, reports: false, contacts: false, athletes: false });
  // A row opened from the cross-grant Activities/Reports log (CSRActivitiesPage,
  // CSRReportsPage) arrives with the tab it belongs to in navigation state, so
  // "open" lands you on the record instead of back on the Overview tab.
  const athletesTabIdx = canViewCert ? 6 : 5;
  const [tab, setTab] = useState(() => {
    const requested = location.state?.tab;
    if (requested === 'athletes') return canViewCert ? 6 : 5;
    return typeof requested === 'number' ? requested : 0;
  });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  // Rows with no edit permission and no separate detail view (expense tags
  // always; contacts/activities/reports for a view-only grant) open in place
  // instead of doing nothing. Keyed "kind-id" so the four lists share one set.
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const toggleExpanded = (key) => setExpandedRows((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const [saving, setSaving] = useState(false);
  const [typeSaving, setTypeSaving] = useState(false);
  // The certificate-type catalogue, read from the admin-managed cache and never
  // fetched from config here. Subscribing re-renders this page when
  // refreshAllFromAPI lands, and the read below then picks up the new list.
  useConfigVersion();
  const utilisationTypes = getUtilisationTypes();
  // One dialog, one slot of state: { title, message, confirmLabel, onConfirm }.
  // Each delete asks by filling this in; the dialog is a view of it.
  const [confirmState, setConfirmState] = useState(null);

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });

  // Activity and report editing moved to their own pages (App.js), so the
  // save confirmation that used to come from the modal's own onSave callback
  // now arrives here the way CSRProjectManagementPage reads its own: in
  // navigation state, cleared with replace:true so it cannot resurface on a
  // Back or a refresh long after the fact.
  const savedMsg = location.state?.saved;
  useEffect(() => {
    if (!savedMsg) return;
    notify(savedMsg);
    navigate(location.pathname, { replace: true, state: { tab: location.state?.tab } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMsg]);

  const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

  // Each call settles on its own, so one failed list cannot take the grant
  // down with it, and a failure is never drawn as "not found" or as an empty
  // list. Only a 404 from the grant itself means the grant does not exist.
  // The type catalogue is optional: every activity carries activityTypeName.
  const load = useCallback(async () => {
    setLoading(true);
    const [p, acts, reps, cons, types, aths] = await Promise.allSettled([
      csrAPI.projects.getById(id),
      csrAPI.activities.getAll({ project: id }),
      csrAPI.reports.getAll({ project: id }),
      csrAPI.contacts.getAll({ project: id }),
      csrAPI.activityTypes.getAll().catch(() => []),
      csrAPI.athletes.getAll({ project: id }),
    ]);
    const listOf = (r) => (r.status === 'fulfilled' ? asList(r.value) : []);
    if (p.status === 'fulfilled') {
      setProject(p.value);
      setLoadError(null);
    } else {
      setProject(null);
      setLoadError(p.reason?.response?.status === 404 ? 'notFound' : 'failed');
    }
    setActivities(listOf(acts));
    setReports(listOf(reps));
    setContacts(listOf(cons));
    setActivityTypes(listOf(types));
    setAthletes(listOf(aths));
    setListFailed({
      activities: acts.status === 'rejected',
      reports: reps.status === 'rejected',
      contacts: cons.status === 'rejected',
      athletes: aths.status === 'rejected',
    });
    setLoading(false);
    // Expense tags require the stricter csr_certificate grant — fetch separately
    // so a csr-only user still sees the rest of the project.
    if (canViewCert) {
      try {
        setExpenses(asList(await csrAPI.expenseTags.getAll({ project: id })));
      } catch {
        /* ignore — no certificate access */
      }
    }
  }, [id, canViewCert]);

  useEffect(() => { load(); }, [load]);

  // Mark completed / Cancelled save the status alone, then re-read this
  // grant's activities only; the rest of the page stays as it is.
  const setActivityStatus = async (activity, status) => {
    try {
      await csrAPI.activities.patch(activity.id, { status });
      setActivities(asList(await csrAPI.activities.getAll({ project: id })));
    } catch (e) {
      notify(e.message || 'Could not update this activity.', 'error');
    }
  };

  const deleteActivity = (a) => setConfirmState({
    title: 'Delete activity',
    message: `Delete activity "${a.title}"?`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await csrAPI.activities.delete(a.id);
        notify('Activity deleted.');
        load();
      } catch (e) {
        notify(e.message || 'Delete failed.', 'error');
      }
    },
  });

  const deleteReport = (r) => setConfirmState({
    title: 'Delete report',
    message: `Delete report "${reportDisplayName(r)}"?`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await csrAPI.reports.delete(r.id);
        notify('Report deleted.');
        load();
      } catch (e) {
        notify(e.message || 'Delete failed.', 'error');
      }
    },
  });

  const deleteContact = (c) => setConfirmState({
    title: 'Delete contact',
    message: `Delete contact "${c.name}"?`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await csrAPI.contacts.delete(c.id);
        notify('Contact deleted.');
        load();
      } catch (e) {
        notify(e.message || 'Delete failed.', 'error');
      }
    },
  });

  const deleteExpense = (x) => setConfirmState({
    title: 'Remove expense tag',
    message: 'Remove this expense tag?',
    confirmLabel: 'Remove',
    onConfirm: async () => {
      try {
        await csrAPI.expenseTags.delete(x.id);
        notify('Expense tag removed.');
        load();
      } catch (e) {
        notify(e.message || 'Delete failed.', 'error');
      }
    },
  });

  const openAddAthleteModal = () => {
    setEditingAthlete(null);
    const defaultCity = (project?.cities && project.cities.length > 0) ? project.cities[0].cityName : '';
    setAthleteForm({
      fullName: '',
      jerseyNumber: '',
      dob: '',
      age: '',
      category: '',
      gender: 'Not Mentioned',
      position: '',
      city: defaultCity,
      schoolOrClub: '',
      status: 'Participated',
      notes: '',
    });
    setAthleteError('');
    setAthleteModalOpen(true);
  };

  const openEditAthleteModal = (a) => {
    setEditingAthlete(a);
    setAthleteForm({
      fullName: a.fullName || '',
      jerseyNumber: a.jerseyNumber || '',
      dob: a.dob || '',
      age: a.age != null ? a.age : '',
      category: a.category || '',
      gender: a.gender || 'Not Mentioned',
      position: a.position || '',
      city: a.city || '',
      schoolOrClub: a.schoolOrClub || '',
      status: a.status || 'Participated',
      notes: a.notes || '',
    });
    setAthleteError('');
    setAthleteModalOpen(true);
  };

  const saveAthlete = async (e) => {
    if (e) e.preventDefault();
    if (!athleteForm.fullName.trim()) {
      setAthleteError('Full name is required.');
      return;
    }
    setAthleteSaving(true);
    setAthleteError('');
    try {
      const payload = {
        projectId: Number(id),
        fullName: String(athleteForm.fullName || '').trim(),
        jerseyNumber: String(athleteForm.jerseyNumber || '').trim(),
        dob: athleteForm.dob || null,
        age: athleteForm.age ? parseInt(athleteForm.age, 10) : null,
        category: athleteForm.category || '',
        gender: athleteForm.gender || 'Not Mentioned',
        position: String(athleteForm.position || '').trim(),
        city: String(athleteForm.city || '').trim(),
        schoolOrClub: String(athleteForm.schoolOrClub || '').trim(),
        status: athleteForm.status,
        notes: String(athleteForm.notes || '').trim(),
      };
      if (editingAthlete) {
        await csrAPI.athletes.update(editingAthlete.id, payload);
        notify('Athlete updated successfully.');
      } else {
        await csrAPI.athletes.create(payload);
        notify('Athlete added successfully.');
      }
      setAthleteModalOpen(false);
      const updated = await csrAPI.athletes.getAll({ project: id });
      setAthletes(asList(updated));
    } catch (err) {
      setAthleteError(err.message || 'Failed to save athlete.');
    } finally {
      setAthleteSaving(false);
    }
  };

  const deleteAthlete = (a) => setConfirmState({
    title: 'Delete athlete',
    message: `Delete athlete "${a.fullName}"?`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      try {
        await csrAPI.athletes.delete(a.id);
        notify('Athlete deleted.');
        load();
      } catch (e) {
        notify(e.message || 'Delete failed.', 'error');
      }
    },
  });

  // The dialog closes in `finally`, so a delete that throws still releases it
  // instead of stranding the user on a dead prompt.
  const runConfirm = async () => {
    if (!confirmState) return;
    setSaving(true);
    try {
      await confirmState.onConfirm();
    } finally {
      setSaving(false);
      setConfirmState(null);
    }
  };

  // Mirror the certificate's rule — BOTH halves of it. Money that actually
  // moved (a Draft, Sent to Accounts or Bounced payment has not), AND spend
  // dated inside the grant's own period. Counting only the first half is what
  // made this total disagree with the document it sits above: a tag could read
  // as Counted here and be absent from the PDF, with nothing on the screen
  // saying why. `withinCertificatePeriod` is undefined on a payload from an
  // older server, and `!== false` keeps that reading as it did.
  const onCertificate = (x) => x.countsTowardCertificate && x.withinCertificatePeriod !== false;
  const counting = expenses.filter(onCertificate);
  const totalTagged = counting.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const excludedCount = expenses.length - counting.length;
  const uncleared = expenses.filter((x) => !x.countsTowardCertificate).length;
  const outOfPeriod = expenses.filter(
    (x) => x.countsTowardCertificate && x.withinCertificatePeriod === false,
  ).length;
  const excludedReasons = [
    uncleared > 0 ? `${uncleared} where the payment has not completed` : null,
    outOfPeriod > 0 ? `${outOfPeriod} dated outside the grant period` : null,
  ].filter(Boolean).join(', and ');
  const sanctioned = Number(project?.sanctionedAmount) || 0;
  const freeze = certificateFreezeState(project);

  // This tab never sorted: it shows the server's order, which is newest first.
  // The default leaves that array untouched, so nobody who ignores the control
  // sees a single row move.
  const shownReports = reportSort === DEFAULT_REPORT_SORT
    ? reports
    : sortReports(reports, reportSort, {
      activityName: (r) => activities.find((a) => a.id === r.activityId)?.title,
    });

  // The PDF is a download of the server's authoritative figures, not a
  // browser-side sum — fetch the certificate, then render it. The 'internal'
  // variant is what unlocks the Source column and the out-of-period note.
  const generateCertificate = async () => {
    let cert;
    try {
      cert = await csrAPI.utilisationCertificate(id);
    } catch (e) {
      notify(e.message || 'Could not generate certificate.', 'error');
      return;
    }
    downloadCertificatePdf(cert, { variant: 'internal' });
  };

  // Saved as soon as it is picked: a single field, so a separate Save button
  // would only be a second step to forget. PATCH, not the PUT the project form
  // uses, so nothing else on the grant is resent.
  const saveUtilisationType = async (e) => {
    const nextId = e.target.value === '' ? null : Number(e.target.value);
    setTypeSaving(true);
    try {
      const saved = await csrAPI.projects.patch(id, { utilisationTypeId: nextId });
      // A partial response omits a blank read-only name, so '' is filled in
      // here rather than keeping the previous type's label.
      setProject((p) => ({
        ...p,
        utilisationTypeId: saved?.utilisationTypeId ?? nextId,
        utilisationTypeName: saved?.utilisationTypeName || '',
      }));
      notify(nextId === null ? 'Certificate type cleared.' : 'Certificate type saved.');
    } catch (err) {
      notify(err?.message || 'Could not save the certificate type.', 'error');
    } finally {
      setTypeSaving(false);
    }
  };

  // A grant can hold a type that has since been retired from the catalogue.
  // It stays selectable for that grant -- otherwise the select would show
  // "not set" for a type the certificate still prints.
  const typeOptions = project?.utilisationTypeId
    && !utilisationTypes.some((t) => t.id === project.utilisationTypeId)
    ? [...utilisationTypes, { id: project.utilisationTypeId, name: project.utilisationTypeName }]
    : utilisationTypes;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError === 'failed') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/csr')}>Back</Button>
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}
        >
          Could not load this grant.
        </Alert>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/csr')}>Back</Button>
        <Typography sx={{ mt: 2 }} color="text.secondary">Project not found.</Typography>
      </Container>
    );
  }

  const listError = (what) => (
    <Alert
      severity="error"
      action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}
    >
      Could not load {what}.
    </Alert>
  );
  const tabCount = (label, list, failed) => (failed ? label : `${label} (${list.length})`);

  return (
    <Container className="csrx" maxWidth="lg" sx={{ py: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/csr/projects')} sx={{ mb: 2 }}>
        All Projects
      </Button>
      {/* Which TTA project this grant belongs to, above the grant's own name:
          structural information, not money and not a promise, so it carries no
          ink. Rendered only when the link exists — an unlinked grant shows the
          same header it always did, and the Overview panel below is where the
          missing link is stated. */}
      {ttaProjectIdentity(project) && (
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: 'block', letterSpacing: '0.08em', lineHeight: 1.6 }}
        >
          {ttaProjectIdentity(project)}
        </Typography>
      )}
      {/* 26 Aug review, 04:35: "BDSA तुम्हारा prime रहेगा" — the funder takes
          the h5 headline, the project name drops to the secondary line. */}
      <Typography variant="h5" sx={{ mb: 0.5 }}>{project.clientName}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {project.name}
      </Typography>
      <Button
        size="small" variant="outlined" sx={{ mb: 2 }}
        onClick={() => navigate(`/csr/${id}/funder-preview`)}
      >
        Preview as funder
      </Button>

      <Tabs value={Math.min(tab, canViewCert ? 6 : 5)} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons={false} sx={{ mb: 2 }}>
        <Tab label="Overview" />
        <Tab label={tabCount('Contacts', contacts, listFailed.contacts)} />
        <Tab label={tabCount('Activities', activities, listFailed.activities)} />
        <Tab label={tabCount('Reports', reports, listFailed.reports)} />
        <Tab label="Contracts" />
        {canViewCert && <Tab label="Utilisation" />}
        <Tab label={tabCount('Athletes', athletes, listFailed.athletes)} />
      </Tabs>

      {tab === 0 && (
        <CSRProjectDetailView project={project}>
          <GrantTrials project={project} />
        </CSRProjectDetailView>
      )}

      {tab === 1 && (
        <Box>
          {editable && (
            <Button
              size="small" startIcon={<AddIcon />} sx={{ mb: 1 }}
              onClick={() => navigate(`/csr/contacts/new?project=${id}`)}
            >
              Add Contact
            </Button>
          )}
          {listFailed.contacts ? listError('contacts') : (
          <div className="twrap">
            {/* Role takes the 4th cell and its identity band: a contact's role
                is what identifies them on this grant. The four fields the
                collapsed panel used to hold — name, role, email, phone — are
                the four columns, so the panel is gone rather than repeating
                the row back to the reader. */}
            <div className="lgrid lgrid--contacts lgrid--6 lgrid-head">
              {['Phone', 'Contact', 'Role', 'Type', 'Email', 'Manage'].map((h) => <span key={h}>{h}</span>)}
            </div>

            {contacts.length === 0 ? (
              <div className="empty"><h3>No contacts yet</h3></div>
            ) : contacts.map((c) => (
              <div className="lwrap" key={c.id}>
                {/* Editable: the row opens the same edit form the pencil does —
                    the row itself is the affordance, not just the small icon.
                    Read-only: there is nothing to edit into and nothing left to
                    disclose, so the row stays a row. */}
                <div
                  className="lgrid lgrid--contacts lgrid--6 lrow"
                  {...rowActivation(
                    editable ? `Edit contact ${c.name}` : null,
                    editable ? () => navigate(`/csr/contacts/${c.id}/edit`) : null,
                  )}
                >
                  {/* Type carries the identity band, not the role. A role is
                      something a person HAS; the type is what they are here as
                      -- the funder's side, IKF's side, or a delivery partner --
                      which is the "belongs to" the tinted column means on every
                      other table. Role keeps its own column; nothing was
                      dropped to make room. */}
                  <span className="fig nowrap">{c.phone || '—'}</span>
                  <span className="t1">{c.name}</span>
                  <span className="t2">{c.designation || '—'}</span>
                  <span className="t2">{contactTypeLabel(c)}</span>
                  <span className="t2">{c.email || '—'}</span>
                  <span className="lend">
                    {editable && (
                      <>
                        <button
                          type="button" className="ico g"
                          aria-label={`Edit contact ${c.name}`}
                          onClick={(e) => { e.stopPropagation(); navigate(`/csr/contacts/${c.id}/edit`); }}
                        >
                          <EditGlyph />
                        </button>
                        <button
                          type="button" className="ico r"
                          aria-label={`Delete contact ${c.name}`}
                          onClick={(e) => { e.stopPropagation(); deleteContact(c); }}
                        >
                          <DeleteGlyph />
                        </button>
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}

            {contacts.length > 0 && (
              <div className="tfoot">
                <span className="cnt">
                  Showing {contacts.length} of {contacts.length}
                  {' '}{contacts.length === 1 ? 'contact' : 'contacts'} on this grant
                </span>
              </div>
            )}
          </div>
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box>
          {editable && (
            <Button
              size="small" startIcon={<AddIcon />} sx={{ mb: 1 }}
              onClick={() => navigate(`/csr/activities/new?project=${id}`)}
            >
              Add Activity
            </Button>
          )}
          {listFailed.activities ? listError('activities') : (
          <div className="twrap">
            {/* Type takes the 4th cell and its identity band — the catalogue row
                an activity points at is what the activity IS, which is the only
                thing on this tab that identifies a record without repeating the
                grant every row already belongs to. Ochre on 'Planned' is the one
                ink that applies: logged but not yet done is "waiting on you".

                Status is a column rather than the trailing cell because the
                trailing cell has to hold this tab's row controls, and a pill
                plus three of them does not fit the 124px the table ends on —
                they printed over the identity band. Location is the field that
                yielded its column for the status and moved into the row's
                detail; it is the least load-bearing of the four. */}
            <div className="lgrid lgrid--gacts lgrid-head">
              {['When', 'Activity', 'Location', 'Type', 'Status'].map((h) => <span key={h}>{h}</span>)}
            </div>

            {activities.length === 0 ? (
              <div className="empty"><h3>No activities yet</h3></div>
            ) : activities.map((a) => {
              const key = `activity-${a.id}`;
              const open = expandedRows.has(key);
              const activityType = activityTypes.find((t) => t.id === a.activityTypeId);
              return (
                <div className="lwrap" key={a.id}>
                  <div
                    className="lgrid lgrid--gacts lrow"
                    {...rowActivation(
                      editable ? `Edit activity ${a.title}` : `Show details for activity ${a.title}`,
                      editable
                        ? () => navigate(`/csr/activities/${a.id}/edit`)
                        : () => toggleExpanded(key),
                    )}
                  >
                    <span className="fig nowrap">{whenLabel(a)}</span>
                    <span className="setrow-c">
                      <span className="t1">{a.title}</span>
                      <span className="t2">{funderVisibilityLabel(a)}</span>
                    </span>
                    {/* Location is back in its own column. It had been given up
                        to make room for the status, which put the status in the
                        middle of this table while it sits on the right of every
                        other one. The status moved to where it belongs and the
                        location got its column back. */}
                    <span className="t2">{a.location || '—'}</span>
                    <span className="t2">{a.activityTypeName || activityType?.name || '—'}</span>
                    <span className="lend">
                      <span className={`pill ${activityStatusPillClass(a.status)}`}>
                        {a.status || 'Unknown'}
                      </span>
                      {editable && (
                        <>
                          <button
                            type="button" className="ico g"
                            aria-label={`Edit activity ${a.title}`}
                            onClick={(e) => { e.stopPropagation(); navigate(`/csr/activities/${a.id}/edit`); }}
                          >
                            <EditGlyph />
                          </button>
                          <button
                            type="button" className="ico r"
                            aria-label={`Delete activity ${a.title}`}
                            onClick={(e) => { e.stopPropagation(); deleteActivity(a); }}
                          >
                            <DeleteGlyph />
                          </button>
                        </>
                      )}
                      {/* Where the activity happened, and what else it is
                          linked to. The second is a sentence rather than a
                          value and never had a column; the first gave its
                          column up to the status. So the disclosure survives on
                          this tab where it did not on the others. */}
                      <button
                        type="button"
                        className={`xpand${open ? ' on' : ''}`}
                        aria-expanded={open}
                        aria-label={`${open ? 'Hide' : 'Show'} details for activity ${a.title}`}
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(key); }}
                      >
                        <ChevronGlyph />
                      </button>
                    </span>
                  </div>

                  {editable && needsDatePassedPrompt(a) && (
                    <DatePassedPrompt
                      activity={a}
                      onSetStatus={setActivityStatus}
                      onChangeDate={(act) => navigate(`/csr/activities/${act.id}/edit`)}
                    />
                  )}

                  {open && (
                    <div className="ldetail">
                      <div>
                        <span className="dk">Location</span>
                        <span className="dv">{a.location || '—'}</span>
                      </div>
                      <div>
                        <span className="dk">Linked to</span>
                        <span className="dv">
                          {[
                            a.linkedTrialId && (a.linkedTrialCode ? `trial ${a.linkedTrialCode}` : 'a trial'),
                            a.workshopId && 'a workshop',
                            a.trainingProgrammeId && 'a training programme',
                          ].filter(Boolean).join(', ') || 'nothing else'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {activities.length > 0 && (
              <div className="tfoot">
                <span className="cnt">
                  Showing {activities.length} of {activities.length}
                  {' '}{activities.length === 1 ? 'activity' : 'activities'} logged on this grant
                </span>
              </div>
            )}
          </div>
          )}
        </Box>
      )}

      {tab === 3 && (
        <Box>
          {editable && (
            <Button
              size="small" startIcon={<AddIcon />} sx={{ mb: 1 }}
              onClick={() => navigate(`/csr/reports/new?project=${id}`)}
            >
              Add Report
            </Button>
          )}
          {reports.length > 0 && (
            <div className="toolbar">
              <select
                className="sel"
                aria-label="Sort reports"
                value={reportSort}
                onChange={(e) => setReportSort(e.target.value)}
              >
                {reportSortOptions({ withGrant: false }).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
          {listFailed.reports ? listError('reports') : (
          <div className="twrap">
            {/* The activity takes the 4th cell and its identity band: inside one
                grant, what a report is a report OF is what identifies it — the
                grant itself would be the same string on every row.

                The gate is a state, not an identity, so it stays a pill; it sits
                in the third column rather than the trailing one because the
                trailing cell holds this tab's row controls and a pill plus two
                of them overruns the 124px the table ends on.

                Both fields the collapsed panel held, the linked activity and the
                gate, are now on the row, so there is nothing left to disclose. */}
            <div className="lgrid lgrid--greports lgrid-head">
              {['Added', 'Report', 'Type', 'Activity', 'Gate'].map((h) => <span key={h}>{h}</span>)}
            </div>

            {reports.length === 0 ? (
              <div className="empty"><h3>No reports yet</h3></div>
            ) : shownReports.map((r) => {
              const linkedActivity = activities.find((a) => a.id === r.activityId);
              return (
                <div className="lwrap" key={r.id}>
                  <div
                    className="lgrid lgrid--greports lrow"
                    {...rowActivation(
                      editable ? `Edit report ${reportDisplayName(r)}` : null,
                      editable ? () => navigate(`/csr/reports/${r.id}/edit`) : null,
                    )}
                  >
                    <span className="fig nowrap">{fmtDay(r.createdAt)}</span>
                    <span className="t1wrap">
                      <span className="t1">{reportDisplayName(r)}</span>
                      <ReportFileButton report={r} onError={(m) => notify(m, 'error')} />
                      {r.fileUrl && (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open document"
                          aria-label={`Open document ${reportDisplayName(r)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                               strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <path d="M15 3h6v6M10 14L21 3" />
                          </svg>
                        </a>
                      )}
                    </span>
                    {/* The report's own kind, where the gate used to sit. The
                        gate is state, and state belongs in the last column with
                        the controls that change it -- which is where the
                        Reports screen has always had it. */}
                    <span className="t2">{r.reportType || '—'}</span>
                    <span className="t2">{linkedActivity?.title || '—'}</span>
                    <span className="lend">
                      <span className={`pill ${r.visibleToClient ? 'act' : 'wait'}`}>
                        {r.visibleToClient ? 'Client-visible' : 'Internal'}
                      </span>
                      {editable && (
                        <>
                          <button
                            type="button" className="ico g"
                            aria-label={`Edit report ${reportDisplayName(r)}`}
                            onClick={(e) => { e.stopPropagation(); navigate(`/csr/reports/${r.id}/edit`); }}
                          >
                            <EditGlyph />
                          </button>
                          <button
                            type="button" className="ico r"
                            aria-label={`Delete report ${reportDisplayName(r)}`}
                            onClick={(e) => { e.stopPropagation(); deleteReport(r); }}
                          >
                            <DeleteGlyph />
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}

            {reports.length > 0 && (
              <div className="tfoot">
                <span className="cnt">
                  Showing {reports.length} of {reports.length}
                  {' '}{reports.length === 1 ? 'report' : 'reports'} filed on this grant
                </span>
              </div>
            )}
          </div>
          )}
        </Box>
      )}

      {tab === 4 && <CSRContractManagementPage projectId={id} />}

      {tab === 5 && canViewCert && (
        <Box>
          {/* The certificate type, under the Utilisation heading: «type लिख दो
              इसके नीचे» (26 Aug review, 19:53), resolved on 3 Sep as the type of
              Utilisation Certificate. It lives here and not on the cross-grant
              Work Utilisation ledger because it belongs to one grant, and this
              is the one screen that is about one grant's certificate. Editing
              writes the grant, so it follows the `csr` edit grant, not the
              certificate grant. */}
          <Box sx={{ mb: 2, maxWidth: 420 }}>
            <div className="pform-field">
              <label htmlFor="uc-type">Certificate type</label>
              {editable ? (
                <select
                  id="uc-type"
                  className="sel"
                  value={project.utilisationTypeId ?? ''}
                  onChange={saveUtilisationType}
                  disabled={typeSaving || (typeOptions.length === 0 && !project.utilisationTypeId)}
                  aria-describedby="uc-type-help"
                >
                  <option value="">— not set —</option>
                  {typeOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              ) : (
                <Typography variant="body2">{project.utilisationTypeName || 'Not set'}</Typography>
              )}
              <p id="uc-type-help" className="pform-help">
                {typeOptions.length === 0
                  ? 'No certificate types in the catalog yet — an admin adds them in TTA Admin → CSR.'
                  : freeze.frozen
                    ? 'The frozen certificate keeps the type it was issued with. A change here applies when the grant is next closed.'
                    : 'Printed on the Utilisation Certificate.'}
              </p>
            </div>
          </Box>
          <Alert
            severity={freeze.frozen ? 'info' : 'success'}
            icon={freeze.frozen ? <LockIcon fontSize="inherit" /> : undefined}
            sx={{ mb: 2 }}
            action={
              <Chip
                size="small"
                label={freeze.label}
                color={freeze.frozen ? 'default' : 'success'}
                variant={freeze.frozen ? 'filled' : 'outlined'}
              />
            }
          >
            {freeze.description}
            {freeze.frozen && (
              <Typography variant="caption" component="div">
                Tagging further expenses will not change this certificate.
              </Typography>
            )}
          </Alert>
          <Stack
            direction={{ xs: 'column', sm: 'row' }} spacing={1}
            sx={{ mb: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
          >
            <Box>
              <Typography variant="body2">
                Sanctioned: ₹{sanctioned.toLocaleString('en-IN')} · Utilised: ₹{totalTagged.toLocaleString('en-IN')}
              </Typography>
              {freeze.frozen && (
                <Typography variant="caption" color="text.secondary" component="div">
                  Live totals. The frozen certificate reports the figures as at {freeze.frozenAtLabel}.
                </Typography>
              )}
              {/* The caption used to assert one reason for every uncounted
                  tag — "the payment has not completed" — which was wrong the
                  moment a tag could also be off the certificate for its date,
                  and said so about tags that had no payment at all. It now
                  names whichever reasons are actually present. */}
              {excludedCount > 0 && (
                <Typography variant="caption" color="warning.dark">
                  {excludedCount} tagged {excludedCount === 1 ? 'expense is' : 'expenses are'} not
                  counted — {excludedReasons}.
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1}>
              {canEditCert && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => navigate(`/csr/expenses/new?project=${id}`)}>
                  Tag Expense
                </Button>
              )}
              <Button
                size="small" variant="outlined"
                onClick={generateCertificate} disabled={expenses.length === 0}
              >
                {freeze.frozen ? 'Download Frozen Certificate' : 'Generate Certificate'}
              </Button>
            </Stack>
          </Stack>
          <div className="twrap">
            {/* Four columns, no identity band. A tag has nothing that identifies
                it apart from the payment it points at, which is already the
                row's own name in .t1 — and every tag on this tab is against the
                same grant, so a grant column would be one string repeated.

                The amount leads. The certificate's rule — only money that
                actually moved is utilised — is the whole reason this list
                exists, so the figure is a column and the reason a tag is or is
                not counted is the trailing state, never a footnote. All three
                fields the collapsed panel carried are on the row now. */}
            <div className="lgrid lgrid--expenses lgrid--4 lgrid-head">
              {['Amount', 'Payment', 'Note', 'Counted'].map((h) => <span key={h}>{h}</span>)}
            </div>

            {expenses.length === 0 ? (
              <div className="empty"><h3>No expenses tagged yet</h3></div>
            ) : expenses.map((x) => (
              <div className="lwrap" key={x.id}>
                {/* No edit view exists for a tag — the server keeps these
                    audit-bound and write-once — so the row opens nothing and is
                    not offered as a control. */}
                <div className="lgrid lgrid--expenses lgrid--4 lrow">
                  <span className="fig nowrap">{rupees(x.amount)}</span>
                  <span className="t1">{x.paymentLabel || 'Manual'}</span>
                  <span className="t2">{x.note || '—'}</span>
                  <span className="lend">
                    {/* Two different reasons a tag is off the certificate, and
                        the operator needs to be able to tell them apart: the
                        money never moved, or it moved outside the grant period.
                        The second one used to be invisible here and was the
                        reported complaint — a certificate that "does not take
                        the expense" with nothing on screen admitting it. */}
                    <span
                      className={`pill ${onCertificate(x) ? 'act' : 'wait'}`}
                      title={outOfPeriodTitle(x, project)}
                    >
                      {onCertificate(x) ? 'Counted' : uncountedReason(x)}
                    </span>
                    {/* An expense tag is audit-bound: permissions/registry.py
                        sets can_delete:false on csr_certificate, and the server
                        refuses DELETE for everyone except SUPER_ADMIN, who
                        bypasses the permission layer entirely. Rendering this
                        for canEditCert gave every real operator a button that
                        only ever returned a 403 — and it looked fine in testing
                        precisely because the owner tests as super-admin. The
                        server rule is the correct one; the button was the bug. */}
                    {isSuper && (
                      <button
                        type="button" className="ico r"
                        title="Remove tag (super-admin only — tags are audit-bound)"
                        aria-label={`Remove tag ${x.paymentLabel || 'Manual'}`}
                        onClick={() => deleteExpense(x)}
                      >
                        <DeleteGlyph />
                      </button>
                    )}
                  </span>
                </div>
              </div>
            ))}

            {expenses.length > 0 && (
              <div className="tfoot">
                <span className="cnt">
                  Showing {expenses.length} of {expenses.length}
                  {' '}{expenses.length === 1 ? 'expense' : 'expenses'} tagged to this grant
                </span>
              </div>
            )}
          </div>
        </Box>
      )}

      {tab === athletesTabIdx && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Beneficiaries and scouted football players supported under this grant.
            </Typography>
            {editable && (
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openAddAthleteModal}
              >
                Add Athlete
              </Button>
            )}
          </Stack>

          {listFailed.athletes ? listError('athletes') : (
            <div className="twrap">
              <div className="lgrid lgrid--athletes lgrid-head">
                {['#', 'Athlete', 'Category / Age / Gender', 'Position', 'City / Club', 'Status', 'Manage'].map((h) => <span key={h}>{h}</span>)}
              </div>

              {athletes.length === 0 ? (
                <div className="empty"><h3>No athletes added yet</h3></div>
              ) : athletes.map((a) => (
                <div className="lwrap" key={a.id}>
                  <div
                    className="lgrid lgrid--athletes lrow"
                    {...rowActivation(
                      editable ? `Edit athlete ${a.fullName}` : null,
                      editable ? () => openEditAthleteModal(a) : null,
                    )}
                  >
                    <span className="fig nowrap">{a.jerseyNumber ? `#${a.jerseyNumber}` : '--'}</span>
                    <span className="t1wrap">
                      <span className="t1">{a.fullName}</span>
                      {a.notes && <span className="t2 athlete-note" title={a.notes}>{a.notes}</span>}
                    </span>
                    <span className="t2">
                      {[a.category, a.age ? `${a.age}y` : null, a.gender].filter(Boolean).join(', ') || '—'}
                    </span>
                    <span className="t2">{a.position || '—'}</span>
                    <span className="t2">
                      {[a.city, a.schoolOrClub].filter(Boolean).join(' · ') || '—'}
                    </span>
                    <span>
                      <span className={`pill ${a.status === 'Participated' ? 'wait' : 'act'}`}>
                        {a.status || 'Participated'}
                      </span>
                    </span>
                    <span className="lend">
                      {editable && (
                        <>
                          <button
                            type="button"
                            className="ico g"
                            aria-label={`Edit athlete ${a.fullName}`}
                            onClick={(e) => { e.stopPropagation(); openEditAthleteModal(a); }}
                          >
                            <EditGlyph />
                          </button>
                          <button
                            type="button"
                            className="ico r"
                            aria-label={`Delete athlete ${a.fullName}`}
                            onClick={(e) => { e.stopPropagation(); deleteAthlete(a); }}
                          >
                            <DeleteGlyph />
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}

              {athletes.length > 0 && (
                <div className="tfoot">
                  <span className="cnt">
                    Showing {athletes.length} of {athletes.length}{' '}
                    {athletes.length === 1 ? 'athlete' : 'athletes'} scouted on this project
                  </span>
                </div>
              )}
            </div>
          )}
        </Box>
      )}

      <Dialog
        open={athleteModalOpen}
        onClose={() => !athleteSaving && setAthleteModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={saveAthlete}>
          <DialogTitle>
            {editingAthlete ? 'Edit Athlete' : 'Add Athlete'}
          </DialogTitle>
          <DialogContent dividers>
            {athleteError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {athleteError}
              </Alert>
            )}
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Full Name"
                required
                fullWidth
                size="small"
                value={athleteForm.fullName}
                onChange={(e) => setAthleteForm({ ...athleteForm, fullName: e.target.value })}
                placeholder="e.g. Manpreet Singh"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Jersey Number"
                  size="small"
                  fullWidth
                  value={athleteForm.jerseyNumber}
                  onChange={(e) => setAthleteForm({ ...athleteForm, jerseyNumber: e.target.value })}
                  placeholder="e.g. 10"
                />
                <TextField
                  label="Date of Birth (DOB)"
                  type="date"
                  size="small"
                  fullWidth
                  value={athleteForm.dob || ''}
                  onChange={(e) => {
                    const dobVal = e.target.value;
                    let calculatedAge = athleteForm.age;
                    if (dobVal) {
                      const birth = new Date(dobVal);
                      if (!isNaN(birth.getTime())) {
                        const today = new Date();
                        let diff = today.getFullYear() - birth.getFullYear();
                        const m = today.getMonth() - birth.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                          diff--;
                        }
                        if (diff >= 0 && diff <= 100) {
                          calculatedAge = String(diff);
                        }
                      }
                    }
                    const category = athleteForm.category || categoryFromDob(dobVal, project?.startDate);
                    setAthleteForm({ ...athleteForm, dob: dobVal, age: calculatedAge, category });
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Pick calendar or type YYYY-MM-DD"
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Age"
                  type="number"
                  size="small"
                  fullWidth
                  value={athleteForm.age}
                  onChange={(e) => setAthleteForm({ ...athleteForm, age: e.target.value })}
                  placeholder="e.g. 15"
                  helperText="Calculated from DOB or enter manually"
                />
                <TextField
                  select
                  label="Category"
                  size="small"
                  fullWidth
                  value={athleteForm.category || ''}
                  onChange={(e) => setAthleteForm({ ...athleteForm, category: e.target.value })}
                  helperText="Set from age at the grant's start; change if needed"
                >
                  <MenuItem value="">Not set</MenuItem>
                  {ATHLETE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  {athleteForm.category && !ATHLETE_CATEGORIES.includes(athleteForm.category) && (
                    <MenuItem value={athleteForm.category}>{athleteForm.category}</MenuItem>
                  )}
                </TextField>
                <TextField
                  select
                  label="Gender"
                  size="small"
                  fullWidth
                  value={athleteForm.gender || 'Not Mentioned'}
                  onChange={(e) => setAthleteForm({ ...athleteForm, gender: e.target.value })}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                  <MenuItem value="Not Mentioned">Not Mentioned</MenuItem>
                </TextField>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Position"
                  size="small"
                  fullWidth
                  value={athleteForm.position}
                  onChange={(e) => setAthleteForm({ ...athleteForm, position: e.target.value })}
                  placeholder="e.g. Forward, Midfielder"
                />
                <TextField
                  label="City"
                  size="small"
                  fullWidth
                  value={athleteForm.city}
                  onChange={(e) => setAthleteForm({ ...athleteForm, city: e.target.value })}
                  placeholder="e.g. Ludhiana"
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Status"
                  size="small"
                  fullWidth
                  value={athleteForm.status}
                  onChange={(e) => setAthleteForm({ ...athleteForm, status: e.target.value })}
                >
                  <MenuItem value="Participated">Participated</MenuItem>
                  <MenuItem value="Shortlisted">Shortlisted</MenuItem>
                  <MenuItem value="Scholarship Awarded">Scholarship Awarded</MenuItem>
                  <MenuItem value="National Finals">National Finals</MenuItem>
                </TextField>
                <TextField
                  label="School / Club / Academy"
                  size="small"
                  fullWidth
                  value={athleteForm.schoolOrClub}
                  onChange={(e) => setAthleteForm({ ...athleteForm, schoolOrClub: e.target.value })}
                  placeholder="e.g. Ludhiana Football Academy"
                />
              </Stack>
              <TextField
                label="Notes"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={athleteForm.notes}
                onChange={(e) => setAthleteForm({ ...athleteForm, notes: e.target.value })}
                placeholder="Optional notes or evaluation details"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setAthleteModalOpen(false)} disabled={athleteSaving} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={athleteSaving}>
              {athleteSaving ? 'Saving...' : (editingAthlete ? 'Update Athlete' : 'Add Athlete')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        busy={saving}
        onConfirm={runConfirm}
        onClose={() => setConfirmState(null)}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
