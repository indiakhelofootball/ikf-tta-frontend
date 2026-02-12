// src/components/trials/TrialDeleteDialog.jsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Alert,
  Box,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

function TrialDeleteDialog({ open, onClose, trial, onConfirmDelete }) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  if (!trial) return null;

  const cityCount = trial.assignedCities?.length || 0;

  const handleClose = () => {
    setConfirmText('');
    setError('');
    onClose();
  };

  const handleConfirm = () => {
    if (confirmText.trim() !== 'DELETE') {
      setError('Please type "DELETE" exactly to confirm');
      return;
    }
    setConfirmText('');
    setError('');
    onConfirmDelete(trial);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>Delete Trial?</Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          This action cannot be undone. The trial and all its data will be permanently removed.
        </Alert>

        {cityCount > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            This trial has <strong>{cityCount} assigned {cityCount === 1 ? 'city' : 'cities'}</strong> that will be unassigned upon deletion.
          </Alert>
        )}

        <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Trial Name:</strong> {trial.trialName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Trial Code:</strong> {trial.trialCode}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Type:</strong> {trial.trialType} | <strong>Season:</strong> {trial.season}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Status:</strong>{' '}
            <Chip label={trial.status} size="small" color={trial.status === 'Active' ? 'success' : 'default'} />
          </Typography>
          {cityCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              <strong>Assigned Cities:</strong> {cityCount}
            </Typography>
          )}
        </Box>

        <Typography variant="body2" fontWeight={600} gutterBottom>
          Type "DELETE" to confirm:
        </Typography>

        <TextField
          fullWidth
          autoFocus
          placeholder="DELETE"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error || 'Type the word DELETE in uppercase'}
          sx={{ mt: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleConfirm}
          disabled={confirmText.trim() !== 'DELETE'}
        >
          Delete Trial
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TrialDeleteDialog;
