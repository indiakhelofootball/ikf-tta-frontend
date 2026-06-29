import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack,
  ToggleButton, ToggleButtonGroup, Autocomplete,
} from '@mui/material';

import { paymentRequestsAPI } from '../../services/api';

export default function CSRExpenseTagModal({ open, onClose, onSave, saving }) {
  const [mode, setMode] = useState('payment');
  const [payments, setPayments] = useState([]);
  const [paymentId, setPaymentId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('payment');
    setPaymentId('');
    setManualAmount('');
    setNote('');
    setError('');
    let active = true;
    paymentRequestsAPI.getAll({ limit: 1000 })
      .then((d) => { if (active) setPayments(Array.isArray(d) ? d : d?.results || []); })
      .catch(() => { if (active) setPayments([]); });
    return () => { active = false; };
  }, [open]);

  const handleSave = () => {
    if (mode === 'payment') {
      if (!paymentId) { setError('Pick a payment'); return; }
      onSave({ paymentId: Number(paymentId), manualAmount: null, note: note.trim() });
    } else {
      if (manualAmount === '' || Number.isNaN(Number(manualAmount))) { setError('Enter an amount'); return; }
      onSave({ paymentId: null, manualAmount, note: note.trim() });
    }
  };

  const pLabel = (p) => `${p.vendorName || 'Vendor'} — ₹${p.grossAmount} (#${p.id})`;
  const selectedPayment = payments.find((p) => p.id === Number(paymentId)) || null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Tag an Expense</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup
            value={mode} exclusive size="small"
            onChange={(e, v) => { if (v) { setMode(v); setError(''); } }}
          >
            <ToggleButton value="payment">Link a payment</ToggleButton>
            <ToggleButton value="manual">Manual amount</ToggleButton>
          </ToggleButtonGroup>

          {mode === 'payment' ? (
            <Autocomplete
              options={payments}
              value={selectedPayment}
              getOptionLabel={pLabel}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(e, opt) => { setPaymentId(opt ? opt.id : ''); setError(''); }}
              renderInput={(params) => (
                <TextField {...params} label="Payment" error={!!error} helperText={error || 'A payment can be tagged to only one project.'} />
              )}
            />
          ) : (
            <TextField
              label="Amount (₹)" type="number" value={manualAmount}
              onChange={(e) => { setManualAmount(e.target.value); setError(''); }}
              error={!!error} helperText={error} fullWidth
            />
          )}

          <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Tag'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
