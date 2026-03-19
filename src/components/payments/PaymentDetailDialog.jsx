// src/components/payments/PaymentDetailDialog.jsx
// View + Edit dialog for a payment request

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, IconButton, Divider,
  Stack, Grid, Chip, TextField, FormControl, Select, MenuItem,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccountBalance as BankIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { PR_STATUS_COLORS, PR_STATUSES } from './paymentData';

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const sectionSx = {
  p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2,
};

const labelSx = {
  fontWeight: 700, color: '#64748b', fontSize: '0.68rem',
  letterSpacing: '0.5px', textTransform: 'uppercase', mb: 1, display: 'block',
};

function PaymentDetailDialog({ open, onClose, payment, onUpdate, mode: initialMode = 'view' }) {
  const [mode, setMode] = useState(initialMode);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');

  useEffect(() => {
    if (open && payment) {
      setMode(initialMode);
      setEditStatus(payment.status || 'Draft');
      setEditNotes(payment.notes || '');
      setEditInvoiceDate(payment.invoiceDate || '');
    }
  }, [open, payment, initialMode]);

  if (!payment) return null;

  const statusStyle = PR_STATUS_COLORS[payment.status] || PR_STATUS_COLORS.Draft;

  const handleSave = () => {
    onUpdate(payment.id, {
      status: editStatus,
      notes: editNotes,
      invoiceDate: editInvoiceDate,
      ...(editStatus === 'Payment Done' && !payment.paymentDate
        ? { paymentDate: new Date().toISOString().slice(0, 10) }
        : {}),
    });
    setMode('view');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}>

      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#5B63D3', fontWeight: 700 }}>
            {payment.id}
          </Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
            Payment Request
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={payment.status} size="small" sx={{
            bgcolor: statusStyle.bg, color: statusStyle.color,
            border: `1px solid ${statusStyle.border}`, fontWeight: 600, fontSize: '0.7rem',
          }} />
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>

        {/* Request Details */}
        <Typography sx={labelSx}>Request Details</Typography>
        <Box sx={sectionSx}>
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Request ID</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#5B63D3' }}>{payment.id}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Invoice Date</Typography>
              {mode === 'edit' ? (
                <TextField size="small" type="date" fullWidth value={editInvoiceDate}
                  onChange={(e) => setEditInvoiceDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
              ) : (
                <Typography variant="body2" fontWeight={600}>{payment.invoiceDate || '—'}</Typography>
              )}
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Work Order</Typography>
              <Typography variant="body2" fontWeight={600}>{payment.workOrderNumber}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">WO Type</Typography>
              <Typography variant="body2" fontWeight={600}>{payment.woType}</Typography>
            </Grid>
            {payment.periodLabel && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Period</Typography>
                <Typography variant="body2" fontWeight={600}>{payment.periodLabel}</Typography>
              </Grid>
            )}
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              {mode === 'edit' ? (
                <FormControl fullWidth size="small">
                  <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                    sx={{ borderRadius: 1.5 }}>
                    {PR_STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <Chip label={payment.status} size="small" sx={{
                  bgcolor: statusStyle.bg, color: statusStyle.color,
                  border: `1px solid ${statusStyle.border}`, fontWeight: 600, fontSize: '0.7rem',
                }} />
              )}
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body2" fontWeight={600}>
                {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Vendor */}
        <Typography sx={labelSx}>Vendor</Typography>
        <Box sx={sectionSx}>
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Vendor Name</Typography>
              <Typography variant="body2" fontWeight={700}>{payment.vendorName}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Service Type</Typography>
              <Typography variant="body2" fontWeight={600}>{payment.vendorType}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">PAN Number</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                {payment.panNumber || '—'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">GST Number</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                {payment.gstNumber || '—'}
              </Typography>
            </Grid>
          </Grid>
          {(payment.bankName || payment.accountNumber) && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <BankIcon sx={{ fontSize: 13, color: '#64748b' }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Bank Details
                </Typography>
              </Stack>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Bank</Typography>
                  <Typography variant="body2" fontWeight={600}>{payment.bankName || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{payment.accountType || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Number</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {payment.accountNumber || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">IFSC Code</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {payment.ifscCode || '—'}
                  </Typography>
                </Grid>
              </Grid>
            </>
          )}
        </Box>

        {/* Payment Summary */}
        <Typography sx={labelSx}>Payment Summary</Typography>
        <Box sx={{ ...sectionSx, mb: 0 }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Gross Amount</Typography>
              <Typography variant="body2" fontWeight={700}>{fmtINR(payment.grossAmount)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: '#dc2626' }}>
                TDS ({payment.tdsRate || 0}%)
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>
                − {fmtINR(payment.tdsAmount)}
              </Typography>
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body1" fontWeight={800}>Net Payable</Typography>
              <Typography variant="body1" fontWeight={800} sx={{ color: '#16a34a', fontSize: '1.1rem' }}>
                {fmtINR(payment.netAmount)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: '#dc2626' }}>TDS to Deposit</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#dc2626' }}>
                {fmtINR(payment.tdsAmount)}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Notes */}
        {(mode === 'edit' || payment.notes) && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={labelSx}>Notes</Typography>
            {mode === 'edit' ? (
              <TextField size="small" fullWidth multiline minRows={2} value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
            ) : (
              <Typography variant="body2" sx={{ color: '#475569' }}>
                {payment.notes || '—'}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{
          textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0',
          color: '#475569', borderRadius: 1.5,
          '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
        }}>
          Close
        </Button>

        {mode === 'view' && (
          <Button onClick={() => setMode('edit')} variant="contained" startIcon={<EditIcon fontSize="small" />}
            sx={{
              textTransform: 'none', fontWeight: 600, bgcolor: '#FDE68A',
              color: '#1e293b', borderRadius: 1.5, px: 3, boxShadow: 'none',
              '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
            }}>
            Edit
          </Button>
        )}

        {mode === 'edit' && (
          <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon fontSize="small" />}
            sx={{
              textTransform: 'none', fontWeight: 600, bgcolor: '#5B63D3',
              color: '#fff', borderRadius: 1.5, px: 3, boxShadow: 'none',
              '&:hover': { bgcolor: '#4338ca', boxShadow: 'none' },
            }}>
            Save Changes
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default PaymentDetailDialog;
