// src/components/vendors/VendorManagementPage.jsx

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
  Chip,
  Grid,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Store as StoreIcon,
} from '@mui/icons-material';

import VendorCard from './VendorCard';
import VendorModal from './VendorModal';
import VendorBulkModal from './VendorBulkModal';
import VendorDetailView from './VendorDetailView';
import VendorStatementDialog from './VendorStatementDialog';
import { vendorsAPI } from '../../services/api';
import { SORT_OPTIONS } from './vendorConstants';

function VendorManagementPage() {
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [detailVendor, setDetailVendor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [statementVendor, setStatementVendor] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  // Menu anchors
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);

  /* ============ LOAD & FILTER ============ */

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    filterAndSort();
  }, [vendors, searchQuery, sortBy, filterType]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorsAPI.getAll();
      setVendors(response.vendors || []);
    } catch (error) {
      console.error('Load error:', error);
      showToast('Failed to load vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSort = () => {
    let filtered = [...vendors];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.vendorName?.toLowerCase().includes(q) ||
          v.contactPerson?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q) ||
          v.gstNumber?.toLowerCase().includes(q) ||
          v.panNumber?.toLowerCase().includes(q) ||
          v.entityName?.toLowerCase().includes(q) ||
          v.city?.toLowerCase().includes(q) ||
          v.state?.toLowerCase().includes(q)
      );
    }

    if (filterType) {
      filtered = filtered.filter((v) => v.vendorType === filterType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.vendorName || '').localeCompare(b.vendorName || '');
        case 'name-desc':
          return (b.vendorName || '').localeCompare(a.vendorName || '');
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'latest':
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    setFilteredVendors(filtered);
  };

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  /* ============ ACTIONS ============ */

  const handleAddVendor = () => {
    setEditingVendor(null);
    setModalOpen(true);
  };

  const handleBulkComplete = (count) => {
    showToast(`${count} vendor${count !== 1 ? 's' : ''} added successfully`);
    loadVendors();
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setModalOpen(true);
  };

  const handleSave = async (vendorData, vendorId) => {
    setSaving(true);
    try {
      if (vendorId) {
        await vendorsAPI.update(vendorId, vendorData);
        showToast('Vendor updated successfully');
      } else {
        await vendorsAPI.create(vendorData);
        showToast('Vendor added successfully');
      }
      setModalOpen(false);
      setEditingVendor(null);
      loadVendors();
    } catch (error) {
      console.error('Save error:', error);
      showToast(error.message || 'Failed to save vendor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vendor) => {
    if (!window.confirm(`Delete vendor "${vendor.vendorName}"? This cannot be undone.`)) return;
    try {
      await vendorsAPI.delete(vendor._id || vendor.id);
      showToast(`${vendor.vendorName} deleted`);
      loadVendors();
    } catch (error) {
      console.error('Delete error:', error);
      showToast(error.message || 'Failed to delete vendor', 'error');
    }
  };

  const clearFilters = () => {
    setFilterType('');
    setSearchQuery('');
    setSortBy('latest');
  };

  const hasFilters = filterType || searchQuery;

  /* ============ RENDER ============ */

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#1e293b', mb: 0.5 }}>
              Vendor Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage vendor profiles and documents.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 2, sm: 0 } }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setBulkModalOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                px: 2.5,
                borderColor: '#5B63D3',
                color: '#5B63D3',
                '&:hover': { bgcolor: '#eef2ff', borderColor: '#4338ca' },
              }}
            >
              Bulk Add
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddVendor}
              sx={{
                bgcolor: '#FDE68A',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                px: 3,
                color: '#1e293b',
                '&:hover': { bgcolor: '#FCD34D' },
              }}
            >
              Add Vendor
            </Button>
          </Stack>
        </Stack>

        {/* Search & Filters */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          sx={{ mb: 3 }}
        >
          <TextField
            size="small"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              maxWidth: 400,
              '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff' },
            }}
          />

          <Stack direction="row" spacing={1}>
            {/* Filter */}
            <Button
              size="small"
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderColor: '#e2e8f0',
                color: '#475569',
                borderRadius: 1.5,
                '&:hover': { borderColor: '#94a3b8' },
              }}
            >
              Filter
            </Button>
            <Menu
              anchorEl={filterMenuAnchor}
              open={Boolean(filterMenuAnchor)}
              onClose={() => setFilterMenuAnchor(null)}
              PaperProps={{ sx: { borderRadius: 1.5, minWidth: 180 } }}
            >
              <MenuItem disabled sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                BY TYPE
              </MenuItem>
              {[...new Set(vendors.map((v) => v.vendorType).filter(Boolean))].sort().map((t) => (
                <MenuItem
                  key={t}
                  selected={filterType === t}
                  onClick={() => { setFilterType(filterType === t ? '' : t); setFilterMenuAnchor(null); }}
                  sx={{ fontSize: '0.85rem' }}
                >
                  {t}
                </MenuItem>
              ))}
            </Menu>

            {/* Sort */}
            <Button
              size="small"
              variant="outlined"
              startIcon={<SortIcon />}
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderColor: '#e2e8f0',
                color: '#475569',
                borderRadius: 1.5,
                '&:hover': { borderColor: '#94a3b8' },
              }}
            >
              Sort
            </Button>
            <Menu
              anchorEl={sortMenuAnchor}
              open={Boolean(sortMenuAnchor)}
              onClose={() => setSortMenuAnchor(null)}
              PaperProps={{ sx: { borderRadius: 1.5 } }}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.value}
                  selected={sortBy === opt.value}
                  onClick={() => { setSortBy(opt.value); setSortMenuAnchor(null); }}
                  sx={{ fontSize: '0.85rem' }}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Menu>
          </Stack>
        </Stack>

        {/* Active Filters */}
        {hasFilters && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3, flexWrap: 'wrap' }}>
            {filterType && (
              <Chip
                label={`Type: ${filterType}`}
                size="small"
                onDelete={() => setFilterType('')}
                sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 500 }}
              />
            )}
            {searchQuery && (
              <Chip
                label={`Search: "${searchQuery}"`}
                size="small"
                onDelete={() => setSearchQuery('')}
                sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 500 }}
              />
            )}
            <Button
              size="small"
              onClick={clearFilters}
              sx={{ textTransform: 'none', fontWeight: 500, color: '#64748b', fontSize: '0.75rem' }}
            >
              Clear All
            </Button>
          </Stack>
        )}

        {/* Content */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#5B63D3' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading vendors...
            </Typography>
          </Box>
        ) : filteredVendors.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <StoreIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
              {vendors.length === 0 ? 'No vendors yet' : 'No vendors match your filters'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {vendors.length === 0
                ? 'Add your first vendor to get started.'
                : 'Try adjusting your search or filters.'}
            </Typography>
            {vendors.length === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddVendor}
                sx={{
                  bgcolor: '#FDE68A',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  color: '#1e293b',
                  '&:hover': { bgcolor: '#FCD34D' },
                }}
              >
                Add Vendor
              </Button>
            )}
          </Box>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Showing {filteredVendors.length} of {vendors.length} vendors
            </Typography>
            <Grid container spacing={2.5}>
              {filteredVendors.map((vendor) => (
                <Grid item xs={12} sm={6} md={4} key={vendor._id || vendor.id}>
                  <VendorCard
                    vendor={vendor}
                    onEdit={handleEdit}
                    onViewDetails={(v) => setDetailVendor(v)}
                    onDelete={handleDelete}
                    onViewStatement={(v) => setStatementVendor(v)}
                  />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>

      {/* Modals */}
      <VendorModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingVendor(null); }}
        onSave={handleSave}
        vendor={editingVendor}
        saving={saving}
        vendors={vendors}
      />

      <VendorDetailView
        open={!!detailVendor}
        onClose={() => setDetailVendor(null)}
        vendor={detailVendor}
        onEdit={handleEdit}
      />

      <VendorBulkModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onBulkComplete={handleBulkComplete}
      />

      <VendorStatementDialog
        open={!!statementVendor}
        onClose={() => setStatementVendor(null)}
        vendor={statementVendor}
      />

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default VendorManagementPage;
