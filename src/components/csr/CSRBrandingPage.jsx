import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Stack, Snackbar, Alert, CircularProgress,
  List, ListItem, ListItemText, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon, ArrowBack as BackIcon, Edit as EditIcon, Delete as DeleteIcon,
} from '@mui/icons-material';

import { csrAPI } from '../../services/api';

const EMPTY = {
  projectId: '', slug: '', displayName: '',
  logoUrl: '', loginImageUrl: '', primaryColor: '', secondaryColor: '', isActive: true,
};

export default function CSRBrandingPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const notify = (message, severity = 'success') => setToast({ open: true, message, severity });
  const asList = (d) => (Array.isArray(d) ? d : d?.results || []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([csrAPI.branding.getAll(), csrAPI.projects.getAll()]);
      setRows(asList(b));
      setProjects(asList(p));
    } catch (e) {
      notify(e.message || 'Failed to load branding.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setErrors({}); setModal({ open: true, editing: null }); };
  const openEdit = (r) => {
    setForm({
      projectId: r.projectId ?? '', slug: r.slug || '', displayName: r.displayName || '',
      logoUrl: r.logoUrl || '', loginImageUrl: r.loginImageUrl || '',
      primaryColor: r.primaryColor || '', secondaryColor: r.secondaryColor || '',
      isActive: r.isActive !== false,
    });
    setErrors({});
    setModal({ open: true, editing: r });
  };

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const next = {};
    if (!form.projectId) next.projectId = 'Pick a project';
    if (!form.slug.trim()) next.slug = 'Required';
    if (!form.displayName.trim()) next.displayName = 'Required';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = { ...form, projectId: Number(form.projectId), slug: form.slug.trim().toLowerCase() };
      if (modal.editing) await csrAPI.branding.update(modal.editing.id, payload);
      else await csrAPI.branding.create(payload);
      notify('Branding saved.');
      setModal({ open: false, editing: null });
      load();
    } catch (e) {
      notify(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete branding "${r.displayName}"?`)) return;
    try {
      await csrAPI.branding.delete(r.id);
      notify('Branding deleted.');
      load();
    } catch (e) {
      notify(e.message || 'Delete failed.', 'error');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/admin')} sx={{ mb: 2 }}>
        Admin Settings
      </Button>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5">Client Portal Branding</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        White-label a funder's portal: logo, colours, and login image per project. The funder
        reaches their branded login at <code>/client/&lt;slug&gt;/login</code>.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No branding yet.</Typography>
      ) : (
        <List>
          {rows.map((r) => (
            <ListItem
              key={r.id}
              divider
              secondaryAction={(
                <>
                  <IconButton size="small" onClick={() => openEdit(r)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => remove(r)}><DeleteIcon fontSize="small" /></IconButton>
                </>
              )}
            >
              <ListItemText primary={`${r.displayName} (/${r.slug})`} />
              {!r.isActive && <Chip size="small" label="Inactive" sx={{ mr: 1 }} />}
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={modal.open} onClose={() => setModal({ open: false, editing: null })} fullWidth maxWidth="sm">
        <DialogTitle>{modal.editing ? 'Edit Branding' : 'New Branding'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Project" value={form.projectId} onChange={setField('projectId')} select fullWidth
              error={!!errors.projectId} helperText={errors.projectId} disabled={!!modal.editing}
            >
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField label="Slug (URL key)" value={form.slug} onChange={setField('slug')} error={!!errors.slug} helperText={errors.slug || 'e.g. acme → /client/acme/login'} fullWidth />
            <TextField label="Display name" value={form.displayName} onChange={setField('displayName')} error={!!errors.displayName} helperText={errors.displayName} fullWidth />
            <TextField label="Logo URL" value={form.logoUrl} onChange={setField('logoUrl')} fullWidth />
            <TextField label="Login image URL" value={form.loginImageUrl} onChange={setField('loginImageUrl')} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Primary colour" value={form.primaryColor} onChange={setField('primaryColor')} placeholder="#0B5FFF" fullWidth />
              <TextField label="Secondary colour" value={form.secondaryColor} onChange={setField('secondaryColor')} placeholder="#22C55E" fullWidth />
            </Stack>
            <TextField label="Status" value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'active' }))} select fullWidth>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal({ open: false, editing: null })} disabled={saving}>Cancel</Button>
          <Button onClick={save} variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open} autoHideDuration={4000}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((s) => ({ ...s, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Container>
  );
}
