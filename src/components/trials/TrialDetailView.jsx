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
} from '@mui/icons-material';
import { STATUS_COLORS } from './trialConstants';

function TrialDetailView({ trial, open, onClose, onEdit, onDelete }) {
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <TrophyIcon sx={{ fontSize: 32, color: '#FBB040' }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {trial.trialName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={trial.trialCode}
                size="small"
                sx={{ fontFamily: 'monospace', bgcolor: '#f3f4f6', fontWeight: 600 }}
              />
              <Chip
                label={trial.status}
                size="small"
                color={STATUS_COLORS[trial.status] || 'default'}
              />
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={() => {
              onClose();
              onEdit(trial);
            }}
            size="small"
            sx={{ bgcolor: 'white' }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => {
              onClose();
              onDelete(trial);
            }}
            size="small"
            sx={{ bgcolor: 'white', color: 'error.main' }}
          >
            <DeleteIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small" sx={{ bgcolor: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Summary Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
              <Typography variant="h3" fontWeight={700} color="primary">
                {trial.season?.replace('Season ', '') || '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">Season</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
              <Typography variant="h3" fontWeight={700} color="success.main">
                {cityCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">Cities Assigned</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, bgcolor: '#fefce8', borderRadius: 2, border: '1px solid #fde68a' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#f59e0b' }}>
                {trial.trialType}
              </Typography>
              <Typography variant="body2" color="text.secondary">Trial Type</Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Project Details */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Project Details
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Trial Name</Typography>
                <Typography variant="body1" fontWeight={600}>{trial.trialName}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Trial Code</Typography>
                <Typography variant="body1" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                  {trial.trialCode}
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Season</Typography>
                <Typography variant="body1" fontWeight={600}>{trial.season}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Trial Type</Typography>
                <Typography variant="body1" fontWeight={600}>{trial.trialType}</Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Tier & Pricing */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Tier & Pricing
        </Typography>

        {trial.tierType === 'Not Any' ? (
          <Box
            sx={{
              p: 3,
              bgcolor: '#f9fafb',
              borderRadius: 2,
              border: '1px dashed #e5e7eb',
              textAlign: 'center',
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No Tier / Pricing applied
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Tier Type</Typography>
                <Chip label={trial.tierType} size="small" color="primary" sx={{ mt: 0.5, display: 'block', width: 'fit-content' }} />
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Amount</Typography>
                <Typography variant="body1" fontWeight={600}>
                  &#8377;{trial.tierAmount?.toLocaleString('en-IN') || '-'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Expected Participants</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {trial.expectedParticipants || '-'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">Details</Typography>
                <Typography variant="body2">{trial.tierDetails || '-'}</Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Schedule */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Schedule
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">Schedule Type</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body1" fontWeight={600}>{trial.scheduleType}</Typography>
                {trial.scheduleType === 'Tentative' && (
                  <Chip label="Tentative" size="small" color="warning" />
                )}
              </Stack>
            </Box>
          </Grid>

          {trial.scheduleType === 'Fixed' ? (
            <>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Start Date</Typography>
                  <Typography variant="body1" fontWeight={600}>{formatDate(trial.startDate)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">End Date</Typography>
                  <Typography variant="body1" fontWeight={600}>{formatDate(trial.endDate)}</Typography>
                </Box>
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Tentative Month</Typography>
                  <Typography variant="body1" fontWeight={600}>{trial.tentativeMonth || '-'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Date Range</Typography>
                  <Typography variant="body1" fontWeight={600}>{trial.tentativeDateRange || '-'}</Typography>
                </Box>
              </Grid>
              {trial.nextTrialDate && (
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Next Trial Date</Typography>
                    <Typography variant="body1" fontWeight={600}>{formatDate(trial.nextTrialDate)}</Typography>
                  </Box>
                </Grid>
              )}
            </>
          )}
        </Grid>

        {trial.comment && (
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, mb: 3 }}>
            <Typography variant="caption" color="text.secondary">Comments</Typography>
            <Typography variant="body2">{trial.comment}</Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Assigned Cities */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Assigned Cities
        </Typography>

        {cityCount > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>City Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Trial Region</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>City Code</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cities.map((city, index) => {
                  const isObj = typeof city === 'object';
                  return (
                    <TableRow key={index} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {isObj ? city.cityName : city}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {isObj ? city.trialRegion : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
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
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              bgcolor: '#f9fafb',
              borderRadius: 2,
              border: '1px dashed #e5e7eb',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No cities assigned yet
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Audit Trail */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Audit Trail
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">Created By</Typography>
              <Typography variant="body2" fontWeight={600}>{trial.createdBy || '-'}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">Created At</Typography>
              <Typography variant="body2" fontWeight={600}>{formatDateTime(trial.createdAt)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">Last Updated</Typography>
              <Typography variant="body2" fontWeight={600}>{formatDateTime(trial.updatedAt)}</Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => {
            onClose();
            onEdit(trial);
          }}
          sx={{
            bgcolor: '#FBB040',
            '&:hover': { bgcolor: '#E89F2C' },
          }}
        >
          Edit Trial
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TrialDetailView;
