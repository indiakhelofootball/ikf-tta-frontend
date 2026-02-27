// src/components/trials/ProjectDashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, IconButton, Stack, Chip,
  Card, CardContent, TextField, InputAdornment, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Checkbox, CircularProgress, Alert, Snackbar, MenuItem, Select, FormControl,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, Grid, Accordion, AccordionSummary, AccordionDetails,
  Tooltip,
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
import TrialEditModal from './TrialEditModal';
import TrialDeleteDialog from './TrialDeleteDialog';
import { CITY_SORT_OPTIONS, MONTHS } from './trialConstants';

const indianStates = State.getStatesOfCountry('IN');

const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.9rem' },
};

const fieldLabelSx = {
  fontSize: '0.82rem', fontWeight: 600, color: '#3c3c43', mb: 0.5, display: 'block',
};

const captionSx = {
  fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em',
  color: '#86868b', fontWeight: 600,
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
    id: i, state: null, city: null, region: '', month: '', availableCities: [],
  }));
}

function ProjectDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Project-level modals
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // City table controls
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);

  // Add city form
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState({ state: null, city: null, region: '', month: '', date: '', availableCities: [] });
  const [addSaving, setAddSaving] = useState(false);

  // Bulk add dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState(makeBulkRows(10));
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

  const loadTrial = async () => {
    try {
      setLoading(true);
      const data = await trialsAPI.getById(id);
      setTrial(data.trial);
    } catch {
      showToast('Failed to load project', 'error');
    } finally {
      setLoading(false);
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
  const handleSaveProject = async (trialId, updateData) => {
    await trialsAPI.patch(trialId, updateData);
    showToast('Project updated');
    setEditOpen(false);
    await loadTrial();
  };

  const handleDeleteProject = async (t) => {
    await trialsAPI.delete(t.id);
    navigate('/trials');
  };

  // ── Add city ──────────────────────────────────────────────────────
  const handleAddCity = async () => {
    if (!addForm.state || !addForm.city || !addForm.month) {
      showToast('State, city and month are required', 'warning');
      return;
    }
    const stateName = addForm.state.name;
    const cityName = addForm.city.name;
    const region = addForm.region.trim() || cityName;
    const existingCities = trial.assignedCities || [];

    const isDup = existingCities.some(c =>
      c.cityName?.toLowerCase() === cityName.toLowerCase() &&
      c.state?.toLowerCase() === stateName.toLowerCase() &&
      (c.region || '').toLowerCase() === region.toLowerCase()
    );
    if (isDup) {
      showToast('This city/region already exists in this project', 'warning');
      return;
    }

    const code = makeCityCode(stateName, cityName, existingCities);
    setAddSaving(true);
    try {
      const data = await trialsAPI.addCity(id, {
        code, state: stateName, cityName, region,
        tentativeMonth: addForm.month,
        tentativeDate: addForm.date || null,
        confirmed: false,
      });
      setTrial(data.trial);
      setAddForm({ state: null, city: null, region: '', month: '', date: '', availableCities: [] });
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
      return next;
    }));
  };

  const handleBulkSave = async () => {
    const valid = bulkRows.filter(r => r.state && r.city && r.month);
    if (valid.length === 0) {
      showToast('Fill at least one row (state, city, month required)', 'warning');
      return;
    }
    setBulkSaving(true);
    const existingCities = trial.assignedCities || [];
    const toAdd = [];
    let skipped = 0;

    for (const row of valid) {
      const stateName = row.state.name;
      const cityName = row.city.name;
      const region = row.region?.trim() || cityName;
      const isDup = [...existingCities, ...toAdd].some(c =>
        c.cityName?.toLowerCase() === cityName.toLowerCase() &&
        c.state?.toLowerCase() === stateName.toLowerCase()
      );
      if (isDup) { skipped++; continue; }
      const code = makeCityCode(stateName, cityName, [...existingCities, ...toAdd]);
      toAdd.push({ code, state: stateName, cityName, region, tentativeMonth: row.month, confirmed: false });
    }

    try {
      await Promise.all(toAdd.map(cityData => trialsAPI.addCity(id, cityData)));
      await loadTrial();
      setBulkOpen(false);
      setBulkRows(makeBulkRows(10));
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
      region: city.region || '',
      tentativeMonth: city.tentativeMonth || '',
      tentativeDate: city.tentativeDate || '',
      confirmed: city.confirmed || false,
    });
  };

  const handleSaveEditCity = async () => {
    setEditSaving(true);
    try {
      const data = await trialsAPI.updateCity(id, editingCode, {
        region: editForm.region,
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
            sx={{ color: '#5B63D3', fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
          >
            Back to Projects
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined" size="small"
              startIcon={<EditIcon sx={{ fontSize: '0.95rem' }} />}
              onClick={() => setEditOpen(true)}
              sx={{
                borderColor: 'rgba(0,0,0,0.12)', color: '#1d1d1f',
                fontWeight: 600, borderRadius: 2, textTransform: 'none',
                '&:hover': { borderColor: '#5B63D3', color: '#5B63D3' },
              }}
            >
              Edit Project
            </Button>
            <Button
              variant="outlined" size="small" color="error"
              startIcon={<DeleteIcon sx={{ fontSize: '0.95rem' }} />}
              onClick={() => setDeleteOpen(true)}
              sx={{ borderColor: '#fecaca', fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
            >
              Delete
            </Button>
          </Stack>
        </Stack>

        {/* ── Project profile card ── */}
        <Card elevation={0} sx={{
          border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3, bgcolor: '#fff',
        }}>
          <CardContent sx={{ p: 3.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={2}>
              <Box>
                <Typography sx={{
                  fontSize: '1.6rem', fontWeight: 700,
                  fontFamily: '"SF Mono", "Fira Code", monospace',
                  color: '#1d1d1f', letterSpacing: '0.01em', mb: 0.5,
                }}>
                  {trial.trialCode || trial.trialName}
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', color: '#6e6e73', fontWeight: 500 }}>
                  {trial.season}
                  {trial.trialType ? ` · ${trial.trialType}` : ''}
                </Typography>
              </Box>

              {/* Quick stats chips */}
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`${cityCount} Regions`}
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
            </Stack>
          </CardContent>
        </Card>

        {/* ── Regions section ── */}
        <Card elevation={0} sx={{
          border: '1px solid rgba(0,0,0,0.06)', borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', mb: 3, bgcolor: '#fff',
        }}>
          <CardContent sx={{ p: 3 }}>

            {/* Section header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1d1d1f' }}>
                Regions
                <Typography component="span" sx={{ ml: 1.5, fontSize: '0.78rem', color: '#86868b', fontWeight: 500 }}>
                  {filteredCities.length !== cityCount
                    ? `${filteredCities.length} of ${cityCount}`
                    : cityCount}
                </Typography>
              </Typography>
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
                  Add Region
                </Button>
              </Stack>
            </Stack>

            {/* Add region form */}
            {addFormOpen && (
              <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, border: '1.5px solid #d1d5db', bgcolor: '#fafafa', mb: 3 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#5B63D3', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 2 }}>
                  New Region
                </Typography>
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Typography sx={fieldLabelSx}>State *</Typography>
                    <Autocomplete
                      size="small" options={indianStates} getOptionLabel={o => o.name || ''}
                      value={addForm.state}
                      onChange={(_, val) => updateAddForm({ state: val })}
                      renderInput={(params) => <TextField {...params} placeholder="Search state..." sx={inputSx} />}
                      isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                      disabled={addSaving}
                      ListboxProps={{ style: { maxHeight: 200 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Typography sx={fieldLabelSx}>City *</Typography>
                    <Autocomplete
                      size="small" options={addForm.availableCities} getOptionLabel={o => o.name || ''}
                      value={addForm.city}
                      onChange={(_, val) => updateAddForm({ city: val })}
                      renderInput={(params) => (
                        <TextField {...params} placeholder={addForm.state ? 'Search city...' : 'Select state first'} sx={inputSx} />
                      )}
                      disabled={!addForm.state || addSaving}
                      isOptionEqualToValue={(o, v) => o.name === v.name}
                      ListboxProps={{ style: { maxHeight: 200 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Typography sx={fieldLabelSx}>Sub City <span style={{ color: '#9e9e9e', fontWeight: 400 }}>(optional)</span></Typography>
                    <TextField
                      fullWidth size="small" placeholder="e.g., Andheri, Bandra"
                      value={addForm.region}
                      onChange={(e) => updateAddForm({ region: e.target.value })}
                      disabled={addSaving} sx={inputSx}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Typography sx={fieldLabelSx}>Month *</Typography>
                    <TextField
                      select fullWidth size="small"
                      value={addForm.month}
                      onChange={(e) => updateAddForm({ month: e.target.value })}
                      disabled={addSaving} sx={inputSx}
                    >
                      <MenuItem value=""><em style={{ color: '#888' }}>— Month —</em></MenuItem>
                      {MONTHS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Typography sx={fieldLabelSx}>Date <span style={{ color: '#9e9e9e', fontWeight: 400 }}>(optional)</span></Typography>
                    <TextField
                      fullWidth size="small" type="date"
                      value={addForm.date}
                      onChange={(e) => updateAddForm({ date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      disabled={addSaving} sx={inputSx}
                    />
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                  <Button
                    variant="contained" size="small"
                    onClick={handleAddCity} disabled={addSaving}
                    startIcon={addSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: '0.9rem' }} />}
                    sx={{
                      bgcolor: '#5B63D3', color: '#fff', borderRadius: 2,
                      textTransform: 'none', fontWeight: 600, boxShadow: 'none',
                      '&:hover': { bgcolor: '#4338ca', boxShadow: 'none' },
                      '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
                    }}
                  >
                    {addSaving ? 'Saving...' : 'Save Region'}
                  </Button>
                  <Button
                    size="small" onClick={() => setAddFormOpen(false)} disabled={addSaving}
                    sx={{ borderRadius: 2, textTransform: 'none', color: '#555' }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Card>
            )}

            {/* Search + Filter + Sort */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
              <TextField
                size="small" fullWidth
                sx={{ maxWidth: { sm: 280 }, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                placeholder="Search city or region..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: '1rem' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  displayEmpty
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  renderValue={(val) => val || 'All States'}
                  sx={{ borderRadius: '8px', fontSize: '0.9rem' }}
                >
                  <MenuItem value="">All States</MenuItem>
                  {indianStates.map(s => (
                    <MenuItem key={s.isoCode} value={s.name}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                  No regions assigned yet
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: '#bbb', mt: 0.5 }}>
                  Click "Add Region" to get started
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', border: '1.5px solid #e0e0e0' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f7' }}>
                        {['#', 'City', 'Sub City', 'State', 'Month', 'Date', 'Confirmed', ''].map((h, i) => (
                          <TableCell key={i} sx={{
                            fontWeight: 700, color: '#1d1d1f', fontSize: '0.78rem',
                            py: 1.5, borderBottom: '2px solid #e0e0e0',
                            textAlign: i === 6 ? 'center' : 'left',
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
                            <TableCell sx={{ color: '#999', fontWeight: 600, py: 1.2, width: 36, fontSize: '0.82rem' }}>
                              {rowNum}
                            </TableCell>
                            <TableCell sx={{ py: 1.2, minWidth: 100 }}>
                              <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#1d1d1f' }}>
                                {city.cityName || '—'}
                              </Typography>
                            </TableCell>

                            {/* Region — editable */}
                            <TableCell sx={{ py: 1.2, minWidth: 140 }}>
                              {isEditing ? (
                                <TextField
                                  size="small" fullWidth
                                  value={editForm.region}
                                  onChange={(e) => setEditForm(f => ({ ...f, region: e.target.value }))}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.85rem' } }}
                                  disabled={editSaving}
                                />
                              ) : (
                                <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>
                                  {city.region && city.region !== city.cityName ? city.region : '—'}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell sx={{ py: 1.2, minWidth: 120 }}>
                              <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>
                                {city.state || '—'}
                              </Typography>
                            </TableCell>

                            {/* Month — editable */}
                            <TableCell sx={{ py: 1.2, minWidth: 110 }}>
                              {isEditing ? (
                                <TextField
                                  select size="small" fullWidth
                                  value={editForm.tentativeMonth}
                                  onChange={(e) => setEditForm(f => ({ ...f, tentativeMonth: e.target.value }))}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.85rem' } }}
                                  disabled={editSaving}
                                >
                                  <MenuItem value="">—</MenuItem>
                                  {MONTHS.map(m => <MenuItem key={m} value={m} sx={{ fontSize: '0.85rem' }}>{m}</MenuItem>)}
                                </TextField>
                              ) : (
                                <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>
                                  {city.tentativeMonth || '—'}
                                </Typography>
                              )}
                            </TableCell>

                            {/* Date — editable */}
                            <TableCell sx={{ py: 1.2, minWidth: 120 }}>
                              {isEditing ? (
                                <TextField
                                  size="small" type="date" fullWidth
                                  value={editForm.tentativeDate || ''}
                                  onChange={(e) => setEditForm(f => ({ ...f, tentativeDate: e.target.value }))}
                                  InputLabelProps={{ shrink: true }}
                                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: '0.85rem' } }}
                                  disabled={editSaving}
                                />
                              ) : (
                                <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>
                                  {city.tentativeDate
                                    ? new Date(city.tentativeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                    : '—'}
                                </Typography>
                              )}
                            </TableCell>

                            {/* Confirmed toggle */}
                            <TableCell align="center" sx={{ py: 1.2, width: 80 }}>
                              <Checkbox
                                checked={isEditing ? editForm.confirmed : city.confirmed}
                                onChange={isEditing
                                  ? (e) => setEditForm(f => ({ ...f, confirmed: e.target.checked }))
                                  : () => handleToggleConfirmed(city)
                                }
                                size="small"
                                sx={{ '&.Mui-checked': { color: '#22C55E' }, p: 0.5 }}
                              />
                            </TableCell>

                            {/* Actions */}
                            <TableCell align="right" sx={{ py: 1.2, width: 100, whiteSpace: 'nowrap' }}>
                              {isEditing ? (
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <Tooltip title="Save">
                                    <IconButton size="small" onClick={handleSaveEditCity} disabled={editSaving}
                                      sx={{ color: '#22C55E', '&:hover': { bgcolor: '#f0fdf4' } }}>
                                      {editSaving ? <CircularProgress size={14} /> : <SaveIcon sx={{ fontSize: 16 }} />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel">
                                    <IconButton size="small" onClick={() => setEditingCode(null)} disabled={editSaving}
                                      sx={{ color: '#86868b', '&:hover': { bgcolor: '#f5f5f7' } }}>
                                      <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              ) : (
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => startEditCity(city)}
                                      sx={{ color: '#5B63D3', '&:hover': { bgcolor: '#eef2ff' } }}>
                                      <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Remove">
                                    <IconButton size="small"
                                      onClick={() => setDeletingCity({ code: city.code, cityName: city.cityName })}
                                      sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                                      <DeleteIcon sx={{ fontSize: 16 }} />
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
                      sx={{ minWidth: 32, borderRadius: 1.5, color: '#5B63D3' }}>
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
                            ? { bgcolor: '#5B63D3', color: '#fff', '&:hover': { bgcolor: '#4338ca' } }
                            : { color: '#5B63D3' }
                          ),
                        }}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button size="small" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      sx={{ minWidth: 32, borderRadius: 1.5, color: '#5B63D3' }}>
                      ›
                    </Button>
                  </Stack>
                )}
                <Typography sx={{ textAlign: 'center', fontSize: '0.75rem', color: '#86868b', mt: 1 }}>
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredCities.length)}–{Math.min(page * PAGE_SIZE, filteredCities.length)} of {filteredCities.length}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Project info accordion ── */}
        <Accordion elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px !important', '&:before': { display: 'none' } }}>
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
                    <NotesIcon sx={{ fontSize: 18, color: '#5B63D3', mt: 0.25 }} />
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
      <Dialog open={bulkOpen} onClose={() => !bulkSaving && setBulkOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '20px', maxHeight: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2.5, borderBottom: '1.5px solid #f0f0f0' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Bulk Add Regions</Typography>
          <IconButton onClick={() => setBulkOpen(false)} disabled={bulkSaving} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2.5 }}>
          <Typography sx={{ fontSize: '0.82rem', color: '#86868b', mb: 2 }}>
            Fill in state, city and month for each row you want to add. Leave blank rows are skipped.
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f7' }}>
                  {['#', 'State', 'City', 'Sub City (optional)', 'Month'].map((h, i) => (
                    <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.78rem', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {bulkRows.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ color: '#999', fontSize: '0.82rem', width: 28 }}>{idx + 1}</TableCell>
                    <TableCell sx={{ py: 0.75, minWidth: 160 }}>
                      <Autocomplete
                        size="small" options={indianStates} getOptionLabel={o => o.name || ''}
                        value={row.state}
                        onChange={(_, val) => updateBulkRow(row.id, { state: val })}
                        renderInput={(params) => <TextField {...params} placeholder="State..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }} />}
                        isOptionEqualToValue={(o, v) => o.isoCode === v.isoCode}
                        disabled={bulkSaving}
                        ListboxProps={{ style: { maxHeight: 180 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.75, minWidth: 160 }}>
                      <Autocomplete
                        size="small" options={row.availableCities} getOptionLabel={o => o.name || ''}
                        value={row.city}
                        onChange={(_, val) => updateBulkRow(row.id, { city: val })}
                        renderInput={(params) => <TextField {...params} placeholder={row.state ? 'City...' : '—'} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }} />}
                        disabled={!row.state || bulkSaving}
                        isOptionEqualToValue={(o, v) => o.name === v.name}
                        ListboxProps={{ style: { maxHeight: 180 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.75, minWidth: 140 }}>
                      <TextField size="small" fullWidth placeholder="e.g., South Mumbai"
                        value={row.region}
                        onChange={(e) => updateBulkRow(row.id, { region: e.target.value })}
                        disabled={bulkSaving}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 0.75, minWidth: 130 }}>
                      <TextField select size="small" fullWidth value={row.month}
                        onChange={(e) => updateBulkRow(row.id, { month: e.target.value })}
                        disabled={bulkSaving}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                      >
                        <MenuItem value="">—</MenuItem>
                        {MONTHS.map(m => <MenuItem key={m} value={m} sx={{ fontSize: '0.85rem' }}>{m}</MenuItem>)}
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1.5px solid #f0f0f0', gap: 1.5 }}>
          <Button onClick={() => setBulkOpen(false)} disabled={bulkSaving}
            sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600, color: '#555' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleBulkSave} disabled={bulkSaving}
            startIcon={bulkSaving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              borderRadius: '20px', textTransform: 'none', fontWeight: 700,
              bgcolor: '#FDE68A', color: '#111827', boxShadow: 'none',
              '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#9e9e9e' },
            }}>
            {bulkSaving ? 'Adding...' : 'Save All'}
          </Button>
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

      {/* ── Edit Project Modal ── */}
      <TrialEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        trial={trial}
        onSave={handleSaveProject}
      />

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
