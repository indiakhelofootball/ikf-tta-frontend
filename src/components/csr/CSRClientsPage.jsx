import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Button, Stack, Snackbar, Alert,
  CircularProgress, Card, CardContent, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  GroupAdd as GroupAddIcon,
} from '@mui/icons-material';

import { csrAPI } from '../../services/api';
import ConfirmDialog from '../common/ConfirmDialog';

const EMPTY = { projectId: '', firstName: '', lastName: '', email: '', password: '' };

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
            {(projects || []).map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name} — {p.clientName}</MenuItem>
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
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <GroupAddIcon color="primary" />
          <Typography variant="h5">CSR Clients</Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
          Onboard Funder
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : clients.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No funders onboarded yet.
        </Typography>
      ) : (
        clients.map((c) => (
          <Card key={c.id} variant="outlined" sx={{ mb: 1.5 }}>
            <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{c.name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>{c.email}</Typography>
                </Box>
                <Chip size="small" label={c.projectName} />
                {!c.isActive && <Chip size="small" color="warning" label="Revoked" />}
                <Button size="small" onClick={() => toggleAccess(c)}>
                  {c.isActive ? 'Revoke' : 'Restore'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))
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
    </Container>
  );
}
