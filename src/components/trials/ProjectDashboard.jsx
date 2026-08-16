// src/components/trials/ProjectDashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, IconButton, Stack, Chip,
  Card, CardContent, TextField, InputAdornment, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Checkbox, FormControlLabel, CircularProgress, Alert, Snackbar, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, Grid, Accordion, AccordionSummary, AccordionDetails,
  Tooltip, Collapse,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  TableRows as BulkIcon,
  ExpandMore as ExpandMoreIcon,
  EmojiEvents as TierIcon,
  StickyNote2 as NotesIcon,
} from '@mui/icons-material';
import { State, City } from 'country-state-city';

import { trialsAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';
import TrialDeleteDialog from './TrialDeleteDialog';
import { CITY_SORT_OPTIONS, MONTHS } from './trialConstants';

const indianStates = State.getStatesOfCountry('IN');

const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '1rem' },
};

const selectInputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '12px', fontSize: '1rem', height: '44px' },
};

const fieldLabelSx = {
  fontSize: '0.9rem', fontWeight: 600, color: '#3c3c43', mb: 0.75, display: 'block',
};

const captionSx = {
  fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em',
  color: '#6e6e73', fontWeight: 600,
};

function makeCityCode(stateName, cityName, existingCities) {
  const stateObj = indianStates.find(s => s.name === stateName);
  const stateCode = stateObj?.isoCode || 'XX';
  const cityAbbr = cityName.trim().substring(0, 3).toUpperCase();
  const seq = String(
    existingCities.filter(c => c.code && c.code.includes(`-${stateCode}-${cityAbbr}-`)).length + 1
  ).padStart(3, '0');
  return `IKF-${stateCode}-${cityAbbr}-${seq}`;
}

const PAGE_SIZE = 20;

function makeBulkRows(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i, state: null, city: null, region: '', month: '', date: '', availableCities: [],
  }));
}

function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useGrants();
  const canEditTrials = canEdit('trials');

  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Project-level modals
  const [deleteOpen, setDeleteOpen] = useState(false);

  // City table controls
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);

  // Add city form
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState({ state: null, city: null, region: '', month: 'July', date: `${new Date().getFullYear()}-07-10`, availableCities: [] });
  const [addSaving, setAddSaving] = useState(false);

  // Bulk add dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState(makeBulkRows(7));
  const [bulkSaving, setBulkSaving] = useState(false);

  // Inline city editing
  const [editingCode, setEditingCode] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // City delete confirm
  const [deletingCity, setDeletingCity] = useState(null);
  const [deleteCitySaving, setDeleteCitySaving] = useState(false);


  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => { loadTrial(); }, [id]);
  useRefetchOnFocus(() => loadTrial({ silent: true }));

  const loadTrial = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await trialsAPI.getById(id);
      setTrial(data.trial);
    } catch {
      if (!silent) showToast('Failed to load project', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const showToast = (msg, severity = 'success') =>
    setToast({ open: true, message: msg, severity });


  // ── Filtered + sorted cities ──────────────────────────────────────
  const filteredCities = useMemo(() => {
    if (!trial) return [];
    let cities = [...(trial.assignedCities || [])];

    if (search.trim()) {
      const q = search.toLowerCase();
      cities = cities.filter(c =>
        c.cityName?.toLowerCase().includes(q) ||
        c.region?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q)
      );
    }

    if (filterState) {
      cities = cities.filter(c => c.state === filterState);
    }

    switch (sortBy) {
      case 'city-asc':
        cities.sort((a, b) => (a.cityName || '').localeCompare(b.cityName || ''));
        break;
      case 'city-desc':
        cities.sort((a, b) => (b.cityName || '').localeCompare(a.cityName || ''));
        break;
      case 'state-asc':
        cities.sort((a, b) => (a.state || '').localeCompare(b.state || ''));
        break;
      case 'month-asc':
        cities.sort((a, b) => MONTHS.indexOf(a.tentativeMonth) - MONTHS.indexOf(b.tentativeMonth));
        break;
      case 'confirmed-first':
        cities.sort((a, b) => (b.confirmed ? 1 : 0) - (a.confirmed ? 1 : 0));
        break;
      default:
        break; // recent = original API order
    }

    return cities;
  }, [trial, search, filterState, sortBy]);

  const totalPages = Math.ceil(filteredCities.length / PAGE_SIZE);
  const paginatedCities = filteredCities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const uniqueStates = useMemo(() =>
    [...new Set((trial?.assignedCities || []).map(c => c.state).filter(Boolean))].sort(),
    [trial]
  );

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterState, sortBy]);

  // ── Project edit / delete ─────────────────────────────────────────
  const handleDeleteProject = async (t) => {
    await trialsAPI.delete(t.id);
    navigate('/trials');
  };

  // ── Add city ──────────────────────────────────────────────────────
  const handleAddCity = async () => {
    const subCity = addForm.region.trim();
    const cityName = subCity
      ? `${addForm.city?.name}, ${subCity}`
      : addForm.city?.name || '';
    if (!addForm.state || !addForm.city) {
      showToast('State and city are required', 'warning');
      return;
    }
    const stateName = addForm.state.name;
    const existingCities = trial.assignedCities || [];

    const isDup = existingCities.some(c =>
      c.cityName?.toLowerCase() === cityName.toLowerCase() &&
      c.state?.toLowerCase() === stateName.toLowerCase()
    );
    if (isDup) {
      showToast('This city already exists in this project', 'warning');
      return;
    }

    const code = makeCityCode(stateName, cityName, existingCities);
    setAddSaving(true);
    try {
      const data = await trialsAPI.addCity(id, {
        code, state: stateName, cityName, region: cityName,
        tentativeMonth: addForm.month,
        tentativeDate: addForm.date || `${new Date().getFullYear()}-07-10`,
        confirmed: false,
      });
      setTrial(data.trial);
      setAddForm({ state: null, city: null, region: '', month: 'July', date: `${new Date().getFullYear()}-07-10`, availableCities: [] });
      setAddFormOpen(false);
      showToast(`${cityName} added`);
    } catch (err) {
      showToast(err.message || 'Failed to add city', 'error');
    } finally {
      setAddSaving(false);
    }
  };

  const updateAddForm = (updates) => {
    setAddForm(prev => {
      const next = { ...prev, ...updates };
      if ('state' in updates) {
        next.city = null;
        next.availableCities = updates.state
          ? City.getCitiesOfState('IN', updates.state.isoCode) : [];
      }
      if ('month' in updates && updates.month) {
        const idx = MONTHS.indexOf(updates.month);
        const year = new Date().getFullYear();
        next.date = `${year}-${String(idx + 1).padStart(2, '0')}-10`;
      }
      if ('month' in updates && !updates.month) {
        next.date = '';
      }
      return next;
    });
  };

  // ── Bulk add ──────────────────────────────────────────────────────
  const updateBulkRow = (rowId, updates) => {
    setBulkRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const next = { ...row, ...updates };
      if ('state' in updates) {
        next.city = null;
        next.availableCities = updates.state
          ? City.getCitiesOfState('IN', updates.state.isoCode) : [];
      }
      if ('month' in updates && updates.month) {
        const idx = MONTHS.indexOf(updates.month);
        const year = new Date().getFullYear();
        next.date = `${year}-${String(idx + 1).padStart(2, '0')}-10`;
      }
      if ('month' in updates && !updates.month) {
        next.date = '';
      }
      return next;
    }));
  };

  const addMoreBulkRows = () => {
    setBulkRows(prev => [
      ...prev,
      ...Array.from({ length: 7 }, (_, i) => ({
        id: Date.now() + i,
        state: null, city: null, region: '', month: '', date: '', availableCities: [],
      })),
    ]);
  };

  const handleBulkSave = async () => {
    const valid = bulkRows.filter(r => r.state && r.city);
    if (valid.length === 0) {
      showToast('Fill at least one row (state and city required)', 'warning');
      return;
    }
    setBulkSaving(true);
    const existingCities = trial.assignedCities || [];
    const toAdd = [];
    let skipped = 0;
    const year = new Date().getFullYear();

    for (const row of valid) {
      const stateName = row.state.name;
      const subCity = row.region?.trim() || '';
      const cityName = subCity ? `${row.city.name}, ${subCity}` : row.city.name;
      const isDup = [...existingCities, ...toAdd].some(c =>
        c.cityName?.toLowerCase() === cityName.toLowerCase() &&
        c.state?.toLowerCase() === stateName.toLowerCase()
      );
      if (isDup) { skipped++; continue; }
      const code = makeCityCode(stateName, cityName, [...existingCities, ...toAdd]);

      let tentativeDate;
      if (row.date) {
        tentativeDate = row.date;
      } else if (row.month) {
        const idx = MONTHS.indexOf(row.month);
        tentativeDate = `${year}-${String(idx + 1).padStart(2, '0')}-10`;
      } else {
        tentativeDate = `${year}-07-10`;
      }
      const tentativeMonth = row.month || 'July';

      toAdd.push({ code, state: stateName, cityName, region: cityName, tentativeMonth, tentativeDate, confirmed: false });
    }

    try {
      await Promise.all(toAdd.map(cityData => trialsAPI.addCity(id, cityData)));
      await loadTrial();
      setBulkOpen(false);
      setBulkRows(makeBulkRows(7));
      showToast(
        skipped > 0
          ? `${toAdd.length} added, ${skipped} duplicate(s) skipped`
          : `${toAdd.length} cities added!`
      );
    } catch (err) {
      showToast(err.message || 'Some cities failed to add', 'error');
      await loadTrial();
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Inline city edit ──────────────────────────────────────────────
  const startEditCity = (city) => {
    setEditingCode(city.code);
    setEditForm({
      tentativeMonth: city.tentativeMonth || '',
      tentativeDate: city.tentativeDate || '',
      confirmed: city.confirmed || false,
    });
  };

  const handleSaveEditCity = async () => {
    setEditSaving(true);
    try {
      const data = await trialsAPI.updateCity(id, editingCode, {
        tentativeMonth: editForm.tentativeMonth,
        tentativeDate: editForm.tentativeDate || null,
        confirmed: editForm.confirmed,
      });
      setTrial(data.trial);
      setEditingCode(null);
      showToast('Region updated');
    } catch (err) {
      showToast(err.message || 'Failed to update', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleConfirmed = async (city) => {
    try {
      const data = await trialsAPI.updateCity(id, city.code, { confirmed: !city.confirmed });
      setTrial(data.trial);
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  // ── Delete city ───────────────────────────────────────────────────
  const handleDeleteCity = async () => {
    setDeleteCitySaving(true);
    try {
      const data = await trialsAPI.removeCity(id, deletingCity.code);
      setTrial(data.trial);
      setDeletingCity(null);
      showToast('Region removed');
    } catch (err) {
      showToast(err.message || 'Failed to remove', 'error');
    } finally {
      setDeleteCitySaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!trial) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Project not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/trials')}>Back to Projects</Button>
      </Box>
    );
  }

  const hasTier = trial.tierType && trial.tierType !== 'Not Any';
  const cityCount = (trial.assignedCities || []).length;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <Box sx={{ py: 4, bgcolor: '#fafafa', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>

        {/* ── Back + action row ── */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/trials')}
            sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
          >
            Back to Projects
          </Button>
          {canEditTrials && (
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined" size="small" color="error"
                startIcon={<DeleteIcon sx={{ fontSize: '0.95rem' }} />}
                onClick={() => setDeleteOpen(true)}
                sx={{ borderColor: '#fecaca', fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
              >
                Delete
              </Button>
            </Stack>
          )}
        </Stack>

        {/* ── Project profile card ── */}
        <Card elevation={0} sx={{
          border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3, bgcolor: '#fff',
        }}>
          <CardContent sx={{ p: 3.5 }}>
            {/* Gradient identity banner */}
            <Box sx={{
              height: 88,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(251,207,232,0.18) 0%, rgba(199,210,254,0.14) 60%, rgba(167,139,250,0.12) 100%)',
              border: '1px solid rgba(236,72,153,0.14)',
              boxShadow: '0 2px 12px rgba(236,72,153,0.07)',
              display: 'flex',
              alignItems: 'stretch',
              overflow: 'hidden',
              mb: 2.5,
            }}>
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3, borderRight: '1px solid rgba(236,72,153,0.12)', overflow: 'hidden' }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#be185d', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                  Project
                </Typography>
                <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, color: '#4c1d95', fontFamily: '"Georgia", "Times New Roman", serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                  {trial.trialType || trial.trialName}{trial.season ? ` — ${trial.season}` : ''}
                </Typography>
              </Box>
              <Box sx={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 3, background: 'linear-gradient(135deg, rgba(199,210,254,0.2) 0%, rgba(167,139,250,0.15) 100%)' }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.4 }}>
                  Reference Code
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#4338ca', fontFamily: '"Roboto Mono", "Courier New", monospace', letterSpacing: '0.04em', lineHeight: 1.3 }}>
                  {trial.trialCode || trial.trialName}
                </Typography>
              </Box>
            </Box>

            {/* Quick stats chips */}
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${cityCount} Trial Locations`}
                size="small"
                sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 600, borderRadius: 1.5 }}
              />
              {hasTier && (
                <Chip
                  label={trial.tierType}
                  size="small"
                  sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, borderRadius: 1.5 }}
                />
              )}
              {hasTier && trial.tierAmount && (
                <Chip
                  label={`₹${Number(trial.tierAmount).toLocaleString('en-IN')}`}
                  size="small"
                  sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 600, borderRadius: 1.5 }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* ── Trial Locations section ── */}
        <Card elevation={0} sx={{
          border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3, bgcolor: '#fff',
        }}>
          <CardContent sx={{ p: 3 }}>

            {/* Section header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1d1d1f' }}>
                Trial Locations
                <Typography component="span" sx={{ ml: 1.5, fontSize: '0.78rem', color: '#6e6e73', fontWeight: 500 }}>
                  {filteredCities.length !== cityCount
                    ? `${filteredCities.length} of ${cityCount}`
                    : cityCount}
                </Typography>
              </Typography>
              {canEditTrials && (
              <Stack direction="row" spacing={1}>
                <Button
                  size="small" variant="outlined"
                  startIcon={<BulkIcon sx={{ fontSize: '0.9rem' }} />}
                  onClick={() => setBulkOpen(true)}
                  sx={{
                    borderColor: 'rgba(0,0,0,0.12)', color: '#475569',
                    fontWeight: 600, borderRadius: 2, textTransform: 'none', fontSize: '0.82rem',
                  }}
                >
                  Bulk Add
                </Button>
                <Button
                  size="small" variant="contained"
                  startIcon={<AddIcon sx={{ fontSize: '0.9rem' }} />}
                  onClick={() => { setAddFormOpen(v => !v); }}
                  sx={{
                    bgcolor: '#FDE68A', color: '#111827', fontWeight: 700,
                    borderRadius: 2, textTransform: 'none', fontSize: '0.82rem',
                    boxShadow: 'none', '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
                  }}
                >
                  Add Trial Location
                </Button>
              </Stack>
              )}
            </Stack>

            {/* Add region form */}
            <Collapse in={addFormOpen} timeout={250}>
              <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, border: '1.5px solid #d1d5db', bgcolor: '#fafafa', mb: 3 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#5B63D3', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 2 }}>
                  Add Trial Location
                </Typography>
                {/* Location fields — CSS Grid, label row then input row */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, columnGap: 3, rowGap: 0 }}>
                  <Typography sx={fieldLabelSx}>State <span style={{ color: '#ef4444' }}>*</span></Typography>
                  <Typography sx={fieldLabelSx}>City <span style={{ color: '#ef4444' }}>*</span></Typography>
                  <Typography sx={fieldLabelSx}>
                    Sub City <Typography component="span" sx={{ fontSize: '0.78rem', color: '#9e9e9e' }}>(opt)</Typography>
                  </Typography>
                  <Autocomplete
                    size="small" options={indianStates} getOptionLabel={o => o.name || ''}
                    value={addForm.state}
                    onChange={(_, val) => updateAddForm({ state: val })}
                    renderInput={(params) => <TextField {...params} placeholder="State..." sx={inputSx} />}
                    isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                    disabled={addSaving}
                    ListboxProps={{ style: { maxHeight: 220 } }}
                  />
                  <Autocomplete
                    size="small" options={addForm.availableCities} getOptionLabel={o => o.name || ''}
                    value={addForm.city}
                    onChange={(_, val) => updateAddForm({ city: val })}
                    renderInput={(params) => (
                      <TextField {...params} placeholder={addForm.state ? 'City...' : 'Select state'} sx={inputSx} />
                    )}
                    disabled={!addForm.state || addSaving}
                    isOptionEqualToValue={(o, v) => o.name === v.name}
                    ListboxProps={{ style: { maxHeight: 220 } }}
                  />
                  <TextField
                    fullWidth size="small" placeholder="e.g. South Bangalore"
                    value={addForm.region}
                    onChange={(e) => updateAddForm({ region: e.target.value })}
                    disabled={addSaving} sx={inputSx}
                  />
                </Box>

                <Divider sx={{ my: 2 }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#5A6B82', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Schedule
                  </Typography>
                </Divider>

                {/* Schedule fields — CSS Grid, label row then input row */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, rowGap: 0 }}>
                  <Typography sx={fieldLabelSx}>Month</Typography>
                  <Typography sx={fieldLabelSx}>Date <Typography component="span" sx={{ fontSize: '0.78rem', color: '#9e9e9e' }}>(auto-filled)</Typography></Typography>
                  <TextField
                    select fullWidth size="small"
                    value={addForm.month}
                    onChange={(e) => updateAddForm({ month: e.target.value })}
                    disabled={addSaving} sx={selectInputSx}
                    SelectProps={{ displayEmpty: true }}
                  >
                    <MenuItem value="" sx={{ color: '#aaa' }}>Select month</MenuItem>
                    {MONTHS.map(m => <MenuItem key={m} value={m} sx={{ fontSize: '1rem', fontWeight: 500 }}>{m}</MenuItem>)}
                  </TextField>
                  <TextField
                    fullWidth size="small" type="date"
                    value={addForm.date}
                    onChange={(e) => updateAddForm({ date: e.target.value })}
                    disabled={addSaving} sx={selectInputSx}
                  />
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                  <Button
                    variant="contained" size="small"
                    onClick={handleAddCity} disabled={addSaving}
                    startIcon={addSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: '0.9rem' }} />}
                    sx={{
                      bgcolor: '#FDE68A', color: '#111827', borderRadius: 2,
                      textTransform: 'none', fontWeight: 700, boxShadow: 'none',
                      '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
                      '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
                    }}
                  >
                    {addSaving ? 'Saving...' : 'Save Location'}
                  </Button>
                  <Button
                    size="small" onClick={() => setAddFormOpen(false)} disabled={addSaving}
                    sx={{ borderRadius: 2, textTransform: 'none', color: '#555' }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Card>
            </Collapse>

            {/* Search + Filter + Sort */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
              <Autocomplete
                size="small"
                freeSolo
                options={search.trim() ? [...new Set((trial?.assignedCities || []).flatMap(c => [c.cityName, c.region && c.region !== c.cityName ? c.region : null, c.state].filter(Boolean)))] : []}
                inputValue={search}
                onInputChange={(_, val) => {
                  setSearch(val);
                  if (val.trim()) setFilterState('');
                }}
                disabled={!!filterState}
                sx={{ maxWidth: { sm: 280 }, width: '100%' }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={filterState ? 'Clear state filter to search' : 'Search city or trial location...'}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#5A6B82', fontSize: '1rem' }} />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                ListboxProps={{ style: { maxHeight: 220 } }}
              />
              <TextField
                select size="small"
                sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                value={filterState}
                onChange={(e) => {
                  setFilterState(e.target.value);
                  if (e.target.value) setSearch('');
                }}
                disabled={!!search.trim()}
                SelectProps={{ displayEmpty: true, renderValue: (val) => val || (search.trim() ? 'Searching...' : 'All States') }}
              >
                <MenuItem value="">All States</MenuItem>
                {indianStates.map(s => (
                  <MenuItem key={s.isoCode} value={s.name}>{s.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {CITY_SORT_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Stack>

            {/* Table */}
            {cityCount === 0 ? (
              <Box sx={{
                textAlign: 'center', py: 6, borderRadius: 3,
                border: '2px dashed #e0e0e0', bgcolor: '#f9f9fb',
              }}>
                <Typography sx={{ fontSize: '0.95rem', color: '#888', fontWeight: 500 }}>
                  No trial locations assigned yet
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: '#bbb', mt: 0.5 }}>
                  Click "Add Trial Location" to get started
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '14px', border: '1.5px solid #e0e0e0' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f7' }}>
                        {['#', 'City', 'State', 'Month', 'Date', 'Status', ''].map((h, i) => (
                          <TableCell key={i} sx={{
                            fontWeight: 700, color: '#1d1d1f', fontSize: '0.88rem',
                            py: 2, borderBottom: '2px solid #e0e0e0',
                            textAlign: i === 6 ? 'center' : i === 7 ? 'right' : 'left',
                          }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedCities.map((city, idx) => {
                        const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                        const isEditing = editingCode === city.code;

                        return (
                          <TableRow key={city.code} sx={{
                            '&:hover': { bgcolor: '#f9f9fb' },
                            '&:last-child td': { border: 0 },
                            bgcolor: isEditing ? '#f5f3ff' : 'transparent',
                          }}>
                            <TableCell sx={{ color: '#999', fontWeight: 600, py: 1.75, width: 44, fontSize: '0.9rem' }}>
                              {rowNum}
                            </TableCell>
                            <TableCell sx={{ py: 1.75, minWidth: 140 }}>
                              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1d1d1f' }}>
                                {city.cityName || '—'}
                              </Typography>
                            </TableCell>

                            <TableCell sx={{ py: 1.75, minWidth: 140 }}>
                              <Typography sx={{ fontSize: '0.95rem', color: '#555' }}>
                                {city.state || '—'}
                              </Typography>
                            </TableCell>

                            {/* Month — editable */}
                            <TableCell sx={{ py: 1.75, minWidth: 140 }}>
                              {isEditing ? (
                                <TextField
                                  select size="small" fullWidth
                                  value={editForm.tentativeMonth}
                                  onChange={(e) => setEditForm(f => ({ ...f, tentativeMonth: e.target.value }))}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.95rem' } }}
                                  disabled={editSaving}
                                >
                                  <MenuItem value="">—</MenuItem>
                                  {MONTHS.map(m => <MenuItem key={m} value={m} sx={{ fontSize: '0.95rem' }}>{m}</MenuItem>)}
                                </TextField>
                              ) : (
                                <Typography sx={{ fontSize: '0.95rem', color: '#555' }}>
                                  {city.tentativeMonth || '—'}
                                </Typography>
                              )}
                            </TableCell>

                            {/* Date — editable */}
                            <TableCell sx={{ py: 1.75, minWidth: 140 }}>
                              {isEditing ? (
                                <TextField
                                  size="small" type="date" fullWidth
                                  value={editForm.tentativeDate || ''}
                                  onChange={(e) => setEditForm(f => ({ ...f, tentativeDate: e.target.value }))}
                                  InputLabelProps={{ shrink: true }}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.95rem' } }}
                                  disabled={editSaving}
                                />
                              ) : (
                                <Typography sx={{ fontSize: '0.95rem', color: '#555' }}>
                                  {city.tentativeDate
                                    ? new Date(city.tentativeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                    : '—'}
                                </Typography>
                              )}
                            </TableCell>

                            {/* Confirmed status */}
                            <TableCell align="center" sx={{ py: 1.75, width: 130 }}>
                              {isEditing ? (
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={editForm.confirmed}
                                      onChange={(e) => setEditForm(f => ({ ...f, confirmed: e.target.checked }))}
                                      sx={{ '&.Mui-checked': { color: '#22C55E' }, p: 0.5 }}
                                    />
                                  }
                                  label={<Typography variant="caption" fontWeight={600}>Confirmed</Typography>}
                                  sx={{ m: 0 }}
                                />
                              ) : city.confirmed ? (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                  bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px',
                                  px: 1.5, py: 0.4 }}>
                                  <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22C55E', flexShrink: 0 }} />
                                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>Confirmed</Typography>
                                </Box>
                              ) : (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                  bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '20px',
                                  px: 1.5, py: 0.4,
                                  ...(canEditTrials && { cursor: 'pointer', '&:hover': { bgcolor: '#f0fdf4', borderColor: '#bbf7d0' } }) }}
                                  onClick={canEditTrials ? () => handleToggleConfirmed(city) : undefined}
                                >
                                  <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#5A6B82', flexShrink: 0 }} />
                                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Not Confirmed</Typography>
                                </Box>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell align="right" sx={{ py: 1.75, width: 110, whiteSpace: 'nowrap' }}>
                              {isEditing ? (
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <Tooltip title="Save">
                                    <IconButton onClick={handleSaveEditCity} disabled={editSaving} aria-label="Save city edit"
                                      sx={{ color: '#22C55E', '&:hover': { bgcolor: '#f0fdf4' } }}>
                                      {editSaving ? <CircularProgress size={16} /> : <SaveIcon sx={{ fontSize: 20 }} />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel">
                                    <IconButton onClick={() => setEditingCode(null)} disabled={editSaving} aria-label="Cancel edit"
                                      sx={{ color: '#6e6e73', '&:hover': { bgcolor: '#f5f5f7' } }}>
                                      <CloseIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              ) : canEditTrials && (
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <Tooltip title="Edit">
                                    <IconButton onClick={() => startEditCity(city)} aria-label="Edit city"
                                      sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: 'primary.dark' } }}>
                                      <EditIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Remove">
                                    <IconButton
                                      aria-label="Remove city"
                                      onClick={() => setDeletingCity({ code: city.code, cityName: city.cityName })}
                                      sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                                      <DeleteIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mt: 2 }}>
                    <Button size="small" disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      sx={{ minWidth: 32, borderRadius: 1.5, color: 'text.secondary' }}>
                      ‹
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <Button
                        key={p} size="small"
                        variant={p === page ? 'contained' : 'text'}
                        onClick={() => setPage(p)}
                        sx={{
                          minWidth: 32, borderRadius: 1.5,
                          ...(p === page
                            ? { bgcolor: '#FDE68A', color: '#111827', '&:hover': { bgcolor: '#FCD34D' } }
                            : { color: 'text.secondary' }
                          ),
                        }}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button size="small" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      sx={{ minWidth: 32, borderRadius: 1.5, color: 'text.secondary' }}>
                      ›
                    </Button>
                  </Stack>
                )}
                <Typography sx={{ textAlign: 'center', fontSize: '0.75rem', color: '#6e6e73', mt: 1 }}>
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredCities.length)}–{Math.min(page * PAGE_SIZE, filteredCities.length)} of {filteredCities.length}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Project info accordion ── */}
        <Accordion elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, borderRadius: 4 }}>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f' }}>
              Project Info
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 3, pb: 3 }}>
            <Grid container spacing={3}>
              {hasTier && (
                <Grid item xs={12} sm={6}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <TierIcon sx={{ fontSize: 18, color: '#f59e0b', mt: 0.25 }} />
                    <Box>
                      <Typography sx={{ ...captionSx, mb: 0.5 }}>Tier</Typography>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#1d1d1f' }}>
                        {trial.tierType}
                        {trial.tierAmount && ` · ₹${Number(trial.tierAmount).toLocaleString('en-IN')}`}
                        {trial.expectedParticipants && ` · ${trial.expectedParticipants} participants`}
                      </Typography>
                      {trial.tierDetails && (
                        <Typography sx={{ fontSize: '0.82rem', color: '#555', mt: 0.25 }}>
                          {trial.tierDetails}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Grid>
              )}
              {trial.comment && (
                <Grid item xs={12} sm={6}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <NotesIcon sx={{ fontSize: 18, color: 'primary.dark', mt: 0.25 }} />
                    <Box>
                      <Typography sx={{ ...captionSx, mb: 0.5 }}>Notes</Typography>
                      <Typography sx={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.6 }}>
                        {trial.comment}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              )}
              <Grid item xs={12}>
                <Divider sx={{ mb: 2 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Box>
                    <Typography sx={captionSx}>Created by</Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>{trial.createdBy || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={captionSx}>Created</Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>
                      {trial.createdAt
                        ? new Date(trial.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={captionSx}>Last updated</Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>
                      {trial.updatedAt
                        ? new Date(trial.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Container>

      {/* ── Bulk Add Dialog ── */}
      <Dialog open={bulkOpen} onClose={() => !bulkSaving && setBulkOpen(false)} maxWidth="xl" fullWidth
        PaperProps={{ sx: { borderRadius: '20px', maxHeight: '92vh', minWidth: '92vw' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 4, py: 3, borderBottom: '1.5px solid #f0f0f0' }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>Bulk Add Cities</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#6e6e73', mt: 0.25 }}>
              {bulkRows.length} rows · blank rows skipped · state & city required · no date = 10 July default
            </Typography>
          </Box>
          <IconButton onClick={() => setBulkOpen(false)} disabled={bulkSaving} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 4, pt: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['#', 'State *', 'City *', 'Sub City', 'Month', 'Date'].map((h, i) => (
                    <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.82rem', py: 1.75, color: '#475569', whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {bulkRows.map((row, idx) => (
                  <TableRow key={row.id} sx={{ '& td': { py: 1.25 } }}>
                    <TableCell sx={{ color: '#5A6B82', fontSize: '0.85rem', width: 36, fontWeight: 600 }}>{idx + 1}</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Autocomplete
                        options={indianStates} getOptionLabel={o => o.name || ''}
                        value={row.state}
                        onChange={(_, val) => updateBulkRow(row.id, { state: val })}
                        renderInput={(params) => <TextField {...params} placeholder="State..." sx={inputSx} />}
                        isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                        disabled={bulkSaving}
                        ListboxProps={{ style: { maxHeight: 200 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Autocomplete
                        options={row.availableCities} getOptionLabel={o => o.name || ''}
                        value={row.city}
                        onChange={(_, val) => updateBulkRow(row.id, { city: val })}
                        renderInput={(params) => <TextField {...params} placeholder={row.state ? 'City...' : '—'} sx={inputSx} />}
                        disabled={!row.state || bulkSaving}
                        isOptionEqualToValue={(o, v) => o.name === v.name}
                        ListboxProps={{ style: { maxHeight: 200 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <TextField fullWidth placeholder="e.g. South Barh"
                        value={row.region}
                        onChange={(e) => updateBulkRow(row.id, { region: e.target.value })}
                        disabled={bulkSaving}
                        sx={inputSx}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <TextField select fullWidth value={row.month}
                        onChange={(e) => updateBulkRow(row.id, { month: e.target.value })}
                        disabled={bulkSaving}
                        sx={selectInputSx}
                      >
                        <MenuItem value="">—</MenuItem>
                        {MONTHS.map(m => <MenuItem key={m} value={m} sx={{ fontSize: '0.9rem' }}>{m}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <TextField fullWidth type="date" value={row.date}
                        onChange={(e) => updateBulkRow(row.id, { date: e.target.value })}
                        disabled={bulkSaving}
                        sx={selectInputSx}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 4, py: 3, borderTop: '1.5px solid #f0f0f0', gap: 1.5, justifyContent: 'space-between' }}>
          <Button
            onClick={addMoreBulkRows}
            disabled={bulkSaving}
            sx={{
              borderRadius: '20px', textTransform: 'none', fontWeight: 600,
              color: '#6366f1', border: '1.5px dashed #c7d2fe',
              px: 3,
              '&:hover': { bgcolor: '#eef2ff', borderColor: '#6366f1' },
            }}
          >
            + Add 7 More
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setBulkOpen(false)} disabled={bulkSaving}
              sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600, color: '#555', border: '1.5px solid #e2e8f0', px: 3 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleBulkSave} disabled={bulkSaving}
              startIcon={bulkSaving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                borderRadius: '20px', textTransform: 'none', fontWeight: 700,
                bgcolor: '#FDE68A', color: '#111827', boxShadow: 'none', px: 4,
                '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
                '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
              }}>
              {bulkSaving ? 'Adding...' : 'Confirm'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ── Delete city confirm ── */}
      <Dialog open={!!deletingCity} onClose={() => !deleteCitySaving && setDeletingCity(null)}
        PaperProps={{ sx: { borderRadius: '16px', maxWidth: 400 } }}>
        <DialogTitle sx={{ pb: 1 }}>Remove Region?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Remove <strong>{deletingCity?.cityName}</strong> from this project?
            This does not affect other projects.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeletingCity(null)} disabled={deleteCitySaving}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteCity} disabled={deleteCitySaving}
            startIcon={deleteCitySaving ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, boxShadow: 'none' }}>
            {deleteCitySaving ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Project Dialog ── */}
      <TrialDeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        trial={trial}
        onConfirmDelete={handleDeleteProject}
      />


      {/* Toast */}
      <Snackbar open={toast.open} autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ProjectDashboard;
