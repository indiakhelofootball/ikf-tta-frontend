// src/components/dashboard/DashboardHome.jsx - IMPROVED SPACING + REP DASHBOARD
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
  Add as AddIcon,
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

  // Role-based stats
  const getStats = () => {
    if (user?.role === ROLES.SUPER_ADMIN) {
      return [
        { label: 'Total Users', value: '342', icon: People, color: '#FBBF24', bgColor: '#FEF3C7' },
        { label: 'Active Trials', value: '2,547', icon: LocationCity, color: '#22C55E', bgColor: '#DCFCE7' },
        { label: 'Work Orders', value: '1,234', icon: Assignment, color: '#3B82F6', bgColor: '#DBEAFE' },
        { label: 'Total Revenue', value: '₹45.2L', icon: TrendingUp, color: '#10B981', bgColor: '#D1FAE5' },
      ];
    } else if (user?.role === ROLES.ADMIN) {
      return [
        { label: 'My REPs', value: '28', icon: People, color: '#FBBF24', bgColor: '#FEF3C7' },
        { label: 'Active Trials', value: '856', icon: LocationCity, color: '#22C55E', bgColor: '#DCFCE7' },
        { label: 'Pending Orders', value: '45', icon: Assignment, color: '#3B82F6', bgColor: '#DBEAFE' },
        { label: 'Completion Rate', value: '87%', icon: TrendingUp, color: '#10B981', bgColor: '#D1FAE5' },
      ];
    } else {
      // REP Dashboard
      return [
        { label: 'My Trials', value: '12', icon: LocationCity, color: '#22C55E', bgColor: '#DCFCE7' },
        { label: 'Total Players', value: '156', icon: PersonOutline, color: '#FBBF24', bgColor: '#FEF3C7' },
        { label: 'This Week', value: '8', icon: EventAvailable, color: '#3B82F6', bgColor: '#DBEAFE' },
        { label: 'Attendance', value: '92%', icon: CheckCircleOutline, color: '#10B981', bgColor: '#D1FAE5' },
      ];
    }
  };

  const stats = getStats();
  const canAccessTrialCities = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const isREP = user?.role === ROLES.REP;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#111827' }}>
          Welcome back, {user?.name || user?.email?.split('@')[0]}!
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="body1" color="text.secondary">
            Role:
          </Typography>
          <Chip
            label={user?.role}
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: isREP ? '#DCFCE7' : '#FEF3C7',
              color: isREP ? '#15803D' : '#B45309',
              fontSize: '0.8rem',
            }}
          />
        </Box>
      </Box>

      {/* Stats Grid - IMPROVED SPACING */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <Card
              elevation={0}
              sx={{
                height: '100%',
                border: '1px solid #E5E7EB',
                borderRadius: 3,
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  borderColor: stat.color,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${stat.color}, ${stat.color}CC)`,
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* IMPROVED LAYOUT - More space between text and icon */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 2.5,  // More vertical space
                }}>
                  {/* Top row: Label and Icon with more gap */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    gap: 3,  // More horizontal gap between text and icon
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#6B7280',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'block',
                          mb: 1.5,  // More space below label
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        variant="h3"
                        fontWeight={700}
                        sx={{ 
                          color: '#111827', 
                          fontSize: '2rem',
                          lineHeight: 1.2,
                        }}
                      >
                        {stat.value}
                      </Typography>
                    </Box>
                    
                    {/* Icon Badge - More padding */}
                    <Box
                      sx={{
                        width: 60,  // Slightly larger
                        height: 60,
                        borderRadius: 2.5,
                        bgcolor: stat.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <stat.icon sx={{ fontSize: 30, color: stat.color }} />
                    </Box>
                  </Box>
                  
                  {/* Growth indicator with more top space */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#22C55E', fontWeight: 600 }}>
                      +12%
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                      from last month
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions - Different for REP */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          border: '1px solid #E5E7EB',
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: '#111827' }}>
          Quick Actions
        </Typography>
        
        {/* REP Actions */}
        {isREP && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<LocationCity />}
                sx={{
                  py: 1.75,
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                    boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.4)',
                  },
                }}
              >
                View My Trials
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                endIcon={<ArrowIcon />}
                sx={{
                  py: 1.75,
                  color: '#3B82F6',
                  borderColor: '#3B82F6',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  borderWidth: 2,
                  '&:hover': {
                    borderColor: '#2563EB',
                    borderWidth: 2,
                    bgcolor: '#EFF6FF',
                  },
                }}
              >
                My Schedule
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                endIcon={<ArrowIcon />}
                sx={{
                  py: 1.75,
                  color: '#F59E0B',
                  borderColor: '#F59E0B',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  borderWidth: 2,
                  '&:hover': {
                    borderColor: '#D97706',
                    borderWidth: 2,
                    bgcolor: '#FFFBEB',
                  },
                }}
              >
                Submit Report
              </Button>
            </Grid>
          </Grid>
        )}

        {/* Admin/Super Admin Actions */}
        {!isREP && (
          <Grid container spacing={2}>
            {canAccessTrialCities && (
              <Grid item xs={12} sm={4}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/trial-cities')}
                  sx={{
                    py: 1.75,
                    background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                    color: '#111827',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    textTransform: 'none',
                    borderRadius: 2,
                    boxShadow: '0 4px 6px -1px rgba(251, 191, 36, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      boxShadow: '0 10px 15px -3px rgba(251, 191, 36, 0.4)',
                    },
                  }}
                >
                  Manage Trial Cities
                </Button>
              </Grid>
            )}
            
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                endIcon={<ArrowIcon />}
                sx={{
                  py: 1.75,
                  color: '#3B82F6',
                  borderColor: '#3B82F6',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  borderWidth: 2,
                  '&:hover': {
                    borderColor: '#2563EB',
                    borderWidth: 2,
                    bgcolor: '#EFF6FF',
                  },
                }}
              >
                View Work Orders
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                endIcon={<ArrowIcon />}
                sx={{
                  py: 1.75,
                  color: '#22C55E',
                  borderColor: '#22C55E',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  textTransform: 'none',
                  borderRadius: 2,
                  borderWidth: 2,
                  '&:hover': {
                    borderColor: '#16A34A',
                    borderWidth: 2,
                    bgcolor: '#F0FDF4',
                  },
                }}
              >
                Manage REPs
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Recent Activity - Different content for REP */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid #E5E7EB',
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: '#111827' }}>
          {isREP ? 'My Recent Activity' : 'Recent Activity'}
        </Typography>
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            color: '#9CA3AF',
          }}
        >
          <Assignment sx={{ fontSize: 64, color: '#E5E7EB', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {isREP ? 'No recent activity in your trials' : 'No recent activity to display'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isREP ? 'Your trial activities will appear here' : 'Your recent actions will appear here'}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}