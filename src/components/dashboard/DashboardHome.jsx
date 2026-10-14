// src/components/dashboard/DashboardHome.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LocationCity,
  People,
  Assignment,
  ArrowForward as ArrowIcon,
  Store as StoreIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROLES, REPORT_KEYS } from '../../auth/roles';
import useGrants from '../../auth/useGrants';
import { trialsAPI, repAPI, vendorsAPI, workOrdersAPI, paymentRequestsAPI } from '../../services/api';

// One load and one summary per card. A card whose load fails says so and
// offers Retry: showing 0 would read as a real count. Vendors are counted from
// /vendors/options/ (no PAN images); /vendors/?limit=1 carried one 2.4 MB image.
const STAT_SOURCES = {
  // The trials list is paginated (20 by default), so counting its rows capped
  // the card at 20. Each count is the server's `total` for a one-row page.
  trials: {
    load: async () => {
      const [all, active, scheduled] = await Promise.all([
        trialsAPI.getAll({ limit: 1 }),
        trialsAPI.getAll({ status: 'Active', limit: 1 }),
        trialsAPI.getAll({ status: 'Scheduled', limit: 1 }),
      ]);
      if (![all, active, scheduled].every((r) => typeof r?.total === 'number')) {
        throw new Error('The project count came back without a total.');
      }
      return { all: all.total, active: active.total + scheduled.total };
    },
    summarise: (r) => ({ value: r.all, sub: `${r.active} active` }),
  },
  reps: {
    load: () => repAPI.getOptions(),
    summarise: (r) => ({ value: (r?.reps || []).length, sub: 'registered' }),
  },
  vendors: {
    load: () => vendorsAPI.getOptions(),
    summarise: (r) => ({ value: r?.total || 0, sub: 'total' }),
  },
  workorders: {
    load: () => workOrdersAPI.getAll(),
    summarise: (r) => {
      const workOrders = r?.workOrders || [];
      const active = workOrders.filter(w => w.status !== 'Cancelled' && w.status !== 'Completed').length;
      return { value: workOrders.length, sub: `${active} active` };
    },
  },
  payments: {
    load: () => paymentRequestsAPI.getAll(),
    summarise: (r) => {
      const payments = r?.paymentRequests || [];
      const pending = payments.filter(p => p.status === 'Draft' || p.status === 'Sent to Accounts').length;
      return { value: payments.length, sub: `${pending} pending` };
    },
  },
};

const settle = (module, outcome) => (
  outcome.status === 'fulfilled'
    ? { status: 'ok', ...STAT_SOURCES[module].summarise(outcome.value) }
    : { status: 'failed' }
);

export default function DashboardHome() {
  const { user, perms, permsLoading } = useAuth();
  const { canView, canEdit } = useGrants();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    if (permsLoading) return;
    const fetchStats = async () => {
      try {
        // Only hit endpoints the user can view — the rest would 403.
        const modules = Object.keys(STAT_SOURCES).filter((m) => canView(m));
        const outcomes = await Promise.allSettled(modules.map((m) => STAT_SOURCES[m].load()));
        setStats(Object.fromEntries(modules.map((m, i) => [m, settle(m, outcomes[i])])));
      } catch (err) {
        console.error('[Dashboard] Failed to load stats:', err.message || err);
        setStats(null);
        setStatsError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permsLoading, perms]);

  const retryStat = async (module) => {
    setStats((prev) => ({ ...prev, [module]: { status: 'loading' } }));
    const [outcome] = await Promise.allSettled([STAT_SOURCES[module].load()]);
    setStats((prev) => ({ ...prev, [module]: settle(module, outcome) }));
  };

  const getStatCards = () => {
    if (!stats) return [];
    return [
      { module: 'trials', label: 'Projects', icon: LocationCity, color: '#22C55E', bgColor: '#DCFCE7' },
      { module: 'reps', label: 'REPs', icon: People, color: '#FBBF24', bgColor: '#FEF3C7' },
      { module: 'vendors', label: 'Vendors', icon: StoreIcon, color: '#3B82F6', bgColor: '#DBEAFE' },
      { module: 'workorders', label: 'Work Orders', icon: Assignment, color: '#8B5CF6', bgColor: '#EDE9FE' },
      { module: 'payments', label: 'Payment Requests', icon: PaymentIcon, color: '#F59E0B', bgColor: '#FEF3C7' },
    ]
      .filter((stat) => canView(stat.module) && stats[stat.module])
      .map((stat) => ({ ...stat, ...stats[stat.module] }));
  };

  const statCards = getStatCards();
  const isAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#1d1d1f', letterSpacing: '-0.025em' }}>
          Welcome back, {user?.name || user?.email?.split('@')[0]}!
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="body1" sx={{ color: '#6e6e73' }}>Role:</Typography>
          <Chip
            label={user?.role}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: isAdmin ? '#FEF3C7' : '#DCFCE7',
              color: isAdmin ? '#B45309' : '#15803D',
              fontSize: '0.8rem',
              borderRadius: 1.5,
            }}
          />
        </Box>
      </Box>

      {/* Stats Grid */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={40} sx={{ color: '#FBBF24' }} />
        </Box>
      ) : statsError ? (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          Could not load dashboard stats. Check your connection or try refreshing.
        </Alert>
      ) : (
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {statCards.map((stat, index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: '#ffffff',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${stat.color}, ${stat.color}CC)`,
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#6e6e73',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'block',
                            mb: 1.5,
                          }}
                        >
                          {stat.label}
                        </Typography>
                        {stat.status === 'ok' && (
                          <Typography
                            variant="h3"
                            fontWeight={700}
                            sx={{
                              color: '#1d1d1f',
                              fontSize: '2rem',
                              lineHeight: 1.2,
                              letterSpacing: '-0.025em',
                            }}
                          >
                            {stat.value}
                          </Typography>
                        )}
                        {stat.status === 'loading' && (
                          <CircularProgress size={24} sx={{ color: stat.color }} aria-label={`Loading ${stat.label}`} />
                        )}
                        {stat.status === 'failed' && (
                          <Box role="alert" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#B42318' }}>
                              Couldn't load.
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => retryStat(stat.module)}
                              aria-label={`Retry loading ${stat.label}`}
                              sx={{ textTransform: 'none', borderRadius: 2, py: 0, minWidth: 0 }}
                            >
                              Retry
                            </Button>
                          </Box>
                        )}
                      </Box>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 3,
                          bgcolor: stat.bgColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <stat.icon sx={{ fontSize: 28, color: stat.color }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <Typography variant="caption" sx={{ color: '#6e6e73' }}>{stat.status === 'ok' ? stat.sub : ' '}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Quick Actions */}
      {(canView('trials') || canView('workorders') || canView('vendors') || canView('payments')) && (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          bgcolor: '#ffffff',
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: '#1d1d1f', letterSpacing: '-0.025em' }}>
          Quick Actions
        </Typography>

        <Grid container spacing={2}>
            {canEdit('trials') && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth variant="contained" size="large"
                startIcon={<LocationCity />}
                onClick={() => navigate('/trials/create')}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 700, fontSize: '0.9375rem',
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', color: 'white',
                  boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)',
                  '&:hover': { background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)', boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.4)' },
                }}
              >
                New Project
              </Button>
            </Grid>
            )}
            {canView('workorders') && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                onClick={() => navigate('/work-orders')}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                  color: '#2563EB', borderColor: '#2563EB', borderWidth: 2,
                  '&:hover': { borderColor: '#1D4ED8', borderWidth: 2, bgcolor: '#EFF6FF' },
                }}
              >
                Work Orders
              </Button>
            </Grid>
            )}
            {canView('vendors') && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                onClick={() => navigate('/vendors')}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                  color: '#A35905', borderColor: '#A35905', borderWidth: 2,
                  '&:hover': { borderColor: '#7E3A06', borderWidth: 2, bgcolor: '#FFFBEB' },
                }}
              >
                Vendors
              </Button>
            </Grid>
            )}
            {canView('payments') && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                onClick={() => navigate('/payments')}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                  color: '#7C3AED', borderColor: '#7C3AED', borderWidth: 2,
                  '&:hover': { borderColor: '#6D28D9', borderWidth: 2, bgcolor: '#F5F3FF' },
                }}
              >
                Payments
              </Button>
            </Grid>
            )}
            {canView('trials') && !canEdit('trials') && (
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                onClick={() => navigate('/trials')}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                  color: '#22C55E', borderColor: '#22C55E', borderWidth: 2,
                  '&:hover': { borderColor: '#16A34A', borderWidth: 2, bgcolor: '#F0FDF4' },
                }}
              >
                View My Trials
              </Button>
            </Grid>
            )}
        </Grid>
      </Paper>
      )}

      {/* Reports & Assets */}
      {REPORT_KEYS.some((k) => canView(k)) && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
            bgcolor: '#ffffff',
          }}
        >
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: '#1d1d1f', letterSpacing: '-0.025em' }}>
            Reports & Assets
          </Typography>
          <Grid container spacing={2}>
            {canView('report_social_media') && (
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                  onClick={() => navigate('/reports/social-media')}
                  sx={{
                    py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                    color: '#EC4899', borderColor: '#EC4899', borderWidth: 2,
                    '&:hover': { borderColor: '#DB2777', borderWidth: 2, bgcolor: '#FDF2F8' },
                  }}
                >
                  REP Report
                </Button>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}
