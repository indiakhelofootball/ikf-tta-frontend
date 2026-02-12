// src/components/trials/TrialWizard.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Grid,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Checkbox,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
  Snackbar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

import { SEASONS, TRIAL_TYPES, TIER_TYPES, SCHEDULE_TYPES } from './trialConstants';
import { generateTrialCode } from '../../utils/trialCodeGenerator';
import { trialsAPI } from '../../services/api';

const STEPS = ['Project Details', 'Cities & Regions', 'Tier & Pricing', 'Schedule', 'Review & Submit'];

function TrialWizard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    trialName: '',
    season: '',
    trialType: '',
    comment: '',
    assignedCities: [],
    tierType: 'Not Any',
    tierDetails: '',
    tierAmount: '',
    expectedParticipants: '',
    scheduleType: 'Fixed',
    startDate: '',
    endDate: '',
    tentativeMonth: '',
    tentativeDateRange: '',
    status: 'Draft',
  });

  const [cityInput, setCityInput] = useState({ cityName: '', trialRegion: '' });
  const [errors, setErrors] = useState({});
  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [existingTrials, setExistingTrials] = useState([]);
  const [confirmChecked, setConfirmChecked] = useState(false);

  useEffect(() => {
    const loadTrials = async () => {
      try {
        const response = await trialsAPI.getAll();
        setExistingTrials(response.trials || []);
      } catch (err) {
        console.error('Failed to load trials:', err);
      }
    };
    loadTrials();
  }, []);

  useEffect(() => {
    if (!formData.trialName.trim()) {
      setNameExists(false);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingName(true);
      try {
        const exists = await trialsAPI.checkNameExists(formData.trialName);
        setNameExists(exists);
      } catch (err) {
        console.error('Name check error:', err);
      } finally {
        setCheckingName(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.trialName]);

  const handleChange = useCallback((field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  // --- City management ---
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
      c.code.includes(`-${stateCode}-${cityAbbr}-`)
    ).length + 1).padStart(3, '0');
    return `IKF-${stateCode}-${cityAbbr}-${seq}`;
  };

  const handleAddCity = () => {
    const name = cityInput.cityName.trim();
    if (!name) return;
    const region = cityInput.trialRegion.trim() || name;
    const code = generateCityCode(name);
    const isDuplicate = formData.assignedCities.some(
      c => c.cityName.toLowerCase() === name.toLowerCase() && c.trialRegion.toLowerCase() === region.toLowerCase()
    );
    if (isDuplicate) {
      showToast('This city-region combination already exists', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      assignedCities: [...prev.assignedCities, { cityName: name, trialRegion: region, code }],
    }));
    setCityInput({ cityName: '', trialRegion: '' });
    if (errors.assignedCities) {
      setErrors(prev => ({ ...prev, assignedCities: '' }));
    }
  };

  const handleRemoveCity = (index) => {
    setFormData(prev => ({
      ...prev,
      assignedCities: prev.assignedCities.filter((_, i) => i !== index),
    }));
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'City Name,Trial Region (optional)\nMumbai,Mumbai Central\nBangalore,South Bangalore\nDelhi,\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trial_cities_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(1);
      const newCities = [];
      let skipped = 0;
      dataLines.forEach(line => {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        const cityName = parts[0];
        const trialRegion = parts[1] || cityName;
        if (!cityName) return;
        const isDuplicate = [...formData.assignedCities, ...newCities].some(
          c => c.cityName.toLowerCase() === cityName.toLowerCase() && c.trialRegion.toLowerCase() === trialRegion.toLowerCase()
        );
        if (isDuplicate) { skipped++; return; }
        const code = generateCityCode(cityName);
        newCities.push({ cityName, trialRegion, code });
      });
      if (newCities.length > 0) {
        setFormData(prev => ({
          ...prev,
          assignedCities: [...prev.assignedCities, ...newCities],
        }));
        showToast(`Imported ${newCities.length} cities${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}`);
      } else {
        showToast('No new cities to import', 'warning');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 0) {
      if (!formData.trialName.trim()) newErrors.trialName = 'Trial name is required';
      if (nameExists) newErrors.trialName = 'A trial with this name already exists';
      if (!formData.season) newErrors.season = 'Season is required';
      if (!formData.trialType) newErrors.trialType = 'Trial type is required';
    }
    if (step === 2) {
      if (formData.tierType !== 'Not Any') {
        if (!formData.tierDetails.trim()) newErrors.tierDetails = 'Tier details are required';
        if (!formData.tierAmount) newErrors.tierAmount = 'Amount is required';
        if (formData.tierAmount && isNaN(Number(formData.tierAmount))) {
          newErrors.tierAmount = 'Amount must be a number';
        }
      }
    }
    if (step === 3) {
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
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!confirmChecked) return;
    setSaving(true);
    try {
      const trialCode = generateTrialCode(formData.season, formData.trialType, existingTrials);
      const trialData = {
        trialName: formData.trialName.trim(),
        trialCode,
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
        nextTrialDate: null,
        status: formData.status,
        comment: formData.comment || null,
        assignedCities: formData.assignedCities,
        createdBy: 'Admin User',
      };
      await trialsAPI.create(trialData);
      showToast('Trial created successfully!');
      setTimeout(() => navigate('/trials'), 1000);
    } catch (error) {
      console.error('Create error:', error);
      showToast(error.message || 'Failed to create trial', 'error');
    } finally {
      setSaving(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const sectionHeaderSx = {
    color: '#475569',
    fontWeight: 700,
    mb: 2.5,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    fontSize: '0.75rem',
    borderBottom: '2px solid #e2e8f0',
    pb: 1,
  };

  const fieldLabelSx = {
    mb: 0.5, display: 'block', fontWeight: 600, color: '#334155', fontSize: '0.8rem',
  };

  /* =============== STEP RENDERERS =============== */

  const renderStep1 = () => (
    <Box>
      <Typography variant="subtitle2" sx={sectionHeaderSx}>
        PROJECT DETAILS
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="caption" sx={fieldLabelSx}>Trial Name *</Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter a unique trial name"
            value={formData.trialName}
            onChange={handleChange('trialName')}
            error={!!errors.trialName || nameExists}
            helperText={
              errors.trialName ||
              (checkingName ? 'Checking availability...' : '') ||
              (nameExists ? 'A trial with this name already exists' : '')
            }
            InputProps={{
              endAdornment: checkingName ? (
                <CircularProgress size={16} />
              ) : formData.trialName && !nameExists ? (
                <CheckIcon sx={{ color: '#22c55e', fontSize: 18 }} />
              ) : null,
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={fieldLabelSx}>Season *</Typography>
          <TextField
            select fullWidth size="small"
            value={formData.season}
            onChange={handleChange('season')}
            error={!!errors.season}
            helperText={errors.season}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          >
            <MenuItem value=""><em>Select Season</em></MenuItem>
            {SEASONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={fieldLabelSx}>Trial Type *</Typography>
          <TextField
            select fullWidth size="small"
            value={formData.trialType}
            onChange={handleChange('trialType')}
            error={!!errors.trialType}
            helperText={errors.trialType}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          >
            <MenuItem value=""><em>Select Type</em></MenuItem>
            {TRIAL_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="caption" sx={fieldLabelSx}>Comment / Notes</Typography>
          <TextField
            fullWidth size="small" multiline rows={2}
            placeholder="Add any additional notes..."
            value={formData.comment}
            onChange={handleChange('comment')}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          />
        </Grid>

        {formData.season && formData.trialType && (
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Generated Trial Code
              </Typography>
              <Typography variant="body1" fontWeight={700} sx={{ fontFamily: 'monospace', color: '#16a34a' }}>
                {generateTrialCode(formData.season, formData.trialType, existingTrials)}
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="subtitle2" sx={sectionHeaderSx}>
        CITIES & REGIONS
      </Typography>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 1.5, '& .MuiAlert-icon': { color: '#3b82f6' } }} variant="outlined">
        Add cities where this trial will take place. You can optionally specify a trial region within each city.
      </Alert>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, borderStyle: 'dashed', borderColor: '#cbd5e1' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="City Name (e.g., Bangalore)"
            value={cityInput.cityName}
            onChange={(e) => setCityInput(prev => ({ ...prev, cityName: e.target.value }))}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCity(); } }}
          />
          <TextField
            size="small"
            placeholder="Trial Region (optional)"
            value={cityInput.trialRegion}
            onChange={(e) => setCityInput(prev => ({ ...prev, trialRegion: e.target.value }))}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCity(); } }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCity}
            disabled={!cityInput.cityName.trim()}
            sx={{
              bgcolor: '#5B63D3', '&:hover': { bgcolor: '#4A52C2' },
              minWidth: 120, borderRadius: 1.5, textTransform: 'none', fontWeight: 600,
            }}
          >
            Add City
          </Button>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
        <Button
          variant="text" startIcon={<DownloadIcon />}
          onClick={handleDownloadTemplate} size="small"
          sx={{ textTransform: 'none', color: '#64748b', fontWeight: 500 }}
        >
          CSV Template
        </Button>
        <Button
          variant="text" startIcon={<UploadIcon />}
          onClick={() => fileInputRef.current?.click()} size="small"
          sx={{ textTransform: 'none', color: '#64748b', fontWeight: 500 }}
        >
          Bulk Import
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVUpload} />
      </Stack>

      {formData.assignedCities.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.5 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.5 }}>City Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.5 }}>Trial Region</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.5 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569', py: 1.5 }} align="center">Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formData.assignedCities.map((city, index) => (
                <TableRow key={index} sx={{ '&:hover': { bgcolor: '#f9fafb' }, '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ color: '#94a3b8' }}>{index + 1}</TableCell>
                  <TableCell><Typography variant="body2" fontWeight={600}>{city.cityName}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{city.trialRegion}</Typography></TableCell>
                  <TableCell>
                    <Chip label={city.code} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => handleRemoveCity(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ textAlign: 'center', py: 5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
          <Typography variant="body2" color="text.secondary">
            No cities added yet. Add cities above or use CSV import.
          </Typography>
        </Box>
      )}

      {formData.assignedCities.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          {formData.assignedCities.length} {formData.assignedCities.length === 1 ? 'city' : 'cities'} added
        </Typography>
      )}
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="subtitle2" sx={sectionHeaderSx}>
        TIER & PRICING
      </Typography>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 1.5 }} variant="outlined">
        Tier & Pricing is optional. Select "Not Any" to skip this section.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" sx={fieldLabelSx}>Tier Type</Typography>
          <TextField
            select fullWidth size="small"
            value={formData.tierType}
            onChange={handleChange('tierType')}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
          >
            {TIER_TYPES.map(t => (
              <MenuItem key={t} value={t}>{t === 'Not Any' ? 'Not Any (Skip Tier)' : t}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {formData.tierType !== 'Not Any' && (
          <>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={fieldLabelSx}>Expected Participants</Typography>
              <TextField
                fullWidth size="small" type="number" placeholder="e.g., 200"
                value={formData.expectedParticipants}
                onChange={handleChange('expectedParticipants')}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={fieldLabelSx}>Tier Details *</Typography>
              <TextField
                fullWidth size="small" multiline rows={2}
                placeholder="Describe the tier package details..."
                value={formData.tierDetails}
                onChange={handleChange('tierDetails')}
                error={!!errors.tierDetails} helperText={errors.tierDetails}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={fieldLabelSx}>Amount (INR) *</Typography>
              <TextField
                fullWidth size="small" type="number" placeholder="e.g., 25000"
                value={formData.tierAmount}
                onChange={handleChange('tierAmount')}
                error={!!errors.tierAmount} helperText={errors.tierAmount}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
          </>
        )}

        {formData.tierType === 'Not Any' && (
          <Grid item xs={12}>
            <Box sx={{ p: 4, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center', border: '1px dashed #cbd5e1' }}>
              <Typography variant="body2" color="text.secondary">
                No tier/pricing will be applied to this trial.
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="subtitle2" sx={sectionHeaderSx}>
        TRIAL SCHEDULE
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl>
            <RadioGroup row value={formData.scheduleType} onChange={handleChange('scheduleType')}>
              {SCHEDULE_TYPES.map(type => (
                <FormControlLabel
                  key={type} value={type}
                  control={<Radio sx={{ '&.Mui-checked': { color: '#FBB040' } }} />}
                  label={<Typography variant="body2" fontWeight={500}>{type}</Typography>}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Grid>

        {formData.scheduleType === 'Fixed' && (
          <>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={fieldLabelSx}>Start Date *</Typography>
              <TextField
                fullWidth type="date" size="small"
                value={formData.startDate} onChange={handleChange('startDate')}
                error={!!errors.startDate} helperText={errors.startDate}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={fieldLabelSx}>End Date *</Typography>
              <TextField
                fullWidth type="date" size="small"
                value={formData.endDate} onChange={handleChange('endDate')}
                error={!!errors.endDate} helperText={errors.endDate}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
          </>
        )}

        {formData.scheduleType === 'Tentative' && (
          <>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={fieldLabelSx}>Tentative Month *</Typography>
              <TextField
                select fullWidth size="small"
                value={formData.tentativeMonth} onChange={handleChange('tentativeMonth')}
                error={!!errors.tentativeMonth} helperText={errors.tentativeMonth}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              >
                <MenuItem value=""><em>Select Month</em></MenuItem>
                {months.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={fieldLabelSx}>Date Range Description</Typography>
              <TextField
                fullWidth size="small" placeholder="e.g., Mid June - End June 2024"
                value={formData.tentativeDateRange} onChange={handleChange('tentativeDateRange')}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mt: 1, borderRadius: 1.5 }} variant="outlined">
                Tentative trials will have a "Pending" schedule status until dates are confirmed.
              </Alert>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );

  const renderStep5 = () => {
    const previewCode = formData.season && formData.trialType
      ? generateTrialCode(formData.season, formData.trialType, existingTrials)
      : 'N/A';

    const reviewSectionSx = {
      p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0',
    };

    return (
      <Box>
        <Typography variant="subtitle2" sx={sectionHeaderSx}>
          REVIEW & SUBMIT
        </Typography>

        <Alert severity="info" sx={{ mb: 3, borderRadius: 1.5 }} variant="outlined">
          Please review all details before submitting.
        </Alert>

        {/* Project Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ ...fieldLabelSx, mb: 1.5, fontSize: '0.75rem', color: '#64748b' }}>
            PROJECT DETAILS
          </Typography>
          <Box sx={reviewSectionSx}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Trial Name</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.trialName}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Season</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.season}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="text.secondary">Trial Type</Typography>
                <Typography variant="body2" fontWeight={600}>{formData.trialType}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Trial Code</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', color: '#16a34a' }}>
                  {previewCode}
                </Typography>
              </Grid>
              {formData.comment && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Comments</Typography>
                  <Typography variant="body2">{formData.comment}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </Box>

        {/* Cities */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ ...fieldLabelSx, mb: 1.5, fontSize: '0.75rem', color: '#64748b' }}>
            CITIES & REGIONS ({formData.assignedCities.length})
          </Typography>
          <Box sx={reviewSectionSx}>
            {formData.assignedCities.length > 0 ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {formData.assignedCities.map((city, i) => (
                  <Chip
                    key={i}
                    label={`${city.cityName}${city.trialRegion !== city.cityName ? ` / ${city.trialRegion}` : ''}`}
                    size="small"
                    sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 500, mb: 0.5 }}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No cities assigned</Typography>
            )}
          </Box>
        </Box>

        {/* Tier */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ ...fieldLabelSx, mb: 1.5, fontSize: '0.75rem', color: '#64748b' }}>
            TIER & PRICING
          </Typography>
          <Box sx={reviewSectionSx}>
            {formData.tierType === 'Not Any' ? (
              <Typography variant="body2" color="text.secondary">No Tier / Pricing</Typography>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Tier</Typography>
                  <Typography variant="body2" fontWeight={600}>{formData.tierType}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Amount</Typography>
                  <Typography variant="body2" fontWeight={600}>&#8377;{Number(formData.tierAmount).toLocaleString('en-IN')}</Typography>
                </Grid>
                {formData.expectedParticipants && (
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Participants</Typography>
                    <Typography variant="body2" fontWeight={600}>{formData.expectedParticipants}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Details</Typography>
                  <Typography variant="body2">{formData.tierDetails}</Typography>
                </Grid>
              </Grid>
            )}
          </Box>
        </Box>

        {/* Schedule */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ ...fieldLabelSx, mb: 1.5, fontSize: '0.75rem', color: '#64748b' }}>
            SCHEDULE
          </Typography>
          <Box sx={reviewSectionSx}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>{formData.scheduleType}</Typography>
                  {formData.scheduleType === 'Tentative' && <Chip label="Tentative" size="small" color="warning" />}
                </Stack>
              </Grid>
              {formData.scheduleType === 'Fixed' ? (
                <>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Start Date</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatDate(formData.startDate)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">End Date</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatDate(formData.endDate)}</Typography>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Month</Typography>
                    <Typography variant="body2" fontWeight={600}>{formData.tentativeMonth}</Typography>
                  </Grid>
                  {formData.tentativeDateRange && (
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary">Range</Typography>
                      <Typography variant="body2" fontWeight={600}>{formData.tentativeDateRange}</Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <FormControlLabel
          control={
            <Checkbox
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              sx={{ '&.Mui-checked': { color: '#5B63D3' } }}
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              I confirm that all details are correct and want to create this trial.
            </Typography>
          }
        />
      </Box>
    );
  };

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: '#1e293b' }}>
            Create New Trial
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Follow the steps below to create a new trial project.
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            mb: 4,
            '& .MuiStepIcon-root.Mui-active': { color: '#5B63D3' },
            '& .MuiStepIcon-root.Mui-completed': { color: '#22c55e' },
            '& .MuiStepLabel-label': { fontSize: '0.75rem', mt: 0.5 },
          }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2.5,
            p: { xs: 3, sm: 4 },
            mb: 4,
            borderColor: '#e2e8f0',
          }}
        >
          {stepContent[activeStep]()}
        </Paper>

        {/* Navigation Buttons */}
        <Stack direction="row" justifyContent="space-between">
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={activeStep === 0 ? () => navigate('/trials') : handleBack}
            sx={{
              borderColor: '#e2e8f0', color: '#475569', borderRadius: 1.5,
              textTransform: 'none', fontWeight: 600,
              '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
            }}
          >
            {activeStep === 0 ? 'Back to Trials' : 'Back'}
          </Button>

          {activeStep < STEPS.length - 1 ? (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={handleNext}
              sx={{
                bgcolor: '#5B63D3', borderRadius: 1.5,
                textTransform: 'none', fontWeight: 600, px: 4,
                '&:hover': { bgcolor: '#4A52C2' },
              }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
              onClick={handleSubmit}
              disabled={!confirmChecked || saving}
              sx={{
                bgcolor: '#22c55e', borderRadius: 1.5,
                textTransform: 'none', fontWeight: 600, px: 4,
                '&:hover': { bgcolor: '#16a34a' },
              }}
            >
              {saving ? 'Creating...' : 'Create Trial'}
            </Button>
          )}
        </Stack>
      </Container>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TrialWizard;
