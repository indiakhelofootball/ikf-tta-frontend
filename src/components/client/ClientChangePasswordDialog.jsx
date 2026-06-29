import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Alert,
} from '@mui/material';

import apiService from '../../services/api';

const EMPTY = { oldPassword: '', newPassword: '', newPassword2: '' };

// Gives a funder a way to rotate the initial password they were onboarded with —
// the client portal has no TTA sidebar / Profile page, so this is their only path.
export default function ClientChangePasswordDialog({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(EMPTY); setError(''); setDone(''); }
  }, [open]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(''); };

  const submit = async () => {
    if (!form.oldPassword || !form.newPassword) { setError('Fill in all fields'); return; }
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (form.newPassword !== form.newPassword2) { setError('New passwords do not match'); return; }
    setSaving(true);
    try {
      await apiService.changePassword(form);
      setDone('Password changed.');
      setForm(EMPTY);
    } catch (e) {
      setError(e.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {done && <Alert severity="success">{done}</Alert>}
          <TextField label="Current password" type="password" value={form.oldPassword} onChange={set('oldPassword')} fullWidth />
          <TextField label="New password" type="password" value={form.newPassword} onChange={set('newPassword')} fullWidth />
          <TextField
            label="Confirm new password" type="password" value={form.newPassword2}
            onChange={set('newPassword2')} error={!!error} helperText={error} fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Close</Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Change'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
