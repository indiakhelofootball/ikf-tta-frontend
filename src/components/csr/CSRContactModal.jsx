import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, MenuItem,
} from '@mui/material';

// The three sides the 26 Aug review named: IKF representative, client
// representative, vendor representative. Blank stays selectable because
// contacts recorded before the field existed carry no type, and picking one
// for them would be inventing a fact about a real person.
const CONTACT_TYPES = ['Client', 'IKF', 'Vendor'];

const EMPTY = { name: '', designation: '', contactType: '', email: '', phone: '' };

export default function CSRContactModal({ open, contact, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

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

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
          <TextField
            label="Name" value={form.name} onChange={setField('name')}
            error={!!error} helperText={error} fullWidth
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
