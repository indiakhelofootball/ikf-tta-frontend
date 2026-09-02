import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Stack, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';

import { csrAPI } from '../../services/api';
import '../../styles/csrDesign.css';
import ConfirmDialog from '../common/ConfirmDialog';

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
  const [confirmState, setConfirmState] = useState(null);

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

  const remove = (r) => setConfirmState({
    title: 'Delete branding',
    message: `Delete branding "${r.displayName}"?`,
    confirmLabel: 'Delete',
    onConfirm: async () => {
      setSaving(true);
      try {
        await csrAPI.branding.delete(r.id);
        notify('Branding deleted.');
        load();
      } catch (e) {
        notify(e.message || 'Delete failed.', 'error');
      } finally {
        setSaving(false);
        setConfirmState(null);
      }
    },
  });

  return (
    <div className="csrx csrx-page csrx-narrow">
      <div className="ph">
        <div>
          <h2>Client Portal Branding</h2>
          <p>
            White-label a funder&rsquo;s portal — logo, colours and login image,
            per grant. The funder reaches their branded login at{' '}
            <code>/client/&lt;slug&gt;/login</code>.
          </p>
        </div>
        <button type="button" className="ghostbtn" onClick={() => navigate('/admin')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Admin Settings
        </button>
        <button type="button" className="newbtn" onClick={openCreate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          New
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spin" /></div>
      ) : rows.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <h3>No branding yet</h3>
            Without a branding row a funder has no door of their own — this is
            what turns <code>/client/&lt;slug&gt;/login</code> into a real page.
          </div>
        </div>
      ) : (
        <div className="twrap">
          {rows.map((r) => (
            <div className="setrow" key={r.id}>
              <span
                className="swatch"
                style={{ background: r.primaryColor || '#2C6A4F' }}
                aria-hidden="true"
              />
              <span className="setrow-c">
                <span className="setrow-n">{r.displayName}</span>
                <span className="setrow-s">/client/{r.slug}/login</span>
              </span>
              {!r.isActive && <span className="pill closed">Inactive</span>}
              <button type="button" className="ico g" aria-label={`Edit branding ${r.displayName}`} onClick={() => openEdit(r)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
              <button type="button" className="ico r" aria-label={`Delete branding ${r.displayName}`} onClick={() => remove(r)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
              </button>
            </div>
          ))}
        </div>
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

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        busy={saving}
        onConfirm={() => confirmState?.onConfirm()}
        onClose={() => setConfirmState(null)}
      />

      <Snackbar
        open={toast.open} autoHideDuration={4000}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((s) => ({ ...s, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </div>
  );
}
