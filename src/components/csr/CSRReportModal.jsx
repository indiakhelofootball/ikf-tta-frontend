import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, FormControlLabel, Switch,
} from '@mui/material';

// The kinds the 26 Aug review asked to distinguish: "what is the report of the
// trial, what is the report of the workshop... what will be the type of report".
// 'Overall' added per 26 Aug review, 16:21: a grant-wide report is distinct
// from 'Other' (uncategorised) -- every other value here is an activity kind.
const REPORT_TYPES = ['Trial', 'Workshop', 'Training Programme', 'Overall', 'Other'];

const EMPTY = {
  title: '', reportType: '', fileName: '', fileUrl: '', activityId: '',
  visibleToClient: false,
};

export default function CSRReportModal({ open, report, activities, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (report) {
      setForm({
        // Reports created before `title` existed put the report's name in
        // fileName -- this modal literally labelled that field "Report Name".
        // Falling back to it keeps the name the user actually typed rather
        // than showing them an empty required field.
        title: report.title || report.fileName || '',
        reportType: report.reportType || '',
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
    if (!form.title.trim()) next.title = 'Required';
    if (!form.fileUrl.trim()) next.fileUrl = 'Paste the document link';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      title: form.title.trim(),
      reportType: form.reportType,
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
            label="Report Name" value={form.title} onChange={setField('title')}
            error={!!errors.title} helperText={errors.title || 'What this report is.'}
            fullWidth
          />
          <TextField
            label="Report Type" value={form.reportType} onChange={setField('reportType')}
            select fullWidth helperText="Trial, workshop, training programme, or other."
          >
            <MenuItem value="">—</MenuItem>
            {REPORT_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="File Name (optional)" value={form.fileName} onChange={setField('fileName')}
            fullWidth helperText="The document's own file name, if it differs."
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
