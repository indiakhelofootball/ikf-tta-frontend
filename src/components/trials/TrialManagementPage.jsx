// src/components/trials/TrialManagementPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  EmojiEvents as TrophyIcon,
  CheckCircle as CheckIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';

import TrialCard from './TrialCard';
import TrialDetailView from './TrialDetailView';
import TrialEditModal from './TrialEditModal';
import TrialDeleteDialog from './TrialDeleteDialog';
import { trialsAPI } from '../../services/api';
import {
  SEASONS,
  TRIAL_TYPES,
  STATUSES,
  SORT_OPTIONS,
  DATE_FILTER_OPTIONS,
} from './trialConstants';

function TrialManagementPage() {
  const [trials, setTrials] = useState([]);
  const [filteredTrials, setFilteredTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Modals
  const [detailViewTrial, setDetailViewTrial] = useState(null);
  const [editingTrial, setEditingTrial] = useState(null);
  const [deletingTrial, setDeletingTrial] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  // Menu anchors
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);

  /* ============ LOAD & FILTER ============ */

  useEffect(() => {
    loadTrials();
  }, []);

  useEffect(() => {
    filterAndSortTrials();
  }, [trials, searchQuery, sortBy, filterType, filterSeason, filterStatus, filterDate]);

  const loadTrials = async () => {
    try {
      setLoading(true);
      const response = await trialsAPI.getAll();
      setTrials(response.trials || []);
    } catch (error) {
      console.error('Load error:', error);
      showToast('Failed to load trials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTrials = () => {
    let filtered = [...trials];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.trialName?.toLowerCase().includes(q) ||
        t.trialCode?.toLowerCase().includes(q) ||
        t.season?.toLowerCase().includes(q) ||
        t.trialType?.toLowerCase().includes(q) ||
        t.comment?.toLowerCase().includes(q) ||
        t.assignedCities?.some(c =>
          (typeof c === 'string' ? c : `${c.cityName} ${c.trialRegion} ${c.code}`).toLowerCase().includes(q)
        )
      );
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(t => t.trialType === filterType);
    }

    // Season filter
    if (filterSeason) {
      filtered = filtered.filter(t => t.season === filterSeason);
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Date filter
    if (filterDate) {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      filtered = filtered.filter(t => {
        if (filterDate === 'tentative-only') {
          return t.scheduleType === 'Tentative';
        }

        const startDate = t.startDate ? new Date(t.startDate) : null;
        if (!startDate && filterDate !== 'tentative-only') return false;

        switch (filterDate) {
          case 'this-month':
            return startDate.getMonth() === thisMonth && startDate.getFullYear() === thisYear;
          case 'next-month': {
            const nextMonth = (thisMonth + 1) % 12;
            const nextMonthYear = thisMonth === 11 ? thisYear + 1 : thisYear;
            return startDate.getMonth() === nextMonth && startDate.getFullYear() === nextMonthYear;
          }
          case 'this-quarter': {
            const quarterStart = Math.floor(thisMonth / 3) * 3;
            return startDate.getMonth() >= quarterStart &&
              startDate.getMonth() <= quarterStart + 2 &&
              startDate.getFullYear() === thisYear;
          }
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'name-asc':
          return (a.trialName || '').localeCompare(b.trialName || '');
        case 'name-desc':
          return (b.trialName || '').localeCompare(a.trialName || '');
        case 'upcoming': {
          const aDate = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
          const bDate = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
          return aDate - bDate;
        }
        case 'past': {
          const aDate = a.startDate ? new Date(a.startDate) : new Date('0001-01-01');
          const bDate = b.startDate ? new Date(b.startDate) : new Date('0001-01-01');
          return bDate - aDate;
        }
        default:
          return 0;
      }
    });

    setFilteredTrials(filtered);
  };

  /* ============ ACTIONS ============ */

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleViewDetails = (trial) => {
    setDetailViewTrial(trial);
  };

  const handleEdit = (trial) => {
    setEditingTrial(trial);
  };

  const handleDelete = (trial) => {
    setDeletingTrial(trial);
  };

  const handleSaveEdit = async (trialId, updateData) => {
    try {
      await trialsAPI.update(trialId, updateData);
      showToast('Trial updated successfully');
      setEditingTrial(null);
      loadTrials();
    } catch (error) {
      console.error('Update error:', error);
      showToast(error.message || 'Failed to update trial', 'error');
      throw error;
    }
  };

  const handleConfirmDelete = async (trial) => {
    try {
      await trialsAPI.delete(trial.id || trial._id);
      showToast('Trial deleted successfully');
      setDeletingTrial(null);
      loadTrials();
    } catch (error) {
      console.error('Delete error:', error);
      showToast(error.message || 'Failed to delete trial', 'error');
    }
  };

  const handleClearFilters = () => {
    setFilterType('');
    setFilterSeason('');
    setFilterStatus('');
    setFilterDate('');
    setFilterMenuAnchor(null);
  };

  const hasActiveFilters = filterType || filterSeason || filterStatus || filterDate;

  /* ============ STATS ============ */

  const totalTrials = trials.length;
  const activeTrials = trials.filter(t => t.status === 'Active').length;
  const upcomingThisMonth = trials.filter(t => {
    if (!t.startDate) return false;
    const now = new Date();
    const start = new Date(t.startDate);
    return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  }).length;

  /* ============ UI ============ */

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: '#1e293b' }}>
            Trials
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage trial projects across seasons
          </Typography>
        </Box>

        {/* Summary Stats */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ py: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#eef2ff' }}>
                    <TrophyIcon sx={{ fontSize: 28, color: '#5B63D3' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#1e293b' }}>{totalTrials}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Trials</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ py: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4' }}>
                    <CheckIcon sx={{ fontSize: 28, color: '#22C55E' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#1e293b' }}>{activeTrials}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Trials</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ py: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fffbeb' }}>
                    <CalendarIcon sx={{ fontSize: 28, color: '#F59E0B' }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#1e293b' }}>{upcomingThisMonth}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upcoming This Month</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter Bar */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 4 }}>
          <TextField
            fullWidth
            size="small"
            sx={{
              maxWidth: { sm: 380 },
              '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1.5 },
            }}
            placeholder="Search trials, codes, cities..."
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
            sx={{
              minWidth: 100, borderColor: '#e2e8f0', color: '#475569',
              borderRadius: 1.5, textTransform: 'none', fontWeight: 500,
              '&:hover': { borderColor: '#94a3b8' },
            }}
          >
            Sort
          </Button>

          <Button
            variant="outlined" size="small"
            startIcon={<FilterIcon sx={{ fontSize: '1rem' }} />}
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            sx={{
              minWidth: 100, borderColor: '#e2e8f0', color: '#475569',
              borderRadius: 1.5, textTransform: 'none', fontWeight: 500,
              '&:hover': { borderColor: '#94a3b8' },
            }}
          >
            Filter
            {hasActiveFilters && (
              <Chip
                label="Active" size="small"
                sx={{ ml: 1, height: 18, fontSize: '0.65rem', bgcolor: '#5B63D3', color: 'white' }}
              />
            )}
          </Button>
        </Stack>

        {/* Sort Menu */}
        <Menu
          anchorEl={sortMenuAnchor}
          open={!!sortMenuAnchor}
          onClose={() => setSortMenuAnchor(null)}
        >
          {SORT_OPTIONS.map(option => (
            <MenuItem
              key={option.value}
              onClick={() => {
                setSortBy(option.value);
                setSortMenuAnchor(null);
              }}
              selected={sortBy === option.value}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterMenuAnchor}
          open={!!filterMenuAnchor}
          onClose={() => setFilterMenuAnchor(null)}
          PaperProps={{ sx: { width: 300, p: 2 } }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>Filters</Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Trial Type</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Trial Type"
            >
              <MenuItem value="">All</MenuItem>
              {TRIAL_TYPES.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Season</InputLabel>
            <Select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              label="Season"
            >
              <MenuItem value="">All</MenuItem>
              {SEASONS.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              {STATUSES.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Date Filter</InputLabel>
            <Select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              label="Date Filter"
            >
              {DATE_FILTER_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            fullWidth
            variant="outlined"
            onClick={handleClearFilters}
            sx={{ mt: 1 }}
          >
            Clear Filters
          </Button>
        </Menu>

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Trial Cards Grid */}
        {!loading && filteredTrials.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 3,
              mb: 4,
            }}
          >
            {filteredTrials.map(trial => (
              <Box key={trial.id || trial._id}>
                <TrialCard
                  trial={trial}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                />
              </Box>
            ))}
          </Box>
        )}

        {/* Empty State */}
        {!loading && filteredTrials.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              bgcolor: 'white',
              borderRadius: 2.5,
              border: '1px dashed #cbd5e1',
            }}
          >
            <Typography variant="subtitle1" sx={{ color: '#475569', fontWeight: 600 }} gutterBottom>
              No trials found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery || hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Create your first trial to get started'}
            </Typography>
          </Box>
        )}

        {/* Detail View */}
        {detailViewTrial && (
          <TrialDetailView
            trial={detailViewTrial}
            open={!!detailViewTrial}
            onClose={() => setDetailViewTrial(null)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
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
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast(prev => ({ ...prev, open: false }))}
        >
          <Alert severity={toast.severity} variant="filled">
            {toast.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default TrialManagementPage;
