// src/components/trialCities/CityModal.jsx - WITH IMPROVED ERROR HANDLING

import React, { useState, useEffect, useMemo } from 'react';
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
  FormControlLabel,
  Checkbox,
  Box,
  CircularProgress,
  Autocomplete,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { State, City } from 'country-state-city';
import { generateTrialCityCode } from '../../utils/codeGenerator';
import { repAPI } from '../../services/api';

function CityModal({ open, onClose, onSave, editingCity, existingCities }) {
  const isEditMode = !!editingCity;

  const indianStates = useMemo(() => {
    return State.getStatesOfCountry('IN').map(state => ({
      name: state.name,
      isoCode: state.isoCode,
    }));
  }, []);

  const [availableCities, setAvailableCities] = useState([]);

  const [formData, setFormData] = useState({
    state: '',
    stateCode: '',
    city: '',
    assignedREP: '',
    groundLocation: '',
    groundVerified: false,
    trialType: '',
    trialDate: '',
    monthOnly: '',
    comment: '',
    nextTrialDate: '',
  });

  const [previewCode, setPreviewCode] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [formError, setFormError] = useState('');
  const [repOptions, setRepOptions] = useState([]);

  // Load cities when state changes
  useEffect(() => {
    if (formData.stateCode) {
      setLoadingCities(true);
      try {
        const cities = City.getCitiesOfState('IN', formData.stateCode);
        const cityNames = cities.map(city => city.name).sort();
        setAvailableCities(cityNames);
      } catch (error) {
        console.error('Error loading cities:', error);
        setAvailableCities([]);
        setFormError('Failed to load cities for this state');
      } finally {
        setLoadingCities(false);
      }
    } else {
      setAvailableCities([]);
    }
  }, [formData.stateCode]);

  // Load active REPs when modal opens
  useEffect(() => {
    if (open) {
      repAPI.getAll({ status: 'Active' })
        .then(data => {
          setRepOptions(data.reps || []);
        })
        .catch(err => {
          console.error('Error loading REPs:', err);
          setRepOptions([]);
        });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (editingCity) {
        const stateObj = indianStates.find(s => s.name === editingCity.state);
        setFormData({
          state: editingCity.state || '',
          stateCode: stateObj?.isoCode || '',
          city: editingCity.city || '',
          assignedREP: editingCity.assignedREP || '',
          groundLocation: editingCity.groundLocation || '',
          groundVerified: editingCity.groundVerified || false,
          trialType: editingCity.trialType || '',
          trialDate: editingCity.trialDate ? editingCity.trialDate.split('T')[0] : '',
          monthOnly: editingCity.monthOnly || '',
          comment: editingCity.comment || '',
          nextTrialDate: editingCity.nextTrialDate ? editingCity.nextTrialDate.split('T')[0] : '',
        });
        setPreviewCode(editingCity.code);
      } else {
        setFormData({
          state: '',
          stateCode: '',
          city: '',
          assignedREP: '',
          groundLocation: '',
          groundVerified: false,
          trialType: '',
          trialDate: '',
          monthOnly: '',
          comment: '',
          nextTrialDate: '',
        });
        setPreviewCode('');
        setAvailableCities([]);
      }
      setErrors({});
      setFormError(''); // Reset form error
    }
  }, [open, editingCity, indianStates]);

  // Generate code when state and city change
  useEffect(() => {
    if (!isEditMode && formData.state && formData.city) {
      try {
        const code = generateTrialCityCode(formData.state, formData.city, existingCities);
        setPreviewCode(code);
      } catch (error) {
        console.error('Error generating code:', error);
        setFormError('Failed to generate city code');
      }
    }
  }, [formData.state, formData.city, existingCities, isEditMode]);

  const handleStateChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        state: newValue.name,
        stateCode: newValue.isoCode,
        city: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        state: '',
        stateCode: '',
        city: '',
      }));
    }
    
    if (errors.state) {
      setErrors(prev => ({ ...prev, state: '' }));
    }
    setFormError(''); // Clear form error
  };

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setFormError(''); // Clear form error
  };

  const handleCityChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      city: newValue || '',
    }));
    
    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }
    setFormError(''); // Clear form error
  };

  // ✅ IMPROVED: Enhanced validation
  const validate = () => {
    const newErrors = {};
    
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    // Check for duplicates (only when creating new)
    if (!isEditMode && existingCities) {
      const duplicate = existingCities.find(
        c =>
          c.city?.toLowerCase() === formData.city.toLowerCase() &&
          c.state?.toLowerCase() === formData.state.toLowerCase()
      );
      
      if (duplicate) {
        newErrors.city = 'This city already exists in this state';
        setFormError('A trial city with this name already exists in this state');
      }
    }

    // Validate dates if provided
    if (formData.trialDate && formData.nextTrialDate) {
      const trialDate = new Date(formData.trialDate);
      const nextTrialDate = new Date(formData.nextTrialDate);
      
      if (nextTrialDate <= trialDate) {
        newErrors.nextTrialDate = 'Next trial date must be after current trial date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ IMPROVED: Better error handling for save
  const handleSave = async () => {
    // Clear previous errors
    setFormError('');

    // Validate form
    if (!validate()) {
      return;
    }

    // Check if code was generated
    if (!isEditMode && !previewCode) {
      setFormError('Failed to generate city code. Please try again.');
      return;
    }

    setSaving(true);

    try {
      const cityData = {
        ...formData,
        code: previewCode,
        trialCityName: formData.city,
        assignedREP: formData.assignedREP || null,
        groundLocation: formData.groundLocation || null,
        trialType: formData.trialType || null,
        trialDate: formData.trialDate || null,
        monthOnly: formData.monthOnly || null,
        comment: formData.comment || null,
        nextTrialDate: formData.nextTrialDate || null,
      };
      delete cityData.stateCode;
      
      // Call parent save function
      await onSave(cityData);
      
      // Success! Parent will handle toast and close
      
    } catch (error) {
      console.error('Error saving city:', error);
      
      // Show error in modal
      if (error.response?.status === 409) {
        setFormError('A city with this name already exists');
      } else if (error.response?.status === 422) {
        setFormError(error.response.data?.message || 'Invalid data. Please check all fields.');
      } else if (error.message === 'Network Error') {
        setFormError('No internet connection. Please check your network.');
      } else {
        setFormError(
          error.response?.data?.message || 
          error.message || 
          'Failed to save city. Please try again.'
        );
      }
      
      // Don't close modal - let user retry
      throw error; // Re-throw so parent knows it failed
    } finally {
      setSaving(false);
    }
  };

  const trialTypes = [
    'IKF Season Trial',
    'Exclusive IKF Season Trial',
    'CSR Project Trial',
    'Zonals',
    'Other',
  ];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedState = indianStates.find(s => s.isoCode === formData.stateCode) || null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
      }}>
        <Typography variant="h6" fontWeight={600}>
          {isEditMode ? 'Edit Trial City' : 'Add Trial City'}
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          
          {/* Error Alert - NEW */}
          {formError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFormError('')}>
              {formError}
            </Alert>
          )}

          {/* LOCATION Section */}
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: '#3B82F6',
              fontWeight: 700,
              mb: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '0.8rem'
            }}
          >
            LOCATION
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                State *
              </Typography>
              <Autocomplete
                value={selectedState}
                onChange={handleStateChange}
                options={indianStates}
                getOptionLabel={(option) => option?.name || ''}
                isOptionEqualToValue={(option, value) => option?.isoCode === value?.isoCode}
                disabled={isEditMode || saving}
                openOnFocus
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box
                      component="li"
                      key={option.isoCode}
                      {...otherProps}
                      sx={{
                        py: 1.5,
                        px: 2,
                        fontSize: '0.95rem',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        borderBottom: '1px solid #f3f4f6',
                        '&:hover': {
                          backgroundColor: '#f0f9ff !important',
                        },
                        '&:last-child': {
                          borderBottom: 'none',
                        }
                      }}
                    >
                      {option.name}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Search state..."
                    error={!!errors.state}
                    helperText={errors.state}
                    InputProps={{
                      ...params.InputProps,
                      sx: {
                        '& .MuiAutocomplete-input': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }
                      },
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          {isEditMode && <LockIcon fontSize="small" sx={{ color: 'text.disabled', ml: 0.5 }} />}
                        </>
                      ),
                    }}
                  />
                )}
                slotProps={{
                  popper: {
                    sx: { zIndex: 1500 },
                    placement: 'bottom-start',
                    modifiers: [{name: 'flip', enabled: false}],
                  },
                  paper: {
                    sx: {
                      mt: 0.5,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      borderRadius: 2,
                      minWidth: '350px',
                      maxWidth: '400px',
                      '& .MuiAutocomplete-listbox': {
                        padding: 0,
                        maxHeight: 280,
                      }
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                City *
              </Typography>
              <Autocomplete
                value={formData.city || null}
                onChange={handleCityChange}
                options={availableCities}
                disabled={isEditMode || !formData.stateCode || saving}
                loading={loadingCities}
                freeSolo
                openOnFocus
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box
                      component="li"
                      key={option}
                      {...otherProps}
                      sx={{
                        py: 1.5,
                        px: 2,
                        fontSize: '0.95rem',
                        borderBottom: '1px solid #f3f4f6',
                        '&:hover': {
                          backgroundColor: '#f0f9ff !important',
                        },
                        '&:last-child': {
                          borderBottom: 'none',
                        }
                      }}
                    >
                      {option}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder={formData.stateCode ? "Search city..." : "Select state first"}
                    error={!!errors.city}
                    helperText={errors.city || (loadingCities ? 'Loading...' : formData.stateCode ? `${availableCities.length} cities available` : '')}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingCities ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                          {isEditMode && <LockIcon fontSize="small" sx={{ color: 'text.disabled', ml: 0.5 }} />}
                        </>
                      ),
                    }}
                  />
                )}
                slotProps={{
                  popper: {
                    sx: { zIndex: 1500 },
                    placement: 'bottom-start',
                  },
                  paper: {
                    sx: {
                      mt: 0.5,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      borderRadius: 2,
                      '& .MuiAutocomplete-listbox': {
                        padding: 0,
                        maxHeight: 280,
                      }
                    }
                  }
                }}
              />
            </Grid>

            {/* Preview Code */}
            {previewCode && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Generated Code
                  </Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ fontFamily: 'monospace', color: '#16a34a' }}>
                    {previewCode}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>

          {/* REP & GROUND Section */}
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: '#3B82F6',
              fontWeight: 700,
              mb: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '0.8rem'
            }}
          >
            REP & GROUND
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Assigned REP
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.assignedREP}
                onChange={handleChange('assignedREP')}
                disabled={saving}
              >
                <MenuItem value=""><em>Select</em></MenuItem>
                {repOptions.map((rep) => (
                  <MenuItem key={rep.id} value={rep.repName}>
                    {rep.repName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Ground Location
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter ground/stadium"
                value={formData.groundLocation}
                onChange={handleChange('groundLocation')}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.groundVerified}
                    onChange={handleChange('groundVerified')}
                    size="small"
                    color="success"
                    disabled={saving}
                  />
                }
                label={<Typography variant="body2">Ground Verified</Typography>}
              />
            </Grid>
          </Grid>

          {/* TRIAL DETAILS Section */}
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: '#3B82F6',
              fontWeight: 700,
              mb: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '0.8rem'
            }}
          >
            TRIAL DETAILS
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Trial Type
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.trialType}
                onChange={handleChange('trialType')}
                disabled={saving}
              >
                <MenuItem value=""><em>Select</em></MenuItem>
                {trialTypes.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Trial Date
              </Typography>
              <TextField
                fullWidth
                type="date"
                size="small"
                value={formData.trialDate}
                onChange={handleChange('trialDate')}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Or Month Only
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.monthOnly}
                onChange={handleChange('monthOnly')}
                disabled={saving}
              >
                <MenuItem value=""><em>Select</em></MenuItem>
                {months.map((month) => (
                  <MenuItem key={month} value={month}>{month}</MenuItem>
                ))}
              </TextField>
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
                error={!!errors.nextTrialDate}
                helperText={errors.nextTrialDate}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Comment/Notes
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Add any additional comments..."
                value={formData.comment}
                onChange={handleChange('comment')}
                disabled={saving}
              />
            </Grid>
          </Grid>

        </Box>
      </DialogContent>

      {/* Actions */}
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
            '&:hover': {
              bgcolor: '#E89F2C'
            }
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CityModal;