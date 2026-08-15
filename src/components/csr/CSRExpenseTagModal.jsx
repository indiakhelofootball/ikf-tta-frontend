import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack,
  ToggleButton, ToggleButtonGroup, Autocomplete, Alert,
} from '@mui/material';

import { paymentRequestsAPI } from '../../services/api';

export default function CSRExpenseTagModal({ open, onClose, onSave, saving }) {
  const [mode, setMode] = useState('payment');
  const [payments, setPayments] = useState([]);
  const [paymentId, setPaymentId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  // Distinguishes "no payments exist" from "you may not see payments". Collapsing
  // the two into an empty list is what made this modal look merely empty when it
  // was actually forbidden.
  const [paymentsDenied, setPaymentsDenied] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Manual is the CSR-side default. Linking a real payment is a FINANCE action
    // and lives on the payment screen ("Tag to CSR"), per the client's own split:
    // "We will show it in finance, not in CSR" / "if you tag him from there".
    setMode('manual');
    setPaymentId('');
    setManualAmount('');
    setNote('');
    setError('');
    setPaymentsDenied(false);
    let active = true;
    paymentRequestsAPI.getAll({ limit: 1000 })
      .then((d) => { if (active) setPayments(Array.isArray(d) ? d : d?.results || []); })
      .catch((e) => {
        // Never swallow this into an empty dropdown. A 403 here is expected for a
        // CSR-side user — say so, rather than showing a picker that silently
        // offers nothing under helper text promising it works.
        if (!active) return;
        setPayments([]);
        setPaymentsDenied(true);
      });
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

          {mode === 'payment' && paymentsDenied ? (
            <Alert severity="info">
              Linking a real payment is done by the finance team, from the payment
              itself — open the payment and use <strong>Tag to CSR</strong>. Your
              access does not include the payments ledger. Use{' '}
              <strong>Manual amount</strong> here instead.
            </Alert>
          ) : mode === 'payment' ? (
            <Autocomplete
              options={payments}
              value={selectedPayment}
              getOptionLabel={pLabel}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(e, opt) => { setPaymentId(opt ? opt.id : ''); setError(''); }}
              noOptionsText="No payments available to tag."
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
        <Button onClick={handleSave} variant="contained" disabled={saving || (mode === 'payment' && paymentsDenied)}>
          {saving ? 'Saving…' : 'Tag'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
