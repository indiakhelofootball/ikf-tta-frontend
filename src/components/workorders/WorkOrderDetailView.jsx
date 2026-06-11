// src/components/workorders/WorkOrderDetailView.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, Stack, Divider, IconButton,
} from '@mui/material';
import {
  Close as CloseIcon, Edit as EditIcon,
  Repeat as PeriodicIcon, AttachMoney as FixedIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { WO_STATUS_COLORS, getPeriodLabel } from './workOrderData';
import { workOrdersAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';

function WorkOrderDetailView({ open, onClose, workOrder, onEdit }) {
  const { canEdit } = useGrants();
  const [fullWO, setFullWO] = useState(null);

  useEffect(() => {
    if (open && workOrder?.id) {
      workOrdersAPI.getById(wo.id)
        .then((data) => setFullWO(data))
        .catch(() => setFullWO(null));
    } else {
      setFullWO(null);
    }
  }, [open, workOrder?.id]);

  if (!workOrder) return null;

  // Merge: use full WO data (with changeLogs) if available, fall back to passed prop
  const wo = fullWO || workOrder;

  const statusStyle = WO_STATUS_COLORS[wo.status] || WO_STATUS_COLORS.Issued;
  const isPeriodic = wo.type === 'Periodic';
  const paidPeriods = wo.paidPeriods || [];

  const fmtAmount = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(n) || 0);

  const sectionSx = {
    p: 2.5,
    bgcolor: '#f8fafc',
    borderRadius: 2,
    border: '1px solid #e2e8f0',
    mb: 2.5,
  };

  const labelSx = {
    fontWeight: 700,
    color: '#94a3b8',
    fontSize: '0.82rem',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    mb: 0.75,
    display: 'block',
  };

  const captionSx = { display: 'block', color: '#94a3b8', fontSize: '0.82rem', mb: 0.25 };
  const valueSx = { color: '#334155', lineHeight: 1.6 };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}
    >
      {/* Header: WO number + vendor name + chips */}
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ color: '#5B63D3', fontWeight: 700 }}>
              {wo.workOrderNumber}
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
              {wo.vendorName}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75}>
            <Chip
              label={wo.status}
              size="small"
              sx={{
                bgcolor: statusStyle.bg, color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`, fontWeight: 600, fontSize: '0.8rem',
              }}
            />
            <Chip
              icon={isPeriodic ? <PeriodicIcon sx={{ fontSize: 14 }} /> : <FixedIcon sx={{ fontSize: 14 }} />}
              label={wo.type}
              size="small"
              sx={{
                bgcolor: isPeriodic ? '#f0fdf4' : '#eef2ff',
                color: isPeriodic ? '#16a34a' : '#4338ca',
                fontWeight: 600, fontSize: '0.8rem',
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
          <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.7 }}>
            {wo.serviceDescription || '—'}
          </Typography>
        </Box>

        {/* Amount info */}
        <Typography sx={labelSx}>Amount</Typography>
        <Box sx={sectionSx}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b' }}>
            {fmtAmount(wo.amount)}
          </Typography>
        </Box>

        {/* Periodic details + period chips */}
        {isPeriodic && (
          <>
            <Typography sx={labelSx}>Periodic Details</Typography>
            <Box sx={{ ...sectionSx, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <Stack direction="row" spacing={3} sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={captionSx}>Amount / Period</Typography>
                  <Typography variant="body2" fontWeight={700} sx={valueSx}>{fmtAmount(wo.amountPerPeriod)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={captionSx}>Periods</Typography>
                  <Typography variant="body2" fontWeight={700} sx={valueSx}>
                    {paidPeriods.length} / {wo.numberOfPeriods} paid
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
                {Array.from({ length: wo.numberOfPeriods }, (_, i) => i + 1).map((p) => {
                  const paid = paidPeriods.includes(p);
                  return (
                    <Chip key={p}
                      label={getPeriodLabel(wo, p)}
                      size="small"
                      sx={{
                        fontWeight: 600, fontSize: '0.8rem',
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

        {/* Change Log */}
        {wo.changeLogs && wo.changeLogs.length > 0 && (
          <>
            <Typography sx={labelSx}>
              <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                <HistoryIcon sx={{ fontSize: 16 }} />
                <span>Change Log</span>
              </Stack>
            </Typography>
            <Box sx={{ ...sectionSx, bgcolor: '#fef3c7', borderColor: '#fde68a', mb: 2.5 }}>
              {wo.changeLogs.map((log) => (
                <Stack key={log.id} direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
                  <Typography variant="caption" sx={{ color: '#92400e', whiteSpace: 'nowrap', minWidth: 120 }}>
                    {new Date(log.changedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' '}
                    {new Date(log.changedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#78350f' }}>
                    {log.changedBy}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#92400e' }}>
                    changed <strong>{log.fieldName}</strong> from <span style={{ textDecoration: 'line-through' }}>{log.oldValue}</span> → <strong>{log.newValue}</strong>
                  </Typography>
                </Stack>
              ))}
            </Box>
          </>
        )}

        {/* Vendor — A-to-Z details */}
        <Typography sx={labelSx}>Vendor Details</Typography>
        <Box sx={{ ...sectionSx, bgcolor: '#fffbeb', borderColor: '#fde68a', mb: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Vendor Name</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.vendorName}</Typography>
            </Box>
            {wo.vendorType && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Service Type</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.vendorType}</Typography>
              </Box>
            )}
            {wo.companyType && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Entity Type</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.companyType}</Typography>
              </Box>
            )}
            {wo.contactPerson && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Contact Person</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.contactPerson}</Typography>
              </Box>
            )}
            {wo.phone && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Phone</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.phone}</Typography>
              </Box>
            )}
            {wo.email && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Email</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.email}</Typography>
              </Box>
            )}
            {wo.address && (
              <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Address</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.address}</Typography>
              </Box>
            )}
          </Box>

          {/* PAN & GST */}
          {(wo.panNumber || wo.gstNumber) && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              {wo.panNumber && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.5 }}>PAN Number</Typography>
                  <Box sx={{
                    display: 'inline-block', px: 1, py: 0.2,
                    bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 1,
                    fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700,
                    color: '#c2410c', letterSpacing: '0.08em',
                  }}>
                    {wo.panNumber.toUpperCase()}
                  </Box>
                </Box>
              )}
              {wo.gstNumber && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>GST Number</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', color: '#334155', lineHeight: 1.6 }}>
                    {wo.gstNumber}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Bank Details — linked to PAN */}
          {(wo.bankName || wo.accountNumber || wo.ifscCode) && (
            <>
              <Divider sx={{ mb: 2, borderColor: '#fde68a' }} />
              <Typography variant="caption" fontWeight={700} sx={{ color: '#92400e', display: 'block', mb: 1.5 }}>
                Bank Details
                {wo.panNumber && (
                  <span style={{ fontWeight: 400 }}> — linked to PAN {wo.panNumber.toUpperCase()}</span>
                )}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {wo.bankName && (
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Bank</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.bankName}</Typography>
                  </Box>
                )}
                {wo.accountType && (
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Account Type</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#334155', lineHeight: 1.6 }}>{wo.accountType}</Typography>
                  </Box>
                )}
                {wo.accountNumber && (
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>Account Number</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', color: '#334155', lineHeight: 1.6 }}>
                      {wo.accountNumber}
                    </Typography>
                  </Box>
                )}
                {wo.ifscCode && (
                  <Box>
                    <Typography variant="caption" sx={{ display: 'block', color: '#92400e', mb: 0.25 }}>IFSC Code</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', color: '#334155', lineHeight: 1.6 }}>
                      {wo.ifscCode}
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
        {canEdit('workorders') && (
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
        )}
      </DialogActions>
    </Dialog>
  );
}

export default WorkOrderDetailView;
