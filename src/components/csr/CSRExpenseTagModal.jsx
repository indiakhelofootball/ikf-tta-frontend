import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Alert,
} from '@mui/material';

// Typing an amount is the ONLY thing this modal does, and that is the requirement
// rather than a limitation. The client drew the line twice:
//   "we will control the payment according to ourselves and tag it. But it will
//    not remain in the CSR section."
//   "even if we make a screen there, in the utilisation certificate the person
//    will just type it."
// So a CSR-side screen is permitted and it is typing-only. Linking a real payment
// is a FINANCE action and happens on the payment itself, via "Tag to CSR" in
// payments/TagToCSRProjectDialog.jsx.
//
// This modal used to offer a "Link a payment" toggle that fetched the whole
// payment ledger. Defaulting it to manual was not enough: anyone holding both
// `csr` and `csr_certificate` — the pair seed_csr_demo grants together — could
// switch to it and tag a live payment from inside CSR. The ledger fetch is gone
// too, not just the control, because reading the ledger from CSR was itself the
// leak the split exists to prevent.
export default function CSRExpenseTagModal({ open, onClose, onSave, saving }) {
  const [manualAmount, setManualAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setManualAmount('');
    setNote('');
    setError('');
  }, [open]);

  const handleSave = () => {
    if (manualAmount === '' || Number.isNaN(Number(manualAmount))) {
      setError('Enter an amount');
      return;
    }
    // paymentId stays null from this surface by construction, not by choice of mode.
    onSave({ paymentId: null, manualAmount, note: note.trim() });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Tag an Expense</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            This records a typed figure. To tag an actual payment, open the payment
            and use <strong>Tag to CSR</strong> — that is done by the finance team,
            from the payment itself.
          </Alert>

          <TextField
            label="Amount (₹)" type="number" value={manualAmount}
            onChange={(e) => { setManualAmount(e.target.value); setError(''); }}
            error={!!error} helperText={error} fullWidth
          />

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
