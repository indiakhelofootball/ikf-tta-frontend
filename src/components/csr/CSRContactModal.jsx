import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, MenuItem, Autocomplete, Typography,
} from '@mui/material';
import { csrAPI } from '../../services/api';

// The three sides the 26 Aug review named: IKF representative, client
// representative, vendor representative. Blank stays selectable because
// contacts recorded before the field existed carry no type, and picking one
// for them would be inventing a fact about a real person.
const CONTACT_TYPES = ['Client', 'IKF', 'Vendor'];

const EMPTY = { name: '', designation: '', contactType: '', email: '', phone: '' };

export default function CSRContactModal({ open, contact, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [knownContacts, setKnownContacts] = useState([]);

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name || '',
        designation: contact.designation || '',
        contactType: contact.contactType || '',
        email: contact.email || '',
        phone: contact.phone || '',
      });
    } else {
      setForm(EMPTY);
    }
    setError('');
  }, [contact, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    csrAPI.contacts.getAll().then((data) => {
      if (cancelled) return;
      const list = Array.isArray(data) ? data : data?.results || [];
      // The same IKF/client people are re-typed on every grant (client review,
      // 26 Aug — "IKF has 5-6 contacts"). Dedupe by email so one person picked
      // across many grants shows once; contacts with no email fall back to a
      // lowercased name so they still collapse.
      const byKey = new Map();
      list.forEach((c) => {
        const key = (c.email || '').trim().toLowerCase() || (c.name || '').trim().toLowerCase();
        if (key && !byKey.has(key)) byKey.set(key, c);
      });
      setKnownContacts(
        Array.from(byKey.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
    }).catch(() => {
      if (!cancelled) setKnownContacts([]);
    });
    return () => { cancelled = true; };
  }, [open]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Picking a suggestion prefills the other fields but never carries the
  // source contact's id — each grant keeps its own contact row, this is just
  // a shortcut for typing the same person in again.
  const applySuggestion = (picked) => {
    if (!picked || typeof picked !== 'object') return;
    setForm((f) => ({
      ...f,
      name: picked.name || f.name,
      designation: picked.designation || f.designation,
      email: picked.email || f.email,
      phone: picked.phone || f.phone,
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    onSave({
      name: form.name.trim(),
      designation: form.designation.trim(),
      contactType: form.contactType,
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{contact ? 'Edit Contact' : 'New Contact'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            freeSolo
            fullWidth
            options={knownContacts}
            inputValue={form.name}
            onInputChange={(e, newValue) => setForm((f) => ({ ...f, name: newValue }))}
            onChange={(e, newValue) => applySuggestion(newValue)}
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
            isOptionEqualToValue={(option, value) => option.name === value?.name}
            renderOption={(props, option) => (
              <li {...props} key={option.id ?? `${option.name}-${option.email}`}>
                <Stack>
                  <span>{option.name}</span>
                  {/* `caption` is uppercase by theme — it exists for column
                      labels. An address rendered ADITI.RANE@EXAMPLE.ORG is
                      harder to match against the one in your inbox, and reads as
                      shouting. Override the transform here rather than weakening
                      the variant everything else relies on. */}
                  {option.email && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}
                    >
                      {option.email}
                    </Typography>
                  )}
                </Stack>
              </li>
            )}
            renderInput={(params) => (
              <TextField {...params} label="Name" error={!!error} helperText={error} />
            )}
          />
          <TextField label="Designation" value={form.designation} onChange={setField('designation')} fullWidth />
          <TextField
            label="Contact Type" value={form.contactType} onChange={setField('contactType')}
            select fullWidth helperText="Whose representative this is."
          >
            <MenuItem value="">—</MenuItem>
            {CONTACT_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t} representative</MenuItem>
            ))}
          </TextField>
          <TextField label="Email" value={form.email} onChange={setField('email')} fullWidth />
          <TextField label="Phone" value={form.phone} onChange={setField('phone')} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
