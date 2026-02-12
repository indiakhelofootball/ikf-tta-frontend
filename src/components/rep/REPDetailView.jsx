// src/components/rep/REPDetailView.jsx
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
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationCity as LocationCityIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

function REPDetailView({ rep, open, onClose, onEdit }) {
  if (!rep) return null;

  const totalTrials = rep.assignedTrials?.length || 0;
  const activeTrials = rep.assignedTrials?.filter(t => t.status === 'Active').length || 0;
  const completedTrials = rep.assignedTrials?.filter(t => t.status === 'Completed').length || 0;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: '#f8fafc',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <BusinessIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {rep.repName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              REP Details & Trial Assignments
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <IconButton 
            onClick={() => {
              onClose();
              onEdit(rep);
            }} 
            size="small"
            sx={{ bgcolor: 'white' }}
          >
            <EditIcon />
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
                {totalTrials}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Trials
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
              <Typography variant="h3" fontWeight={700} color="success.main">
                {activeTrials}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Trials
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ p: 2, bgcolor: '#fafafa', borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Typography variant="h3" fontWeight={700} color="text.secondary">
                {completedTrials}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Trials
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* REP Information */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          REP Information
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <LocationCityIcon sx={{ color: '#6366f1' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {rep.city}, {rep.state}
                  </Typography>
                </Box>
              </Stack>

              {rep.contactName && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <BusinessIcon sx={{ color: '#10b981' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Contact Person</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {rep.contactName}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {rep.phone && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <PhoneIcon sx={{ color: '#f59e0b' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {rep.phone}
                    </Typography>
                  </Box>
                </Stack>
              )}

              {rep.email && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <EmailIcon sx={{ color: '#ec4899' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {rep.email}
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              {rep.region && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Region</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {rep.region}
                  </Typography>
                </Box>
              )}

              {rep.season && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Season</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {rep.season}
                  </Typography>
                </Box>
              )}

              {rep.panCard && (
                <Box>
                  <Typography variant="caption" color="text.secondary">PAN Card</Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {rep.panCard}
                  </Typography>
                </Box>
              )}

              {rep.mouStatus && (
                <Box>
                  <Typography variant="caption" color="text.secondary">MoU Status</Typography>
                  <Chip 
                    label={rep.mouStatus} 
                    size="small" 
                    color={rep.mouStatus === 'Signed' ? 'success' : 'warning'}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              )}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Assigned Trials Table */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Assigned Trials
        </Typography>

        {rep.assignedTrials && rep.assignedTrials.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600 }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Trial Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Trial Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rep.assignedTrials.map((trial, index) => (
                  <TableRow key={index} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                    <TableCell>{trial.city}</TableCell>
                    <TableCell>{trial.trialName}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon fontSize="small" sx={{ color: '#6b7280' }} />
                        <Typography variant="body2">
                          {formatDate(trial.trialDate)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={trial.period} 
                        size="small" 
                        color={trial.period === 'This Week' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={trial.status} 
                        size="small" 
                        color={trial.status === 'Active' ? 'success' : trial.status === 'Completed' ? 'default' : 'info'}
                        icon={trial.status === 'Completed' ? <CheckIcon sx={{ fontSize: 14 }} /> : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4,
            bgcolor: '#f9fafb',
            borderRadius: 2,
            border: '1px dashed #e5e7eb'
          }}>
            <Typography variant="body2" color="text.secondary">
              No trials assigned yet
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Close</Button>
        <Button 
          variant="contained" 
          startIcon={<EditIcon />}
          onClick={() => {
            onClose();
            onEdit(rep);
          }}
          sx={{ 
            bgcolor: '#FBB040',
            '&:hover': { bgcolor: '#E89F2C' }
          }}
        >
          Edit REP
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default REPDetailView;