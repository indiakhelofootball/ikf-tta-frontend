import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Stack, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Box, InputAdornment,
} from '@mui/material';

import { csrAPI, brandImageUrl } from '../../services/api';
import '../../styles/csrDesign.css';
import '../../styles/clientPortal.css';
import ConfirmDialog from '../common/ConfirmDialog';
import { normaliseHex, isTooLightForText } from './brandColour';
import { brandCssVars } from '../client/clientTheme';
import { trimLogo, logoNotes, checkImageFile, suggestSlug } from './brandImage';

const HEX_ERROR = 'Use a 6-digit hex colour, e.g. #2C6A4F.';
const TOO_LIGHT = 'Too light for text on white; the portal will use a darker shade of it for text.';
// A native colour input always holds some colour; this is what it shows while
// the typed value is blank or invalid. It is never saved on its own.
const SWATCH_FALLBACK = '#FFFFFF';

const EMPTY = {
  projectId: '', slug: '', displayName: '',
  logoUrl: '', loginImageUrl: '', primaryColor: '', secondaryColor: '', isActive: true,
};
// A picked image waiting for Save: the file to send, a local preview, and what
// the rules said about it. `remove` deletes the uploaded copy on Save.
const NO_IMAGES = {
  logo: { file: null, preview: '', notes: [], error: '', remove: false },
  'login-image': { file: null, preview: '', notes: [], error: '', remove: false },
};
const fmtSize = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// What the funder will see, drawn with the portal's own stylesheet and the
// same colour rules, so the preview cannot disagree with the real page.
function BrandPreview({ name, colour, logo, loginImage }) {
  const vars = brandCssVars(colour) || {};
  const shown = name || 'Funder name';
  return (
    <div className="cportal bprev" style={vars}>
      <div className={`bprev-login${loginImage ? ' photo' : ''}`} style={loginImage ? { backgroundImage: `url(${loginImage})` } : undefined}>
        <span className="bprev-chip">{logo ? <img src={logo} alt="" /> : <b>{shown}</b>}</span>
        <span className="bprev-title">Sign in to your programme report</span>
      </div>
      <div className="cbar bprev-bar">
        <div className="cbar-id">
          {logo && <img className="cbar-logo" src={logo} alt="" />}
          <span className="cbar-name">{shown}</span>
        </div>
      </div>
      <div className="bprev-body">
        <div className="ceyebrow">Programme report for {shown}</div>
        <div className="bprev-h">Football Changing Lives 2026</div>
        <div className="ctrack"><div className="cfill" style={{ width: '64%' }} /></div>
        <span className="cbtn bprev-btn">Open</span>
      </div>
    </div>
  );
}

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
  const [images, setImages] = useState(NO_IMAGES);
  const [slugTouched, setSlugTouched] = useState(false);

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

  const openCreate = () => {
    setForm(EMPTY); setErrors({}); setImages(NO_IMAGES); setSlugTouched(false);
    setModal({ open: true, editing: null });
  };
  const openEdit = (r) => {
    setForm({
      projectId: r.projectId ?? '', slug: r.slug || '', displayName: r.displayName || '',
      logoUrl: r.logoUrl || '', loginImageUrl: r.loginImageUrl || '',
      primaryColor: r.primaryColor || '', secondaryColor: r.secondaryColor || '',
      isActive: r.isActive !== false,
    });
    setErrors({});
    setImages(NO_IMAGES);
    setSlugTouched(true);
    setModal({ open: true, editing: r });
  };

  const setDisplayName = (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, displayName: value, ...(slugTouched ? {} : { slug: suggestSlug(value) }) }));
  };

  const pickImage = (kind) => async (e) => {
    const picked = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!picked) return;
    const error = checkImageFile(picked, kind);
    if (error) {
      setImages((m) => ({ ...m, [kind]: { ...NO_IMAGES[kind], error } }));
      return;
    }
    let file = picked;
    let notes = [];
    if (kind === 'logo') {
      try {
        const t = await trimLogo(picked);
        file = t.file;
        notes = logoNotes(t);
      } catch {
        setImages((m) => ({ ...m, [kind]: { ...NO_IMAGES[kind], error: 'This image could not be read.' } }));
        return;
      }
    }
    setImages((m) => ({ ...m, [kind]: { file, preview: URL.createObjectURL(file), notes, error: '', remove: false } }));
  };

  // What the preview shows for an image: a newly picked file, else the copy
  // already uploaded (unless it is being removed), else the pasted link.
  const previewSrc = (kind, summaryKey, link) => {
    const st = images[kind];
    if (st.file) return st.preview;
    const up = modal.editing?.[summaryKey];
    if (up && !st.remove) return brandImageUrl(modal.editing.slug, kind, up.version);
    return link || '';
  };

  const imageField = (kind, label, hint, uploaded) => {
    const st = images[kind];
    const current = !st.remove && uploaded;
    return (
      <div className="bimg">
        <div className="bimg-l">{label}</div>
        <div className="bimg-row">
          <Button component="label" variant="outlined" size="small">
            {st.file || current ? 'Replace' : 'Upload'}
            <input hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label={`${label} file`} onChange={pickImage(kind)} />
          </Button>
          {st.file ? <span className="bimg-n">{st.file.name}, {fmtSize(st.file.size)}, uploaded when you save</span>
            : current ? <span className="bimg-n">{uploaded.name}, {fmtSize(uploaded.size)}</span>
              : <span className="bimg-n">{hint}</span>}
          {(st.file || current) && (
            <Button
              size="small"
              onClick={() => setImages((m) => ({ ...m, [kind]: { ...NO_IMAGES[kind], remove: !!uploaded } }))}
            >
              Remove
            </Button>
          )}
        </div>
        {st.error && <div className="bimg-warn" role="alert">{st.error}</div>}
        {st.notes.map((n) => <div key={n.text} className={n.level === 'warn' ? 'bimg-warn' : 'bimg-ok'}>{n.text}</div>)}
      </div>
    );
  };

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const setColour = (k) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [k]: e.target.type === 'color' ? value.toUpperCase() : value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const colourField = (k, label, placeholder) => {
    const value = form[k];
    const hex = normaliseHex(value);
    const note = k === 'primaryColor' && isTooLightForText(value) ? TOO_LIGHT : '';
    return (
      <TextField
        label={label} value={value} onChange={setColour(k)} placeholder={placeholder} fullWidth
        error={!!errors[k]} helperText={errors[k] || note}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Box
                  component="input" type="color" aria-label={`${label} swatch`}
                  value={(hex || SWATCH_FALLBACK).toLowerCase()} onChange={setColour(k)}
                  sx={{ width: 28, height: 28, p: 0, border: 0, bgcolor: 'transparent', cursor: 'pointer' }}
                />
              </InputAdornment>
            ),
          },
        }}
      />
    );
  };

  const save = async () => {
    const next = {};
    if (!form.projectId) next.projectId = 'Pick a project';
    if (!form.slug.trim()) next.slug = 'Required';
    if (!form.displayName.trim()) next.displayName = 'Required';
    ['primaryColor', 'secondaryColor'].forEach((k) => {
      if (form[k].trim() && !normaliseHex(form[k])) next[k] = HEX_ERROR;
    });
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        projectId: Number(form.projectId),
        slug: form.slug.trim().toLowerCase(),
        primaryColor: normaliseHex(form.primaryColor) || '',
        secondaryColor: normaliseHex(form.secondaryColor) || '',
      };
      const saved = modal.editing
        ? await csrAPI.branding.update(modal.editing.id, payload)
        : await csrAPI.branding.create(payload);
      const id = modal.editing ? modal.editing.id : saved?.id;
      const failures = [];
      for (const kind of ['logo', 'login-image']) {
        const st = images[kind];
        try {
          if (st.file && id) await csrAPI.brandingImage.upload(id, kind, st.file);
          else if (st.remove && id) await csrAPI.brandingImage.remove(id, kind);
        } catch (err) {
          failures.push(`${kind === 'logo' ? 'Logo' : 'Login image'}: ${err.message}`);
        }
      }
      if (failures.length) notify(`Branding saved, but ${failures.join(' ')}`, 'warning');
      else notify('Branding saved.');
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

      <Dialog open={modal.open} onClose={() => setModal({ open: false, editing: null })} fullWidth maxWidth="md">
        <DialogTitle>{modal.editing ? 'Edit Branding' : 'New Branding'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Project" value={form.projectId} onChange={setField('projectId')} select fullWidth
              error={!!errors.projectId} helperText={errors.projectId} disabled={!!modal.editing}
            >
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField
              label="Display name" value={form.displayName} onChange={setDisplayName}
              error={!!errors.displayName} fullWidth slotProps={{ htmlInput: { maxLength: 60 } }}
              helperText={errors.displayName || `${form.displayName.length} of 60 characters, so the header never wraps.`}
            />
            <TextField
              label="Slug (URL key)" value={form.slug}
              onChange={(e) => { setSlugTouched(true); setField('slug')(e); }}
              disabled={!!modal.editing?.slugLocked}
              error={!!errors.slug} fullWidth
              helperText={errors.slug || (modal.editing?.slugLocked
                ? `Locked: a funder has already signed in at /client/${form.slug}/login.`
                : `Invitation link: /client/${form.slug || '<slug>'}/login. It locks once the funder signs in.`)}
            />
            {imageField('logo', 'Logo', 'PNG, JPG or WEBP, up to 1 MB. Empty edges are trimmed.', modal.editing?.logoFile)}
            {imageField('login-image', 'Login image', 'Optional programme photo, up to 4 MB. A dark overlay keeps text readable.', modal.editing?.loginImageFile)}
            <TextField label="Logo URL" value={form.logoUrl} onChange={setField('logoUrl')} fullWidth helperText="Only used when no logo is uploaded." />
            <TextField label="Login image URL" value={form.loginImageUrl} onChange={setField('loginImageUrl')} fullWidth helperText="Only used when no login image is uploaded." />
            <Stack direction="row" spacing={2}>
              {colourField('primaryColor', 'Primary colour', '#0B5FFF')}
              {colourField('secondaryColor', 'Secondary colour', '#22C55E')}
            </Stack>
            <TextField label="Status" value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'active' }))} select fullWidth>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
          <section className="bprev-wrap" aria-label="Preview">
            <div className="bimg-l">Preview</div>
            <BrandPreview
              name={form.displayName.trim()}
              colour={form.primaryColor}
              logo={previewSrc('logo', 'logoFile', form.logoUrl)}
              loginImage={previewSrc('login-image', 'loginImageFile', form.loginImageUrl)}
            />
          </section>
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
