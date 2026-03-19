// src/components/vendors/VendorSearchDialog.jsx

import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, IconButton,
  Stack, Divider, MenuItem, FormControl, Select, Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

function VendorSearchDialog({ open, onClose, vendors, onEdit, onView }) {
  const [serviceType, setServiceType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [nameQuery, setNameQuery] = useState('');

  // Step 1 options: unique service types from actual data
  const serviceTypes = useMemo(() => {
    return [...new Set(vendors.map(v => v.vendorType).filter(Boolean))].sort();
  }, [vendors]);

  // Step 2 options: Individual always first, then company types present in the pool
  const entityTypes = useMemo(() => {
    let pool = [...vendors];
    if (serviceType) {
      pool = pool.filter(v => v.vendorType === serviceType);
    }
    const present = new Set(pool.map(v => v.companyType).filter(Boolean));
    const options = ['Individual'];
    [...present].filter(t => t !== 'Individual').sort().forEach(t => options.push(t));
    return options;
  }, [vendors, serviceType]);

  // Cascading filter results
  const results = useMemo(() => {
    if (!serviceType && !entityType && !nameQuery.trim()) return [];

    let filtered = [...vendors];

    if (serviceType) {
      filtered = filtered.filter(v => v.vendorType === serviceType);
    }
    if (entityType) {
      filtered = filtered.filter(v => v.companyType === entityType);
    }
    if (nameQuery.trim()) {
      const q = nameQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.vendorName?.toLowerCase().includes(q) ||
        v.entityName?.toLowerCase().includes(q) ||
        v.contactPerson?.toLowerCase().includes(q)
      );
    }

    return filtered.slice(0, 15);
  }, [vendors, serviceType, entityType, nameQuery]);

  const hasSearched = serviceType !== '' || entityType !== '' || nameQuery.trim().length > 0;

  const handleServiceTypeChange = (val) => {
    setServiceType(val);
    setEntityType(''); // reset — available options change with service type
  };

  const handleReset = () => {
    setServiceType('');
    setEntityType('');
    setNameQuery('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2.5, maxHeight: '85vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            Find Vendor
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Use filters to narrow down and find the vendor you're looking for.
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Filter header */}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2 }}>
          <FilterIcon sx={{ fontSize: 16, color: '#5B63D3' }} />
          <Typography variant="caption" sx={{
            fontWeight: 700, color: '#5B63D3', fontSize: '0.7rem',
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            Search Filters
          </Typography>
          {hasSearched && (
            <Button
              size="small"
              onClick={handleReset}
              sx={{ textTransform: 'none', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', ml: 'auto' }}
            >
              Clear All
            </Button>
          )}
        </Stack>

        <Stack spacing={2} sx={{ mb: 3 }}>
          {/* Filter 1: Service Type */}
          <FormControl fullWidth size="small">
            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: '#334155', fontSize: '0.8rem' }}>
              1. Service Type
            </Typography>
            <Select
              value={serviceType}
              onChange={(e) => handleServiceTypeChange(e.target.value)}
              displayEmpty
              renderValue={(val) => val || <em style={{ color: '#94a3b8' }}>All service types</em>}
              sx={{ borderRadius: 1.5 }}
            >
              <MenuItem value=""><em>All service types</em></MenuItem>
              {serviceTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Filter 2: Entity Type */}
          <FormControl fullWidth size="small">
            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: '#334155', fontSize: '0.8rem' }}>
              2. Entity Type
            </Typography>
            <Select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              displayEmpty
              renderValue={(val) => val || <em style={{ color: '#94a3b8' }}>All entity types</em>}
              sx={{ borderRadius: 1.5 }}
            >
              <MenuItem value=""><em>All entity types</em></MenuItem>
              {entityTypes.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.85rem' }}>{t}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Filter 3: Vendor Name */}
          <Box>
            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: '#334155', fontSize: '0.8rem', display: 'block' }}>
              3. Vendor Name
            </Typography>
            <TextField
              fullWidth size="small"
              placeholder="Type vendor name, entity name, or contact person..."
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              autoFocus
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Box>
        </Stack>

        {/* Active filter chips */}
        {hasSearched && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
            {serviceType && (
              <Chip
                label={`Service: ${serviceType}`}
                size="small"
                onDelete={() => handleServiceTypeChange('')}
                sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 500, fontSize: '0.72rem' }}
              />
            )}
            {entityType && (
              <Chip
                label={`Entity: ${entityType}`}
                size="small"
                onDelete={() => setEntityType('')}
                sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 500, fontSize: '0.72rem' }}
              />
            )}
            {nameQuery.trim() && (
              <Chip
                label={`Name: "${nameQuery}"`}
                size="small"
                onDelete={() => setNameQuery('')}
                sx={{ bgcolor: '#eef2ff', color: '#4f46e5', fontWeight: 500, fontSize: '0.72rem' }}
              />
            )}
          </Stack>
        )}

        {/* Results */}
        {hasSearched && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="caption" sx={{
              fontWeight: 700, color: '#64748b', fontSize: '0.7rem',
              letterSpacing: '0.5px', textTransform: 'uppercase', mb: 1.5, display: 'block',
            }}>
              {results.length > 0 ? `${results.length} VENDOR${results.length !== 1 ? 'S' : ''} FOUND` : 'NO VENDORS FOUND'}
            </Typography>

            {results.length > 0 ? (
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {results.map((v) => (
                  <Box key={v._id || v.id} sx={{
                    p: 2, borderRadius: 2, border: '1px solid #e2e8f0',
                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                    transition: 'all 0.15s',
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>
                          {v.vendorName}
                        </Typography>
                        {v.entityName && (
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {v.entityName}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          {v.vendorType && (
                            <Chip label={v.vendorType} size="small" variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 20, borderColor: '#5B63D3', color: '#5B63D3' }} />
                          )}
                          {v.companyType && (
                            <Chip label={v.companyType} size="small" variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 20, borderColor: '#94a3b8', color: '#64748b' }} />
                          )}
                          {v.status && (
                            <Chip label={v.status} size="small"
                              sx={{ fontSize: '0.65rem', height: 20,
                                bgcolor: v.status === 'Verified' ? '#f0fdf4' : '#fff7ed',
                                color: v.status === 'Verified' ? '#16a34a' : '#ea580c',
                              }} />
                          )}
                        </Stack>
                        {v.contactPerson && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {v.contactPerson} {v.phone ? `· ${v.phone}` : ''}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" variant="outlined"
                          startIcon={<ViewIcon sx={{ fontSize: 14 }} />}
                          onClick={() => { handleClose(); onView(v); }}
                          sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, borderRadius: 1.5,
                            borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#94a3b8' } }}>
                          View
                        </Button>
                        <Button size="small" variant="contained"
                          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                          onClick={() => { handleClose(); onEdit(v); }}
                          sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, borderRadius: 1.5,
                            bgcolor: '#FDE68A', color: '#1e293b', boxShadow: 'none',
                            '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' } }}>
                          Edit
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1', mb: 2 }}>
                <SearchIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No vendors found — ask admin to add them first.
                </Typography>
              </Box>
            )}
          </>
        )}

        {!hasSearched && (
          <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #e2e8f0' }}>
            <SearchIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Use the filters above to find vendors
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600, color: '#475569' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VendorSearchDialog;
