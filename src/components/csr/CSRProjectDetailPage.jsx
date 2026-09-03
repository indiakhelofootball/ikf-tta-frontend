import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Tabs, Tab, Snackbar, Alert,
  CircularProgress, Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

import CSRProjectDetailView, { ttaProjectIdentity } from './CSRProjectDetailView';
import CSRContactModal from './CSRContactModal';
import CSRExpenseTagModal from './CSRExpenseTagModal';
import CSRContractManagementPage from './CSRContractManagementPage';
import ConfirmDialog from '../common/ConfirmDialog';
import { certificateFreezeState } from './csrContractRules';
import { csrAPI } from '../../services/api';
import '../../styles/csrDesign.css';
import useGrants from '../../auth/useGrants';
import { downloadCertificatePdf } from '../../utils/certificatePdf';

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
const contactTypeLabel = (v) => (v ? CONTACT_TYPE_LABELS[v] || v : '\u2014');

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
  const [contacts, setContacts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  // A row opened from the cross-grant Activities/Reports log (CSRActivitiesPage,
  // CSRReportsPage) arrives with the tab it belongs to in navigation state, so
  // "open" lands you on the record instead of back on the Overview tab.
  const [tab, setTab] = useState(() => {
    const requested = location.state?.tab;
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

  const [contactModal, setContactModal] = useState({ open: false, editing: null });
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, acts, reps, cons, types] = await Promise.all([
        csrAPI.projects.getById(id),
        csrAPI.activities.getAll({ project: id }),
        csrAPI.reports.getAll({ project: id }),
        csrAPI.contacts.getAll({ project: id }),
        csrAPI.activityTypes.getAll(),
      ]);
      setProject(p);
      setActivities(asList(acts));
      setReports(asList(reps));
      setContacts(asList(cons));
      setActivityTypes(asList(types));
    } catch (e) {
      notify(e.message || 'Failed to load project.', 'error');
    } finally {
      setLoading(false);
    }
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
    message: `Delete report "${r.fileName}"?`,
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

  const saveContact = async (payload) => {
    setSaving(true);
    try {
      const body = { ...payload, projectId: Number(id) };
      if (contactModal.editing) {
        await csrAPI.contacts.update(contactModal.editing.id, body);
        notify('Contact updated.');
      } else {
        await csrAPI.contacts.create(body);
        notify('Contact added.');
      }
      setContactModal({ open: false, editing: null });
      load();
    } catch (e) {
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

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

  const saveExpense = async (payload) => {
    setSaving(true);
    try {
      await csrAPI.expenseTags.create({ ...payload, projectId: Number(id) });
      notify('Expense tagged.');
      setExpenseModalOpen(false);
      load();
    } catch (e) {
      notify(e.message || 'Tag failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

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

  // Mirror the certificate's rule: only money that actually moved is utilised.
  // A tag whose payment is still Draft, Sent to Accounts, or Bounced is shown in
  // the list but excluded here, so this total always matches the PDF.
  const counting = expenses.filter((x) => x.countsTowardCertificate);
  const totalTagged = counting.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const excludedCount = expenses.length - counting.length;
  const sanctioned = Number(project?.sanctionedAmount) || 0;
  const freeze = certificateFreezeState(project);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
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

  return (
    <Container className="csrx" maxWidth="lg" sx={{ py: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/csr')} sx={{ mb: 2 }}>
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

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Overview" />
        <Tab label={`Contacts (${contacts.length})`} />
        <Tab label={`Activities (${activities.length})`} />
        <Tab label={`Reports (${reports.length})`} />
        <Tab label="Contracts" />
        {canViewCert && <Tab label="Utilisation" />}
      </Tabs>

      {tab === 0 && <CSRProjectDetailView project={project} />}

      {tab === 1 && (
        <Box>
          {editable && (
            <Button
              size="small" startIcon={<AddIcon />} sx={{ mb: 1 }}
              onClick={() => setContactModal({ open: true, editing: null })}
            >
              Add Contact
            </Button>
          )}
          <div className="twrap">
            {/* Role takes the 4th cell and its identity band: a contact's role
                is what identifies them on this grant. The four fields the
                collapsed panel used to hold — name, role, email, phone — are
                the four columns, so the panel is gone rather than repeating
                the row back to the reader. */}
            <div className="lgrid lgrid--6 lgrid-head">
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
                  className="lgrid lgrid--6 lrow"
                  {...rowActivation(
                    editable ? `Edit contact ${c.name}` : null,
                    editable ? () => setContactModal({ open: true, editing: c }) : null,
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
                  <span className="t2">{contactTypeLabel(c.contactType)}</span>
                  <span className="t2">{c.email || '—'}</span>
                  <span className="lend">
                    {editable && (
                      <>
                        <button
                          type="button" className="ico g"
                          aria-label={`Edit contact ${c.name}`}
                          onClick={(e) => { e.stopPropagation(); setContactModal({ open: true, editing: c }); }}
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
            <div className="lgrid lgrid-head">
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
                    className="lgrid lrow"
                    {...rowActivation(
                      editable ? `Edit activity ${a.title}` : `Show details for activity ${a.title}`,
                      editable
                        ? () => navigate(`/csr/activities/${a.id}/edit`)
                        : () => toggleExpanded(key),
                    )}
                  >
                    <span className="fig nowrap">{whenLabel(a)}</span>
                    <span className="t1">{a.title}</span>
                    {/* Location is back in its own column. It had been given up
                        to make room for the status, which put the status in the
                        middle of this table while it sits on the right of every
                        other one. The status moved to where it belongs and the
                        location got its column back. */}
                    <span className="t2">{a.location || '—'}</span>
                    <span className="t2">{activityType?.name || '—'}</span>
                    <span className="lend">
                      <span className={`pill ${a.status === 'Planned' ? 'wait' : 'closed'}`}>
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
                            a.linkedTrialId && 'a trial',
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
            <div className="lgrid lgrid-head">
              {['Added', 'Report', 'Type', 'Activity', 'Gate'].map((h) => <span key={h}>{h}</span>)}
            </div>

            {reports.length === 0 ? (
              <div className="empty"><h3>No reports yet</h3></div>
            ) : reports.map((r) => {
              const linkedActivity = activities.find((a) => a.id === r.activityId);
              return (
                <div className="lwrap" key={r.id}>
                  <div
                    className="lgrid lrow"
                    {...rowActivation(
                      editable ? `Edit report ${r.fileName}` : null,
                      editable ? () => navigate(`/csr/reports/${r.id}/edit`) : null,
                    )}
                  >
                    <span className="fig nowrap">{fmtDay(r.createdAt)}</span>
                    <span className="t1wrap">
                      <span className="t1">{r.fileName}</span>
                      {r.fileUrl && (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open document"
                          aria-label={`Open document ${r.fileName}`}
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
                            aria-label={`Edit report ${r.fileName}`}
                            onClick={(e) => { e.stopPropagation(); navigate(`/csr/reports/${r.id}/edit`); }}
                          >
                            <EditGlyph />
                          </button>
                          <button
                            type="button" className="ico r"
                            aria-label={`Delete report ${r.fileName}`}
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
        </Box>
      )}

      {tab === 4 && <CSRContractManagementPage projectId={id} />}

      {tab === 5 && canViewCert && (
        <Box>
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
              {excludedCount > 0 && (
                <Typography variant="caption" color="warning.dark">
                  {excludedCount} tagged {excludedCount === 1 ? 'expense is' : 'expenses are'} not
                  counted — the payment has not completed.
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1}>
              {canEditCert && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => setExpenseModalOpen(true)}>
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
            <div className="lgrid lgrid--4 lgrid-head">
              {['Amount', 'Payment', 'Note', 'Counted'].map((h) => <span key={h}>{h}</span>)}
            </div>

            {expenses.length === 0 ? (
              <div className="empty"><h3>No expenses tagged yet</h3></div>
            ) : expenses.map((x) => (
              <div className="lwrap" key={x.id}>
                {/* No edit view exists for a tag — the server keeps these
                    audit-bound and write-once — so the row opens nothing and is
                    not offered as a control. */}
                <div className="lgrid lgrid--4 lrow">
                  <span className="fig nowrap">{rupees(x.amount)}</span>
                  <span className="t1">{x.paymentLabel || 'Manual'}</span>
                  <span className="t2">{x.note || '—'}</span>
                  <span className="lend">
                    <span className={`pill ${x.countsTowardCertificate ? 'act' : 'wait'}`}>
                      {x.countsTowardCertificate
                        ? 'Counted'
                        : (x.paymentStatus || 'Not counted')}
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

      <CSRContactModal
        open={contactModal.open}
        contact={contactModal.editing}
        onClose={() => setContactModal({ open: false, editing: null })}
        onSave={saveContact}
        saving={saving}
      />
      <CSRExpenseTagModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={saveExpense}
        saving={saving}
      />
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
