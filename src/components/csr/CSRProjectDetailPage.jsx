import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Tabs, Tab, Snackbar, Alert,
  CircularProgress, List, ListItem, ListItemText, IconButton, Chip, Link, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import CSRProjectDetailView from './CSRProjectDetailView';
import CSRActivityModal from './CSRActivityModal';
import CSRReportModal from './CSRReportModal';
import CSRContactModal from './CSRContactModal';
import CSRExpenseTagModal from './CSRExpenseTagModal';
import CSRContractManagementPage from './CSRContractManagementPage';
import { certificateFreezeState, formatFrozenAt } from './csrContractRules';
import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';

export default function CSRProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [activityModal, setActivityModal] = useState({ open: false, editing: null });
  const [reportModal, setReportModal] = useState({ open: false, editing: null });
  const [contactModal, setContactModal] = useState({ open: false, editing: null });
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const deleteActivity = async (a) => {
    if (!window.confirm(`Delete activity "${a.title}"?`)) return;
    try {
      await csrAPI.activities.delete(a.id);
      notify('Activity deleted.');
      load();
    } catch (e) {
      notify(e.message || 'Delete failed.', 'error');
    }
  };

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

  const deleteReport = async (r) => {
    if (!window.confirm(`Delete report "${r.fileName}"?`)) return;
    try {
      await csrAPI.reports.delete(r.id);
      notify('Report deleted.');
      load();
    } catch (e) {
      notify(e.message || 'Delete failed.', 'error');
    }
  };

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

  const deleteContact = async (c) => {
    if (!window.confirm(`Delete contact "${c.name}"?`)) return;
    try {
      await csrAPI.contacts.delete(c.id);
      notify('Contact deleted.');
      load();
    } catch (e) {
      notify(e.message || 'Delete failed.', 'error');
    }
  };

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

  const deleteExpense = async (x) => {
    if (!window.confirm('Remove this expense tag?')) return;
    try {
      await csrAPI.expenseTags.delete(x.id);
      notify('Expense tag removed.');
      load();
    } catch (e) {
      notify(e.message || 'Delete failed.', 'error');
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
  // browser-side sum — fetch the certificate, then render it.
  const generateCertificate = async () => {
    let cert;
    try {
      cert = await csrAPI.utilisationCertificate(id);
    } catch (e) {
      notify(e.message || 'Could not generate certificate.', 'error');
      return;
    }
    const num = (v) => Number(v || 0).toLocaleString('en-IN');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Utilisation Certificate', 14, 18);
    doc.setFontSize(10);
    doc.text(`Project: ${cert.projectName}`, 14, 28);
    doc.text(`Client / Funder: ${cert.clientName}`, 14, 34);
    doc.text(`Sanctioned: INR ${num(cert.sanctionedAmount)}`, 14, 40);
    doc.text(`Total Utilised: INR ${num(cert.totalUtilised)}`, 14, 46);
    // The certificate is filed against the grant period, so the document has to
    // state it. An open bound is printed as "onwards"/"to date" rather than
    // omitted: a reader who cannot see the period cannot tell whether a figure
    // covers the grant or everything ever tagged, which is the ambiguity the
    // server-side window exists to remove.
    const period = cert.periodStart || cert.periodEnd
      ? `Period: ${cert.periodStart || 'project inception'} to ${cert.periodEnd || 'date'}`
      : 'Period: not stated on the project — covers all tagged expenses';
    doc.text(period, 14, 52);
    // The downloaded document has to carry the same distinction the screen
    // makes, or a filed PDF cannot be told apart from a still-moving one.
    const stamp = cert.frozen
      ? `Frozen v${cert.certificateVersion} — figures as at ${formatFrozenAt(cert.frozenAt)}`
      : 'Live — figures may still change';
    doc.text(stamp, 14, 58);
    if (cert.outOfPeriodCount > 0) {
      doc.text(
        `${cert.outOfPeriodCount} tagged expense(s) fall outside this period and are not included.`,
        14, 64,
      );
    }
    autoTable(doc, {
      startY: cert.outOfPeriodCount > 0 ? 72 : 66,
      head: [['Source', 'Note', 'Amount (INR)']],
      body: (cert.lineItems || []).map((x) => [
        x.source || 'Manual',
        x.note || '',
        num(x.amount),
      ]),
    });
    doc.save(`utilisation_certificate_${cert.projectName}.pdf`);
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
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/csr')} sx={{ mb: 2 }}>
        All Projects
      </Button>
      <Typography variant="h5" sx={{ mb: 0.5 }}>{project.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {project.clientName}
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
              {contacts.map((c) => (
                <ListItem
                  key={c.id}
                  secondaryAction={editable && (
                    <>
                      <IconButton size="small" onClick={() => setContactModal({ open: true, editing: c })}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteContact(c)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                >
                  <ListItemText
                    primary={[c.name, c.designation].filter(Boolean).join(' · ')}
                    secondary={[c.email, c.phone].filter(Boolean).join(' · ') || null}
                  />
                </ListItem>
              ))}
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
              {activities.map((a) => (
                <ListItem
                  key={a.id}
                  secondaryAction={editable && (
                    <>
                      <IconButton size="small" onClick={() => setActivityModal({ open: true, editing: a })}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteActivity(a)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                >
                  <ListItemText
                    primary={a.title}
                    secondary={[
                      (a.startDate && a.endDate) ? `${a.startDate} → ${a.endDate}` : a.date,
                      a.location,
                    ].filter(Boolean).join(' · ') || null}
                  />
                  <Chip size="small" label={a.status} sx={{ mr: 1 }} />
                </ListItem>
              ))}
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
              {reports.map((r) => (
                <ListItem
                  key={r.id}
                  secondaryAction={editable && (
                    <>
                      <IconButton size="small" onClick={() => setReportModal({ open: true, editing: r })}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteReport(r)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        {r.fileName}
                        {r.fileUrl && (
                          <Tooltip title="Open document">
                            <Link href={r.fileUrl} target="_blank" rel="noopener" sx={{ display: 'inline-flex' }}>
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
                </ListItem>
              ))}
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
              {expenses.map((x) => (
                <ListItem
                  key={x.id}
                  // An expense tag is audit-bound: permissions/registry.py sets
                  // can_delete:false on csr_certificate, and the server refuses
                  // DELETE for everyone except SUPER_ADMIN, who bypasses the
                  // permission layer entirely. Rendering this for canEditCert
                  // gave every real operator a button that only ever returned a
                  // 403 — and it looked fine in testing precisely because the
                  // owner tests as super-admin. The server rule is the correct
                  // one; the button was the bug.
                  secondaryAction={isSuper && (
                    <IconButton
                      size="small"
                      onClick={() => deleteExpense(x)}
                      title="Remove tag (super-admin only — tags are audit-bound)"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                >
                  <ListItemText primary={x.paymentLabel || 'Manual'} secondary={x.note || null} />
                  {!x.countsTowardCertificate && (
                    <Chip
                      size="small" color="warning" variant="outlined" sx={{ mr: 1 }}
                      label={x.paymentStatus || 'Not counted'}
                    />
                  )}
                  <Chip size="small" label={`₹${(Number(x.amount) || 0).toLocaleString('en-IN')}`} sx={{ mr: 1 }} />
                </ListItem>
              ))}
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
