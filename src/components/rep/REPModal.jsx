// src/components/rep/REPModal.jsx - WITH IMPROVED ERROR HANDLING
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
  Box,
  CircularProgress,
  Autocomplete,
  Alert,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { State, City } from 'country-state-city';

function REPModal({ open, onClose, onSave, editingREP }) {
  const isEditMode = !!editingREP;

  const indianStates = useMemo(() => {
    return State.getStatesOfCountry('IN').map(state => ({
      name: state.name,
      isoCode: state.isoCode,
    }));
  }, []);

  const [availableCities, setAvailableCities] = useState([]);

  const [formData, setFormData] = useState({
    repName: '',
    state: '',
    stateCode: '',
    city: '',
    season: '',
    region: '',
    status: 'Active',
    contactName: '',
    phone: '',
    email: '',
    backupContactName: '',
    backupPhone: '',
    backupEmail: '',
    physicalAddress: '',
    groundLocation: '',
    pinCode: '',
    panCard: '',
    gstNo: '',
    mouStatus: '',
  });

  const [mouDocument, setMouDocument] = useState(null);
  const [mouDocumentPreview, setMouDocumentPreview] = useState(null);
  const [repLogo, setRepLogo] = useState(null);
  const [repLogoPreview, setRepLogoPreview] = useState(null);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [fileError, setFileError] = useState(''); // NEW: For file upload errors

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
      } finally {
        setLoadingCities(false);
      }
    } else {
      setAvailableCities([]);
    }
  }, [formData.stateCode]);

  useEffect(() => {
    if (open) {
      if (editingREP) {
        const stateObj = indianStates.find(s => s.name === editingREP.state);
        setFormData({
          repName: editingREP.repName || '',
          state: editingREP.state || '',
          stateCode: stateObj?.isoCode || '',
          city: editingREP.city || '',
          season: editingREP.season || '',
          region: editingREP.region || '',
          status: editingREP.status || 'Active',
          contactName: editingREP.contactName || '',
          phone: editingREP.phone || '',
          email: editingREP.email || '',
          backupContactName: editingREP.backupContactName || '',
          backupPhone: editingREP.backupPhone || '',
          backupEmail: editingREP.backupEmail || '',
          physicalAddress: editingREP.physicalAddress || '',
          groundLocation: editingREP.groundLocation || '',
          pinCode: editingREP.pinCode || '',
          panCard: editingREP.panCard || '',
          gstNo: editingREP.gstNo || '',
          mouStatus: editingREP.mouStatus || '',
        });
        
        if (editingREP.mouDocumentUrl) {
          setMouDocumentPreview(editingREP.mouDocumentUrl);
        }
        if (editingREP.repLogoUrl) {
          setRepLogoPreview(editingREP.repLogoUrl);
        }
      } else {
        setFormData({
          repName: '',
          state: '',
          stateCode: '',
          city: '',
          season: '',
          region: '',
          status: 'Active',
          contactName: '',
          phone: '',
          email: '',
          backupContactName: '',
          backupPhone: '',
          backupEmail: '',
          physicalAddress: '',
          groundLocation: '',
          pinCode: '',
          panCard: '',
          gstNo: '',
          mouStatus: '',
        });
        setAvailableCities([]);
        setMouDocument(null);
        setMouDocumentPreview(null);
        setRepLogo(null);
        setRepLogoPreview(null);
      }
      setErrors({});
      setFileError(''); // Reset file error
    }
  }, [open, editingREP, indianStates]);

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
  };

  const handleCityChange = (event, newValue) => {
    setFormData(prev => ({
      ...prev,
      city: newValue || '',
    }));
    
    if (errors.city) {
      setErrors(prev => ({ ...prev, city: '' }));
    }
  };

  // IMPROVED: File upload handlers with better error handling
  const handleMouDocumentUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(''); // Clear previous errors

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setFileError('MoU document must be PDF or DOC format');
      event.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('MoU document must be less than 5MB');
      event.target.value = '';
      return;
    }

    setMouDocument(file);
    setMouDocumentPreview(file.name);
    event.target.value = '';
  };

  const handleRepLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileError(''); // Clear previous errors

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFileError('REP logo must be an image file (PNG, JPG, etc.)');
      event.target.value = '';
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFileError('REP logo must be less than 2MB');
      event.target.value = '';
      return;
    }

    setRepLogo(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setRepLogoPreview(reader.result);
    };
    reader.onerror = () => {
      setFileError('Failed to read image file');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveMouDocument = () => {
    setMouDocument(null);
    setMouDocumentPreview(null);
    setFileError('');
  };

  const handleRemoveRepLogo = () => {
    setRepLogo(null);
    setRepLogoPreview(null);
    setFileError('');
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.repName.trim()) {
      newErrors.repName = 'REP Name is required';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    // Optional: Add more validation
    if (formData.phone && formData.phone.length !== 10) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.panCard || !formData.panCard.trim()) {
      newErrors.panCard = 'PAN Card is required';
    } else if (formData.panCard.length !== 10) {
      newErrors.panCard = 'PAN Card must be 10 characters';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.panCard.toUpperCase())) {
      newErrors.panCard = 'Invalid PAN format (e.g., AABCU9603R)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Clear previous file errors
    setFileError('');

    // Validate form
    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const repData = { ...formData };
      delete repData.stateCode;

      // Add file data
      if (mouDocument) {
        repData.mouDocumentName = mouDocument.name;
        repData.mouDocumentUrl = mouDocumentPreview;
      }
      if (repLogo) {
        repData.repLogoName = repLogo.name;
        repData.repLogoUrl = repLogoPreview;
      }

      // Call parent save function
      await onSave(repData);
      
      // Success! Reset file states
      setMouDocument(null);
      setMouDocumentPreview(null);
      setRepLogo(null);
      setRepLogoPreview(null);
      setFileError('');
      
      // Note: onClose() is called by parent after success toast
    } catch (error) {
      console.error('Error saving REP:', error);
      
      // Show error in modal
      setFileError(
        error.message || 
        'Failed to save REP. Please try again.'
      );
      
      // Don't close modal - let user retry
      throw error; // Re-throw so parent knows it failed
    } finally {
      setSaving(false);
    }
  };

  const seasons = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const statuses = ['Active', 'Inactive'];
  const mouStatuses = ['Signed', 'Pending', 'Not Required'];

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
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
      }}>
        <Typography variant="h6" fontWeight={600}>
          {isEditMode ? 'Edit REP' : 'Add REP'}
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          
          {/* Error Alert - NEW */}
          {fileError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFileError('')}>
              {fileError}
            </Alert>
          )}

          {/* BASIC INFO Section */}
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
            BASIC INFORMATION
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                REP Name *
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g., Sports Academy Mumbai"
                value={formData.repName}
                onChange={handleChange('repName')}
                error={!!errors.repName}
                helperText={errors.repName}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Season
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.season}
                onChange={handleChange('season')}
                disabled={saving}
              >
                <MenuItem value=""><em>Select Season</em></MenuItem>
                {seasons.map((season) => (
                  <MenuItem key={season} value={season}>{season}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Status
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.status}
                onChange={handleChange('status')}
                disabled={saving}
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Region
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.region}
                onChange={handleChange('region')}
                disabled={saving}
              >
                <MenuItem value=""><em>Select Region</em></MenuItem>
                {regions.map((region) => (
                  <MenuItem key={region} value={region}>{region}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* TRIAL CITY Section */}
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
            TRIAL CITY
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
                disabled={saving}
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
                disabled={!formData.stateCode || saving}
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

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Pin Code
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g., 400001"
                value={formData.pinCode}
                onChange={handleChange('pinCode')}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Ground Location
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Stadium or ground address"
                value={formData.groundLocation}
                onChange={handleChange('groundLocation')}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Physical Address
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Complete physical address"
                value={formData.physicalAddress}
                onChange={handleChange('physicalAddress')}
                disabled={saving}
              />
            </Grid>
          </Grid>

          {/* PRIMARY CONTACT Section */}
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
            PRIMARY CONTACT
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Contact Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g., Rajesh Sharma"
                value={formData.contactName}
                onChange={handleChange('contactName')}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Phone
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Email
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={handleChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                disabled={saving}
              />
            </Grid>
          </Grid>

          {/* BACKUP CONTACT Section */}
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
            BACKUP CONTACT
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Backup Contact Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Optional"
                value={formData.backupContactName}
                onChange={handleChange('backupContactName')}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Backup Phone
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Optional"
                value={formData.backupPhone}
                onChange={handleChange('backupPhone')}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Backup Email
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                placeholder="backup@example.com"
                value={formData.backupEmail}
                onChange={handleChange('backupEmail')}
                disabled={saving}
              />
            </Grid>
          </Grid>

          {/* DOCUMENTS & BRANDING Section */}
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
            DOCUMENTS & BRANDING
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                Signed MoU/Agreement
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  size="small"
                  sx={{ justifyContent: 'flex-start' }}
                  disabled={saving}
                >
                  Choose File
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={handleMouDocumentUpload}
                  />
                </Button>
                {mouDocumentPreview && (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                    <FileIcon fontSize="small" color="primary" />
                    <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }}>
                      {typeof mouDocumentPreview === 'string' && mouDocumentPreview.length > 30
                        ? mouDocumentPreview.substring(0, 30) + '...'
                        : mouDocumentPreview}
                    </Typography>
                    <IconButton size="small" onClick={handleRemoveMouDocument} disabled={saving}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Upload signed MoU/Agreement (PDF/DOC, max 5MB)
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                REP Logo
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  size="small"
                  sx={{ justifyContent: 'flex-start' }}
                  disabled={saving}
                >
                  Choose File
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleRepLogoUpload}
                  />
                </Button>
                {repLogoPreview && (
                  <Box sx={{ position: 'relative', width: '100%' }}>
                    <Box
                      component="img"
                      src={repLogoPreview}
                      alt="REP Logo Preview"
                      sx={{
                        width: '100%',
                        height: 80,
                        objectFit: 'contain',
                        border: '1px solid #e5e7eb',
                        borderRadius: 1,
                        p: 1,
                        bgcolor: '#f9fafb',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveRepLogo}
                      disabled={saving}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'white',
                        '&:hover': { bgcolor: '#fee2e2' },
                      }}
                    >
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Upload logo for shirt printing/branding (PNG/JPG, max 2MB)
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* LEGAL INFORMATION Section */}
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
            LEGAL INFORMATION
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                PAN Card *
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="AABCU9603R"
                value={formData.panCard}
                onChange={handleChange('panCard')}
                error={!!errors.panCard}
                helperText={errors.panCard}
                disabled={saving}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                GST No. (Optional)
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="27AABCU9603R1ZM"
                value={formData.gstNo}
                onChange={handleChange('gstNo')}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 500 }}>
                MoU Status
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={formData.mouStatus}
                onChange={handleChange('mouStatus')}
                disabled={saving}
              >
                <MenuItem value=""><em>Select</em></MenuItem>
                {mouStatuses.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

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

export default REPModal;