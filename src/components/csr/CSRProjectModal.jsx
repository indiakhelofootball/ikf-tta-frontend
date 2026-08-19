import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Stack, Autocomplete,
} from '@mui/material';

import { workOrdersAPI } from '../../services/api';
import { getProjectNames } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';
import { SEASONS } from '../trials/trialConstants';

const STATUS_OPTIONS = ['Active', 'Closed'];

const EMPTY = {
  name: '', clientName: '', sanctionedAmount: '',
  startDate: '', endDate: '', status: 'Active', description: '', workOrderId: '',
  projectRefId: '', season: '',
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
        projectRefId: project.projectRefId ?? '',
        season: project.season || '',
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

  // Sync getter + version subscription, the documented way admin-managed
  // dropdowns are consumed. Seeded rows carry synthetic string ids that are not
  // ConfigOption primary keys, so they are filtered out — offering one would
  // post a value the backend must reject.
  const cfgVersion = useConfigVersion();
  const ttaProjects = useMemo(
    () => getProjectNames().filter((p) => typeof p.id === 'number'),
    [cfgVersion],
  );

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
      projectRefId: form.projectRefId === '' ? null : Number(form.projectRefId),
      season: form.season,
    });
  };

  const woLabel = (wo) => `${wo.workOrderNumber || `#${wo.id}`}${wo.vendorName ? ` — ${wo.vendorName}` : ''}`;
  const selectedWO = workOrders.find((w) => w.id === Number(form.workOrderId)) || null;

  // A saved reference whose catalog row has not arrived yet (or is no longer
  // offered) still has to render as itself. Falling back to the server's
  // read-only ttaProjectName keeps editing an unrelated field from silently
  // clearing the identity.
  const selectedTTAProject = form.projectRefId === '' ? null
    : ttaProjects.find((p) => p.id === Number(form.projectRefId))
      || { id: Number(form.projectRefId), name: project?.ttaProjectName || `#${form.projectRefId}` };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{project ? 'Edit CSR Project' : 'New CSR Project'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Project Name" value={form.name} onChange={setField('name')}
            error={!!errors.name}
            helperText={errors.name || "This grant's own label, e.g. Khelo Girls Initiative — Chhattisgarh."}
            fullWidth
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Autocomplete
              options={ttaProjects}
              value={selectedTTAProject}
              getOptionLabel={(p) => p.name || ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(e, opt) => setForm((f) => ({ ...f, projectRefId: opt ? opt.id : '' }))}
              fullWidth
              renderInput={(params) => (
                <TextField
                  {...params} label="Runs Under TTA Project (optional)"
                  helperText="Which existing TTA project this grant funds."
                />
              )}
            />
            <TextField
              label="Season (optional)" value={form.season} onChange={setField('season')}
              select fullWidth helperText="The season of that TTA project."
            >
              <MenuItem value=""><em>Not set</em></MenuItem>
              {SEASONS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Stack>
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
