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
  Card,
  CardContent,
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
  CheckCircle as VerifiedIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';

import VendorCard from './VendorCard';
import VendorModal from './VendorModal';
import VendorDetailView from './VendorDetailView';
import { vendorsAPI, repAPI } from '../../services/api';
import { VENDOR_TYPES, VENDOR_STATUSES, SORT_OPTIONS } from './vendorConstants';

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

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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
  }, [vendors, searchQuery, sortBy, filterType, filterStatus]);

  const mapRepToVendor = (rep) => ({
    _id: `rep_${rep.id}`,
    id: `rep_${rep.id}`,
    repId: rep.id,
    vendorName: rep.repName || '',
    vendorType: 'REP',
    gstNumber: rep.gstNo || '',
    panNumber: rep.panCard || '',
    gstVerified: false,
    panVerified: false,
    contactPerson: rep.contactName || '',
    phone: rep.phone || '',
    email: rep.email || '',
    address: rep.physicalAddress || '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    status: rep.status || 'Active',
    isRepSourced: true,
    // Extra REP fields for detail view
    state: rep.state || '',
    city: rep.city || '',
    region: rep.region || '',
    season: rep.season || '',
    groundLocation: rep.groundLocation || '',
    pinCode: rep.pinCode || '',
    mouStatus: rep.mouStatus || '',
    backupContactName: rep.backupContactName || '',
    backupPhone: rep.backupPhone || '',
    backupEmail: rep.backupEmail || '',
    createdAt: rep.createdAt || '',
  });

  const loadVendors = async () => {
    try {
      setLoading(true);
      const [vendorResponse, repResponse] = await Promise.all([
        vendorsAPI.getAll(),
        repAPI.getAll().catch(() => ({ reps: [] })),
      ]);

      const regularVendors = vendorResponse.vendors || [];
      const repVendors = (repResponse.reps || []).map(mapRepToVendor);

      setVendors([...regularVendors, ...repVendors]);
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
          v.city?.toLowerCase().includes(q) ||
          v.state?.toLowerCase().includes(q)
      );
    }

    if (filterType) {
      filtered = filtered.filter((v) => v.vendorType === filterType);
    }
    if (filterStatus) {
      filtered = filtered.filter((v) => v.status === filterStatus);
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

  const handleAddNew = () => {
    setEditingVendor(null);
    setModalOpen(true);
  };

  const handleEdit = (vendor) => {
    if (vendor.isRepSourced) return; // REP vendors are edited from REP Management
    setEditingVendor(vendor);
    setModalOpen(true);
  };

  const handleSave = async (vendorData) => {
    setSaving(true);
    try {
      if (editingVendor) {
        await vendorsAPI.update(editingVendor._id || editingVendor.id, vendorData);
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

  const handleVerify = async (vendor) => {
    try {
      await vendorsAPI.update(vendor._id || vendor.id, { ...vendor, status: 'Verified' });
      showToast(`${vendor.vendorName} has been verified`);
      loadVendors();
    } catch (error) {
      console.error('Verify error:', error);
      showToast('Failed to verify vendor', 'error');
    }
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterStatus('');
    setSearchQuery('');
    setSortBy('latest');
  };

  const hasFilters = filterType || filterStatus || searchQuery;

  /* ============ STATS ============ */

  const totalVendors = vendors.length;
  const verifiedCount = vendors.filter((v) => v.status === 'Verified' || v.status === 'Active').length;
  const pendingCount = vendors.filter((v) => v.status === 'Pending').length;
  const repCount = vendors.filter((v) => v.isRepSourced).length;

  const statCards = [
    { label: 'Total Vendors', value: totalVendors, icon: <StoreIcon />, color: '#5B63D3' },
    { label: 'Verified / Active', value: verifiedCount, icon: <VerifiedIcon />, color: '#22c55e' },
    { label: 'Pending', value: pendingCount, icon: <PendingIcon />, color: '#f59e0b' },
  ];

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
              Manage vendor profiles, documents, and verification status.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            sx={{
              bgcolor: '#5B63D3',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 1.5,
              px: 3,
              mt: { xs: 2, sm: 0 },
              '&:hover': { bgcolor: '#4A52C2' },
            }}
          >
            Add Vendor
          </Button>
        </Stack>

        {/* Stats */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {statCards.map((stat) => (
            <Grid item xs={12} sm={4} key={stat.label}>
              <Card
                variant="outlined"
                sx={{ borderRadius: 2, borderColor: '#e2e8f0', '&:hover': { borderColor: '#cbd5e1' } }}
              >
                <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ color: stat.color }}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Box sx={{ color: stat.color, opacity: 0.3, '& svg': { fontSize: 40 } }}>
                      {stat.icon}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

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
              {VENDOR_TYPES.map((t) => (
                <MenuItem
                  key={t}
                  selected={filterType === t}
                  onClick={() => { setFilterType(filterType === t ? '' : t); setFilterMenuAnchor(null); }}
                  sx={{ fontSize: '0.85rem' }}
                >
                  {t}
                </MenuItem>
              ))}
              <MenuItem disabled sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', mt: 1 }}>
                BY STATUS
              </MenuItem>
              {VENDOR_STATUSES.map((s) => (
                <MenuItem
                  key={s}
                  selected={filterStatus === s}
                  onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setFilterMenuAnchor(null); }}
                  sx={{ fontSize: '0.85rem' }}
                >
                  {s}
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
            {filterStatus && (
              <Chip
                label={`Status: ${filterStatus}`}
                size="small"
                onDelete={() => setFilterStatus('')}
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
                onClick={handleAddNew}
                sx={{
                  bgcolor: '#5B63D3',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: '#4A52C2' },
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
                    onVerify={handleVerify}
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
      />

      <VendorDetailView
        open={!!detailVendor}
        onClose={() => setDetailVendor(null)}
        vendor={detailVendor}
        onEdit={handleEdit}
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
