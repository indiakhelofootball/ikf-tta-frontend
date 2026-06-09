// src/components/reports/ReportsHub.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Paper, Stack, Chip, Tooltip,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Store as VendorIcon,
  Assignment as WorkOrderIcon,
  Receipt as TDSIcon,
  Share as SocialIcon,
  AccountBalance as BatchIcon,
} from '@mui/icons-material';

const REPORTS = [
  {
    key: 'payment-audit',
    title: 'Payment Audit',
    description: 'Every payment with automatic flags for duplicates, multi-bounces, stale payments, missing TDS and over-payments.',
    icon: <PaymentIcon />,
    path: '/reports/payment-audit',
    status: 'live',
    color: '#5B63D3',
  },
  {
    key: 'vendor-audit',
    title: 'Vendor Audit',
    description: 'One row per vendor. Total committed, paid, pending, TDS and bounces. Auto-detected duplicate PAN, shared bank account and KYC gaps.',
    icon: <VendorIcon />,
    path: '/reports/vendor-audit',
    status: 'live',
    color: '#0891b2',
  },
  {
    key: 'trial-spend',
    title: 'Trial Spend',
    description: 'One row per trial with cumulative spend, count of work orders and bounces. Orphan work orders surfaced separately.',
    icon: <WorkOrderIcon />,
    path: '/reports/trial-spend',
    status: 'live',
    color: '#16a34a',
  },
  {
    key: 'batch-report',
    title: 'Batch and Bank Reconciliation',
    description: 'Every batch sent to the bank with its payments, bounce rate and breakdown by bank (IDFC, ICICI).',
    icon: <BatchIcon />,
    path: '/reports/batches',
    status: 'soon',
    color: '#d97706',
  },
  {
    key: 'tds-monthly',
    title: 'TDS Monthly Reconciliation',
    description: 'TDS due vs deposited per month, late deposits, section-wise breakdown for return filing.',
    icon: <TDSIcon />,
    path: '/reports/tds-monthly',
    status: 'soon',
    color: '#dc2626',
  },
  {
    key: 'social-media',
    title: 'Social Media',
    description: 'REP social media presence with logos and MOU documents.',
    icon: <SocialIcon />,
    path: '/reports/social-media',
    status: 'live',
    color: '#7c3aed',
  },
];

function ReportTile({ report, onOpen }) {
  const isLive = report.status === 'live';
  return (
    <Tooltip title={report.description} placement="top" arrow>
      <Box
        onClick={isLive ? onOpen : undefined}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          px: 1.75, py: 1, borderRadius: 999,
          bgcolor: report.color,
          cursor: isLive ? 'pointer' : 'not-allowed',
          opacity: isLive ? 1 : 0.55,
          transition: 'all 0.15s',
          width: '100%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          '&:hover': isLive
            ? { filter: 'brightness(1.08)', boxShadow: '0 3px 10px rgba(0,0,0,0.12)' }
            : {},
        }}
      >
        <Box sx={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(255,255,255,0.25)', color: '#ffffff',
          '& svg': { fontSize: '1rem' },
        }}>
          {report.icon}
        </Box>
        <Typography
          fontWeight={700}
          noWrap
          sx={{ color: '#ffffff', fontSize: '0.82rem', flex: 1, minWidth: 0 }}
        >
          {report.title}
        </Typography>
        {!isLive && (
          <Chip
            label="Soon"
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.9)', color: '#64748b',
              fontSize: '0.6rem', fontWeight: 600, height: 18,
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
}

function ReportsHub() {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Stack sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b' }}>
            Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Cross-module analysis and audit. Open any report to see filtered, sorted, flagged data without touching the operational modules.
          </Typography>
        </Stack>

        <Grid container spacing={1.5}>
          {REPORTS.map(r => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={r.key}>
              <ReportTile report={r} onOpen={() => navigate(r.path)} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default ReportsHub;
