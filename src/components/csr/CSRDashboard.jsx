// src/components/csr/CSRDashboard.jsx
// The CSR app's landing page.
//
// Specified in three documents and never built, which is why a csr-grant user
// landed on TTA's /dashboard — a page whose stat cards filter over
// trials/reps/vendors/workorders/payments and therefore rendered a welcome
// banner and nothing else, at every login.
//
// Metrics are exactly the three CSR_PRODUCT_DESIGN.md §4 named:
//   "counts: active projects, sanctioned vs tagged spend, pending reports".

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Stack, Chip, LinearProgress, Alert, Skeleton,
} from '@mui/material';
import {
  FolderSpecial as ProjectsIcon,
  AccountBalanceWallet as SpendIcon,
  Description as ReportsIcon,
} from '@mui/icons-material';
import { csrAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(Number(n) || 0);

const cardSx = {
  p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0', height: '100%',
};

function StatCard({ icon, label, value, sub, tone = '#5B63D3' }) {
  return (
    <Paper elevation={0} sx={cardSx}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 1.5, display: 'grid', placeItems: 'center',
          bgcolor: `${tone}14`, color: tone,
        }}>
          {icon}
        </Box>
        <Typography sx={{
          fontWeight: 700, color: '#5A6B82', fontSize: '0.75rem',
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h4" fontWeight={800} sx={{ color: '#1e293b', lineHeight: 1.1 }}>
        {value}
      </Typography>
      {sub && <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>{sub}</Typography>}
    </Paper>
  );
}

export default function CSRDashboard() {
  const navigate = useNavigate();
  const { canView } = useGrants();
  const [projects, setProjects] = useState([]);
  const [utilised, setUtilised] = useState(null);
  const [pendingReports, setPendingReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    csrAPI.projects.getAll()
      .then((res) => {
        if (!active) return;
        const rows = res?.results || res || [];
        setProjects(rows);

        // Sanctioned vs tagged: the certificate endpoint is the only
        // server-authoritative source of "utilised", and it already applies the
        // Payment Done rule. Summing tags client-side would drift from the PDF.
        const active_ = rows.filter((p) => p.status !== 'Closed');
        return Promise.all(
          active_.map((p) =>
            csrAPI.utilisationCertificate(p.id)
              .then((c) => Number(c.totalUtilised) || 0)
              .catch(() => 0)
          )
        ).then((totals) => {
          if (active) setUtilised(totals.reduce((a, b) => a + b, 0));
        });
      })
      .catch(() => {
        if (active) setError('Could not load CSR projects.');
      })
      .finally(() => { if (active) setLoading(false); });

    // A report that exists but is not yet published is the CSR team's queue.
    csrAPI.reports.getAll()
      .then((res) => {
        if (!active) return;
        const rows = res?.results || res || [];
        setPendingReports(rows.filter((r) => !r.visibleToClient).length);
      })
      .catch(() => { if (active) setPendingReports(null); });

    return () => { active = false; };
  }, []);

  const activeProjects = projects.filter((p) => p.status !== 'Closed');
  const sanctioned = activeProjects.reduce((sum, p) => sum + (Number(p.sanctionedAmount) || 0), 0);
  const pct = sanctioned > 0 && utilised != null
    ? Math.min(100, Math.round((utilised / sanctioned) * 100))
    : 0;

  if (!canView('csr')) {
    return <Alert severity="warning">You do not have access to CSR.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* No page title here — the layout header already renders "CSR Dashboard".
          Repeating it produced two identical headings on screen, which the E2E
          suite caught as a strict-mode ambiguity. */}
      <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
        Project delivery, reporting, and utilisation.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          {loading ? <Skeleton variant="rounded" height={140} /> : (
            <StatCard
              icon={<ProjectsIcon fontSize="small" />}
              label="Active projects"
              value={activeProjects.length}
              sub={`${projects.length} total`}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={4}>
          {loading ? <Skeleton variant="rounded" height={140} /> : (
            <StatCard
              icon={<SpendIcon fontSize="small" />}
              label="Sanctioned vs utilised"
              tone="#16a34a"
              value={fmtINR(utilised)}
              sub={`of ${fmtINR(sanctioned)} sanctioned`}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={4}>
          {loading ? <Skeleton variant="rounded" height={140} /> : (
            <StatCard
              icon={<ReportsIcon fontSize="small" />}
              label="Reports pending release"
              tone="#d97706"
              value={pendingReports == null ? '—' : pendingReports}
              sub={pendingReports === 0 ? 'nothing waiting' : 'not yet visible to funders'}
            />
          )}
        </Grid>
      </Grid>

      {!loading && sanctioned > 0 && (
        <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={700}>Utilisation across active projects</Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>{pct}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
        </Paper>
      )}

      <Paper elevation={0} sx={cardSx}>
        <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5 }}>Projects</Typography>
        {loading && <Skeleton variant="rounded" height={80} />}
        {!loading && projects.length === 0 && (
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            No CSR projects yet.
          </Typography>
        )}
        {!loading && projects.slice(0, 6).map((p) => (
          <Stack
            key={p.id} direction="row" justifyContent="space-between" alignItems="center"
            onClick={() => navigate(`/csr/${p.id}`)}
            sx={{
              py: 1.25, borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
              '&:hover': { bgcolor: '#f8fafc' },
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
              <Typography variant="caption" sx={{ color: '#5A6B82' }}>
                {p.clientName} · {fmtINR(p.sanctionedAmount)}
              </Typography>
            </Box>
            <Chip size="small" label={p.status} />
          </Stack>
        ))}
      </Paper>
    </Box>
  );
}
