// src/components/vendors/VendorBulkModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Grid, Button, IconButton,
  Stack, Divider, CircularProgress, Chip, Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import VendorModal from './VendorModal';
import { vendorsAPI } from '../../services/api';

const emptyRow = () => ({
  _bulkId: Date.now() + Math.random(),
  vendorName: '',
  vendorType: '',
  companyType: '',
  entityName: '',
  contactPerson: '',
  phone: '',
  email: '',
  panNumber: '',
  // all other fields — filled via Edit button
  gstNumber: '',
  tdsType: 'None',
  gstVerified: false,
  panVerified: false,
  address: '',
  contactPinCode: '',
  bankName: '',
  accountNumber: '',
  accountType: '',
  ifscCode: '',
  bankPinCode: '',
  status: 'Pending',
});

const fieldLabelSx = {
  mb: 0.5,
  display: 'block',
  fontWeight: 600,
  color: '#334155',
  fontSize: '0.75rem',
};

function VendorBulkModal({ open, onClose, onBulkComplete }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [rowErrors, setRowErrors] = useState({}); // { _bulkId: { field: msg } }
  const [editingIndex, setEditingIndex] = useState(null); // index in rows[]
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState([]); // [{ name, status, error }]
  const [done, setDone] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setRows([emptyRow()]);
      setRowErrors({});
      setEditingIndex(null);
      setResults([]);
      setDone(false);
    }
  }, [open]);

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (bulkId) => {
    setRows(prev => prev.filter(r => r._bulkId !== bulkId));
    setRowErrors(prev => { const n = { ...prev }; delete n[bulkId]; return n; });
  };

  const handleInlineChange = (bulkId, field, value) => {
    setRows(prev => prev.map(r => r._bulkId === bulkId ? { ...r, [field]: value } : r));
    setRowErrors(prev => ({
      ...prev,
      [bulkId]: { ...(prev[bulkId] || {}), [field]: '' },
    }));
  };

  // Called by VendorModal when user saves the detailed edit of a row
  const handleDetailSave = (data) => {
    setRows(prev => prev.map((r, i) =>
      i === editingIndex ? { ...r, ...data, _bulkId: r._bulkId } : r
    ));
    setEditingIndex(null);
  };

  const validate = () => {
    const newErrors = {};
    let valid = true;

    rows.forEach(row => {
      const errs = {};

      if (!row.vendorName.trim()) { errs.vendorName = 'Required'; valid = false; }

      if (!row.contactPerson.trim()) { errs.contactPerson = 'Required'; valid = false; }

      if (!row.phone.trim()) {
        errs.phone = 'Required'; valid = false;
      } else {
        const d = row.phone.replace(/\D/g, '');
        if (d.length !== 10) { errs.phone = '10 digits'; valid = false; }
        else if (!/^[6-9]/.test(d)) { errs.phone = 'Start 6–9'; valid = false; }
      }

      if (!row.email.trim()) {
        errs.email = 'Required'; valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errs.email = 'Invalid email'; valid = false;
      }

      if (!row.panNumber.trim()) {
        errs.panNumber = 'Required'; valid = false;
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(row.panNumber.trim())) {
        errs.panNumber = 'Invalid PAN'; valid = false;
      }

      if (Object.keys(errs).length) newErrors[row._bulkId] = errs;
    });

    setRowErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setResults([]);
    const newResults = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const { _bulkId, ...data } = row;
      try {
        await vendorsAPI.create(data);
        newResults.push({ name: row.vendorName, status: 'success' });
      } catch (err) {
        newResults.push({ name: row.vendorName, status: 'error', error: err.message });
      }
      setResults([...newResults]);
    }

    setSubmitting(false);
    setDone(true);
    const successCount = newResults.filter(r => r.status === 'success').length;
    if (successCount > 0) onBulkComplete(successCount);
  };

  const editingVendorData = editingIndex !== null ? rows[editingIndex] : null;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <>
      <Dialog
        open={open}
        onClose={submitting ? undefined : onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '92vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
              Bulk Add Vendors
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Fill key details for each vendor. Use the edit button for full details (bank, address, etc.)
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} disabled={submitting} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2 }}>

          {/* Results panel — shown during/after submit */}
          {results.length > 0 && (
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>Results</Typography>
                {successCount > 0 && (
                  <Chip
                    icon={<SuccessIcon sx={{ fontSize: 14 }} />}
                    label={`${successCount} added`}
                    size="small"
                    sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.7rem' }}
                  />
                )}
                {errorCount > 0 && (
                  <Chip
                    icon={<ErrorIcon sx={{ fontSize: 14 }} />}
                    label={`${errorCount} failed`}
                    size="small"
                    sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: '0.7rem' }}
                  />
                )}
                {submitting && <CircularProgress size={16} sx={{ color: '#5B63D3' }} />}
              </Stack>
              <Stack spacing={0.75}>
                {results.map((r, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    {r.status === 'success'
                      ? <SuccessIcon sx={{ fontSize: 16, color: '#22c55e' }} />
                      : <ErrorIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                    }
                    <Typography variant="caption" fontWeight={600}>{r.name}</Typography>
                    {r.error && (
                      <Typography variant="caption" color="error">{r.error}</Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {/* Row cards */}
          {!done && rows.map((row, index) => {
            const errs = rowErrors[row._bulkId] || {};
            const hasDetailsFilled = !!(row.bankName || row.address || row.gstNumber || row.accountNumber);

            return (
              <Box
                key={row._bulkId}
                sx={{
                  mb: 2,
                  p: 2,
                  border: '1px solid',
                  borderColor: Object.keys(errs).length ? '#fca5a5' : '#e2e8f0',
                  borderRadius: 2,
                  bgcolor: Object.keys(errs).length ? '#fff5f5' : '#fff',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Row header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#5B63D3', fontSize: '0.75rem' }}>
                      VENDOR {index + 1}
                    </Typography>
                    {hasDetailsFilled && (
                      <Chip
                        label="Details added"
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#eff6ff', color: '#3b82f6' }}
                      />
                    )}
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Fill full details (bank, address, docs)">
                      <IconButton
                        size="small"
                        onClick={() => setEditingIndex(index)}
                        aria-label="Edit vendor details"
                        sx={{ color: '#5B63D3', '&:hover': { bgcolor: '#eef2ff' } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {rows.length > 1 && (
                      <Tooltip title="Remove this row">
                        <IconButton
                          size="small"
                          onClick={() => removeRow(row._bulkId)}
                          aria-label="Remove vendor row"
                          sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>

                {/* Inline fields — 3 per row */}
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={fieldLabelSx}>Vendor Name *</Typography>
                    <TextField
                      fullWidth size="small"
                      placeholder="Vendor name"
                      value={row.vendorName}
                      onChange={e => handleInlineChange(row._bulkId, 'vendorName', e.target.value)}
                      error={!!errs.vendorName}
                      helperText={errs.vendorName}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={fieldLabelSx}>Contact Person *</Typography>
                    <TextField
                      fullWidth size="small"
                      placeholder="Contact name"
                      value={row.contactPerson}
                      onChange={e => handleInlineChange(row._bulkId, 'contactPerson', e.target.value)}
                      error={!!errs.contactPerson}
                      helperText={errs.contactPerson}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={fieldLabelSx}>Service Type</Typography>
                    <TextField
                      fullWidth size="small"
                      placeholder="e.g. Printing"
                      value={row.vendorType}
                      onChange={e => handleInlineChange(row._bulkId, 'vendorType', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={fieldLabelSx}>Phone *</Typography>
                    <TextField
                      fullWidth size="small"
                      placeholder="10-digit mobile"
                      value={row.phone}
                      onChange={e => handleInlineChange(row._bulkId, 'phone', e.target.value)}
                      error={!!errs.phone}
                      helperText={errs.phone}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={fieldLabelSx}>Email *</Typography>
                    <TextField
                      fullWidth size="small"
                      placeholder="email@example.com"
                      value={row.email}
                      onChange={e => handleInlineChange(row._bulkId, 'email', e.target.value)}
                      error={!!errs.email}
                      helperText={errs.email}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={fieldLabelSx}>PAN Number *</Typography>
                    <TextField
                      fullWidth size="small"
                      placeholder="AABCU9603R"
                      value={row.panNumber}
                      onChange={e => handleInlineChange(row._bulkId, 'panNumber', e.target.value.toUpperCase())}
                      error={!!errs.panNumber}
                      helperText={errs.panNumber}
                      inputProps={{ style: { textTransform: 'uppercase' } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Grid>
                </Grid>
              </Box>
            );
          })}

          {/* Add row button */}
          {!done && (
            <Button
              startIcon={<AddIcon />}
              onClick={addRow}
              disabled={submitting}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#5B63D3',
                border: '1px dashed #c7d2fe',
                borderRadius: 2,
                width: '100%',
                py: 1,
                '&:hover': { bgcolor: '#eef2ff', borderColor: '#818cf8' },
              }}
            >
              Add Another Vendor
            </Button>
          )}

        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {done
              ? `${successCount} of ${rows.length} vendors added`
              : `${rows.length} vendor${rows.length !== 1 ? 's' : ''} to add`}
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              onClick={onClose}
              disabled={submitting}
              sx={{ textTransform: 'none', fontWeight: 600, color: '#475569' }}
            >
              {done ? 'Close' : 'Cancel'}
            </Button>
            {!done && (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting || rows.length === 0}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: '#FDE68A',
                  borderRadius: 1.5,
                  px: 3,
                  color: '#1e293b',
                  '&:hover': { bgcolor: '#FCD34D' },
                }}
              >
                {submitting
                  ? `Adding ${results.length + 1} of ${rows.length}...`
                  : `Add ${rows.length} Vendor${rows.length !== 1 ? 's' : ''}`}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Full detail edit for a single row — reuses VendorModal but saves to local state */}
      <VendorModal
        open={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        onSave={handleDetailSave}
        vendor={editingVendorData}
        saving={false}
      />
    </>
  );
}

export default VendorBulkModal;
