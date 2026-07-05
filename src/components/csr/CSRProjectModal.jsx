import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, Autocomplete,
} from '@mui/material';

import { workOrdersAPI } from '../../services/api';

const STATUS_OPTIONS = ['Active', 'Closed'];

const EMPTY = {
  name: '', clientName: '', sanctionedAmount: '',
  startDate: '', endDate: '', status: 'Active', description: '', workOrderId: '',
};

export default function CSRProjectModal({ open, project, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        clientName: project.clientName || '',
        sanctionedAmount: project.sanctionedAmount ?? '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        status: project.status || 'Active',
        description: project.description || '',
        workOrderId: project.workOrderId ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [project, open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    workOrdersAPI.getAll()
      .then((data) => { if (active) setWorkOrders(Array.isArray(data) ? data : data?.results || []); })
      .catch(() => { if (active) setWorkOrders([]); });
    return () => { active = false; };
  }, [open]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Required';
    if (!form.clientName.trim()) next.clientName = 'Required';
    if (form.sanctionedAmount === '' || Number.isNaN(Number(form.sanctionedAmount))) {
      next.sanctionedAmount = 'Enter an amount';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      clientName: form.clientName.trim(),
      sanctionedAmount: form.sanctionedAmount,
      status: form.status,
      description: form.description.trim(),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      workOrderId: form.workOrderId === '' ? null : Number(form.workOrderId),
    });
  };

  const woLabel = (wo) => `${wo.workOrderNumber || `#${wo.id}`}${wo.vendorName ? ` — ${wo.vendorName}` : ''}`;
  const selectedWO = workOrders.find((w) => w.id === Number(form.workOrderId)) || null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{project ? 'Edit CSR Project' : 'New CSR Project'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Project Name" value={form.name} onChange={setField('name')}
            error={!!errors.name} helperText={errors.name} fullWidth
          />
          <TextField
            label="Client / Funder" value={form.clientName} onChange={setField('clientName')}
            error={!!errors.clientName} helperText={errors.clientName} fullWidth
          />
          <TextField
            label="Sanctioned Amount (₹)" value={form.sanctionedAmount}
            onChange={setField('sanctionedAmount')} type="number"
            error={!!errors.sanctionedAmount} helperText={errors.sanctionedAmount} fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start Date" value={form.startDate} onChange={setField('startDate')}
              type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth
            />
            <TextField
              label="End Date" value={form.endDate} onChange={setField('endDate')}
              type="date" slotProps={{ inputLabel: { shrink: true } }} fullWidth
            />
          </Stack>
          <TextField label="Status" value={form.status} onChange={setField('status')} select fullWidth>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description" value={form.description} onChange={setField('description')}
            multiline minRows={2} fullWidth
          />
          <Autocomplete
            options={workOrders}
            value={selectedWO}
            getOptionLabel={woLabel}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(e, opt) => setForm((f) => ({ ...f, workOrderId: opt ? opt.id : '' }))}
            renderInput={(params) => (
              <TextField {...params} label="Work Order (optional)" helperText="Link the contract work order." />
            )}
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
