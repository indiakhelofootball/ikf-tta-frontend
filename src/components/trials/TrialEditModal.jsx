// src/components/trials/TrialEditModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  IconButton,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import { SEASONS, TRIAL_TYPES, TIER_TYPES, STATUSES, SCHEDULE_TYPES } from './trialConstants';

function TrialEditModal({ open, onClose, trial, onSave }) {
  const [formData, setFormData] = useState({
    season: '',
    trialType: '',
    tierType: 'Not Any',
    tierDetails: '',
    tierAmount: '',
    expectedParticipants: '',
    scheduleType: 'Fixed',
    startDate: '',
    endDate: '',
    tentativeMonth: '',
    tentativeDateRange: '',
    nextTrialDate: '',
    status: 'Draft',
    comment: '',
    assignedCities: [],
  });

  // City inline form
  const [cityInput, setCityInput] = useState({ cityName: '', trialRegion: '' });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open && trial) {
      setFormData({
        season: trial.season || '',
        trialType: trial.trialType || '',
        tierType: trial.tierType || 'Not Any',
        tierDetails: trial.tierDetails || '',
        tierAmount: trial.tierAmount != null ? String(trial.tierAmount) : '',
        expectedParticipants: trial.expectedParticipants != null ? String(trial.expectedParticipants) : '',
        scheduleType: trial.scheduleType || 'Fixed',
        startDate: trial.startDate ? trial.startDate.split('T')[0] : '',
        endDate: trial.endDate ? trial.endDate.split('T')[0] : '',
        tentativeMonth: trial.tentativeMonth || '',
        tentativeDateRange: trial.tentativeDateRange || '',
        nextTrialDate: trial.nextTrialDate ? trial.nextTrialDate.split('T')[0] : '',
        status: trial.status || 'Draft',
        comment: trial.comment || '',
        assignedCities: trial.assignedCities || [],
      });
      setCityInput({ cityName: '', trialRegion: '' });
      setErrors({});
      setFormError('');
    }
  }, [open, trial]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setFormError('');
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // City management
  const generateCityCode = (cityName) => {
    const stateMap = {
      'mumbai': 'MH', 'pune': 'MH', 'nagpur': 'MH', 'thane': 'MH',
      'delhi': 'DL', 'new delhi': 'DL', 'gurgaon': 'HR', 'noida': 'UP',
      'bangalore': 'KA', 'bengaluru': 'KA', 'mysore': 'KA',
      'chennai': 'TN', 'coimbatore': 'TN',
      'kolkata': 'WB', 'hyderabad': 'TG', 'ahmedabad': 'GJ',
      'jaipur': 'RJ', 'lucknow': 'UP', 'bhopal': 'MP', 'indore': 'MP',
      'patna': 'BR', 'chandigarh': 'CH', 'kochi': 'KL',
    };
    const cityLower = cityName.toLowerCase().trim();
    const stateCode = stateMap[cityLower] || 'XX';
    const cityAbbr = cityName.trim().substring(0, 3).toUpperCase();
    const seq = String(formData.assignedCities.filter(c =>
      c.code && c.code.includes(`-${stateCode}-${cityAbbr}-`)
    ).length + 1).padStart(3, '0');
    return `IKF-${stateCode}-${cityAbbr}-${seq}`;
  };

  const handleAddCity = () => {
    const name = cityInput.cityName.trim();
    if (!name) return;

    const region = cityInput.trialRegion.trim() || name;
    const code = generateCityCode(name);

    const isDuplicate = formData.assignedCities.some(
      c => c.cityName?.toLowerCase() === name.toLowerCase() && c.trialRegion?.toLowerCase() === region.toLowerCase()
    );
    if (isDuplicate) return;

    setFormData(prev => ({
      ...prev,
      assignedCities: [...prev.assignedCities, { cityName: name, trialRegion: region, code }],
    }));
    setCityInput({ cityName: '', trialRegion: '' });
  };

  const handleRemoveCity = (index) => {
    setFormData(prev => ({
      ...prev,
      assignedCities: prev.assignedCities.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.season) newErrors.season = 'Season is required';
    if (!formData.trialType) newErrors.trialType = 'Trial type is required';

    if (formData.tierType !== 'Not Any') {
      if (!formData.tierDetails.trim()) newErrors.tierDetails = 'Tier details are required';
      if (!formData.tierAmount) newErrors.tierAmount = 'Amount is required';
      if (formData.tierAmount && isNaN(Number(formData.tierAmount))) {
        newErrors.tierAmount = 'Amount must be a number';
      }
    }

    if (formData.scheduleType === 'Fixed') {
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      if (!formData.endDate) newErrors.endDate = 'End date is required';
      if (formData.startDate && formData.endDate) {
        if (new Date(formData.endDate) <= new Date(formData.startDate)) {
          newErrors.endDate = 'End date must be after start date';
        }
      }
    } else {
      if (!formData.tentativeMonth) newErrors.tentativeMonth = 'Tentative month is required';
    }

    if (!formData.status) newErrors.status = 'Status is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    setFormError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const updateData = {
        season: formData.season,
        trialType: formData.trialType,
        tierType: formData.tierType,
        tierDetails: formData.tierType !== 'Not Any' ? formData.tierDetails : null,
        tierAmount: formData.tierType !== 'Not Any' ? Number(formData.tierAmount) : null,
        expectedParticipants: formData.tierType !== 'Not Any' && formData.expectedParticipants
          ? Number(formData.expectedParticipants) : null,
        scheduleType: formData.scheduleType,
        startDate: formData.scheduleType === 'Fixed' ? formData.startDate : null,
        endDate: formData.scheduleType === 'Fixed' ? formData.endDate : null,
        tentativeMonth: formData.scheduleType === 'Tentative' ? formData.tentativeMonth : null,
        tentativeDateRange: formData.scheduleType === 'Tentative' ? formData.tentativeDateRange : null,
        nextTrialDate: formData.scheduleType === 'Tentative' && formData.nextTrialDate
          ? formData.nextTrialDate : null,
        status: formData.status,
        comment: formData.comment || null,
        assignedCities: formData.assignedCities,
      };

      await onSave(trial.id || trial._id, updateData);
    } catch (error) {
      console.error('Save error:', error);
      setFormError(error.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!trial) return null;

  // Blue section header style
  const sectionHeaderSx = {
    color: '#3B82F6',
    fontWeight: 700,
    mb: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontSize: '0.8rem',
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Edit Trial
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFormError('')}>
              {formError}
            </Alert>
          )}

          {/* Trial Name - Read Only */}
          <Typography variant="subtitle2" sx={sectionHeaderSx}>
            PROJECT DETAILS
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Trial Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={trial.trialName}
                disabled
                InputProps={{
                  endAdornment: <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Trial Code
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={trial.trialCode}
                disabled
                InputProps={{
                  endAdornment: <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />,
                  sx: { fontFamily: 'monospace' },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Status *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.status}
                onChange={handleChange('status')}
                error={!!errors.status}
                helperText={errors.status}
                disabled={saving}
              >
                {STATUSES.map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Season *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.season}
                onChange={handleChange('season')}
                error={!!errors.season}
                helperText={errors.season}
                disabled={saving}
              >
                {SEASONS.map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Trial Type *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.trialType}
                onChange={handleChange('trialType')}
                error={!!errors.trialType}
                helperText={errors.trialType}
                disabled={saving}
              >
                {TRIAL_TYPES.map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Cities Management */}
          <Typography variant="subtitle2" sx={sectionHeaderSx}>
            CITIES & REGIONS
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="City Name"
              value={cityInput.cityName}
              onChange={(e) => setCityInput(prev => ({ ...prev, cityName: e.target.value }))}
              sx={{ flex: 1 }}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCity();
                }
              }}
            />
            <TextField
              size="small"
              placeholder="Trial Region (optional)"
              value={cityInput.trialRegion}
              onChange={(e) => setCityInput(prev => ({ ...prev, trialRegion: e.target.value }))}
              sx={{ flex: 1 }}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCity();
                }
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddCity}
              disabled={!cityInput.cityName.trim() || saving}
              size="small"
              sx={{
                bgcolor: '#5B63D3',
                '&:hover': { bgcolor: '#4A52C2' },
                minWidth: 100,
              }}
            >
              Add
            </Button>
          </Stack>

          {formData.assignedCities.length > 0 ? (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600 }}>City</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Region</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Remove</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.assignedCities.map((city, index) => {
                    const isObj = typeof city === 'object';
                    return (
                      <TableRow key={index}>
                        <TableCell>{isObj ? city.cityName : city}</TableCell>
                        <TableCell>{isObj ? city.trialRegion : '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {isObj ? city.code : city}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveCity(index)}
                            disabled={saving}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
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
                py: 3,
                bgcolor: '#f9fafb',
                borderRadius: 2,
                border: '1px dashed #e5e7eb',
                mb: 3,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No cities assigned
              </Typography>
            </Box>
          )}

          {/* Tier & Pricing */}
          <Typography variant="subtitle2" sx={sectionHeaderSx}>
            TIER & PRICING
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Tier Type
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.tierType}
                onChange={handleChange('tierType')}
                disabled={saving}
              >
                {TIER_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t === 'Not Any' ? 'Not Any (No Tier)' : t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {formData.tierType !== 'Not Any' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                    Expected Participants
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={formData.expectedParticipants}
                    onChange={handleChange('expectedParticipants')}
                    disabled={saving}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                    Tier Details *
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={formData.tierDetails}
                    onChange={handleChange('tierDetails')}
                    error={!!errors.tierDetails}
                    helperText={errors.tierDetails}
                    disabled={saving}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                    Amount (INR) *
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={formData.tierAmount}
                    onChange={handleChange('tierAmount')}
                    error={!!errors.tierAmount}
                    helperText={errors.tierAmount}
                    disabled={saving}
                  />
                </Grid>
              </>
            )}
          </Grid>

          {/* Schedule */}
          <Typography variant="subtitle2" sx={sectionHeaderSx}>
            SCHEDULE
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <FormControl>
                <RadioGroup
                  row
                  value={formData.scheduleType}
                  onChange={handleChange('scheduleType')}
                >
                  {SCHEDULE_TYPES.map(type => (
                    <FormControlLabel
                      key={type}
                      value={type}
                      control={<Radio sx={{ '&.Mui-checked': { color: '#FBB040' } }} />}
                      label={type}
                      disabled={saving}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.scheduleType === 'Fixed' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                    Start Date *
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    value={formData.startDate}
                    onChange={handleChange('startDate')}
                    error={!!errors.startDate}
                    helperText={errors.startDate}
                    InputLabelProps={{ shrink: true }}
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                    End Date *
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    value={formData.endDate}
                    onChange={handleChange('endDate')}
                    error={!!errors.endDate}
                    helperText={errors.endDate}
                    InputLabelProps={{ shrink: true }}
                    disabled={saving}
                  />
                </Grid>
              </>
            )}

            {formData.scheduleType === 'Tentative' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                    Tentative Month *
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={formData.tentativeMonth}
                    onChange={handleChange('tentativeMonth')}
                    error={!!errors.tentativeMonth}
                    helperText={errors.tentativeMonth}
                    disabled={saving}
                  >
                    <MenuItem value=""><em>Select Month</em></MenuItem>
                    {months.map(m => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                    Date Range Description
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="e.g., Mid June - End June 2024"
                    value={formData.tentativeDateRange}
                    onChange={handleChange('tentativeDateRange')}
                    disabled={saving}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                    Next Trial Date
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    value={formData.nextTrialDate}
                    onChange={handleChange('nextTrialDate')}
                    InputLabelProps={{ shrink: true }}
                    disabled={saving}
                  />
                </Grid>
              </>
            )}
          </Grid>

          {/* Comment */}
          <Typography variant="subtitle2" sx={sectionHeaderSx}>
            NOTES
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            placeholder="Add any additional notes..."
            value={formData.comment}
            onChange={handleChange('comment')}
            disabled={saving}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            minWidth: 100,
            bgcolor: '#FBB040',
            '&:hover': { bgcolor: '#E89F2C' },
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TrialEditModal;
