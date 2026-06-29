import React, { useState } from 'react';
import {
  Card, CardContent, Typography, TextField, Button, Stack, Snackbar, Alert,
} from '@mui/material';

import apiService from '../../services/api';

const EMPTY = { oldPassword: '', newPassword: '', newPassword2: '' };

export default function ChangePasswordCard() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(''); };

  const submit = async () => {
    if (!form.oldPassword || !form.newPassword) { setError('Fill in all fields'); return; }
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (form.newPassword !== form.newPassword2) { setError('New passwords do not match'); return; }
    setSaving(true);
    try {
      await apiService.changePassword(form);
      setForm(EMPTY);
      setToast({ open: true, message: 'Password changed.', severity: 'success' });
    } catch (e) {
      setError(e.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>Change Password</Typography>
        <Stack spacing={2} sx={{ maxWidth: 420 }}>
          <TextField
            label="Current password" type="password"
            value={form.oldPassword} onChange={set('oldPassword')} fullWidth
          />
          <TextField
            label="New password" type="password"
            value={form.newPassword} onChange={set('newPassword')} fullWidth
          />
          <TextField
            label="Confirm new password" type="password"
            value={form.newPassword2} onChange={set('newPassword2')}
            error={!!error} helperText={error} fullWidth
          />
          <Button
            variant="contained" onClick={submit} disabled={saving}
            sx={{ alignSelf: 'flex-start' }}
          >
            {saving ? 'Saving…' : 'Change Password'}
          </Button>
        </Stack>
      </CardContent>
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
    </Card>
  );
}
