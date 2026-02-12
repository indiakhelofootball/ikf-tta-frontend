// src/components/trialCities/TrialCitiesPage.jsx - WITH IMPROVED ERROR HANDLING

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
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
} from '@mui/icons-material';

import CityCard from './CityCard';
import CityModal from './CityModal';
import { trialCitiesAPI } from '../../services/api';
import { generateTrialCityCode } from '../../utils/codeGenerator';

function TrialCitiesPage() {
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Bulk upload state
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const fileInputRef = useRef(null);

  /* ---------------- LOAD & FILTER ---------------- */

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    filterCities();
  }, [cities, searchQuery]);

  // ✅ IMPROVED: Better error handling for loading cities
  const loadCities = async () => {
    setLoading(true);
    try {
      const response = await trialCitiesAPI.getAll();
      setCities(response.cities || []);
    } catch (error) {
      console.error('Failed to load cities:', error);
      
      // User-friendly error messages
      if (error.message === 'Network Error') {
        showToast('No internet connection. Please check your network and try again.', 'error');
      } else if (error.response?.status === 500) {
        showToast('Server error. Please try again later.', 'error');
      } else if (error.response?.status === 404) {
        showToast('Cities endpoint not found. Please contact support.', 'error');
      } else {
        showToast(error.response?.data?.message || 'Failed to load cities. Please refresh the page.', 'error');
      }
      
      // Set empty array to prevent UI crashes
      setCities([]);
    } finally {
      setLoading(false); // Always stop loading
    }
  };

  const filterCities = () => {
    try {
      let filtered = [...cities];
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          c.city?.toLowerCase().includes(q) ||
          c.state?.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.trialType?.toLowerCase().includes(q)
        );
      }
      
      setFilteredCities(filtered);
    } catch (error) {
      console.error('Error filtering cities:', error);
      showToast('Error filtering results. Please try again.', 'error');
      setFilteredCities(cities); // Fallback to showing all cities
    }
  };

  /* ---------------- COMMON ---------------- */

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  /* ---------------- CITY ACTIONS ---------------- */

  const handleAddCity = () => {
    setEditingCity(null);
    setModalOpen(true);
  };

  const handleEditCity = (city) => {
    setEditingCity(city);
    setModalOpen(true);
  };

  // ✅ IMPROVED: Better error handling for saving cities
  const handleSaveCity = async (cityData) => {
    try {
      if (editingCity) {
        await trialCitiesAPI.update(editingCity.code, cityData);
        showToast('City updated successfully!', 'success');
      } else {
        await trialCitiesAPI.create(cityData);
        showToast('City created successfully!', 'success');
      }
      
      setModalOpen(false);
      await loadCities(); // Reload to show updated data
      
    } catch (error) {
      console.error('Failed to save city:', error);
      
      // Specific error messages
      if (error.response?.status === 409) {
        showToast('A city with this name already exists in this state.', 'error');
      } else if (error.response?.status === 422) {
        showToast(error.response.data?.message || 'Invalid data. Please check all fields.', 'error');
      } else if (error.message === 'Network Error') {
        showToast('No internet connection. Please check your network.', 'error');
      } else {
        showToast(error.response?.data?.message || 'Failed to save city. Please try again.', 'error');
      }
      
      // Re-throw so modal stays open
      throw error;
    }
  };

  // ✅ IMPROVED: Better error handling for deleting cities
  const handleDeleteCity = async (city) => {
    // Confirm before deleting
    if (!window.confirm(`Are you sure you want to delete "${city.city}, ${city.state}"?`)) {
      return;
    }

    try {
      await trialCitiesAPI.delete(city.code);
      showToast('City deleted successfully!', 'success');
      
      // Update local state immediately
      setCities(prevCities => prevCities.filter(c => c.code !== city.code));
      
    } catch (error) {
      console.error('Failed to delete city:', error);
      
      // Specific error messages
      if (error.response?.status === 404) {
        showToast('City not found. It may have been already deleted.', 'warning');
        // Still remove from local state
        setCities(prevCities => prevCities.filter(c => c.code !== city.code));
      } else if (error.response?.status === 409) {
        showToast('Cannot delete city with active trials. Remove trials first.', 'error');
      } else if (error.message === 'Network Error') {
        showToast('No internet connection. Please check your network.', 'error');
      } else {
        showToast(error.response?.data?.message || 'Failed to delete city. Please try again.', 'error');
      }
    }
  };

  // ✅ IMPROVED: Better error handling for reverify
  const handleReverifyCity = async (city) => {
    try {
      await trialCitiesAPI.update(city.code, {
        ...city,
        lastReverified: new Date().toISOString(),
      });
      showToast('City reverified successfully!', 'success');
      await loadCities(); // Reload to show updated timestamp
      
    } catch (error) {
      console.error('Failed to reverify city:', error);
      
      if (error.message === 'Network Error') {
        showToast('No internet connection. Please check your network.', 'error');
      } else {
        showToast(error.response?.data?.message || 'Failed to reverify city. Please try again.', 'error');
      }
    }
  };

  /* ---------------- BULK IMPORT ---------------- */

  const handleBulkMenuOpen = (e) => setBulkMenuAnchor(e.currentTarget);
  const handleBulkMenuClose = () => setBulkMenuAnchor(null);

  const handleDownloadTemplate = () => {
    try {
      const template = [
        ['state', 'city', 'groundLocation', 'trialType'],
        ['Maharashtra', 'Mumbai', 'Andheri Sports Complex', 'IKF Trial'],
      ];
      const csv = template.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trial_cities_template.csv';
      a.click();
      URL.revokeObjectURL(url);
      handleBulkMenuClose();
    } catch (error) {
      console.error('Failed to download template:', error);
      showToast('Failed to download template. Please try again.', 'error');
    }
  };

  const parseCSV = (text) => {
    try {
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return { data: [], errors: ['CSV file is empty or invalid'] };

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const data = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => row[h] = values[idx] || '');

        if (!row.state || !row.city) {
          errors.push(`Row ${i + 1}: state & city are required`);
        } else {
          data.push({
            state: row.state,
            city: row.city,
            groundLocation: row.groundlocation || '',
            trialType: row.trialtype || '',
            status: 'pending',
          });
        }
      }
      return { data, errors };
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return { data: [], errors: ['Failed to parse CSV file. Please check the format.'] };
    }
  };

  // ✅ IMPROVED: Better error handling for file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      showToast('Please upload a CSV file', 'error');
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      e.target.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      
      reader.onload = ev => {
        try {
          const { data, errors } = parseCSV(ev.target.result);
          setBulkData(data);
          setBulkErrors(errors);
          setBulkUploadOpen(true);
        } catch (error) {
          console.error('Error processing CSV:', error);
          showToast('Failed to process CSV file. Please check the format.', 'error');
        }
      };
      
      reader.onerror = () => {
        showToast('Failed to read file. Please try again.', 'error');
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      showToast('Failed to read file. Please try again.', 'error');
    } finally {
      e.target.value = ''; // Reset input
    }
  };

  // ✅ IMPROVED: Better error handling for bulk upload
  const handleBulkUpload = async () => {
    if (!bulkData.length) {
      showToast('No data to import', 'warning');
      return;
    }

    setBulkUploading(true);
    setBulkProgress(0);

    const results = [];
    const total = bulkData.length;

    for (let i = 0; i < bulkData.length; i++) {
      const cityData = bulkData[i];

      // Check for duplicates
      const alreadyExists = cities.some(
        c =>
          c.city?.toLowerCase() === cityData.city.toLowerCase() &&
          c.state?.toLowerCase() === cityData.state.toLowerCase()
      );

      if (alreadyExists) {
        results.push({
          ...cityData,
          status: 'error',
          error: 'City already exists in this state',
        });
        setBulkProgress(((i + 1) / total) * 100);
        continue;
      }

      try {
        await trialCitiesAPI.create({
          ...cityData,
          trialCityName: cityData.city,
        });

        results.push({ ...cityData, status: 'success' });
      } catch (err) {
        console.error(`Failed to create ${cityData.city}:`, err);
        results.push({
          ...cityData,
          status: 'error',
          error: err.response?.data?.message || err.message || 'Failed to create city',
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
      await loadCities();
    } else {
      showToast('Import failed: No cities were added', 'error');
    }
  };

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
              Trial Cities
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage trial locations and schedules
            </Typography>
          </Box>

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
              onClick={handleAddCity}
              sx={{ 
                px: 3,
                bgcolor: '#5B63D3',
                '&:hover': {
                  bgcolor: '#4A52C2'
                }
              }}
            >
              Add City
            </Button>
          </Stack>
        </Box>

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

        {/* Search Bar */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            sx={{ 
              maxWidth: 600,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#5B63D3',
                  }
                }
              }
            }}
            placeholder="Search by city, state or code..."
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
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* City Cards Grid */}
        {!loading && filteredCities.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }} alignItems="stretch">
            {filteredCities.map(city => (
              <Grid item xs={12} lg={6} key={city.code} sx={{ display: 'flex' }}>
                <CityCard
                  city={city}
                  onEdit={handleEditCity}
                  onDelete={handleDeleteCity}
                  onReverify={handleReverifyCity}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!loading && filteredCities.length === 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 8,
            bgcolor: 'white',
            borderRadius: 2,
            border: '1px solid #e5e7eb'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No cities found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'Try adjusting your search' : 'Add your first trial city to get started'}
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCity}
                sx={{ mt: 2, bgcolor: '#5B63D3' }}
              >
                Add Your First City
              </Button>
            )}
          </Box>
        )}

        <CityModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveCity}
          editingCity={editingCity}
          existingCities={cities}
        />

        {/* Bulk Upload Dialog */}
        <Dialog open={bulkUploadOpen} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>Bulk Import Preview</Typography>
            <IconButton onClick={() => setBulkUploadOpen(false)} size="small" disabled={bulkUploading}>
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
                    <TableCell sx={{ fontWeight: 600 }}>City</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>State</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
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
                      <TableCell>{r.city}</TableCell>
                      <TableCell>{r.state}</TableCell>
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
            <Button onClick={() => setBulkUploadOpen(false)} disabled={bulkUploading}>
              Close
            </Button>
            <Button 
              variant="contained" 
              onClick={handleBulkUpload} 
              disabled={bulkUploading || bulkErrors.length > 0 || bulkData.length === 0}
              sx={{ 
                bgcolor: '#5B63D3',
                '&:hover': { bgcolor: '#4A52C2' }
              }}
            >
              {bulkUploading ? 'Importing...' : 'Import'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleCloseToast}>
          <Alert severity={toast.severity} variant="filled" onClose={handleCloseToast}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default TrialCitiesPage;