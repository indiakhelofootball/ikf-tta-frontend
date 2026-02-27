// src/components/trials/TrialEditModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, IconButton, MenuItem,
  Box, CircularProgress, Alert,
} from '@mui/material';
import { Close as CloseIcon, Edit as EditIcon } from '@mui/icons-material';
import { TIER_TYPES } from './trialConstants';

const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.95rem' },
};

const sectionSx = {
  fontSize: '0.72rem', fontWeight: 700, color: '#888',
  letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1.5,
};

const fieldLabelSx = {
  fontSize: '0.88rem', fontWeight: 600, color: '#3c3c43', mb: 0.6, display: 'block',
};

function TrialEditModal({ open, onClose, trial, onSave }) {
  const [formData, setFormData] = useState({
    tierType: 'Not Any',
    comment: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open && trial) {
      setFormData({
        tierType: trial.tierType || 'Not Any',
        comment: trial.comment || '',
      });
      setFormError('');
    }
  }, [open, trial]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setFormError('');
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      await onSave(trial.id, {
        tierType: formData.tierType,
        comment: formData.comment || null,
      });
    } catch (err) {
      setFormError(err.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  if (!trial) return null;
  const projectLabel = trial.trialCode || trial.trialName || 'Project';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}
    >
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pb: 1.5, borderBottom: '1.5px solid #f0f0f0', pt: 2.5, px: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EditIcon sx={{ color: '#5B63D3', fontSize: 20 }} />
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
            <span style={{ color: '#9e9e9e', fontWeight: 600 }}>Edit: </span>
            <span style={{ color: '#1d1d1f', fontFamily: 'monospace' }}>{projectLabel}</span>
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" disabled={saving}
          sx={{ color: '#666', '&:hover': { bgcolor: '#f5f5f7' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 3, pb: 1 }}>
        {formError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }} onClose={() => setFormError('')}>
            {formError}
          </Alert>
        )}

        {/* TIER */}
        <Typography sx={sectionSx}>Tier</Typography>
        <Box sx={{ mb: 4, maxWidth: 280 }}>
          <Typography sx={fieldLabelSx}>Tier Type</Typography>
          <TextField
            select fullWidth size="small"
            value={formData.tierType}
            onChange={handleChange('tierType')}
            disabled={saving} sx={inputSx}
          >
            {TIER_TYPES.map(t => (
              <MenuItem key={t} value={t} sx={{ fontSize: '0.95rem', color: t === 'Not Any' ? '#6B7280' : 'inherit' }}>
                {t === 'Not Any' ? 'Not Any (No Tier)' : t}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* NOTES */}
        <Typography sx={sectionSx}>Notes</Typography>
        <TextField
          fullWidth multiline rows={3} size="small"
          placeholder="Add any additional notes..."
          value={formData.comment}
          onChange={handleChange('comment')}
          disabled={saving}
          sx={{ ...inputSx, mb: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1.5px solid #f0f0f0', gap: 1.5 }}>
        <Button
          onClick={onClose} disabled={saving}
          sx={{
            borderRadius: '20px', textTransform: 'none', fontWeight: 600,
            fontSize: '0.9rem', color: '#555', px: 3, py: 1,
            '&:hover': { bgcolor: '#f5f5f7' },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          onClick={handleSave}
          disabled={saving}
          sx={{
            borderRadius: '20px', textTransform: 'none', fontWeight: 700,
            fontSize: '0.95rem', py: 1, px: 4, boxShadow: 'none',
            bgcolor: '#FDE68A', color: '#111827',
            '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
            '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
          }}
        >
          {saving ? 'Updating...' : 'Update Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TrialEditModal;
