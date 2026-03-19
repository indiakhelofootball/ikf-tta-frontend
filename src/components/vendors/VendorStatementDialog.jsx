// src/components/vendors/VendorStatementDialog.jsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, IconButton, Divider, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { getVendorStatement, PR_STATUS_COLORS, FAKE_TDS_RECORDS } from '../payments/paymentData';

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function VendorStatementDialog({ open, onClose, vendor }) {
  if (!vendor) return null;

  const stmt = getVendorStatement(vendor.id, FAKE_TDS_RECORDS);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Vendor Statement</Typography>
          <Typography variant="body2" color="text.secondary">{vendor.vendorName}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>

        {/* Summary Cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Gross Paid', value: stmt.totalGross, color: '#1e293b' },
            { label: 'TDS Deducted', value: stmt.totalTDS, color: '#dc2626' },
            { label: 'Net Paid', value: stmt.totalNet, color: '#16a34a' },
            { label: 'Pending', value: stmt.pendingAmount, color: '#d97706' },
          ].map((s) => (
            <Box key={s.label} sx={{
              flex: 1, p: 2, bgcolor: '#f8fafc', borderRadius: 2,
              border: '1px solid #e2e8f0',
            }}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>
                {fmtINR(s.value)}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Payment History Table */}
        {stmt.requests.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No payment requests found for this vendor.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['DATE', 'REQUEST ID', 'WORK ORDER', 'GROSS', 'TDS', 'NET', 'STATUS', 'TDS DEPOSIT'].map(h => (
                    <TableCell key={h} sx={{
                      fontWeight: 700, fontSize: '0.7rem', color: '#6b7280',
                      letterSpacing: '0.05em',
                    }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {stmt.requests.map((r) => {
                  const statusStyle = PR_STATUS_COLORS[r.status] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{r.invoiceDate || '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#5B63D3' }}>{r.id}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>
                        {r.workOrderNumber}
                        {r.periodLabel && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {r.periodLabel}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem' }}>{fmtINR(r.grossAmount)}</TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#dc2626' }}>
                        − {fmtINR(r.tdsAmount)}
                        <Typography variant="caption" display="block" color="text.secondary">
                          ({r.tdsRate}%)
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#16a34a' }}>
                        {fmtINR(r.netAmount)}
                      </TableCell>
                      <TableCell>
                        <Chip label={r.status} size="small" sx={{
                          fontSize: '0.65rem', fontWeight: 600,
                          bgcolor: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`,
                        }} />
                      </TableCell>
                      <TableCell>
                        {r.status === 'Payment Done' && r.tdsAmount > 0 ? (
                          r.tdsDeposited ? (
                            <Chip label="Deposited" size="small" sx={{
                              fontSize: '0.6rem', fontWeight: 600,
                              bgcolor: '#f0fdf4', color: '#16a34a',
                              border: '1px solid #bbf7d0',
                            }} />
                          ) : (
                            <Chip label="Pending" size="small" sx={{
                              fontSize: '0.6rem', fontWeight: 600,
                              bgcolor: '#fef9c3', color: '#ca8a04',
                              border: '1px solid #fde68a',
                            }} />
                          )
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Totals row */}
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    TOTAL (Completed Payments)
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem' }}>{fmtINR(stmt.totalGross)}</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#dc2626' }}>
                    − {fmtINR(stmt.totalTDS)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#16a34a' }}>
                    {fmtINR(stmt.totalNet)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{
          textTransform: 'none', fontWeight: 600, borderRadius: 1.5,
          borderColor: '#e2e8f0', color: '#475569',
          '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
        }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VendorStatementDialog;
