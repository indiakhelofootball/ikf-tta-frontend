// src/components/payments/TagToCSRProjectDialog.jsx
// Tag a payment to a CSR project — from the FINANCE side.
//
// The client was explicit that this action belongs here and not inside CSR:
// "We will show it in finance, not in CSR", "if you tag him from there",
// "the payment will not be in the CSR. If we give it to the CSR person, he will
// say, tomorrow you show it, how will you change it?" So the person who controls
// the money decides which spend counts toward a funder's certificate; the CSR
// manager only reads the result.
//
// Boundary note: this is a payments-module screen calling the CSR API. The
// FRONTEND crosses the boundary; the backend dependency stays one-way (core apps
// never import csr — see InvDepTest). Nothing here reaches into CSR's tables
// directly.

import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, TextField, MenuItem, Alert, Chip, Stack, CircularProgress,
} from '@mui/material';
import { csrAPI } from '../../services/api';

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// Only money that actually moved belongs on a utilisation certificate. Tagging
// anything else is allowed (the operator may tag ahead of disbursement), but it
// is flagged, because the certificate will exclude it until the payment lands.
const CERTIFIABLE_STATUS = 'Payment Done';

export default function TagToCSRProjectDialog({ open, onClose, payment, onTagged }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [note, setNote] = useState('');
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !payment) return;
    let active = true;
    setError('');
    setNote('');
    setProjectId('');
    setExisting(null);
    setLoading(true);

    Promise.all([
      csrAPI.projects.getAll(),
      // Is this payment already tagged? The server refuses a duplicate, but the
      // operator should see that before they pick a project, not after.
      csrAPI.expenseTags.getAll({ payment: payment.id }),
    ])
      .then(([projRes, tagRes]) => {
        if (!active) return;
        const rows = projRes?.results || projRes || [];
        setProjects(rows.filter((p) => p.status !== 'Closed'));
        const tags = tagRes?.results || tagRes || [];
        const mine = tags.find((t) => String(t.paymentId) === String(payment.id));
        setExisting(mine || null);
      })
      .catch(() => {
        // Never swallow this into an empty dropdown — that is the failure mode
        // that made the CSR-side picker look empty instead of forbidden.
        if (active) setError('Could not load CSR projects. You may not have the Utilisation Certificate permission.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [open, payment]);

  if (!payment) return null;

  const handleTag = () => {
    setSaving(true);
    setError('');
    csrAPI.expenseTags
      .create({ projectId, paymentId: payment.id, note })
      .then((tag) => {
        onTagged?.(tag);
        onClose();
      })
      .catch((e) => {
        // The server names the project already holding the payment (INV-AUDIT).
        setError(e?.message || 'Could not tag this payment.');
      })
      .finally(() => setSaving(false));
  };

  const alreadyTagged = Boolean(existing);
  const notYetPaid = payment.status !== CERTIFIABLE_STATUS;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Tag to CSR project</DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {payment.requestNumber} · {payment.vendorName}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
            <Typography variant="h6" fontWeight={700}>{fmtINR(payment.grossAmount)}</Typography>
            <Chip size="small" label={payment.status} />
          </Stack>
        </Box>

        {loading && <CircularProgress size={22} />}

        {!loading && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && alreadyTagged && (
          <Alert severity="info">
            Already tagged to <strong>{existing.projectName || `project #${existing.projectId}`}</strong>.
            A payment may be tagged to only one CSR project — untag it there first to move it.
          </Alert>
        )}

        {!loading && !alreadyTagged && !error && (
          <>
            {notYetPaid && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This payment is <strong>{payment.status}</strong>. It can be tagged now, but it will
                not count toward the utilisation certificate until it reaches “{CERTIFIABLE_STATUS}”.
              </Alert>
            )}

            <TextField
              select fullWidth size="small" label="CSR project" value={projectId}
              onChange={(e) => setProjectId(e.target.value)} sx={{ mb: 2 }}
              helperText="A payment may be tagged to only one CSR project."
            >
              {projects.length === 0 && <MenuItem disabled value="">No open CSR projects</MenuItem>}
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} — {p.clientName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth size="small" label="Note (optional)" value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What this spend covers, for the certificate line item"
            />
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600 }}>
          Close
        </Button>
        {!alreadyTagged && !error && (
          <Button
            onClick={handleTag} variant="contained" disabled={!projectId || saving}
            sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#5B63D3', color: '#fff',
              '&:hover': { bgcolor: '#4338ca' } }}
          >
            {saving ? 'Tagging…' : 'Tag payment'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
