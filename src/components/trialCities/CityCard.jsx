import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Divider,
  Grid,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Place as PlaceIcon,
  Stadium as StadiumIcon,
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
  Verified as VerifiedIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  PersonOutline as BackupIcon,
} from '@mui/icons-material';

function CityCard({ city, onEdit, onDelete, onReverify }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reverifyDialogOpen, setReverifyDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setConfirmText('');
    setDeleteError('');
  };

  const handleConfirmDelete = () => {
    if (confirmText.trim() !== city.city) {
      setDeleteError(`Please type "${city.city}" exactly`);
      return;
    }
    setDeleteDialogOpen(false);
    onDelete(city);
  };

  const handleReverifyClick = () => {
    setReverifyDialogOpen(true);
  };

  const handleConfirmReverify = () => {
    setReverifyDialogOpen(false);
    if (onReverify) {
      onReverify(city);
    }
  };

  // Dummy scout data
  const scoutInfo = city.scoutInfo || {
    scoutName: 'Rahul Sharma',
    phoneNumber: '+91 98765 43210',
    backupScout: 'Priya Verma',
  };

  return (
    <>
      <Card
        sx={{
          minHeight: 500,
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          // display: flex and flexDirection come from MUI theme
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Row - City Name & Status */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1.5 }}>
                {city.city}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={city.code}
                  size="small"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: '#f3f4f6',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label={city.groundVerified ? 'Verified' : 'Pending'}
                  size="small"
                  color={city.groundVerified ? 'success' : 'warning'}
                  icon={city.groundVerified ? <VerifiedIcon sx={{ fontSize: 14 }} /> : undefined}
                />
              </Stack>
            </Box>
          </Stack>

          {/* Info Grid - Horizontal Layout */}
          <Box sx={{ flex: 1 }}>
            <Grid container spacing={3}>
              {/* Left Column - Location & Ground */}
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PlaceIcon fontSize="small" sx={{ color: '#6366f1' }} />
                    <Typography variant="body2" color="text.secondary">
                      {city.state}
                    </Typography>
                  </Stack>

                  {city.groundLocation && (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <StadiumIcon fontSize="small" sx={{ color: '#10b981' }} />
                      <Typography variant="body2" color="text.secondary">
                        {city.groundLocation}
                      </Typography>
                    </Stack>
                  )}

                  {city.trialDate && (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <CalendarIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(city.trialDate)}
                      </Typography>
                    </Stack>
                  )}
                </Stack>

                {city.assignedREP && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Assigned REP
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {city.assignedREP}
                    </Typography>
                  </Box>
                )}
              </Grid>

              {/* Right Column - Scout Info */}
              <Grid item xs={12} md={6}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: '#3B82F6',
                    fontWeight: 700,
                    mb: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '0.7rem'
                  }}
                >
                  Scout Information
                </Typography>

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PersonIcon sx={{ fontSize: 18, color: '#4f46e5' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block' }}>
                        Scout
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {scoutInfo.scoutName}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block' }}>
                        Phone
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {scoutInfo.phoneNumber}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <BackupIcon sx={{ fontSize: 18, color: '#d97706' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block' }}>
                        Backup
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {scoutInfo.backupScout}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </CardContent>

        {/* Actions - Improved spacing and styling */}
        <Box sx={{ p: 3, pt: 0 }}>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="medium"
              startIcon={<EditIcon />}
              onClick={() => onEdit(city)}
              sx={{ 
                flex: 1,
                bgcolor: '#FBB040',
                color: 'white',
                fontWeight: 600,
                py: 1,
                '&:hover': {
                  bgcolor: '#E89F2C'
                }
              }}
            >
              Edit
            </Button>

            <Button
              variant="outlined"
              size="medium"
              startIcon={<VerifiedIcon />}
              onClick={handleReverifyClick}
              sx={{ 
                flex: 1,
                borderColor: '#3B82F6',
                color: '#3B82F6',
                fontWeight: 600,
                py: 1,
                '&:hover': {
                  borderColor: '#2563EB',
                  bgcolor: '#EFF6FF'
                }
              }}
            >
              Reverify
            </Button>

            <Button
              variant="outlined"
              size="medium"
              color="error"
              onClick={handleDeleteClick}
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#FEE2E2'
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          </Stack>
        </Box>
      </Card>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>Delete Trial City?</Typography>
          <IconButton onClick={() => setDeleteDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            This action cannot be undone.
          </Alert>

          <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>City:</strong> {city.city}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>Code:</strong> {city.code}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>State:</strong> {city.state}
            </Typography>
          </Box>

          <Typography variant="body2" fontWeight={600} gutterBottom>
            Type the city name to confirm:
          </Typography>

          <TextField
            fullWidth
            autoFocus
            placeholder={city.city}
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setDeleteError('');
            }}
            error={!!deleteError}
            helperText={deleteError || `Type: ${city.city}`}
            sx={{ mt: 1 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reverify Dialog */}
      <Dialog
        open={reverifyDialogOpen}
        onClose={() => setReverifyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <VerifiedIcon color="info" />
            <Typography variant="h6" fontWeight={600}>Reverify Trial City Details</Typography>
          </Stack>
          <IconButton onClick={() => setReverifyDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color: '#3B82F6', fontWeight: 700, mb: 2, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                Location Details
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">City</Typography>
                  <Typography variant="body1" fontWeight={600}>{city.city}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Code</Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{city.code}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">State</Typography>
                  <Typography variant="body1" fontWeight={600}>{city.state}</Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color: '#3B82F6', fontWeight: 700, mb: 2, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                Ground & Trial Details
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ground Location</Typography>
                  <Typography variant="body1" fontWeight={600}>{city.groundLocation || 'Not set'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ground Verified</Typography>
                  <Chip label={city.groundVerified ? 'Yes' : 'No'} size="small" color={city.groundVerified ? 'success' : 'warning'} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Trial Date</Typography>
                  <Typography variant="body1" fontWeight={600}>{formatDate(city.trialDate)}</Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color: '#3B82F6', fontWeight: 700, mb: 2, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                Scout Details
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Scout Name</Typography>
                  <Typography variant="body1" fontWeight={600}>{scoutInfo.scoutName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                  <Typography variant="body1" fontWeight={600}>{scoutInfo.phoneNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Backup Scout</Typography>
                  <Typography variant="body1" fontWeight={600}>{scoutInfo.backupScout}</Typography>
                </Box>
              </Stack>
            </Grid>

            {city.comment && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#3B82F6', fontWeight: 700, mb: 2, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                  Comments/Notes
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Typography variant="body2">{city.comment}</Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setReverifyDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<VerifiedIcon />}
            onClick={handleConfirmReverify}
          >
            Mark as Reverified
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CityCard;