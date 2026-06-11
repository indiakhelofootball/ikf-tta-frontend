// src/components/workorders/WorkOrderCard.jsx

import React from 'react';
import {
  Card, CardContent, Box, Typography, Chip, Stack, Button,
} from '@mui/material';
import {
  Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon,
  Repeat as PeriodicIcon, PushPin as FixedIcon,
  Payment as PaymentIcon, PictureAsPdf as PdfIcon,
  ErrorOutline as BouncedIcon, Restore as ResolveIcon,
} from '@mui/icons-material';
import { WO_STATUS_COLORS, isWOFullyPaid } from './workOrderData';
import useGrants from '../../auth/useGrants';

function WorkOrderCard({ workOrder, onView, onEdit, onDelete, onRaisePayment, onRemoveBounced, onDownloadPDF, isPast }) {
  const { canEdit } = useGrants();
  const fullyPaid = isWOFullyPaid(workOrder);
  const bouncedCount = parseInt(workOrder.bouncedPaymentCount || 0, 10);
  const hasBounced = bouncedCount > 0;
  const statusStyle = WO_STATUS_COLORS[workOrder.status] || WO_STATUS_COLORS.Issued;
  const isPeriodic = workOrder.type === 'Periodic';

  const fmtINR = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(n) || 0);

  return (
    <Card variant="outlined" sx={{
      borderRadius: 2, borderColor: '#e2e8f0', transition: 'all 0.15s ease',
      '&:hover': { borderColor: '#94a3b8', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
    }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>

        {/* Header: WO number + type chip + status chip */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#5B63D3' }}>
                {workOrder.workOrderNumber}
              </Typography>
              <Chip
                icon={isPeriodic ? <PeriodicIcon sx={{ fontSize: '12px !important' }} /> : <FixedIcon sx={{ fontSize: '12px !important' }} />}
                label={isPeriodic ? 'Periodic' : 'Fixed'}
                size="small"
                sx={{
                  bgcolor: isPeriodic ? '#f0fdf4' : '#eef2ff',
                  color: isPeriodic ? '#16a34a' : '#4338ca',
                  border: `1px solid ${isPeriodic ? '#86efac' : '#a5b4fc'}`,
                  fontWeight: 600, fontSize: '0.82rem', height: 22,
                }}
              />
            </Stack>
            <Typography variant="body1" fontWeight={700} sx={{ color: '#1e293b', mt: 0.25 }}>
              {workOrder.vendorName}
            </Typography>
            {(workOrder.vendorType || workOrder.companyType) && (
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                {workOrder.vendorType}
                {workOrder.companyType ? ` · ${workOrder.companyType}` : ''}
              </Typography>
            )}
          </Box>
          <Stack direction="column" alignItems="flex-end" spacing={0.5}>
            <Chip label={workOrder.status} size="small" sx={{
              bgcolor: statusStyle.bg, color: statusStyle.color,
              border: `1px solid ${statusStyle.border}`, fontWeight: 600, fontSize: '0.8rem',
            }} />
            {hasBounced && (
              <Chip
                icon={<BouncedIcon sx={{ fontSize: '14px !important', color: '#dc2626 !important' }} />}
                label={`Bounced ${bouncedCount > 1 ? `(${bouncedCount})` : ''}`}
                size="small"
                sx={{
                  bgcolor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                  fontWeight: 700, fontSize: '0.78rem',
                }}
              />
            )}
          </Stack>
        </Stack>

        {/* Total amount + created date */}
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            {fmtINR(workOrder.amount)}
          </Typography>
          {workOrder.createdAt && (
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {new Date(workOrder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Typography>
          )}
        </Stack>

        {/* TDS info */}
        {parseFloat(workOrder.tdsRate) > 0 && (
          <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600, display: 'block', mb: 0.5 }}>
            TDS: {workOrder.tdsRate}%{workOrder.tdsComment ? ` (${workOrder.tdsComment})` : ''}
          </Typography>
        )}

        {/* Periodic info box */}
        {isPeriodic && (
          <Box sx={{ mb: 1.5, px: 1.5, py: 0.75, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #bbf7d0' }}>
            <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
              {fmtINR(workOrder.amountPerPeriod)} × {workOrder.numberOfPeriods} periods
              {workOrder.paidPeriods && (
                <> — {workOrder.paidPeriods.length}/{workOrder.numberOfPeriods} paid</>
              )}
            </Typography>
          </Box>
        )}

        {/* Actions — Row 1 */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" startIcon={<ViewIcon fontSize="small" />}
            onClick={() => onView(workOrder)}
            sx={{
              textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
              borderColor: '#e2e8f0', color: '#475569', borderRadius: 1.5,
              '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
            }}>
            View
          </Button>
          {canEdit('workorders') && (
            <Button size="small" variant="contained" startIcon={<EditIcon fontSize="small" />}
              onClick={() => onEdit(workOrder)}
              sx={{
                textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                bgcolor: '#FDE68A', color: '#1e293b', borderRadius: 1.5,
                boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
              }}>
              Edit
            </Button>
          )}
          {!isPast && canEdit('workorders') && (
            <Button size="small" variant="outlined" startIcon={<DeleteIcon fontSize="small" />}
              onClick={() => onDelete(workOrder)}
              sx={{
                textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                borderColor: '#fecaca', color: '#dc2626', borderRadius: 1.5,
                '&:hover': { borderColor: '#dc2626', bgcolor: '#fef2f2' },
              }}>
              Delete
            </Button>
          )}
          {onDownloadPDF && (
            <Button size="small" variant="outlined" startIcon={<PdfIcon fontSize="small" />}
              onClick={() => onDownloadPDF(workOrder)}
              sx={{
                textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                borderColor: '#e2e8f0', color: '#7c3aed', borderRadius: 1.5,
                '&:hover': { borderColor: '#7c3aed', bgcolor: '#f5f3ff' },
              }}>
              PDF
            </Button>
          )}
        </Stack>
        {/* Actions — Row 2 */}
        {!isPast && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {onRaisePayment && canEdit('payments') && (
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<PaymentIcon fontSize="small" />}
                disabled={fullyPaid}
                title={fullyPaid ? 'Work order is fully paid' : 'Open Raise Payment with this work order'}
                onClick={() => onRaisePayment(workOrder)}
                sx={{
                  textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                  borderColor: '#bbf7d0', color: '#15803d', borderRadius: 1.5,
                  '&:hover': { borderColor: '#86efac', bgcolor: '#f0fdf4' },
                  '&.Mui-disabled': { borderColor: '#e2e8f0', color: '#94a3b8' },
                }}
              >
                Raise Payment
              </Button>
            )}
            {hasBounced && onRemoveBounced && canEdit('workorders') && (
              <Button
                size="small"
                variant="contained"
                startIcon={<ResolveIcon fontSize="small" />}
                onClick={() => onRemoveBounced(workOrder)}
                title="Permanently delete this work order and its bounced payment records"
                sx={{
                  textTransform: 'none', fontWeight: 700, fontSize: '0.82rem',
                  bgcolor: '#dc2626', color: '#fff', borderRadius: 1.5, boxShadow: 'none',
                  '&:hover': { bgcolor: '#b91c1c', boxShadow: 'none' },
                }}
              >
                Remove
              </Button>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkOrderCard;
