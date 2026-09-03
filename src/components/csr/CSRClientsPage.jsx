import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Button, Stack, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem,
} from '@mui/material';

import { csrAPI } from '../../services/api';
import '../../styles/csrDesign.css';
import ConfirmDialog from '../common/ConfirmDialog';

const EMPTY = { projectId: '', firstName: '', lastName: '', email: '', password: '' };

const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function OnboardModal({ open, projects, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => { if (open) { setForm(EMPTY); setErrors({}); } }, [open]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.projectId) next.projectId = 'Pick a project';
    if (!form.email.trim()) next.email = 'Required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!form.password || form.password.length < 8) next.password = 'At least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      projectId: Number(form.projectId),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
    });
  };

  const noProjects = !projects || projects.length === 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Onboard a Funder</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Creates a read-only client login linked to one project. The funder sets their own
            password after first sign-in.
          </Typography>
          <TextField
            label="Project" value={form.projectId} onChange={setField('projectId')}
            select fullWidth error={!!errors.projectId}
            helperText={noProjects ? 'No CSR projects yet — create one first.' : errors.projectId}
            disabled={noProjects}
          >
            {/* 26 Aug review, 04:35: funder prime, project name secondary. */}
            {(projects || []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.clientName} — {p.name}</MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="First Name" value={form.firstName} onChange={setField('firstName')} fullWidth />
            <TextField label="Last Name" value={form.lastName} onChange={setField('lastName')} fullWidth />
          </Stack>
          <TextField
            label="Email" value={form.email} onChange={setField('email')} type="email"
            error={!!errors.email} helperText={errors.email} fullWidth
          />
          <TextField
            label="Initial Password" value={form.password} onChange={setField('password')}
            type="text"
            error={!!errors.password}
            helperText={errors.password || 'Share this with the funder; they change it on the Profile page.'}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || noProjects}>
          {saving ? 'Creating…' : 'Create Funder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CSRClientsPage() {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [confirmState, setConfirmState] = useState(null);

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });
  const asList = (data) => (Array.isArray(data) ? data : data?.results || []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cs, ps] = await Promise.all([csrAPI.clients.list(), csrAPI.projects.getAll()]);
      setClients(asList(cs));
      setProjects(asList(ps));
    } catch (e) {
      notify(e.message || 'Failed to load clients.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAccess = (c) => {
    const revoking = c.isActive;
    const message = revoking
      ? `Revoke portal access for ${c.email}? They are signed out immediately. Their reports and certificate are kept, and you can restore access later.`
      : `Restore portal access for ${c.email}?`;
    setConfirmState({
      title: revoking ? 'Revoke portal access' : 'Restore portal access',
      message,
      confirmLabel: revoking ? 'Revoke' : 'Restore',
      destructive: revoking,
      onConfirm: async () => {
        setSaving(true);
        try {
          await csrAPI.clients.setAccess(c.id, !c.isActive);
          notify(revoking ? 'Access revoked.' : 'Access restored.');
          load();
        } catch (e) {
          notify(e.message || 'Could not update access.', 'error');
        } finally {
          setSaving(false);
          setConfirmState(null);
        }
      },
    });
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      await csrAPI.clients.onboard(payload);
      notify('Funder onboarded.');
      setModalOpen(false);
      load();
    } catch (e) {
      // Surface field errors from the backend when present.
      const fieldErr = e?.response?.data?.errors;
      const msg = fieldErr
        ? Object.values(fieldErr).flat().join(' ')
        : (e.message || 'Onboarding failed.');
      notify(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="csrx csrx-page">
      <div className="ph">
        <div>
          <h2>Funders</h2>
          <p>
            Each funder gets a read-only login onto one grant. They set their own
            password after the first sign-in.
          </p>
        </div>
        <button type="button" className="newbtn" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          Onboard Funder
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : (
        <div className="twrap">
          {/* Grant sits fourth on purpose: the fourth cell carries the tinted
              identity band, and which grant a funder is tied to IS the record's
              identity here — a funder login exists only against one grant.
              The funder's own name stays prime in .t1, the grant secondary. */}
          <div className="lgrid lgrid-head">
            {['Onboarded', 'Funder', 'Email', 'Grant', 'Access'].map((h) => <span key={h}>{h}</span>)}
          </div>

          {clients.length === 0 ? (
            <div className="empty">
              <h3>No funders onboarded yet</h3>
              Onboarding a funder creates their portal login and ties it to one
              grant — they see that grant and nothing else.
            </div>
          ) : clients.map((c) => (
            <div className="lwrap" key={c.id}>
              <div className="lgrid lrow">
                <span className="fig nowrap">{fmtDay(c.createdAt)}</span>
                <span className="t1">{c.name}</span>
                <span className="t2">{c.email}</span>
                <span className="t2">{c.projectName}</span>
                <span className="lend">
                  {!c.isActive && <span className="pill wait">Revoked</span>}
                  <button type="button" className="ghostbtn tight" onClick={() => toggleAccess(c)}>
                    {c.isActive ? 'Revoke' : 'Restore'}
                  </button>
                </span>
              </div>
            </div>
          ))}

          {clients.length > 0 && (
            <div className="tfoot">
              <span className="cnt">
                Showing {clients.length} of {clients.length}
                {' '}{clients.length === 1 ? 'funder' : 'funders'} onboarded in total
              </span>
            </div>
          )}
        </div>
      )}

      <OnboardModal
        open={modalOpen}
        projects={projects}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
      />

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        destructive={confirmState?.destructive !== false}
        busy={saving}
        onConfirm={() => confirmState?.onConfirm()}
        onClose={() => setConfirmState(null)}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
