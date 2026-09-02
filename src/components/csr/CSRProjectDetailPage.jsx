import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Tabs, Tab, Snackbar, Alert,
  CircularProgress, List, ListItem, ListItemButton, ListItemText, IconButton, Chip,
  Link, Tooltip, Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

import CSRProjectDetailView, { ttaProjectIdentity } from './CSRProjectDetailView';
import CSRActivityModal from './CSRActivityModal';
import CSRReportModal from './CSRReportModal';
import CSRContactModal from './CSRContactModal';
import CSRExpenseTagModal from './CSRExpenseTagModal';
import CSRContractManagementPage from './CSRContractManagementPage';
import ConfirmDialog from '../common/ConfirmDialog';
import { certificateFreezeState } from './csrContractRules';
import { csrAPI } from '../../services/api';
import '../../styles/csrDesign.css';
import useGrants from '../../auth/useGrants';
import { downloadCertificatePdf } from '../../utils/certificatePdf';

// The same label/value idiom CSRContractDetailView uses for its expanded
// panel — a caption above a value — kept local here since that file exports
// no reusable piece and this page owns its own rows.
function DetailField({ label, value }) {
  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
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

  const [activityModal, setActivityModal] = useState({ open: false, editing: null });
  const [reportModal, setReportModal] = useState({ open: false, editing: null });
  const [contactModal, setContactModal] = useState({ open: false, editing: null });
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // One dialog, one slot of state: { title, message, confirmLabel, onConfirm }.
  // Each delete asks by filling this in; the dialog is a view of it.
  const [confirmState, setConfirmState] = useState(null);

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });

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

  const saveActivity = async (payload) => {
    setSaving(true);
    try {
      const body = { ...payload, projectId: Number(id) };
      if (activityModal.editing) {
        await csrAPI.activities.update(activityModal.editing.id, body);
        notify('Activity updated.');
      } else {
        await csrAPI.activities.create(body);
        notify('Activity added.');
      }
      setActivityModal({ open: false, editing: null });
      load();
    } catch (e) {
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
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

  const saveReport = async (payload) => {
    setSaving(true);
    try {
      const body = { ...payload, projectId: Number(id) };
      if (reportModal.editing) {
        await csrAPI.reports.update(reportModal.editing.id, body);
        notify('Report updated.');
      } else {
        await csrAPI.reports.create(body);
        notify('Report added.');
      }
      setReportModal({ open: false, editing: null });
      load();
    } catch (e) {
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

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
          {contacts.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>No contacts yet.</Typography>
          ) : (
            <List dense>
              {contacts.map((c) => {
                const key = `contact-${c.id}`;
                const open = expandedRows.has(key);
                return (
                  <ListItem
                    key={c.id}
                    disablePadding
                    sx={{ display: 'block' }}
                    secondaryAction={editable && (
                      <Stack direction="row" sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setContactModal({ open: true, editing: c })} aria-label={`Edit contact ${c.name}`}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deleteContact(c)} aria-label={`Delete contact ${c.name}`}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  >
                    {/* Editable: opens the same edit form the pencil icon does — the
                        row itself is now the affordance, not just the small icon.
                        Read-only: nothing to edit into, so the row opens in place. */}
                    <ListItemButton
                      onClick={() => (editable
                        ? setContactModal({ open: true, editing: c })
                        : toggleExpanded(key))}
                      aria-label={editable ? `Edit contact ${c.name}` : `Show details for contact ${c.name}`}
                      sx={{ pr: editable ? 9 : 2 }}
                    >
                      <ListItemText
                        primary={[c.name, c.designation].filter(Boolean).join(' · ')}
                        secondary={[c.email, c.phone].filter(Boolean).join(' · ') || null}
                      />
                    </ListItemButton>
                    <Collapse in={open} unmountOnExit>
                      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ px: 2, pb: 1.5 }}>
                        <DetailField label="Name" value={c.name} />
                        <DetailField label="Designation" value={c.designation} />
                        <DetailField label="Email" value={c.email} />
                        <DetailField label="Phone" value={c.phone} />
                      </Stack>
                    </Collapse>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box>
          {editable && (
            <Button
              size="small" startIcon={<AddIcon />} sx={{ mb: 1 }}
              onClick={() => setActivityModal({ open: true, editing: null })}
            >
              Add Activity
            </Button>
          )}
          {activities.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>No activities yet.</Typography>
          ) : (
            <List dense>
              {activities.map((a) => {
                const key = `activity-${a.id}`;
                const open = expandedRows.has(key);
                const activityType = activityTypes.find((t) => t.id === a.activityTypeId);
                return (
                  <ListItem
                    key={a.id}
                    disablePadding
                    sx={{ display: 'block' }}
                    secondaryAction={editable && (
                      <Stack direction="row" sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setActivityModal({ open: true, editing: a })} aria-label={`Edit activity ${a.title}`}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deleteActivity(a)} aria-label={`Delete activity ${a.title}`}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  >
                    <ListItemButton
                      onClick={() => (editable
                        ? setActivityModal({ open: true, editing: a })
                        : toggleExpanded(key))}
                      aria-label={editable ? `Edit activity ${a.title}` : `Show details for activity ${a.title}`}
                      sx={{ pr: editable ? 9 : 2 }}
                    >
                      <ListItemText
                        primary={a.title}
                        secondary={[
                          (a.startDate && a.endDate) ? `${a.startDate} → ${a.endDate}` : a.date,
                          a.location,
                        ].filter(Boolean).join(' · ') || null}
                      />
                      <Chip size="small" label={a.status} sx={{ mr: 1 }} />
                    </ListItemButton>
                    <Collapse in={open} unmountOnExit>
                      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ px: 2, pb: 1.5 }}>
                        <DetailField label="Activity type" value={activityType?.name} />
                        <DetailField label="Status" value={a.status} />
                        <DetailField
                          label="Linked to"
                          value={[
                            a.linkedTrialId && 'a trial',
                            a.workshopId && 'a workshop',
                            a.trainingProgrammeId && 'a training programme',
                          ].filter(Boolean).join(', ') || 'nothing else'}
                        />
                      </Stack>
                    </Collapse>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      )}

      {tab === 3 && (
        <Box>
          {editable && (
            <Button
              size="small" startIcon={<AddIcon />} sx={{ mb: 1 }}
              onClick={() => setReportModal({ open: true, editing: null })}
            >
              Add Report
            </Button>
          )}
          {reports.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>No reports yet.</Typography>
          ) : (
            <List dense>
              {reports.map((r) => {
                const key = `report-${r.id}`;
                const open = expandedRows.has(key);
                const linkedActivity = activities.find((a) => a.id === r.activityId);
                return (
                  <ListItem
                    key={r.id}
                    disablePadding
                    sx={{ display: 'block' }}
                    secondaryAction={editable && (
                      <Stack direction="row" sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setReportModal({ open: true, editing: r })} aria-label={`Edit report ${r.fileName}`}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deleteReport(r)} aria-label={`Delete report ${r.fileName}`}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  >
                    <ListItemButton
                      onClick={() => (editable
                        ? setReportModal({ open: true, editing: r })
                        : toggleExpanded(key))}
                      aria-label={editable ? `Edit report ${r.fileName}` : `Show details for report ${r.fileName}`}
                      sx={{ pr: editable ? 9 : 2 }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            {r.fileName}
                            {r.fileUrl && (
                              <Tooltip title="Open document">
                                <Link
                                  href={r.fileUrl}
                                  target="_blank"
                                  rel="noopener"
                                  onClick={(e) => e.stopPropagation()}
                                  sx={{ display: 'inline-flex' }}
                                >
                                  <OpenIcon fontSize="inherit" />
                                </Link>
                              </Tooltip>
                            )}
                          </Stack>
                        }
                      />
                      <Chip
                        size="small"
                        label={r.visibleToClient ? 'Client-visible' : 'Internal'}
                        color={r.visibleToClient ? 'success' : 'default'}
                        sx={{ mr: 1 }}
                      />
                    </ListItemButton>
                    <Collapse in={open} unmountOnExit>
                      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ px: 2, pb: 1.5 }}>
                        <DetailField label="Activity" value={linkedActivity?.title} />
                        <DetailField label="Gate" value={r.visibleToClient ? 'Client-visible' : 'Internal'} />
                      </Stack>
                    </Collapse>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      )}

      {tab === 4 && <CSRContractManagementPage projectId={id} />}

      <CSRActivityModal
        open={activityModal.open}
        activity={activityModal.editing}
        activityTypes={activityTypes}
        onClose={() => setActivityModal({ open: false, editing: null })}
        onSave={saveActivity}
        saving={saving}
      />
      <CSRReportModal
        open={reportModal.open}
        report={reportModal.editing}
        activities={activities}
        onClose={() => setReportModal({ open: false, editing: null })}
        onSave={saveReport}
        saving={saving}
      />
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
          {expenses.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>No expenses tagged yet.</Typography>
          ) : (
            <List dense>
              {expenses.map((x) => {
                const key = `expense-${x.id}`;
                const open = expandedRows.has(key);
                return (
                  <ListItem
                    key={x.id}
                    disablePadding
                    sx={{ display: 'block' }}
                    // An expense tag is audit-bound: permissions/registry.py sets
                    // can_delete:false on csr_certificate, and the server refuses
                    // DELETE for everyone except SUPER_ADMIN, who bypasses the
                    // permission layer entirely. Rendering this for canEditCert
                    // gave every real operator a button that only ever returned a
                    // 403 — and it looked fine in testing precisely because the
                    // owner tests as super-admin. The server rule is the correct
                    // one; the button was the bug.
                    secondaryAction={isSuper && (
                      <Tooltip title="Remove tag (super-admin only — tags are audit-bound)">
                        <IconButton
                          size="small"
                          onClick={() => deleteExpense(x)}
                          aria-label={`Remove tag ${x.paymentLabel || 'Manual'}`}
                          sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  >
                    {/* No edit view exists for a tag — server keeps these
                        audit-bound and write-once — so the row's only honest
                        "open" is showing the fields it doesn't have room for. */}
                    <ListItemButton
                      onClick={() => toggleExpanded(key)}
                      aria-label={`Show details for tag ${x.paymentLabel || 'Manual'}`}
                      sx={{ pr: isSuper ? 6 : 2 }}
                    >
                      <ListItemText primary={x.paymentLabel || 'Manual'} secondary={x.note || null} />
                      {!x.countsTowardCertificate && (
                        <Chip
                          size="small" color="warning" variant="outlined" sx={{ mr: 1 }}
                          label={x.paymentStatus || 'Not counted'}
                        />
                      )}
                      <Chip size="small" label={`₹${(Number(x.amount) || 0).toLocaleString('en-IN')}`} sx={{ mr: 1 }} />
                    </ListItemButton>
                    <Collapse in={open} unmountOnExit>
                      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ px: 2, pb: 1.5 }}>
                        <DetailField label="Amount" value={`₹${(Number(x.amount) || 0).toLocaleString('en-IN')}`} />
                        <DetailField label="Counted toward certificate" value={x.countsTowardCertificate ? 'Yes' : `No — ${x.paymentStatus || 'not counted'}`} />
                        <DetailField label="Note" value={x.note} />
                      </Stack>
                    </Collapse>
                  </ListItem>
                );
              })}
            </List>
          )}
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
