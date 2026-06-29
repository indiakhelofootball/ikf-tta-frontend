import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, Autocomplete,
} from '@mui/material';

import { trialsAPI } from '../../services/api';

const STATUS_OPTIONS = ['Planned', 'Completed'];

const EMPTY = {
  title: '', activityTypeId: '', date: '', location: '', status: 'Planned', linkedTrialId: '',
};

export default function CSRActivityModal({ open, activity, activityTypes, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [trials, setTrials] = useState([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    trialsAPI.getAll()
      .then((data) => { if (active) setTrials(Array.isArray(data) ? data : data?.results || []); })
      .catch(() => { if (active) setTrials([]); });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (activity) {
      setForm({
        title: activity.title || '',
        activityTypeId: activity.activityTypeId ?? '',
        date: activity.date || '',
        location: activity.location || '',
        status: activity.status || 'Planned',
        linkedTrialId: activity.linkedTrialId ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [activity, open]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Required';
    if (!form.activityTypeId) next.activityTypeId = 'Pick an activity type';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      title: form.title.trim(),
      activityTypeId: Number(form.activityTypeId),
      date: form.date || null,
      location: form.location.trim(),
      status: form.status,
      linkedTrialId: form.linkedTrialId === '' ? null : Number(form.linkedTrialId),
    });
  };

  const noTypes = !activityTypes || activityTypes.length === 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{activity ? 'Edit Activity' : 'New Activity'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title" value={form.title} onChange={setField('title')}
            error={!!errors.title} helperText={errors.title} fullWidth
          />
          <TextField
            label="Activity Type" value={form.activityTypeId} onChange={setField('activityTypeId')}
            select fullWidth error={!!errors.activityTypeId}
            helperText={noTypes ? 'No activity types defined yet — add them in the catalog first.' : errors.activityTypeId}
            disabled={noTypes}
          >
            {(activityTypes || []).map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Date" value={form.date} onChange={setField('date')}
              type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth
            />
            <TextField label="Location" value={form.location} onChange={setField('location')} fullWidth />
          </Stack>
          <TextField label="Status" value={form.status} onChange={setField('status')} select fullWidth>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          <Autocomplete
            options={trials}
            value={trials.find((t) => t.id === Number(form.linkedTrialId)) || null}
            getOptionLabel={(t) => `${t.trialCode ? `${t.trialCode} — ` : ''}${t.trialName || `#${t.id}`}`}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(e, opt) => setForm((f) => ({ ...f, linkedTrialId: opt ? opt.id : '' }))}
            renderInput={(params) => (
              <TextField {...params} label="Linked Trial (optional)" helperText="Link an existing trial, if this activity is one." />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || noTypes}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
