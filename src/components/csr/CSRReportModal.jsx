import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, FormControlLabel, Switch,
} from '@mui/material';

const EMPTY = {
  fileName: '', fileUrl: '', activityId: '', visibleToClient: false,
};

export default function CSRReportModal({ open, report, activities, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (report) {
      setForm({
        fileName: report.fileName || '',
        fileUrl: report.fileUrl || '',
        activityId: report.activityId ?? '',
        visibleToClient: !!report.visibleToClient,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [report, open]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.fileName.trim()) next.fileName = 'Required';
    if (!form.fileUrl.trim()) next.fileUrl = 'Paste the document link';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      fileName: form.fileName.trim(),
      fileUrl: form.fileUrl.trim(),
      activityId: form.activityId === '' ? null : Number(form.activityId),
      visibleToClient: form.visibleToClient,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{report ? 'Edit Report' : 'New Report'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Report Name" value={form.fileName} onChange={setField('fileName')}
            error={!!errors.fileName} helperText={errors.fileName} fullWidth
          />
          <TextField
            label="Document Link" value={form.fileUrl} onChange={setField('fileUrl')}
            error={!!errors.fileUrl} helperText={errors.fileUrl || 'External link (e.g. Drive), per the app convention.'}
            fullWidth
          />
          <TextField
            label="Activity (optional)" value={form.activityId} onChange={setField('activityId')}
            select fullWidth helperText="Attach this report to a specific activity."
          >
            <MenuItem value="">— None —</MenuItem>
            {(activities || []).map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.title}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={form.visibleToClient}
                onChange={(e) => setForm((f) => ({ ...f, visibleToClient: e.target.checked }))}
              />
            }
            label="Visible to client"
          />
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
