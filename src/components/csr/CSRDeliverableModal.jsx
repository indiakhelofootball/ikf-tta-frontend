import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack,
} from '@mui/material';

import { DELIVERABLE_STATUSES } from './csrContractRules';

const EMPTY = {
  title: '', description: '', targetCount: '', completedCount: '',
  dueDate: '', status: 'Pending',
};

export default function CSRDeliverableModal({
  open, deliverable, contractLabel, onClose, onSave, saving, serverErrors,
}) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (deliverable) {
      setForm({
        title: deliverable.title || '',
        description: deliverable.description || '',
        targetCount: deliverable.targetCount ?? '',
        completedCount: deliverable.completedCount ?? '',
        dueDate: deliverable.dueDate || '',
        status: deliverable.status || 'Pending',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [deliverable, open]);

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length) setErrors(serverErrors);
  }, [serverErrors]);

  const setField = (k) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Required';
    if (form.targetCount !== '' && Number(form.targetCount) < 0) next.targetCount = 'Cannot be negative';
    if (form.completedCount !== '' && Number(form.completedCount) < 0) {
      next.completedCount = 'Cannot be negative';
    }
    if (
      form.targetCount !== '' && form.completedCount !== '' &&
      Number(form.completedCount) > Number(form.targetCount)
    ) {
      next.completedCount = 'More than the target';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      targetCount: form.targetCount === '' ? null : Number(form.targetCount),
      completedCount: form.completedCount === '' ? null : Number(form.completedCount),
      dueDate: form.dueDate || null,
      status: form.status,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {deliverable ? 'Edit Deliverable' : 'New Deliverable'}
        {contractLabel ? ` — ${contractLabel}` : ''}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title" value={form.title} onChange={setField('title')}
            error={!!errors.title} helperText={errors.title} fullWidth
          />
          <TextField
            label="Description" value={form.description} onChange={setField('description')}
            multiline minRows={2}
            error={!!errors.description} helperText={errors.description} fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Target Count" value={form.targetCount} onChange={setField('targetCount')}
              type="number" error={!!errors.targetCount} helperText={errors.targetCount} fullWidth
            />
            <TextField
              label="Completed Count" value={form.completedCount} onChange={setField('completedCount')}
              type="number" error={!!errors.completedCount} helperText={errors.completedCount} fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Due Date" value={form.dueDate} onChange={setField('dueDate')}
              type="date" slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.dueDate} helperText={errors.dueDate} fullWidth
            />
            <TextField
              label="Status" value={form.status} onChange={setField('status')} select
              error={!!errors.status} helperText={errors.status} fullWidth
            >
              {DELIVERABLE_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Stack>
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
