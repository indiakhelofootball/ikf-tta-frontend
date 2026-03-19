// src/components/workorders/WorkOrderDetailView.jsx

import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, Stack, Divider, IconButton,
} from '@mui/material';
import {
  Close as CloseIcon, Edit as EditIcon,
  Repeat as PeriodicIcon, AttachMoney as FixedIcon,
} from '@mui/icons-material';
import { WO_STATUS_COLORS, getPeriodLabel } from './workOrderData';

function WorkOrderDetailView({ open, onClose, workOrder, onEdit }) {
  if (!workOrder) return null;

  const statusStyle = WO_STATUS_COLORS[workOrder.status] || WO_STATUS_COLORS.Issued;
  const isPeriodic = workOrder.type === 'Periodic';
  const paidPeriods = workOrder.paidPeriods || [];

  const fmtAmount = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const sectionSx = {
    p: 2,
    bgcolor: '#f8fafc',
    borderRadius: 2,
    border: '1px solid #e2e8f0',
    mb: 2,
  };

  const labelSx = {
    fontWeight: 700,
    color: '#64748b',
    fontSize: '0.68rem',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    mb: 0.5,
    display: 'block',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}
    >
      {/* Header: WO number + vendor name + chips */}
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ color: '#5B63D3', fontWeight: 700 }}>
              {workOrder.workOrderNumber}
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
              {workOrder.vendorName}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75}>
            <Chip
              label={workOrder.status}
              size="small"
              sx={{
                bgcolor: statusStyle.bg, color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`, fontWeight: 600, fontSize: '0.7rem',
              }}
            />
            <Chip
              icon={isPeriodic ? <PeriodicIcon sx={{ fontSize: 14 }} /> : <FixedIcon sx={{ fontSize: 14 }} />}
              label={workOrder.type}
              size="small"
              sx={{
                bgcolor: isPeriodic ? '#f0fdf4' : '#eef2ff',
                color: isPeriodic ? '#16a34a' : '#4338ca',
                fontWeight: 600, fontSize: '0.65rem',
              }}
            />
          </Stack>
        </Stack>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>

        {/* Description */}
        <Typography sx={labelSx}>Description</Typography>
        <Box sx={sectionSx}>
          <Typography variant="body2" sx={{ color: '#1e293b' }}>
            {workOrder.serviceDescription || '—'}
          </Typography>
        </Box>

        {/* Amount info */}
        <Typography sx={labelSx}>Amount</Typography>
        <Box sx={sectionSx}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b' }}>
            {fmtAmount(workOrder.amount)}
          </Typography>
        </Box>

        {/* Periodic details + period chips */}
        {isPeriodic && (
          <>
            <Typography sx={labelSx}>Periodic Details</Typography>
            <Box sx={{ ...sectionSx, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Amount / Period</Typography>
                  <Typography variant="body2" fontWeight={700}>{fmtAmount(workOrder.amountPerPeriod)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Periods</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {paidPeriods.length} / {workOrder.numberOfPeriods} paid
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
                {Array.from({ length: workOrder.numberOfPeriods }, (_, i) => i + 1).map((p) => {
                  const paid = paidPeriods.includes(p);
                  return (
                    <Chip key={p}
                      label={getPeriodLabel(workOrder, p)}
                      size="small"
                      sx={{
                        fontWeight: 600, fontSize: '0.65rem',
                        bgcolor: paid ? '#dcfce7' : '#fff',
                        color: paid ? '#16a34a' : '#64748b',
                        border: `1px solid ${paid ? '#86efac' : '#e2e8f0'}`,
                        textDecoration: paid ? 'line-through' : 'none',
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          </>
        )}

        {/* Vendor — A-to-Z details */}
        <Typography sx={labelSx}>Vendor Details</Typography>
        <Box sx={{ ...sectionSx, bgcolor: '#fffbeb', borderColor: '#fde68a', mb: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#92400e' }}>Vendor Name</Typography>
              <Typography variant="body2" fontWeight={700}>{workOrder.vendorName}</Typography>
            </Box>
            {workOrder.vendorType && (
              <Box>
                <Typography variant="caption" sx={{ color: '#92400e' }}>Service Type</Typography>
                <Typography variant="body2" fontWeight={600}>{workOrder.vendorType}</Typography>
              </Box>
            )}
            {workOrder.companyType && (
              <Box>
                <Typography variant="caption" sx={{ color: '#92400e' }}>Entity Type</Typography>
                <Typography variant="body2" fontWeight={600}>{workOrder.companyType}</Typography>
              </Box>
            )}
            {workOrder.contactPerson && (
              <Box>
                <Typography variant="caption" sx={{ color: '#92400e' }}>Contact Person</Typography>
                <Typography variant="body2" fontWeight={600}>{workOrder.contactPerson}</Typography>
              </Box>
            )}
            {workOrder.phone && (
              <Box>
                <Typography variant="caption" sx={{ color: '#92400e' }}>Phone</Typography>
                <Typography variant="body2" fontWeight={600}>{workOrder.phone}</Typography>
              </Box>
            )}
            {workOrder.email && (
              <Box>
                <Typography variant="caption" sx={{ color: '#92400e' }}>Email</Typography>
                <Typography variant="body2" fontWeight={600}>{workOrder.email}</Typography>
              </Box>
            )}
            {workOrder.address && (
              <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                <Typography variant="caption" sx={{ color: '#92400e' }}>Address</Typography>
                <Typography variant="body2" fontWeight={600}>{workOrder.address}</Typography>
              </Box>
            )}
          </Box>

          {/* PAN & GST */}
          {(workOrder.panNumber || workOrder.gstNumber) && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
              {workOrder.panNumber && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#92400e' }}>PAN Number</Typography>
                  <Box sx={{
                    display: 'inline-block', px: 1, py: 0.2,
                    bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 1,
                    fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700,
                    color: '#c2410c', letterSpacing: '0.08em',
                  }}>
                    {workOrder.panNumber.toUpperCase()}
                  </Box>
                </Box>
              )}
              {workOrder.gstNumber && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#92400e' }}>GST Number</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {workOrder.gstNumber}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Bank Details — linked to PAN */}
          {(workOrder.bankName || workOrder.accountNumber || workOrder.ifscCode) && (
            <>
              <Divider sx={{ mb: 2, borderColor: '#fde68a' }} />
              <Typography variant="caption" fontWeight={700} sx={{ color: '#92400e', display: 'block', mb: 1.5 }}>
                Bank Details
                {workOrder.panNumber && (
                  <span style={{ fontWeight: 400 }}> — linked to PAN {workOrder.panNumber.toUpperCase()}</span>
                )}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {workOrder.bankName && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#92400e' }}>Bank</Typography>
                    <Typography variant="body2" fontWeight={600}>{workOrder.bankName}</Typography>
                  </Box>
                )}
                {workOrder.accountType && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#92400e' }}>Account Type</Typography>
                    <Typography variant="body2" fontWeight={600}>{workOrder.accountType}</Typography>
                  </Box>
                )}
                {workOrder.accountNumber && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#92400e' }}>Account Number</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {workOrder.accountNumber}
                    </Typography>
                  </Box>
                )}
                {workOrder.ifscCode && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#92400e' }}>IFSC Code</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                      {workOrder.ifscCode}
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0',
            color: '#475569', borderRadius: 1.5,
            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
          }}
        >
          Close
        </Button>
        <Button
          onClick={() => { onClose(); onEdit(workOrder); }}
          variant="contained"
          startIcon={<EditIcon fontSize="small" />}
          sx={{
            textTransform: 'none', fontWeight: 600, bgcolor: '#FDE68A',
            color: '#1e293b', borderRadius: 1.5, px: 3, boxShadow: 'none',
            '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
          }}
        >
          Edit Work Order
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WorkOrderDetailView;
