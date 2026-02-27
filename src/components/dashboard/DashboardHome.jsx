// src/components/dashboard/DashboardHome.jsx
import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Paper,
} from '@mui/material';
import {
  LocationCity,
  People,
  Assignment,
  TrendingUp,
  ArrowForward as ArrowIcon,
  PersonOutline,
  EventAvailable,
  CheckCircleOutline,
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROLES } from '../../auth/roles';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getStats = () => {
    if (user?.role === ROLES.SUPER_ADMIN) {
      return [
        { label: 'Total Users', value: '342', icon: People, color: '#FBBF24', bgColor: '#FEF3C7' },
        { label: 'Active Trials', value: '2,547', icon: LocationCity, color: '#22C55E', bgColor: '#DCFCE7' },
        { label: 'Work Orders', value: '1,234', icon: Assignment, color: '#3B82F6', bgColor: '#DBEAFE' },
        { label: 'Total Revenue', value: '\u20B945.2L', icon: TrendingUp, color: '#10B981', bgColor: '#D1FAE5' },
      ];
    } else if (user?.role === ROLES.ADMIN) {
      return [
        { label: 'My REPs', value: '28', icon: People, color: '#FBBF24', bgColor: '#FEF3C7' },
        { label: 'Active Trials', value: '856', icon: LocationCity, color: '#22C55E', bgColor: '#DCFCE7' },
        { label: 'Pending Orders', value: '45', icon: Assignment, color: '#3B82F6', bgColor: '#DBEAFE' },
        { label: 'Completion Rate', value: '87%', icon: TrendingUp, color: '#10B981', bgColor: '#D1FAE5' },
      ];
    } else {
      return [
        { label: 'My Trials', value: '12', icon: LocationCity, color: '#22C55E', bgColor: '#DCFCE7' },
        { label: 'Total Players', value: '156', icon: PersonOutline, color: '#FBBF24', bgColor: '#FEF3C7' },
        { label: 'This Week', value: '8', icon: EventAvailable, color: '#3B82F6', bgColor: '#DBEAFE' },
        { label: 'Attendance', value: '92%', icon: CheckCircleOutline, color: '#10B981', bgColor: '#D1FAE5' },
      ];
    }
  };

  const stats = getStats();
  const isREP = user?.role === ROLES.REP;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#1d1d1f', letterSpacing: '-0.025em' }}>
          Welcome back, {user?.name || user?.email?.split('@')[0]}!
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="body1" sx={{ color: '#86868b' }}>Role:</Typography>
          <Chip
            label={user?.role}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: isREP ? '#DCFCE7' : '#FEF3C7',
              color: isREP ? '#15803D' : '#B45309',
              fontSize: '0.8rem',
              borderRadius: 1.5,
            }}
          />
        </Box>
      </Box>

      {/* Stats Grid — Apple Widget Style */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {stats.map((stat, index) => (
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
                          color: '#86868b',
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
                    <Typography variant="caption" sx={{ color: '#22C55E', fontWeight: 600 }}>+12%</Typography>
                    <Typography variant="caption" sx={{ color: '#86868b' }}>from last month</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
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

        {isREP && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth variant="contained" size="large"
                startIcon={<LocationCity />}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 700, fontSize: '0.9375rem',
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', color: 'white',
                  boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)',
                  '&:hover': { background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)', boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.4)' },
                }}
              >
                View My Trials
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                  color: '#3B82F6', borderColor: '#3B82F6', borderWidth: 2,
                  '&:hover': { borderColor: '#2563EB', borderWidth: 2, bgcolor: '#EFF6FF' },
                }}
              >
                My Schedule
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                  color: '#F59E0B', borderColor: '#F59E0B', borderWidth: 2,
                  '&:hover': { borderColor: '#D97706', borderWidth: 2, bgcolor: '#FFFBEB' },
                }}
              >
                Submit Report
              </Button>
            </Grid>
          </Grid>
        )}

        {!isREP && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                  color: '#3B82F6', borderColor: '#3B82F6', borderWidth: 2,
                  '&:hover': { borderColor: '#2563EB', borderWidth: 2, bgcolor: '#EFF6FF' },
                }}
              >
                View Work Orders
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth variant="outlined" size="large" endIcon={<ArrowIcon />}
                sx={{
                  py: 1.75, borderRadius: 2.5, textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem',
                  color: '#22C55E', borderColor: '#22C55E', borderWidth: 2,
                  '&:hover': { borderColor: '#16A34A', borderWidth: 2, bgcolor: '#F0FDF4' },
                }}
              >
                Manage REPs
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Recent Activity */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          bgcolor: '#ffffff',
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: '#1d1d1f', letterSpacing: '-0.025em' }}>
          {isREP ? 'My Recent Activity' : 'Recent Activity'}
        </Typography>
        <Box sx={{ textAlign: 'center', py: 6, color: '#86868b' }}>
          <Assignment sx={{ fontSize: 64, color: 'rgba(0,0,0,0.08)', mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#86868b' }}>
            {isREP ? 'No recent activity in your trials' : 'No recent activity to display'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: '#86868b' }}>
            {isREP ? 'Your trial activities will appear here' : 'Your recent actions will appear here'}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
