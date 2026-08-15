// src/components/trials/TrialDetailView.jsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as TrophyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { STATUS_COLORS } from './trialConstants';
import useGrants from '../../auth/useGrants';

function TrialDetailView({ trial, open, onClose, onEdit, onDelete }) {
  const { canEdit } = useGrants();
  if (!trial) return null;

  const cities = trial.assignedCities || [];
  const cityCount = cities.length;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const labelSx = { color: '#6e6e73', fontSize: '0.75rem', letterSpacing: '-0.01em' };
  const valueSx = { fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4, maxHeight: '90vh', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#f5f5f7',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <TrophyIcon sx={{ fontSize: 32, color: '#FBB040' }} />
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.025em', color: '#1d1d1f' }}>
              {trial.trialName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={trial.trialCode}
                size="small"
                sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.04)', fontWeight: 600, borderRadius: 1.5 }}
              />
              <Chip
                label={trial.status}
                size="small"
                color={STATUS_COLORS[trial.status] || 'default'}
                sx={{ borderRadius: 1.5 }}
              />
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          {canEdit('trials') && (
            <IconButton
              onClick={() => { onClose(); onEdit(trial); }}
              size="small"
              aria-label="Edit trial"
              sx={{ bgcolor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              <EditIcon />
            </IconButton>
          )}
          {canEdit('trials') && (
            <IconButton
              onClick={() => { onClose(); onDelete(trial); }}
              size="small"
              aria-label="Delete trial"
              sx={{ bgcolor: 'white', color: 'error.main', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              <DeleteIcon />
            </IconButton>
          )}
          <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ bgcolor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Summary Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{
              p: 2, bgcolor: '#f5f5f7', borderRadius: 3,
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <Typography variant="h3" fontWeight={700} color="primary" sx={{ letterSpacing: '-0.025em' }}>
                {trial.season?.replace('Season ', '') || '-'}
              </Typography>
              <Typography variant="body2" sx={labelSx}>Season</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{
              p: 2, bgcolor: '#f0fdf4', borderRadius: 3,
              border: '1px solid rgba(34,197,94,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <Typography variant="h3" fontWeight={700} color="success.main" sx={{ letterSpacing: '-0.025em' }}>
                {cityCount}
              </Typography>
              <Typography variant="body2" sx={labelSx}>Cities Assigned</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{
              p: 2, bgcolor: '#fefce8', borderRadius: 3,
              border: '1px solid rgba(245,158,11,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <Typography variant="body1" fontWeight={700} sx={{ color: '#f59e0b', fontSize: '0.95rem' }}>
                {trial.trialType || '-'}
              </Typography>
              <Typography variant="body2" sx={labelSx}>Trial Description</Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.06)' }} />

        {/* Project Details */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, letterSpacing: '-0.025em', color: '#1d1d1f' }}>
          Project Details
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={labelSx}>Trial Name</Typography>
                <Typography variant="body1" sx={valueSx}>{trial.trialName}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={labelSx}>Trial Code</Typography>
                <Typography variant="body1" sx={{ ...valueSx, fontFamily: 'monospace' }}>
                  {trial.trialCode}
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={labelSx}>Season</Typography>
                <Typography variant="body1" sx={valueSx}>{trial.season}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={labelSx}>Trial Description</Typography>
                <Typography variant="body1" sx={valueSx}>{trial.trialType || '-'}</Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.06)' }} />

        {/* Tier & Pricing */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, letterSpacing: '-0.025em', color: '#1d1d1f' }}>
          Tier & Pricing
        </Typography>

        {trial.tierType === 'Not Any' ? (
          <Box sx={{ p: 3, bgcolor: '#f5f5f7', borderRadius: 2.5, border: '1px dashed rgba(0,0,0,0.12)', textAlign: 'center', mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#6e6e73' }}>No Tier / Pricing applied</Typography>
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="caption" sx={labelSx}>Tier Type</Typography>
                <Chip label={trial.tierType} size="small" color="primary" sx={{ mt: 0.5, display: 'block', width: 'fit-content' }} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="caption" sx={labelSx}>Amount</Typography>
                <Typography variant="body1" sx={valueSx}>
                  &#8377;{trial.tierAmount?.toLocaleString('en-IN') || '-'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="caption" sx={labelSx}>Expected Participants</Typography>
                <Typography variant="body1" sx={valueSx}>{trial.expectedParticipants || '-'}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="caption" sx={labelSx}>Details</Typography>
                <Typography variant="body2">{trial.tierDetails || '-'}</Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.06)' }} />

        {/* Schedule */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, letterSpacing: '-0.025em', color: '#1d1d1f' }}>
          Schedule
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="caption" sx={labelSx}>Schedule Type</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body1" sx={valueSx}>{trial.scheduleType}</Typography>
                {trial.scheduleType === 'Tentative' && (
                  <Chip label="Tentative" size="small" color="warning" sx={{ borderRadius: 1.5 }} />
                )}
              </Stack>
            </Box>
          </Grid>

          {trial.scheduleType === 'Fixed' ? (
            <>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="caption" sx={labelSx}>Start Date</Typography>
                  <Typography variant="body1" sx={valueSx}>{formatDate(trial.startDate)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="caption" sx={labelSx}>End Date</Typography>
                  <Typography variant="body1" sx={valueSx}>{formatDate(trial.endDate)}</Typography>
                </Box>
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="caption" sx={labelSx}>Tentative Month</Typography>
                  <Typography variant="body1" sx={valueSx}>{trial.tentativeMonth || '-'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="caption" sx={labelSx}>Date Range</Typography>
                  <Typography variant="body1" sx={valueSx}>{trial.tentativeDateRange || '-'}</Typography>
                </Box>
              </Grid>
              {trial.nextTrialDate && (
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" sx={labelSx}>Next Trial Date</Typography>
                    <Typography variant="body1" sx={valueSx}>{formatDate(trial.nextTrialDate)}</Typography>
                  </Box>
                </Grid>
              )}
            </>
          )}
        </Grid>

        {trial.comment && (
          <Box sx={{ p: 2, bgcolor: '#f5f5f7', borderRadius: 2.5, mb: 3 }}>
            <Typography variant="caption" sx={labelSx}>Comments</Typography>
            <Typography variant="body2">{trial.comment}</Typography>
          </Box>
        )}

        <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.06)' }} />

        {/* Assigned Cities */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, letterSpacing: '-0.025em', color: '#1d1d1f' }}>
          Assigned Cities
        </Typography>

        {cityCount > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, border: '1px solid rgba(0,0,0,0.06)' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f5f5f7', color: '#1d1d1f', fontSize: '0.75rem' }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f5f5f7', color: '#1d1d1f', fontSize: '0.75rem' }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f5f5f7', color: '#1d1d1f', fontSize: '0.75rem' }}>City Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f5f5f7', color: '#1d1d1f', fontSize: '0.75rem' }}>Region</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f5f5f7', color: '#1d1d1f', fontSize: '0.75rem' }}>Ground</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f5f5f7', color: '#1d1d1f', fontSize: '0.75rem' }} align="center">Confirmed</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#f5f5f7', color: '#1d1d1f', fontSize: '0.75rem' }}>Code</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cities.map((city, index) => {
                  const isObj = typeof city === 'object';
                  return (
                    <TableRow key={index} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {isObj ? (city.state || '-') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {isObj ? city.cityName : city}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {isObj ? (city.region || city.trialRegion || '-') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {isObj ? (city.groundLocation || '-') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {isObj && city.confirmed ? (
                          <CheckIcon sx={{ color: '#22c55e', fontSize: 18 }} />
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {isObj ? city.code : city}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f5f5f7', borderRadius: 2.5, border: '1px dashed rgba(0,0,0,0.12)' }}>
            <Typography variant="body2" sx={{ color: '#6e6e73' }}>No cities assigned yet</Typography>
          </Box>
        )}

        <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.06)' }} />

        {/* Audit Trail */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, letterSpacing: '-0.025em', color: '#1d1d1f' }}>
          Audit Trail
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="caption" sx={labelSx}>Created By</Typography>
              <Typography variant="body2" sx={valueSx}>{trial.createdBy || '-'}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="caption" sx={labelSx}>Created At</Typography>
              <Typography variant="body2" sx={valueSx}>{formatDateTime(trial.createdAt)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="caption" sx={labelSx}>Last Updated</Typography>
              <Typography variant="body2" sx={valueSx}>{formatDateTime(trial.updatedAt)}</Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none' }}>Close</Button>
        {canEdit('trials') && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => { onClose(); onEdit(trial); }}
            sx={{
              bgcolor: '#FDE68A', borderRadius: 2, textTransform: 'none', fontWeight: 600,
              '&:hover': { bgcolor: '#FCD34D' },
            }}
          >
            Edit Trial
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default TrialDetailView;
