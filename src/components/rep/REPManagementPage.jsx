// src/components/rep/REPManagementPage.jsx

import React, { useState, useEffect, useRef } from 'react';
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
  ListItemIcon,
  ListItemText,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FileUpload as UploadIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  KeyboardArrowDown as ArrowDownIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  LocationCity as LocationCityIcon,
  CalendarToday as CalendarIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

import REPCard from './Repcard';
import REPModal from './REPModal';
import REPDetailView from './REPDetailView';
import { repAPI } from '../../services/api';
import useGrants from '../../auth/useGrants';
import useRefetchOnFocus from '../../hooks/useRefetchOnFocus';

function REPManagementPage() {
  const { canEdit } = useGrants();
  const [reps, setReps] = useState([]);
  const [filteredReps, setFilteredReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingREP, setEditingREP] = useState(null);
  const [detailViewREP, setDetailViewREP] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState('repName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterTrialName, setFilterTrialName] = useState('');
  const [filterCity, setFilterCity] = useState('');

  // Bulk upload state
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Menu anchors
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);

  /* ---------------- LOAD & FILTER ---------------- */

  useEffect(() => {
    loadREPs();
  }, []);
  useRefetchOnFocus(() => loadREPs({ silent: true }));

  useEffect(() => {
    filterAndSortREPs();
  }, [reps, searchQuery, sortBy, sortOrder, filterTrialName, filterCity]);

  const loadREPs = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await repAPI.getAll({ limit: 100 });
      setReps(response.reps || []);
    } catch (error) {
      console.error('Load error:', error);
      if (!silent) showToast('Failed to load REPs', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filterAndSortREPs = () => {
    let filtered = [...reps];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.repName?.toLowerCase().includes(q) ||
        r.contactName?.toLowerCase().includes(q) ||
        r.cityAssignments?.some(a =>
          a.city?.toLowerCase().includes(q) ||
          a.state?.toLowerCase().includes(q) ||
          a.trialName?.toLowerCase().includes(q)
        )
      );
    }

    // Trial name filter
    if (filterTrialName) {
      filtered = filtered.filter(r =>
        r.cityAssignments?.some(a => a.trialName === filterTrialName)
      );
    }

    // City filter
    if (filterCity) {
      filtered = filtered.filter(r =>
        r.cityAssignments?.some(a => a.city === filterCity)
      );
    }


    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'repName':
          aVal = a.repName?.toLowerCase() || '';
          bVal = b.repName?.toLowerCase() || '';
          break;
        case 'cities':
          aVal = a.numberOfCities || 0;
          bVal = b.numberOfCities || 0;
          break;
        case 'assignments':
          aVal = a.cityAssignments?.length || 0;
          bVal = b.cityAssignments?.length || 0;
          break;
        default:
          aVal = a.repName?.toLowerCase() || '';
          bVal = b.repName?.toLowerCase() || '';
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredReps(filtered);
  };

  /* ---------------- COMMON ---------------- */

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  /* ---------------- REP ACTIONS ---------------- */

  const handleAddREP = () => {
    setEditingREP(null);
    setModalOpen(true);
  };

  const handleEditREP = (rep) => {
    setEditingREP(rep);
    setModalOpen(true);
  };

  const handleSaveREP = async (repData) => {
    try {
      if (editingREP) {
        await repAPI.update(editingREP.id, repData);
        showToast('REP updated successfully');
      } else {
        await repAPI.create(repData);
        showToast('REP created successfully');
      }
      setModalOpen(false);
      loadREPs();
    } catch (error) {
      console.error('Save error:', error);
      showToast(error.message || 'Failed to save REP', 'error');
    }
  };

  const handleDeleteREP = async (rep) => {
    try {
      await repAPI.delete(rep.id);
      showToast('REP deleted successfully');
      loadREPs();
    } catch (error) {
      console.error('Delete error:', error);
      showToast(error.message || 'Failed to delete REP', 'error');
    }
  };

  const handleViewDetails = (rep) => {
    setDetailViewREP(rep);
  };

  /* ---------------- SORTING & FILTERING ---------------- */

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setSortMenuAnchor(null);
  };

  const handleClearFilters = () => {
    setFilterTrialName('');
    setFilterCity('');
    setFilterMenuAnchor(null);
  };

  /* ---------------- BULK IMPORT ---------------- */

  const handleBulkMenuOpen = (e) => setBulkMenuAnchor(e.currentTarget);
  const handleBulkMenuClose = () => setBulkMenuAnchor(null);

  const handleDownloadTemplate = () => {
    const template = [
      ['repName', 'phone', 'email', 'contactName'],
      ['Sports Academy Mumbai', '9876543210', 'contact@academy.com', 'Rajesh Sharma'],
    ];
    const csv = template.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rep_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    handleBulkMenuClose();
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return { data: [], errors: ['Invalid CSV'] };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => row[h] = values[idx] || '');

      if (!row.repname) {
        errors.push(`Row ${i + 1}: repName is required`);
      } else {
        data.push({
          repName: row.repname,
          phone: row.phone || '',
          email: row.email || '',
          contactName: row.contactname || '',
          status: 'pending',
        });
      }
    }
    return { data, errors };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const { data, errors } = parseCSV(ev.target.result);
      setBulkData(data);
      setBulkErrors(errors);
      setBulkUploadOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkUpload = async () => {
    if (!bulkData.length) return;

    setBulkUploading(true);
    setBulkProgress(0);

    const results = [];
    const total = bulkData.length;

    for (let i = 0; i < bulkData.length; i++) {
      const repData = bulkData[i];

      // Check for duplicates by org name
      const alreadyExists = reps.some(
        r => r.repName?.toLowerCase() === repData.repName.toLowerCase()
      );

      if (alreadyExists) {
        results.push({
          ...repData,
          status: 'error',
          error: 'REP already exists',
        });
        setBulkProgress(((i + 1) / total) * 100);
        continue;
      }

      try {
        await repAPI.create(repData);
        results.push({ ...repData, status: 'success' });
      } catch (err) {
        console.error(`Failed to create ${repData.repName}:`, err);
        results.push({
          ...repData,
          status: 'error',
          error: err.message || 'Failed to create REP',
        });
      }

      setBulkProgress(((i + 1) / total) * 100);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setBulkData(results);
    setBulkUploading(false);

    const success = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    if (success > 0) {
      showToast(
        `Import completed: ${success} added${failed > 0 ? `, ${failed} failed` : ''}`,
        failed > 0 ? 'warning' : 'success'
      );
      await loadREPs();
    } else {
      showToast('Import failed: No REPs were added', 'error');
    }
  };

  // Get unique values for filters
  const uniqueTrialNames = [...new Set(reps.flatMap(r => r.cityAssignments?.map(a => a.trialName) || []))].filter(Boolean);
  const uniqueCities = [...new Set(reps.flatMap(r => r.cityAssignments?.map(a => a.city) || []))].filter(Boolean);

  /* ---------------- SUMMARY STATS ---------------- */

  const totalREPs = reps.length;
  const totalCities = new Set(
    reps.flatMap(r => r.cityAssignments?.map(a => a.city) || [])
  ).size;
  const totalAssignments = reps.reduce(
    (sum, r) => sum + (r.cityAssignments?.length || 0), 0
  );

  /* ---------------- UI ---------------- */

  return (
    <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4
        }}>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              REP Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage field partners and trial assignments
            </Typography>
          </Box>

          {canEdit('reps') && (
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              endIcon={<ArrowDownIcon />}
              onClick={handleBulkMenuOpen}
              sx={{ 
                px: 3,
                borderColor: '#e0e0e0',
                color: 'text.primary',
                '&:hover': {
                  borderColor: '#5B63D3',
                  bgcolor: '#f5f6ff'
                }
              }}
            >
              Bulk Import
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddREP}
              sx={{ 
                px: 3,
                bgcolor: '#FDE68A',
                '&:hover': {
                  bgcolor: '#FCD34D'
                }
              }}
            >
              Add REP
            </Button>
          </Stack>
          )}
        </Box>

        {/* Summary Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <BusinessIcon sx={{ fontSize: 40, color: '#5B63D3' }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{totalREPs}</Typography>
                    <Typography variant="body2" color="text.secondary">Total REPs</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <LocationCityIcon sx={{ fontSize: 40, color: '#22C55E' }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{totalCities}</Typography>
                    <Typography variant="body2" color="text.secondary">Cities</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <CalendarIcon sx={{ fontSize: 40, color: '#F59E0B' }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{totalAssignments}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Assignments</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bulk Menu */}
        <Menu anchorEl={bulkMenuAnchor} open={!!bulkMenuAnchor} onClose={handleBulkMenuClose}>
          <MenuItem onClick={handleDownloadTemplate}>
            <ListItemIcon><DownloadIcon /></ListItemIcon>
            <ListItemText>Download CSV Template</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => fileInputRef.current.click()}>
            <ListItemIcon><UploadIcon /></ListItemIcon>
            <ListItemText>Upload CSV</ListItemText>
          </MenuItem>
        </Menu>

        <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleFileUpload} />

        {/* Search and Filter Bar */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
          <TextField
            fullWidth
            sx={{ 
              maxWidth: { sm: 400 },
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
              }
            }}
            placeholder="Search REPs, cities, trials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="outlined"
            startIcon={<SortIcon />}
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            sx={{ minWidth: 120 }}
          >
            Sort
          </Button>

          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            sx={{ minWidth: 120 }}
          >
            Filter
            {(filterTrialName || filterCity) && (
              <Chip 
                label="Active" 
                size="small" 
                color="primary" 
                sx={{ ml: 1, height: 20 }}
              />
            )}
          </Button>
        </Stack>

        {/* Sort Menu */}
        <Menu anchorEl={sortMenuAnchor} open={!!sortMenuAnchor} onClose={() => setSortMenuAnchor(null)}>
          <MenuItem onClick={() => handleSort('repName')}>
            REP Name {sortBy === 'repName' && `(${sortOrder === 'asc' ? 'A-Z' : 'Z-A'})`}
          </MenuItem>
          <MenuItem onClick={() => handleSort('cities')}>
            Cities {sortBy === 'cities' && `(${sortOrder === 'asc' ? 'Low-High' : 'High-Low'})`}
          </MenuItem>
          <MenuItem onClick={() => handleSort('assignments')}>
            Assignments {sortBy === 'assignments' && `(${sortOrder === 'asc' ? 'Low-High' : 'High-Low'})`}
          </MenuItem>
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
            <InputLabel>Trial Name</InputLabel>
            <Select
              value={filterTrialName}
              onChange={(e) => setFilterTrialName(e.target.value)}
              label="Trial Name"
            >
              <MenuItem value="">All</MenuItem>
              {uniqueTrialNames.map(name => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>City</InputLabel>
            <Select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              label="City"
            >
              <MenuItem value="">All</MenuItem>
              {uniqueCities.map(city => (
                <MenuItem key={city} value={city}>{city}</MenuItem>
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

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* REP Cards Grid */}
        {!loading && filteredReps.length > 0 && (
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)'
              },
              gap: 3,
              mb: 4
            }}
          >
            {filteredReps.map(rep => (
              <Box key={rep.id}>
                <REPCard
                  rep={rep}
                  onEdit={handleEditREP}
                  onDelete={handleDeleteREP}
                  onViewDetails={handleViewDetails}
                />
              </Box>
            ))}
          </Box>
        )}

        {/* Empty State */}
        {!loading && filteredReps.length === 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 8,
            bgcolor: 'white',
            borderRadius: 2,
            border: '1px solid #e5e7eb'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No REPs found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery || filterTrialName || filterCity
                ? 'Try adjusting your search or filters'
                : 'Add your first REP to get started'}
            </Typography>
          </Box>
        )}

        {/* REP Modal */}
        <REPModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveREP}
          editingREP={editingREP}
        />

        {/* REP Detail View */}
        {detailViewREP && (
          <REPDetailView
            rep={detailViewREP}
            open={!!detailViewREP}
            onClose={() => setDetailViewREP(null)}
            onEdit={handleEditREP}
          />
        )}

        {/* Bulk Upload Dialog */}
        <Dialog open={bulkUploadOpen} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>Bulk Import Preview</Typography>
            <IconButton onClick={() => setBulkUploadOpen(false)} size="small" aria-label="Close">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {bulkUploading && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={bulkProgress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                  Processing: {Math.round(bulkProgress)}%
                </Typography>
              </Box>
            )}
            {bulkErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>CSV Errors:</Typography>
                {bulkErrors.map((e, i) => <div key={i}>• {e}</div>)}
              </Alert>
            )}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>REP Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bulkData.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {r.status === 'success' && <CheckIcon color="success" fontSize="small" />}
                        {r.status === 'error' && <ErrorIcon color="error" fontSize="small" />}
                        {r.status === 'pending' && <Typography variant="caption">Pending</Typography>}
                      </TableCell>
                      <TableCell>{r.repName}</TableCell>
                      <TableCell>{r.contactName}</TableCell>
                      <TableCell>{r.phone}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color={r.error ? 'error' : 'text.secondary'}>
                          {r.error || (r.status === 'success' ? 'Added' : '-')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setBulkUploadOpen(false)}>Close</Button>
            <Button 
              variant="contained" 
              onClick={handleBulkUpload} 
              disabled={bulkUploading || bulkErrors.length > 0}
              sx={{ 
                bgcolor: '#FDE68A',
                '&:hover': { bgcolor: '#FCD34D' }
              }}
            >
              {bulkUploading ? 'Importing...' : 'Import'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast}>
          <Alert severity={toast.severity} variant="filled">
            {toast.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default REPManagementPage;