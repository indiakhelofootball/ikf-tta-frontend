// src/components/trials/TrialWizard.jsx

import React, { useState, useEffect, useCallback } from 'react';
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
  FormControlLabel,
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
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { State, City } from 'country-state-city';

import { SEASONS_PROJECT, PROJECT_NAMES } from './trialConstants';
import { generateProjectCode } from '../../utils/trialCodeGenerator';
import { trialsAPI } from '../../services/api';

const STEPS = ['Project Setup', 'Locations', 'Schedule', 'Review'];
const indianStates = State.getStatesOfCountry('IN');

// ── MD3-aligned shared styles ──────────────────────────────────────
const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '1rem' },
  '& .MuiInputLabel-root': { fontSize: '1rem' },
};

// selectSx removed — Step 1 now uses external labels (Typography) like Steps 2/3

const filledBtnSx = {
  borderRadius: '20px', textTransform: 'none',
  fontWeight: 700, fontSize: '0.95rem',
  py: 1.25, px: 3.5, boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
  '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
};

const outlinedBtnSx = {
  borderRadius: '20px', textTransform: 'none',
  fontWeight: 600, fontSize: '0.95rem',
  py: 1.25, px: 3.5,
  border: '1.5px solid #c7c7cc', color: '#1d1d1f',
  '&:hover': { bgcolor: '#f5f5f7', border: '1.5px solid #888', boxShadow: 'none' },
};

const sectionTitleSx = {
  fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', mb: 0.5,
};

const fieldLabelSx = {
  fontSize: '0.9rem', fontWeight: 600, color: '#3c3c43', mb: 0.75, display: 'block',
};

// ── Helper: generate city code ─────────────────────────────────────
function makeCityCode(stateName, cityName, existingCities) {
  const stateObj = indianStates.find(s => s.name === stateName);
  const stateCode = stateObj?.isoCode || 'XX';
  const cityAbbr = cityName.trim().substring(0, 3).toUpperCase();
  const seq = String(
    existingCities.filter(c => c.code && c.code.includes(`-${stateCode}-${cityAbbr}-`)).length + 1
  ).padStart(3, '0');
  return `IKF-${stateCode}-${cityAbbr}-${seq}`;
}

function TrialWizard() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [projectCreated, setProjectCreated] = useState(false);
  const [existingTrials, setExistingTrials] = useState([]);

  const [formData, setFormData] = useState({
    projectName: '',
    season: '',
    description: '',      // merged about + notes
    assignedCities: [],
    tentativeMonth: '',
    tentativeDateRange: '',
    status: 'Draft',
  });

  // Multiple location rows (each row = one location being filled in)
  const [locationRows, setLocationRows] = useState([
    { id: Date.now(), state: null, city: null, region: '', availableCities: [] },
  ]);

  // Bulk add state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState(
    Array.from({ length: 10 }, (_, i) => ({ id: i, state: null, city: null, region: '', availableCities: [] }))
  );

  // Per-city schedules: { [cityCode]: { month: '', date: '' } }
  const [citySchedules, setCitySchedules] = useState({});

  const [errors, setErrors] = useState({});

  useEffect(() => {
    trialsAPI.getAll()
      .then(r => setExistingTrials(r.trials || []))
      .catch(() => {});
  }, []);

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

  const autoProjectCode = (formData.projectName && formData.season)
    ? generateProjectCode(formData.projectName, formData.season, existingTrials)
    : '';

  const handleChange = useCallback((field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }, [errors]);

  // ── Location row management ────────────────────────────────────
  const updateRow = (id, updates) => {
    setLocationRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const next = { ...row, ...updates };
      if ('state' in updates) {
        next.city = null;
        next.availableCities = updates.state
          ? City.getCitiesOfState('IN', updates.state.isoCode)
          : [];
      }
      return next;
    }));
  };

  const removeRow = (id) => {
    setLocationRows(prev => prev.filter(r => r.id !== id));
  };

  const addNewRow = () => {
    setLocationRows(prev => [...prev, { id: Date.now(), state: null, city: null, region: '', availableCities: [] }]);
  };

  const saveRow = (id) => {
    const row = locationRows.find(r => r.id === id);
    if (!row?.state || !row?.city) {
      showToast('Please select a state and city', 'warning');
      return;
    }
    const stateName = row.state.name;
    const cityName = row.city.name;
    const region = row.region.trim() || cityName;

    const isDuplicate = formData.assignedCities.some(
      c => c.cityName?.toLowerCase() === cityName.toLowerCase() &&
           c.state?.toLowerCase() === stateName.toLowerCase() &&
           c.region?.toLowerCase() === region.toLowerCase()
    );
    if (isDuplicate) {
      showToast('This location already exists', 'warning');
      return;
    }

    const code = makeCityCode(stateName, cityName, formData.assignedCities);
    setFormData(prev => ({
      ...prev,
      assignedCities: [...prev.assignedCities, {
        state: stateName, cityName, region, trialRegion: region,
        confirmed: false, code,
      }],
    }));
    // Remove the saved row — user clicks "Add more cities" when ready for next
    setLocationRows(prev => prev.filter(r => r.id !== id));
    showToast(`${cityName} saved`);
  };

  const removeCity = (index) => {
    setFormData(prev => ({
      ...prev,
      assignedCities: prev.assignedCities.filter((_, i) => i !== index),
    }));
  };

  // ── Bulk add management ────────────────────────────────────────
  const updateBulkRow = (id, updates) => {
    setBulkRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const next = { ...row, ...updates };
      if ('state' in updates) {
        next.city = null;
        next.availableCities = updates.state
          ? City.getCitiesOfState('IN', updates.state.isoCode)
          : [];
      }
      return next;
    }));
  };

  const saveBulkRows = () => {
    const valid = bulkRows.filter(r => r.state && r.city);
    if (valid.length === 0) {
      showToast('Fill at least one city (state + city required)', 'warning');
      return;
    }
    const toAdd = [];
    let skipped = 0;
    for (const row of valid) {
      const stateName = row.state.name;
      const cityName = row.city.name;
      const region = row.region.trim() || cityName;
      const isDuplicate = [...formData.assignedCities, ...toAdd].some(
        c => c.cityName?.toLowerCase() === cityName.toLowerCase() &&
             c.state?.toLowerCase() === stateName.toLowerCase()
      );
      if (isDuplicate) { skipped++; continue; }
      const code = makeCityCode(stateName, cityName, [...formData.assignedCities, ...toAdd]);
      toAdd.push({ state: stateName, cityName, region, trialRegion: region, confirmed: false, code });
    }
    if (toAdd.length > 0) {
      setFormData(prev => ({ ...prev, assignedCities: [...prev.assignedCities, ...toAdd] }));
    }
    setBulkRows(Array.from({ length: 10 }, (_, i) => ({ id: i, state: null, city: null, region: '', availableCities: [] })));
    setBulkOpen(false);
    showToast(
      skipped > 0 ? `${toAdd.length} saved, ${skipped} duplicate(s) skipped` : `${toAdd.length} cities saved!`,
      toAdd.length > 0 ? 'success' : 'warning'
    );
  };

  // ── Validation ─────────────────────────────────────────────────
  const validateStep = (step) => {
    const errs = {};
    if (step === 0) {
      if (!formData.projectName) errs.projectName = 'Project name is required';
      if (!formData.season) errs.season = 'Season is required';
    }
    if (step === 2) {
      const missingMonth = formData.assignedCities.some(city => !citySchedules[city.code]?.month);
      if (missingMonth) errs.schedule = 'Please set a month for every city';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) setActiveStep(p => p + 1);
  };
  const handleBack = () => setActiveStep(p => p - 1);

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!confirmChecked) return;
    setSaving(true);
    try {
      const code = generateProjectCode(formData.projectName, formData.season, existingTrials);
      await trialsAPI.create({
        trialName: code,
        trialCode: code,
        season: formData.season,
        trialType: formData.description || formData.projectName,
        tierType: 'Not Any',
        tierDetails: null, tierAmount: null, expectedParticipants: null,
        scheduleType: 'Tentative',
        startDate: null, endDate: null,
        tentativeMonth: null,
        tentativeDateRange: null,
        nextTrialDate: null,
        status: formData.status,
        comment: null,
        assignedCities: formData.assignedCities.map(city => ({
          ...city,
          tentativeMonth: citySchedules[city.code]?.month || null,
          tentativeDate: citySchedules[city.code]?.date || null,
        })),
      });
      showToast('Project created successfully!');
      setProjectCreated(true);
    } catch (err) {
      showToast(err.message || 'Failed to create project', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({ projectName: '', season: '', description: '', assignedCities: [], tentativeMonth: '', tentativeDateRange: '', status: 'Draft' });
    setLocationRows([{ id: Date.now(), state: null, city: null, region: '', availableCities: [] }]);
    setBulkRows(Array.from({ length: 10 }, (_, i) => ({ id: i, state: null, city: null, region: '', availableCities: [] })));
    setBulkOpen(false);
    setCitySchedules({});
    setErrors({});
    setConfirmChecked(false);
    setProjectCreated(false);
    setActiveStep(0);
  };

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // ═══════════════════════════════════════════════════════════════
  // STEP 1 — PROJECT SETUP
  // ═══════════════════════════════════════════════════════════════
  const renderStep1 = () => (
    <Box>
      <Typography sx={sectionTitleSx}>Project Setup</Typography>
      <Typography variant="body2" sx={{ mb: 3.5, color: '#6e6e73', fontSize: '0.95rem' }}>
        Select your project and season to get started.
      </Typography>

      <Grid container spacing={3}>
        {/* Project Name */}
        <Grid item xs={12} sm={6}>
          <Typography sx={fieldLabelSx}>
            Project Name <span style={{ color: '#ef4444' }}>*</span>
          </Typography>
          <TextField
            select fullWidth size="small"
            value={formData.projectName}
            onChange={handleChange('projectName')}
            error={!!errors.projectName}
            helperText={errors.projectName}
            sx={inputSx}
          >
            <MenuItem value=""><em style={{ color: '#888' }}>— Select Project —</em></MenuItem>
            {PROJECT_NAMES.map(p => (
              <MenuItem key={p} value={p} sx={{ fontSize: '1rem', fontWeight: 500 }}>{p}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Season */}
        <Grid item xs={12} sm={6}>
          <Typography sx={fieldLabelSx}>
            Season <span style={{ color: '#ef4444' }}>*</span>
          </Typography>
          <TextField
            select fullWidth size="small"
            value={formData.season}
            onChange={handleChange('season')}
            error={!!errors.season}
            helperText={errors.season}
            sx={inputSx}
          >
            <MenuItem value=""><em style={{ color: '#888' }}>— Select Season —</em></MenuItem>
            {SEASONS_PROJECT.map(s => (
              <MenuItem key={s} value={s} sx={{ fontSize: '1rem', fontWeight: 500 }}>{s}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Project context banner — fixed height, opacity-based reveal, zero layout shift */}
        <Grid item xs={12}>
          <Box
            sx={{
              height: 46,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              borderRadius: '10px',
              bgcolor: '#f5f3ff',
              border: '1.5px solid #ddd6fe',
              opacity: (formData.projectName && formData.season) ? 1 : 0,
              transition: 'opacity 0.25s ease',
              pointerEvents: 'none',
            }}
          >
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#6e6e73', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
              Project ID
            </Typography>
            <Chip
              label={autoProjectCode}
              size="small"
              sx={{
                bgcolor: '#1e1b4b', color: '#e0e7ff',
                fontWeight: 700, fontSize: '0.78rem',
                fontFamily: '"Roboto Mono", monospace',
                borderRadius: '6px', height: 26,
                letterSpacing: '0.04em',
              }}
            />
            <Box sx={{ width: '1px', height: 20, bgcolor: '#c4b5fd', flexShrink: 0 }} />
            <Chip
              label={formData.projectName}
              size="small"
              sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 700, fontSize: '0.82rem', borderRadius: '7px', height: 26 }}
            />
            <Typography sx={{ color: '#c4b5fd', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>·</Typography>
            <Chip
              label={formData.season}
              size="small"
              sx={{ bgcolor: '#fdf4ff', color: '#7e22ce', fontWeight: 700, fontSize: '0.82rem', borderRadius: '7px', height: 26 }}
            />
          </Box>
        </Grid>

        {/* Description / Notes */}
        <Grid item xs={12}>
          <TextField
            fullWidth size="small" multiline rows={4}
            label="Description / Notes"
            placeholder="Describe this project — purpose, target audience, or any important notes..."
            value={formData.description}
            onChange={handleChange('description')}
            sx={inputSx}
            slotProps={{
              inputLabel: { shrink: true },
              input: { notched: true },
            }}
          />
        </Grid>

      </Grid>
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 2 — LOCATIONS
  // ═══════════════════════════════════════════════════════════════
  const renderStep2 = () => (
    <Box>
      <Typography sx={sectionTitleSx}>Locations</Typography>

      {/* Colored project context */}
      {formData.projectName && (
        <Box sx={{ mb: 3, display: 'inline-flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '1rem', color: '#6e6e73' }}>Adding locations for</Typography>
          <Chip
            label={formData.projectName}
            sx={{ bgcolor: '#eef2ff', color: '#4338ca', fontWeight: 700, fontSize: '0.9rem', height: 30, borderRadius: '8px' }}
          />
          <Typography sx={{ fontSize: '1rem', color: '#6e6e73' }}>—</Typography>
          <Chip
            label={formData.season}
            sx={{ bgcolor: '#fdf4ff', color: '#7e22ce', fontWeight: 700, fontSize: '0.9rem', height: 30, borderRadius: '8px' }}
          />
        </Box>
      )}

      {/* ── Bulk Add Panel ─────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          onClick={() => setBulkOpen(p => !p)}
          sx={{
            ...outlinedBtnSx,
            borderColor: '#F59E0B', color: '#92400e',
            bgcolor: bulkOpen ? '#fffbeb' : 'transparent',
            '&:hover': { bgcolor: '#fffbeb', borderColor: '#D97706' },
          }}
        >
          {bulkOpen ? 'Close Bulk Add' : '⚡ Bulk Add Cities'}
        </Button>

        {bulkOpen && (
          <Paper variant="outlined" sx={{ mt: 2, p: 3, borderRadius: '14px', border: '1.5px solid #FDE68A', bgcolor: '#fffdf5' }}>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e', mb: 0.5 }}>
              Bulk Add — fill up to 10 cities at once
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#b45309', mb: 2.5 }}>
              Rows with no state+city selected will be skipped automatically.
            </Typography>

            <Stack spacing={1.5}>
              {bulkRows.map((row, idx) => (
                <Grid container spacing={1.5} key={row.id} alignItems="center">
                  {/* Row number */}
                  <Grid item xs={12} sm="auto">
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#9e9e9e', minWidth: 22, textAlign: 'center' }}>
                      {idx + 1}
                    </Typography>
                  </Grid>
                  {/* State */}
                  <Grid item xs={12} sm={4}>
                    <Autocomplete
                      size="small"
                      options={indianStates}
                      getOptionLabel={(o) => o.name || ''}
                      value={row.state}
                      onChange={(_, val) => updateBulkRow(row.id, { state: val })}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="State" sx={inputSx} />
                      )}
                      isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                      ListboxProps={{ style: { maxHeight: 200 } }}
                    />
                  </Grid>
                  {/* City */}
                  <Grid item xs={12} sm={4}>
                    <Autocomplete
                      size="small"
                      options={row.availableCities}
                      getOptionLabel={(o) => o.name || ''}
                      value={row.city}
                      onChange={(_, val) => updateBulkRow(row.id, { city: val })}
                      renderInput={(params) => (
                        <TextField {...params} placeholder={row.state ? 'City' : 'Select state first'} sx={inputSx} />
                      )}
                      disabled={!row.state}
                      isOptionEqualToValue={(o, v) => o.name === v.name}
                      noOptionsText="No cities found"
                      ListboxProps={{ style: { maxHeight: 200 } }}
                    />
                  </Grid>
                  {/* Sub City */}
                  <Grid item xs={12} sm>
                    <TextField
                      fullWidth size="small"
                      placeholder="Sub City (optional)"
                      value={row.region}
                      onChange={(e) => updateBulkRow(row.id, { region: e.target.value })}
                      sx={inputSx}
                    />
                  </Grid>
                </Grid>
              ))}
            </Stack>

            <Button
              variant="contained"
              onClick={saveBulkRows}
              sx={{
                ...filledBtnSx,
                mt: 3,
                bgcolor: '#F59E0B', color: '#1c1917',
                '&:hover': { bgcolor: '#D97706' },
                px: 5,
              }}
            >
              Save All Cities
            </Button>
          </Paper>
        )}
      </Box>

      {/* ── Individual location rows ────────────────────────── */}
      <Stack spacing={2.5} sx={{ mb: 3 }}>
        {locationRows.map((row, idx) => (
          <Paper
            key={row.id}
            variant="outlined"
            sx={{
              p: 2.5, borderRadius: '14px',
              border: '1.5px solid #d1d5db', bgcolor: '#fafafa',
            }}
          >
            {/* Row header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#5B63D3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Location {formData.assignedCities.length + idx + 1}
              </Typography>
              {locationRows.length > 1 && (
                <IconButton size="small" onClick={() => removeRow(row.id)} sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>

            <Grid container spacing={2.5}>
              {/* State */}
              <Grid item xs={12} sm={4}>
                <Typography sx={fieldLabelSx}>State</Typography>
                <Autocomplete
                  size="small"
                  options={indianStates}
                  getOptionLabel={(o) => o.name || ''}
                  value={row.state}
                  onChange={(_, val) => updateRow(row.id, { state: val })}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Search state..." sx={inputSx} />
                  )}
                  isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                  ListboxProps={{ style: { maxHeight: 220 } }}
                />
              </Grid>

              {/* City */}
              <Grid item xs={12} sm={4}>
                <Typography sx={fieldLabelSx}>City</Typography>
                <Autocomplete
                  size="small"
                  options={row.availableCities}
                  getOptionLabel={(o) => o.name || ''}
                  value={row.city}
                  onChange={(_, val) => updateRow(row.id, { city: val })}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={row.state ? 'Search city...' : 'Select state first'}
                      sx={inputSx}
                    />
                  )}
                  disabled={!row.state}
                  isOptionEqualToValue={(o, v) => o.name === v.name}
                  noOptionsText="No cities found"
                  ListboxProps={{ style: { maxHeight: 220 } }}
                />
              </Grid>

              {/* Sub City */}
              <Grid item xs={12} sm={4}>
                <Typography sx={fieldLabelSx}>
                  Sub City <Typography component="span" sx={{ fontSize: '0.8rem', color: '#9e9e9e' }}>(optional)</Typography>
                </Typography>
                <TextField
                  fullWidth size="small"
                  placeholder="e.g., Andheri, Bandra"
                  value={row.region}
                  onChange={(e) => updateRow(row.id, { region: e.target.value })}
                  sx={inputSx}
                />
              </Grid>

              {/* Save button */}
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={() => saveRow(row.id)}
                  disabled={!row.state || !row.city}
                  sx={{
                    ...filledBtnSx,
                    bgcolor: '#FDE68A', color: '#111827',
                    '&:hover': { bgcolor: '#FCD34D' },
                    minWidth: 120,
                  }}
                >
                  Save
                </Button>
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Stack>

      {/* + Add more cities */}
      <Button
        variant="outlined"
        onClick={addNewRow}
        disabled={locationRows.length > 0}
        sx={{
          ...outlinedBtnSx,
          borderStyle: 'dashed',
          color: '#5B63D3', borderColor: '#5B63D3',
          '&:hover': { bgcolor: '#eef2ff', borderColor: '#4338ca' },
          mb: 3,
        }}
      >
        + Add more cities
      </Button>

      {/* Saved locations table */}
      {formData.assignedCities.length > 0 && (
        <>
          <Typography sx={{ ...fieldLabelSx, mb: 1 }}>
            Saved Locations ({formData.assignedCities.length})
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', border: '1.5px solid #e0e0e0' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f7' }}>
                  {['#', 'State', 'City', 'Sub City', ''].map((h, i) => (
                    <TableCell key={i} align={i === 4 ? 'center' : 'left'} sx={{
                      fontWeight: 700, color: '#1d1d1f', fontSize: '0.85rem',
                      py: 1.5, borderBottom: '2px solid #e0e0e0',
                    }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.assignedCities.map((loc, i) => (
                  <TableRow key={i} sx={{ '&:hover': { bgcolor: '#f9f9fb' }, '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ color: '#888', fontWeight: 600, py: 1.25, width: 36 }}>{i + 1}</TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: '0.9rem', color: '#555' }}>{loc.state || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f' }}>{loc.cityName}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.25 }}>
                      <Typography sx={{ fontSize: '0.9rem', color: '#555' }}>
                        {loc.region && loc.region !== loc.cityName ? loc.region : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.25, width: 44 }}>
                      <IconButton size="small" onClick={() => removeCity(i)} sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {formData.assignedCities.length === 0 && locationRows.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, borderRadius: '14px', border: '2px dashed #e0e0e0', bgcolor: '#f9f9fb', mt: 2 }}>
          <LocationIcon sx={{ fontSize: 40, color: '#ccc', mb: 1 }} />
          <Typography sx={{ fontSize: '0.95rem', color: '#888', fontWeight: 500 }}>
            No locations saved yet — click "+ Add more cities" to begin
          </Typography>
        </Box>
      )}
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 3 — SCHEDULE
  // ═══════════════════════════════════════════════════════════════
  const updateCitySchedule = (code, field, value) => {
    setCitySchedules(prev => ({
      ...prev,
      [code]: { ...prev[code], [field]: value },
    }));
    if (errors.schedule) setErrors(prev => ({ ...prev, schedule: '' }));
  };

  const renderStep3 = () => (
    <Box>
      <Typography sx={sectionTitleSx}>Schedule</Typography>
      <Typography variant="body2" sx={{ mb: 3.5, color: '#6e6e73', fontSize: '0.95rem' }}>
        Set a tentative date for each city.
      </Typography>

      {errors.schedule && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>{errors.schedule}</Alert>
      )}

      {formData.assignedCities.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '10px' }}>
          No cities added yet — go back to Locations to add cities first.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {formData.assignedCities.map((city) => {
            const sched = citySchedules[city.code] || {};
            return (
              <Paper key={city.code} variant="outlined" sx={{
                p: 2.5, borderRadius: '14px',
                border: '1.5px solid #d1d5db', bgcolor: '#fafafa',
              }}>
                {/* City label */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <LocationIcon sx={{ fontSize: 18, color: '#5B63D3' }} />
                  <Typography sx={{ fontWeight: 700, color: '#1d1d1f', fontSize: '0.95rem' }}>
                    {city.cityName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: '#888' }}>— {city.state}</Typography>
                  {city.region && city.region !== city.cityName && (
                    <Typography sx={{ fontSize: '0.8rem', color: '#aaa' }}>· {city.region}</Typography>
                  )}
                </Stack>

                <Grid container spacing={2.5}>
                  {/* Month */}
                  <Grid item xs={12} sm={6}>
                    <Typography sx={fieldLabelSx}>
                      Month <span style={{ color: '#ef4444' }}>*</span>
                    </Typography>
                    <TextField
                      select fullWidth size="small"
                      value={sched.month || ''}
                      onChange={(e) => updateCitySchedule(city.code, 'month', e.target.value)}
                      sx={inputSx}
                    >
                      <MenuItem value=""><em style={{ color: '#888' }}>— Select Month —</em></MenuItem>
                      {months.map(m => (
                        <MenuItem key={m} value={m} sx={{ fontSize: '1rem', fontWeight: 500 }}>{m}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Date picker */}
                  <Grid item xs={12} sm={6}>
                    <Typography sx={fieldLabelSx}>Date</Typography>
                    <TextField
                      fullWidth size="small" type="date"
                      value={sched.date || ''}
                      onChange={(e) => updateCitySchedule(city.code, 'date', e.target.value)}
                      sx={inputSx}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );

  // ═══════════════════════════════════════════════════════════════
  // STEP 4 — REVIEW
  // ═══════════════════════════════════════════════════════════════
  const renderStep4 = () => {
    const sectionBox = {
      p: 3, borderRadius: '14px', bgcolor: '#f9f9fb', border: '1.5px solid #e8e8e8', mb: 3,
    };
    const label = { fontSize: '0.8rem', fontWeight: 600, color: '#888', mb: 0.5, display: 'block' };
    const value = { fontSize: '1rem', fontWeight: 600, color: '#1d1d1f' };

    return (
      <Box>
        <Typography sx={sectionTitleSx}>Review</Typography>
        <Typography variant="body2" sx={{ mb: 3.5, color: '#6e6e73', fontSize: '0.95rem' }}>
          Check everything before creating the project.
        </Typography>

        {/* Project */}
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1 }}>
          Project Details
        </Typography>
        <Box sx={sectionBox}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography sx={label}>Project Name</Typography>
              <Typography sx={value}>{formData.projectName}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography sx={label}>Season</Typography>
              <Typography sx={value}>{formData.season}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography sx={label}>Reference Code</Typography>
              <Typography sx={{ ...value, fontFamily: 'monospace', color: '#16a34a', fontSize: '1.05rem' }}>
                {autoProjectCode}
              </Typography>
            </Grid>
            {formData.description && (
              <Grid item xs={12}>
                <Typography sx={label}>Description</Typography>
                <Typography sx={{ fontSize: '0.95rem', color: '#444' }}>{formData.description}</Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Locations */}
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1 }}>
          Locations ({formData.assignedCities.length})
        </Typography>
        <Box sx={sectionBox}>
          {formData.assignedCities.length > 0 ? (
            <Stack spacing={1}>
              {formData.assignedCities.map((loc, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip label={`${loc.state || ''} › ${loc.cityName}`} size="small"
                    sx={{ bgcolor: '#eef2ff', color: '#3730a3', fontWeight: 700, fontSize: '0.85rem' }} />
                  {loc.region && loc.region !== loc.cityName && (
                    <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>· {loc.region}</Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: '0.95rem', color: '#888' }}>No locations assigned</Typography>
          )}
        </Box>

        {/* Schedule */}
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1 }}>
          Schedule
        </Typography>
        <Box sx={sectionBox}>
          {formData.assignedCities.length === 0 ? (
            <Typography sx={{ fontSize: '0.95rem', color: '#888' }}>No cities assigned</Typography>
          ) : (
            <Stack spacing={1.5}>
              {formData.assignedCities.map((city) => {
                const sched = citySchedules[city.code] || {};
                return (
                  <Stack key={city.code} direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Chip
                      label={`${city.state || ''} › ${city.cityName}`}
                      size="small"
                      sx={{ bgcolor: '#eef2ff', color: '#3730a3', fontWeight: 700, fontSize: '0.82rem' }}
                    />
                    <Typography sx={{ fontSize: '0.9rem', color: '#1d1d1f', fontWeight: 600 }}>
                      {sched.month || '—'}
                    </Typography>
                    {sched.date && (
                      <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>{sched.date}</Typography>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <FormControlLabel
          control={
            <Checkbox
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              sx={{ '&.Mui-checked': { color: '#5B63D3' }, transform: 'scale(1.15)' }}
            />
          }
          label={
            <Typography sx={{ fontSize: '0.95rem', color: '#555', ml: 0.5 }}>
              I confirm all details are correct and want to create this project.
            </Typography>
          }
        />
      </Box>
    );
  };

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4];

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <Box sx={{ py: 4, minHeight: '100vh', bgcolor: '#f5f5f7' }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d1d1f', mb: 0.5, letterSpacing: '-0.02em' }}>
            Project Setup
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: '#6e6e73' }}>
            Follow the steps below to create a new project.
          </Typography>
        </Box>

        {/* Stepper */}
        {!projectCreated && (
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            sx={{
              mb: 4,
              '& .MuiStepIcon-root.Mui-active': { color: '#5B63D3' },
              '& .MuiStepIcon-root.Mui-completed': { color: '#22c55e' },
              '& .MuiStepLabel-label': { fontSize: '0.85rem', mt: 0.5, fontWeight: 600 },
              '& .MuiStepConnector-line': { borderTopWidth: 2 },
            }}
          >
            {STEPS.map(label => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
        )}

        {/* Success */}
        {projectCreated ? (
          <Paper elevation={0} sx={{
            borderRadius: '20px', p: 6, textAlign: 'center',
            border: '1.5px solid #bbf7d0', bgcolor: '#fff',
          }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <CheckIcon sx={{ fontSize: 40, color: '#22c55e' }} />
            </Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d1d1f', mb: 1 }}>
              Project Created!
            </Typography>
            <Typography sx={{ fontSize: '1rem', color: '#6e6e73', mb: 4 }}>
              <strong>{autoProjectCode}</strong> has been saved as a Draft.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleReset}
                sx={{ ...filledBtnSx, bgcolor: '#FDE68A', color: '#111827', '&:hover': { bgcolor: '#FCD34D' }, px: 5 }}>
                Create Another Project
              </Button>
              <Button variant="outlined" onClick={() => navigate('/trials')}
                sx={{ ...outlinedBtnSx, px: 5 }}>
                Go to Projects List
              </Button>
            </Stack>
          </Paper>
        ) : (
          <>
            {/* Step card */}
            <Paper elevation={0} sx={{
              borderRadius: '20px', p: { xs: 3, sm: 4.5 }, mb: 3,
              border: '1.5px solid #e8e8e8', bgcolor: '#fff',
            }}>
              {stepContent[activeStep]()}
            </Paper>

            {/* Navigation */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={activeStep === 0 ? () => navigate('/trials') : handleBack}
                sx={{ ...outlinedBtnSx, px: 3.5 }}
              >
                {activeStep === 0 ? 'Back to Projects' : 'Previous'}
              </Button>

              {activeStep < STEPS.length - 1 ? (
                <Button
                  variant="contained"
                  endIcon={<NextIcon />}
                  onClick={handleNext}
                  sx={{ ...filledBtnSx, bgcolor: '#FDE68A', color: '#111827', '&:hover': { bgcolor: '#FCD34D' }, px: 4.5 }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
                  onClick={handleSubmit}
                  disabled={!confirmChecked || saving}
                  sx={{ ...filledBtnSx, bgcolor: '#22c55e', color: '#fff', '&:hover': { bgcolor: '#16a34a' }, px: 4.5 }}
                >
                  {saving ? 'Creating...' : 'Create Project'}
                </Button>
              )}
            </Stack>
          </>
        )}
      </Container>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: '12px', fontSize: '0.95rem' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TrialWizard;
