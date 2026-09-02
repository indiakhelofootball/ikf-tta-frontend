import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack,
} from '@mui/material';

const EMPTY = {
  reference: '', title: '', amount: '', contractFileName: '', contractDriveLink: '',
  documentDate: '', startDate: '', endDate: '', notes: '',
};

export default function CSRContractModal({ open, contract, onClose, onSave, saving, serverErrors }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contract) {
      setForm({
        reference: contract.reference || '',
        title: contract.title || '',
        amount: contract.amount ?? '',
        contractFileName: contract.contractFileName || '',
        contractDriveLink: contract.contractDriveLink || '',
        documentDate: contract.documentDate || '',
        startDate: contract.startDate || '',
        endDate: contract.endDate || '',
        notes: contract.notes || '',
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [contract, open]);

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
    if (!form.title.trim() && !form.reference.trim()) {
      next.reference = 'Give the contract a reference or a title';
    }
    if (form.amount === '' || Number.isNaN(Number(form.amount))) {
      next.amount = 'Enter an amount';
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      next.endDate = 'End date is before the start date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      reference: form.reference.trim(),
      title: form.title.trim(),
      amount: form.amount,
      contractFileName: form.contractFileName.trim(),
      contractDriveLink: form.contractDriveLink.trim(),
      documentDate: form.documentDate || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {/* "Record", not "New". By the time a CSR grant exists the contract has
          already been signed — 26 Aug review, 1105s: "The new contract will not
          come here, because you are going in the future. You have already taken
          the contract, you have already asked for the amount." This form
          captures a contract that exists; it does not draft one. */}
      <DialogTitle>{contract ? 'Edit grant contract' : 'Record the grant contract'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Reference" value={form.reference} onChange={setField('reference')}
            error={!!errors.reference} helperText={errors.reference} fullWidth
          />
          <TextField
            label="Title" value={form.title} onChange={setField('title')}
            error={!!errors.title} helperText={errors.title} fullWidth
          />
          <TextField
            label="Contract Amount (₹)" value={form.amount} onChange={setField('amount')}
            type="number" error={!!errors.amount} helperText={errors.amount} fullWidth
          />
          {/* Signed Date removed on the 26 Aug client review ("we will remove
              the sign date"). The backend column is kept so no recorded date is
              destroyed; it is simply no longer asked for or served. */}
          {/* Document date sits WITH the other two, not where the sign date
              used to be. The 26 Aug review removed the sign date and named this
              as its replacement in the same breath — by the time a grant
              reaches CSR the contract is signed, so the date that matters is
              the one printed on the document in hand. */}
          <TextField
            label="Document Date" value={form.documentDate}
            onChange={setField('documentDate')}
            type="date" slotProps={{ inputLabel: { shrink: true } }}
            error={!!errors.documentDate} helperText={errors.documentDate} fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start Date" value={form.startDate} onChange={setField('startDate')}
              type="date" slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.startDate} helperText={errors.startDate} fullWidth
            />
            <TextField
              label="End Date" value={form.endDate} onChange={setField('endDate')}
              type="date" slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.endDate} helperText={errors.endDate} fullWidth
            />
          </Stack>
          <TextField
            label="Document Name" value={form.contractFileName}
            onChange={setField('contractFileName')}
            error={!!errors.contractFileName} helperText={errors.contractFileName} fullWidth
          />
          <TextField
            label="Document Link" value={form.contractDriveLink}
            onChange={setField('contractDriveLink')}
            error={!!errors.contractDriveLink}
            helperText={errors.contractDriveLink || 'Link to the signed contract. Must be an http or https address.'}
            fullWidth
          />
          <TextField
            label="Notes" value={form.notes} onChange={setField('notes')}
            multiline minRows={2}
            error={!!errors.notes} helperText={errors.notes} fullWidth
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
