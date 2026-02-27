// src/components/trials/TrialManagementPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Button, TextField, InputAdornment,
  Stack, Snackbar, Alert, CircularProgress, Menu, MenuItem,
  Chip, Card, CardContent, Grid, FormControl, InputLabel, Select,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  EmojiEvents as TrophyIcon,
  LocationOn as RegionIcon,
} from '@mui/icons-material';

import TrialCard from './TrialCard';
import TrialEditModal from './TrialEditModal';
import TrialDeleteDialog from './TrialDeleteDialog';
import { trialsAPI } from '../../services/api';
import { SEASONS, SORT_OPTIONS } from './trialConstants';

function TrialManagementPage() {
  const [trials, setTrials] = useState([]);
  const [filteredTrials, setFilteredTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [editingTrial, setEditingTrial] = useState(null);
  const [deletingTrial, setDeletingTrial] = useState(null);

  const [filterType, setFilterType] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);

  useEffect(() => { loadTrials(); }, []);

  useEffect(() => {
    filterAndSortTrials();
  }, [trials, searchQuery, sortBy, filterType, filterSeason]);

  const loadTrials = async () => {
    try {
      setLoading(true);
      const response = await trialsAPI.getAll();
      setTrials(response.trials || []);
    } catch (error) {
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTrials = () => {
    let filtered = [...trials];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.trialName?.toLowerCase().includes(q) ||
        t.trialCode?.toLowerCase().includes(q) ||
        t.season?.toLowerCase().includes(q) ||
        t.trialType?.toLowerCase().includes(q) ||
        t.comment?.toLowerCase().includes(q) ||
        t.assignedCities?.some(c =>
          (typeof c === 'string' ? c : `${c.cityName} ${c.state} ${c.region}`).toLowerCase().includes(q)
        )
      );
    }

    if (filterType) filtered = filtered.filter(t => t.trialType === filterType);
    if (filterSeason) filtered = filtered.filter(t => t.season === filterSeason);

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'latest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'name-asc': return (a.trialName || '').localeCompare(b.trialName || '');
        case 'name-desc': return (b.trialName || '').localeCompare(a.trialName || '');
        default: return 0;
      }
    });

    setFilteredTrials(filtered);
  };

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

  const handleEdit = (trial) => setEditingTrial(trial);
  const handleDelete = (trial) => setDeletingTrial(trial);

  const handleSaveEdit = async (trialId, updateData) => {
    try {
      await trialsAPI.patch(trialId, updateData);
      showToast('Project updated');
      setEditingTrial(null);
      loadTrials();
    } catch (error) {
      showToast(error.message || 'Failed to update project', 'error');
      throw error;
    }
  };

  const handleConfirmDelete = async (trial) => {
    try {
      await trialsAPI.delete(trial.id);
      showToast('Project deleted');
      setDeletingTrial(null);
      loadTrials();
    } catch (error) {
      showToast(error.message || 'Failed to delete project', 'error');
    }
  };

  const handleClearFilters = () => {
    setFilterType('');
    setFilterSeason('');
    setFilterMenuAnchor(null);
  };

  const hasActiveFilters = !!(filterType || filterSeason);

  // Stats
  const totalTrials = trials.length;
  const totalRegions = trials.reduce((sum, t) => sum + (t.assignedCities?.length || 0), 0);

  // Unique project types for filter
  const projectTypes = [...new Set(trials.map(t => t.trialType).filter(Boolean))];

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: '#1e293b' }}>
            Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage trial projects across seasons
          </Typography>
        </Box>

        {/* Stats */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[
            {
              icon: <TrophyIcon sx={{ fontSize: 28, color: '#5B63D3' }} />,
              value: totalTrials, label: 'Total Projects', iconBg: '#eef2ff',
            },
            {
              icon: <RegionIcon sx={{ fontSize: 28, color: '#10b981' }} />,
              value: totalRegions, label: 'Total Regions', iconBg: '#f0fdf4',
            },
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card elevation={0} sx={{
                borderRadius: 4,
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                bgcolor: '#ffffff',
              }}>
                <CardContent sx={{ py: 2.5 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: stat.iconBg }}>
                      {stat.icon}
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight={700} sx={{ color: '#1d1d1f', letterSpacing: '-0.025em' }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                        {stat.label}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Search + Sort + Filter */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 4 }}>
          <TextField
            fullWidth size="small"
            sx={{ maxWidth: { sm: 380 }, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1.5 } }}
            placeholder="Search projects, codes, regions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8', fontSize: '1.1rem' }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined" size="small"
            startIcon={<SortIcon sx={{ fontSize: '1rem' }} />}
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            sx={{ minWidth: 100, borderColor: '#e2e8f0', color: '#475569', borderRadius: 1.5, textTransform: 'none', fontWeight: 500 }}
          >
            Sort
          </Button>
          <Button
            variant="outlined" size="small"
            startIcon={<FilterIcon sx={{ fontSize: '1rem' }} />}
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            sx={{ minWidth: 100, borderColor: '#e2e8f0', color: '#475569', borderRadius: 1.5, textTransform: 'none', fontWeight: 500 }}
          >
            Filter
            {hasActiveFilters && (
              <Chip label="•" size="small" sx={{ ml: 0.5, height: 16, minWidth: 16, bgcolor: '#5B63D3', color: 'white', fontSize: '0.6rem' }} />
            )}
          </Button>
        </Stack>

        {/* Sort Menu */}
        <Menu anchorEl={sortMenuAnchor} open={!!sortMenuAnchor} onClose={() => setSortMenuAnchor(null)}>
          {SORT_OPTIONS.map(opt => (
            <MenuItem key={opt.value} selected={sortBy === opt.value}
              onClick={() => { setSortBy(opt.value); setSortMenuAnchor(null); }}>
              {opt.label}
            </MenuItem>
          ))}
        </Menu>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterMenuAnchor} open={!!filterMenuAnchor}
          onClose={() => setFilterMenuAnchor(null)}
          PaperProps={{ sx: { width: 280, p: 2 } }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Filters</Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Season</InputLabel>
            <Select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)} label="Season">
              <MenuItem value="">All Seasons</MenuItem>
              {SEASONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>

          {projectTypes.length > 0 && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Project Type</InputLabel>
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} label="Project Type">
                <MenuItem value="">All Types</MenuItem>
                {projectTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          <Button fullWidth variant="outlined" onClick={handleClearFilters} sx={{ mt: 0.5 }}>
            Clear Filters
          </Button>
        </Menu>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Cards Grid */}
        {!loading && filteredTrials.length > 0 && (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3, mb: 4,
          }}>
            {filteredTrials.map(trial => (
              <TrialCard
                key={trial.id}
                trial={trial}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </Box>
        )}

        {/* Empty state */}
        {!loading && filteredTrials.length === 0 && (
          <Box sx={{
            textAlign: 'center', py: 8, bgcolor: 'white',
            borderRadius: 2.5, border: '1px dashed #cbd5e1',
          }}>
            <Typography variant="subtitle1" sx={{ color: '#475569', fontWeight: 600 }} gutterBottom>
              No projects found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery || hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Create your first project to get started'}
            </Typography>
          </Box>
        )}

        {/* Edit Modal */}
        <TrialEditModal
          open={!!editingTrial}
          onClose={() => setEditingTrial(null)}
          trial={editingTrial}
          onSave={handleSaveEdit}
        />

        {/* Delete Dialog */}
        <TrialDeleteDialog
          open={!!deletingTrial}
          onClose={() => setDeletingTrial(null)}
          trial={deletingTrial}
          onConfirmDelete={handleConfirmDelete}
        />

        {/* Toast */}
        <Snackbar
          open={toast.open} autoHideDuration={4000}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
        >
          <Alert severity={toast.severity} variant="filled">{toast.message}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default TrialManagementPage;
