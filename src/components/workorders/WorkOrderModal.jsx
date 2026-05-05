// src/components/workorders/WorkOrderModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, IconButton, Divider, Stack, Chip,
  ToggleButton, ToggleButtonGroup,
  Alert, CircularProgress, Autocomplete, Checkbox, FormControlLabel,
  Select, MenuItem, FormControl, InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  Repeat as PeriodicIcon,
  PushPin as FixedIcon,
  InfoOutlined as InfoIcon,
  FilterList as FilterIcon,
  OpenInNew as OpenIcon,
  AddCircleOutline as NewWOIcon,
  Search as SearchIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { generateWorkOrderNumber } from './workOrderData';
import { getVendorTypeNames, getEntityTypeNames } from '../../utils/adminStorage';
import { vendorsAPI } from '../../services/api';

/* ── Design tokens ── */
const cardSx = {
  bgcolor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '14px',
  p: { xs: 2.5, sm: 3.5 },
  mb: 3,
};

const labelSx = {
  fontSize: '0.88rem',
  fontWeight: 600,
  color: '#64748b',
  mb: 0.75,
  display: 'block',
};

const secHeaderSx = {
  color: '#5B63D3',
  fontWeight: 700,
  mb: 2.5,
  mt: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontSize: '0.88rem',
};

const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
  '& .MuiOutlinedInput-input': { py: 1.25, fontSize: '0.95rem' },
};

const autocompleteSlotProps = {
  popper: { sx: { zIndex: 1500 }, placement: 'bottom-start',
    modifiers: [{ name: 'flip', enabled: false }] },
  paper: { sx: { mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    borderRadius: 2, minWidth: 300,
    '& .MuiAutocomplete-listbox': { padding: 0, maxHeight: 260 } } },
};

/** Extract numeric TDS rate from tdsType string like "TDS @ 2% (Sec 194C)" → 2 */
function parseTdsRate(tdsType) {
  if (!tdsType || tdsType === 'None') return 0;
  const match = tdsType.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : 0;
}

const EMPTY_FORM = {
  workOrderNumber: '',
  type: 'Fixed',
  vendorId: '',
  serviceDescription: '',
  amount: '',
  amountPerPeriod: '',
  numberOfPeriods: '',
  tdsRate: '',
  tdsComment: '',
};

function WorkOrderModal({ open, onClose, onSave, workOrder, saving, allVendors: propVendors = [], preSelectedVendor, allWorkOrders = [], onOpenWO }) {
  const isEdit = Boolean(workOrder);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorInputValue, setVendorInputValue] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [proceedToCreate, setProceedToCreate] = useState(false);
  const [amountUnlocked, setAmountUnlocked] = useState(false);

  // — fresh vendor list (re-fetched when modal opens) —
  const [freshVendors, setFreshVendors] = useState([]);
  const allVendors = freshVendors.length > 0 ? freshVendors : propVendors;

  useEffect(() => {
    if (open) {
      vendorsAPI.getAll({ limit: 1000 })
        .then(res => { if (res.vendors?.length) setFreshVendors(res.vendors); })
        .catch(() => {});
    } else {
      setFreshVendors([]);
    }
  }, [open]);

  // — search state —
  const [searchServiceType, setSearchServiceType] = useState('');
  const [searchEntityType, setSearchEntityType] = useState('');

  // Reset form only when modal opens/closes or workOrder changes — NOT when allVendors updates
  useEffect(() => {
    if (open) {
      if (workOrder) {
        setForm({ ...EMPTY_FORM, ...workOrder });
      } else if (preSelectedVendor) {
        const vendorId = preSelectedVendor._id || preSelectedVendor.id;
        const woNum = generateWorkOrderNumber(preSelectedVendor.vendorType, preSelectedVendor.vendorName, allWorkOrders);
        setForm({ ...EMPTY_FORM, vendorId, workOrderNumber: woNum });
        setSelectedVendor(preSelectedVendor);
        setSearchServiceType('');
        setSearchEntityType('');
      } else {
        setForm({ ...EMPTY_FORM });
        setSelectedVendor(null);
        setSearchServiceType('');
        setSearchEntityType('');
      }
      setConfirmed(false);
      setErrors({});
      setProceedToCreate(false);
      setAmountUnlocked(false);
    }
  }, [open, workOrder, preSelectedVendor]);

  // Resolve selected vendor from fresh vendor list (runs when allVendors updates)
  useEffect(() => {
    if (open && workOrder && allVendors.length > 0) {
      const v = allVendors.find((x) => (x._id || x.id) === workOrder.vendorId) || workOrder;
      setSelectedVendor(v);
    }
  }, [open, workOrder, allVendors]);

  /* ── Search filter logic ── */
  const serviceTypeOptions = useMemo(() => getVendorTypeNames(), []);
  const entityTypeOptions = useMemo(() => getEntityTypeNames(), []);

  const filteredVendors = useMemo(() => {
    let pool = [...allVendors];
    if (searchServiceType) pool = pool.filter(v => (v.vendorType || '').toLowerCase() === searchServiceType.toLowerCase());
    if (searchEntityType) pool = pool.filter(v => (v.companyType || '').toLowerCase() === searchEntityType.toLowerCase());
    return pool;
  }, [allVendors, searchServiceType, searchEntityType]);

  // Existing WOs for the selected vendor
  const vendorExistingWOs = useMemo(() => {
    if (!selectedVendor || isEdit) return [];
    const vendorId = selectedVendor._id || selectedVendor.id;
    return allWorkOrders.filter(wo => wo.vendorId === vendorId);
  }, [selectedVendor, allWorkOrders, isEdit]);

  const showExistingWOPanel = !isEdit && selectedVendor && !proceedToCreate;

  /** Get a human-readable payment status for a WO */
  function getWOPaymentStatus(wo) {
    if (wo.type === 'Periodic') {
      const paid = (wo.paidPeriods || []).length;
      const total = wo.numberOfPeriods || 0;
      return `${paid}/${total} periods paid`;
    }
    const paid = parseFloat(wo.paidGrossAmount) || 0;
    const total = parseFloat(wo.amount) || 0;
    if (paid <= 0) return 'No payments yet';
    if (paid >= total) return 'Fully paid';
    return `${fmtINR(paid)} / ${fmtINR(total)} paid`;
  }

  const handleServiceTypeChange = (val) => {
    setSearchServiceType(val);
    setSearchEntityType('');
    setSelectedVendor(null);
  };

  const handleEntityTypeChange = (val) => {
    setSearchEntityType(val);
    setSelectedVendor(null);
  };

  const handleVendorSelect = (_, vendor) => {
    if (!vendor) {
      setSelectedVendor(null);
      setForm((p) => ({ ...p, vendorId: '', workOrderNumber: '' }));
      setProceedToCreate(false);
      return;
    }
    setSelectedVendor(vendor);
    setProceedToCreate(false);
    if (vendor.vendorType) setSearchServiceType(vendor.vendorType);
    if (vendor.companyType) setSearchEntityType(vendor.companyType);
    const woNum = isEdit ? form.workOrderNumber : generateWorkOrderNumber(vendor.vendorType, vendor.vendorName, allWorkOrders);
    setForm((p) => ({ ...p, vendorId: vendor._id || vendor.id, workOrderNumber: woNum }));
    if (errors.vendorId) setErrors((prev) => ({ ...prev, vendorId: '' }));
  };

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (field === 'amountPerPeriod' || field === 'numberOfPeriods') {
      setConfirmed(false);
    }
  };

  const setType = (_, val) => {
    if (!val) return;
    setForm((p) => ({ ...p, type: val }));
    setConfirmed(false);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.amount;
      delete next.amountPerPeriod;
      delete next.numberOfPeriods;
      delete next.confirmed;
      return next;
    });
  };

  // Check if this WO has any payments (used for lock/unlock logic)
  const hasPayments = isEdit && (
    (parseFloat(workOrder?.paidGrossAmount) || 0) > 0 ||
    (workOrder?.paidPeriods || []).length > 0
  );
  const paidAmount = parseFloat(workOrder?.paidGrossAmount) || 0;
  const paidPeriodsCount = (workOrder?.paidPeriods || []).length;
  // Permanently lock if payments have been batched (status is Partially Paid or Fully Paid)
  const isBatchedLock = isEdit && ['Partially Paid', 'Fully Paid'].includes(workOrder?.status);
  const amountLocked = isBatchedLock || (hasPayments && !amountUnlocked);

  const periodicTotal =
    form.type === 'Periodic' && form.amountPerPeriod && form.numberOfPeriods
      ? Number(form.amountPerPeriod) * Number(form.numberOfPeriods)
      : 0;

  const fmtINR = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(n) || 0);

  const validate = () => {
    const newErrors = {};
    if (!form.vendorId) newErrors.vendorId = 'Select a vendor first';
    const v = selectedVendor || {};
    if (!v.accountNumber || !v.ifscCode || !v.bankName) {
      newErrors.vendorId = 'Vendor bank details (bank name, account number, IFSC) are incomplete. Please update the vendor first.';
    }
    if (!form.serviceDescription.trim()) newErrors.serviceDescription = 'Description is required';
    if (form.type === 'Fixed') {
      if (!form.amount || Number(form.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
      else if (hasPayments && Number(form.amount) < paidAmount)
        newErrors.amount = `Amount cannot be less than ${fmtINR(paidAmount)} (already paid)`;
    } else {
      if (!form.amountPerPeriod || Number(form.amountPerPeriod) <= 0)
        newErrors.amountPerPeriod = 'Amount per period is required';
      if (!form.numberOfPeriods || Number(form.numberOfPeriods) <= 0)
        newErrors.numberOfPeriods = 'Number of periods is required';
      if (hasPayments && Number(form.numberOfPeriods) < paidPeriodsCount)
        newErrors.numberOfPeriods = `Cannot be less than ${paidPeriodsCount} (already paid)`;
      if (periodicTotal > 0 && hasPayments && periodicTotal < paidAmount)
        newErrors.amountPerPeriod = `Total cannot be less than ${fmtINR(paidAmount)} (already paid)`;
      if (periodicTotal > 0 && !confirmed)
        newErrors.confirmed = 'Please confirm the total before saving';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const totalAmount = form.type === 'Periodic'
      ? periodicTotal
      : Number(form.amount);

    // Save A-to-Z vendor details for future template generation
    const v = selectedVendor || {};
    const payload = {
      workOrderNumber: form.workOrderNumber,
      vendorId: form.vendorId,
      // Vendor identity
      vendorName: v.vendorName || '',
      vendorType: v.vendorType || '',
      companyType: v.companyType || '',
      contactPerson: v.contactPerson || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      contactPinCode: v.contactPinCode || '',
      // Compliance
      panNumber: v.panNumber || '',
      gstNumber: v.gstNumber || '',
      tdsType: v.tdsType || '',
      tdsRate: Number(form.tdsRate) || 0,
      tdsComment: form.tdsComment || '',
      // Bank details
      bankName: v.bankName || '',
      accountNumber: v.accountNumber || '',
      ifscCode: v.ifscCode || '',
      accountType: v.accountType || '',
      bankPinCode: v.bankPinCode || '',
      // WO fields
      type: form.type,
      amount: totalAmount,
      serviceDescription: form.serviceDescription,
      status: 'Issued',
      ...(form.type === 'Periodic' && {
        amountPerPeriod: Number(form.amountPerPeriod),
        numberOfPeriods: Number(form.numberOfPeriods),
        paidPeriods: form.paidPeriods || [],
      }),
      ...(form.type === 'Fixed' && {
        paidGrossAmount: form.paidGrossAmount || 0,
      }),
    };
    onSave(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2.5, maxHeight: '92vh', bgcolor: '#f8fafc' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, bgcolor: '#f8fafc' }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            {isEdit ? 'Edit Work Order' : 'New Work Order'}
          </Typography>
          {!isEdit && !selectedVendor && (
            <Typography variant="caption" color="text.secondary">
              Step 1: Search and select a vendor to create a work order
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3, bgcolor: '#f8fafc' }}>

        {/* ── VENDOR IDENTITY (edit mode or after proceed) ── */}
        {(isEdit || proceedToCreate) && selectedVendor && (
          <Box sx={{ ...cardSx, bgcolor: '#fffbeb', border: '1px solid #fde68a' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1e293b', mb: 1 }}>
              {selectedVendor.vendorName}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {selectedVendor.vendorType && (
                <Chip label={selectedVendor.vendorType} size="small" sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }} />
              )}
              {selectedVendor.companyType && (
                <Chip label={selectedVendor.companyType} size="small" sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }} />
              )}
              {selectedVendor.panNumber && (
                <Chip label={`PAN: ${selectedVendor.panNumber.toUpperCase()}`} size="small" sx={{ fontWeight: 700, fontSize: '0.82rem', bgcolor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', fontFamily: 'monospace' }} />
              )}
            </Stack>
          </Box>
        )}

        {/* ── 1. VENDOR SEARCH — only in Add mode, before proceeding ── */}
        {!isEdit && !proceedToCreate && <Box sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2 }}>
            <FilterIcon sx={{ fontSize: 18, color: '#5B63D3' }} />
            <Typography variant="caption" sx={{
              fontWeight: 700, color: '#5B63D3', fontSize: '0.85rem',
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              Find Vendor
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {/* Row 1: Service Type | Entity Type */}
            <FormControl fullWidth size="small">
              <Typography component="label" sx={labelSx}>Service Type</Typography>
              <Select
                value={searchServiceType}
                onChange={(e) => handleServiceTypeChange(e.target.value)}
                displayEmpty
                renderValue={(val) => val || <em style={{ color: '#94a3b8' }}>All service types</em>}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>All service types</em></MenuItem>
                {serviceTypeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <Typography component="label" sx={labelSx}>Entity Type</Typography>
              <Select
                value={searchEntityType}
                onChange={(e) => handleEntityTypeChange(e.target.value)}
                displayEmpty
                renderValue={(val) => val || <em style={{ color: '#94a3b8' }}>All entity types</em>}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>All entity types</em></MenuItem>
                {entityTypeOptions.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.85rem' }}>{t}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Row 2: Vendor Name (full width) */}
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography component="label" sx={labelSx}>Vendor Name *</Typography>
              <Autocomplete
                options={filteredVendors}
                getOptionLabel={(opt) => opt.vendorName || ''}
                isOptionEqualToValue={(opt, val) => (opt._id || opt.id) === (val._id || val.id)}
                filterOptions={(options, { inputValue }) => {
                  if (inputValue.trim() === '') return options;
                  const q = inputValue.toLowerCase();
                  // Filter vendors whose name starts with the typed text
                  const filtered = options.filter((o) =>
                    o.vendorName?.toLowerCase().startsWith(q)
                  );
                  // If no startsWith match, also try includes & search ALL vendors
                  if (filtered.length === 0) {
                    const fromAll = allVendors.filter((o) =>
                      o.vendorName?.toLowerCase().includes(q) ||
                      o.contactPerson?.toLowerCase().includes(q)
                    );
                    return fromAll;
                  }
                  return filtered;
                }}
                value={selectedVendor}
                onChange={handleVendorSelect}
                onInputChange={(_, val) => setVendorInputValue(val)}
                noOptionsText="No vendor found — ask admin to add them first"
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={option._id || option.id} {...otherProps}
                      sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f3f4f6',
                        '&:hover': { backgroundColor: '#f5f3ff !important' } }}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{option.vendorName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.vendorType}
                          {option.companyType ? ` · ${option.companyType}` : ''}
                          {option.state ? ` · ${option.state}` : ''}
                          {option.city ? `, ${option.city}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Type to search vendor name..."
                    error={!!errors.vendorId}
                    helperText={errors.vendorId}
                    sx={inputSx}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                          {params.InputProps?.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                slotProps={autocompleteSlotProps}
              />
            </Box>
          </Box>
        </Box>}

        {/* ── EXISTING WOs PANEL — shown after vendor select, before form ── */}
        {showExistingWOPanel && (
          <Box sx={cardSx}>
            <Typography sx={{ ...secHeaderSx, color: '#475569' }}>
              Existing Work Orders
            </Typography>

            {vendorExistingWOs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px dashed #e2e8f0' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  No previous work orders found for {selectedVendor.vendorName}.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<NewWOIcon />}
                  onClick={() => setProceedToCreate(true)}
                  sx={{
                    textTransform: 'none', fontWeight: 600, bgcolor: '#FDE68A',
                    color: '#1e293b', borderRadius: 1.5, px: 3, boxShadow: 'none',
                    '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
                  }}
                >
                  Create New Work Order
                </Button>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  {vendorExistingWOs.map((wo) => (
                    <Box
                      key={wo.id || wo._id}
                      sx={{
                        p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b', lineHeight: 1.4 }}>
                          {wo.serviceDescription || 'No description'}
                        </Typography>
                        {onOpenWO && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<OpenIcon sx={{ fontSize: 14 }} />}
                            onClick={() => { onClose(); onOpenWO(wo); }}
                            sx={{
                              textTransform: 'none', fontWeight: 600, fontSize: '0.82rem',
                              borderColor: '#e2e8f0', color: '#475569', borderRadius: 1.5,
                              flexShrink: 0, whiteSpace: 'nowrap', py: 0.5,
                              '&:hover': { borderColor: '#94a3b8', bgcolor: '#fff' },
                            }}
                          >
                            Open
                          </Button>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={wo.type === 'Periodic' ? 'Periodic' : 'Fixed'}
                          size="small"
                          sx={{
                            fontWeight: 600, fontSize: '0.8rem',
                            bgcolor: wo.type === 'Periodic' ? '#f0fdf4' : '#eef2ff',
                            color: wo.type === 'Periodic' ? '#15803d' : '#4338ca',
                            border: `1px solid ${wo.type === 'Periodic' ? '#bbf7d0' : '#c7d2fe'}`,
                          }}
                        />
                        <Chip
                          label={wo.type === 'Periodic'
                            ? `${fmtINR(wo.amountPerPeriod)} × ${wo.numberOfPeriods}`
                            : fmtINR(wo.amount)}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
                        />
                        <Chip
                          label={getWOPaymentStatus(wo)}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                        />
                        <Chip
                          label={wo.status || 'Issued'}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<NewWOIcon />}
                  onClick={() => setProceedToCreate(true)}
                  sx={{
                    textTransform: 'none', fontWeight: 600, bgcolor: '#FDE68A',
                    color: '#1e293b', borderRadius: 1.5, py: 1.25, boxShadow: 'none',
                    '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
                  }}
                >
                  + Create New Work Order
                </Button>
              </>
            )}
          </Box>
        )}

        {selectedVendor && (isEdit || proceedToCreate) && (
          <>
            {/* ── WO NUMBER ── */}
            {form.workOrderNumber && (
              <Box sx={{ ...cardSx, bgcolor: '#eef2ff', border: '1px solid #a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.82rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Work Order Number
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: '#4338ca', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {form.workOrderNumber}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b', maxWidth: 200, textAlign: 'right' }}>
                  Auto-generated from service type + vendor name
                </Typography>
              </Box>
            )}

            {/* ── 2. TYPE TOGGLE ── */}
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>Work Order Type</Typography>
              <ToggleButtonGroup
                value={form.type}
                exclusive
                onChange={setType}
                fullWidth
                size="small"
                sx={{ '& .MuiToggleButton-root': { borderRadius: 1.5, textTransform: 'none', fontWeight: 600, py: 1.25 } }}
              >
                <ToggleButton
                  value="Fixed"
                  sx={{ '&.Mui-selected': { bgcolor: '#eef2ff', color: '#4338ca', borderColor: '#a5b4fc' } }}
                >
                  <FixedIcon fontSize="small" sx={{ mr: 1 }} /> One Time
                </ToggleButton>
                <ToggleButton
                  value="Periodic"
                  sx={{ '&.Mui-selected': { bgcolor: '#f0fdf4', color: '#16a34a', borderColor: '#86efac' } }}
                >
                  <PeriodicIcon fontSize="small" sx={{ mr: 1 }} /> Periodic
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {form.type === 'Fixed'
                  ? 'Single fixed amount — total is the amount you enter.'
                  : 'Multiple payments — total = amount per period × number of periods.'}
              </Typography>
            </Box>

            {/* ── 3. AMOUNT ── */}
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>
                {form.type === 'Fixed' ? 'Amount' : 'Periodic Amount'}
              </Typography>

              {/* Payment lock banner */}
              {(hasPayments || isBatchedLock) && (
                <Alert
                  severity={isBatchedLock ? 'error' : amountUnlocked ? 'warning' : 'info'}
                  icon={<LockIcon fontSize="small" />}
                  sx={{ mb: 2, borderRadius: 1.5 }}
                  action={
                    !isBatchedLock ? (
                      <Button
                        size="small"
                        color={amountUnlocked ? 'warning' : 'info'}
                        onClick={() => setAmountUnlocked(!amountUnlocked)}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        {amountUnlocked ? 'Lock' : 'Unlock'}
                      </Button>
                    ) : undefined
                  }
                >
                  <Typography variant="body2" fontWeight={600}>
                    {form.type === 'Fixed'
                      ? `${fmtINR(paidAmount)} of ${fmtINR(workOrder?.amount)} paid`
                      : `${paidPeriodsCount} of ${workOrder?.numberOfPeriods} periods paid (${fmtINR(paidAmount)})`
                    }
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isBatchedLock
                      ? 'Amount is permanently locked — payments have been sent for processing.'
                      : amountUnlocked
                        ? `Amount cannot be set below ${fmtINR(paidAmount)}`
                        : 'Amount is locked because payments exist. Click Unlock to edit.'
                    }
                  </Typography>
                </Alert>
              )}

              {form.type === 'Fixed' ? (
                <Box>
                  <Typography component="label" sx={labelSx}>Total Amount (₹) *</Typography>
                  <TextField
                    size="small" fullWidth type="number" sx={inputSx}
                    placeholder="e.g. 100000"
                    inputProps={{ min: 1 }}
                    value={form.amount}
                    onChange={(e) => set('amount', e.target.value)}
                    error={!!errors.amount}
                    helperText={errors.amount}
                    disabled={amountLocked}
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                  <Box>
                    <Typography component="label" sx={labelSx}>Amount / Period (₹) *</Typography>
                    <TextField
                      size="small" fullWidth type="number" sx={inputSx}
                      placeholder="e.g. 15000"
                      inputProps={{ min: 1 }}
                      value={form.amountPerPeriod}
                      onChange={(e) => set('amountPerPeriod', e.target.value)}
                      error={!!errors.amountPerPeriod}
                      helperText={errors.amountPerPeriod}
                      disabled={amountLocked}
                    />
                  </Box>
                  <Box>
                    <Typography component="label" sx={labelSx}>No. of Periods *</Typography>
                    <TextField
                      size="small" fullWidth type="number" sx={inputSx}
                      placeholder="e.g. 6"
                      inputProps={{ min: 1 }}
                      value={form.numberOfPeriods}
                      onChange={(e) => set('numberOfPeriods', e.target.value)}
                      error={!!errors.numberOfPeriods}
                      helperText={errors.numberOfPeriods}
                      disabled={amountLocked}
                    />
                  </Box>
                </Box>
              )}
            </Box>

            {/* ── 4. TDS ── */}
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>TDS (Tax Deducted at Source)</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2.5 }}>
                <Box>
                  <Typography component="label" sx={labelSx}>TDS Rate (%) *</Typography>
                  <TextField
                    size="small" fullWidth type="number" sx={inputSx}
                    placeholder="e.g. 2"
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    value={form.tdsRate}
                    onChange={(e) => set('tdsRate', e.target.value)}
                  />
                </Box>
                <Box>
                  <Typography component="label" sx={labelSx}>TDS Type / Section</Typography>
                  <TextField
                    size="small" fullWidth sx={inputSx}
                    placeholder="e.g. Sec 194C – Contractor"
                    value={form.tdsComment}
                    onChange={(e) => set('tdsComment', e.target.value)}
                  />
                </Box>
              </Box>
              {form.tdsRate > 0 && (
                <Alert severity="info" icon={<InfoIcon fontSize="small" />} sx={{ mt: 2, borderRadius: 1.5 }}>
                  <Typography variant="body2">
                    <strong>{form.tdsRate}% TDS</strong> will be deducted when raising payments for this work order.
                    {form.tdsComment && <> — {form.tdsComment}</>}
                  </Typography>
                </Alert>
              )}
            </Box>

            {/* ── 5. CONFIRM TOTAL (Periodic only) ── */}
            {form.type === 'Periodic' && periodicTotal > 0 && (
              <Box sx={cardSx}>
                <Alert
                  icon={<InfoIcon fontSize="small" />}
                  severity="info"
                  sx={{ borderRadius: 1.5, mb: 1.5 }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    {fmtINR(form.amountPerPeriod)} × {form.numberOfPeriods} periods
                    {' = '}
                    <span style={{ fontSize: '1.1rem', color: '#0369a1' }}>{fmtINR(periodicTotal)}</span>
                    {' total'}
                  </Typography>
                </Alert>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={confirmed}
                      onChange={(e) => {
                        setConfirmed(e.target.checked);
                        if (errors.confirmed) setErrors((prev) => ({ ...prev, confirmed: '' }));
                      }}
                      sx={{ color: errors.confirmed ? '#dc2626' : undefined }}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={600} sx={{ color: errors.confirmed ? '#dc2626' : '#334155' }}>
                      I confirm this total is correct
                    </Typography>
                  }
                />
                {errors.confirmed && (
                  <Typography variant="caption" sx={{ color: '#dc2626', ml: 4 }}>
                    {errors.confirmed}
                  </Typography>
                )}
              </Box>
            )}

            {/* ── 6. DESCRIPTION ── */}
            <Box sx={cardSx}>
              <Typography sx={secHeaderSx}>Description</Typography>
              <Box>
                <Typography component="label" sx={labelSx}>Work Order Description *</Typography>
                <TextField
                  size="small" fullWidth multiline minRows={3} sx={inputSx}
                  placeholder={`Describe the specific work for ${selectedVendor.vendorName}...`}
                  value={form.serviceDescription}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, serviceDescription: e.target.value.slice(0, 30) }));
                    if (errors.serviceDescription) setErrors((prev) => ({ ...prev, serviceDescription: '' }));
                  }}
                  error={!!errors.serviceDescription}
                  helperText={errors.serviceDescription || `${form.serviceDescription.length}/30 — bank narration limit`}
                  inputProps={{ maxLength: 30 }}
                />
              </Box>
            </Box>

            {/* ── 7. VENDOR DETAILS (add mode only — edit shows compact card at top) ── */}
            {!isEdit && <Box sx={{ ...cardSx, bgcolor: '#fffbeb', border: '1px solid #fde68a', mb: 0 }}>
              <Typography sx={{ ...secHeaderSx, color: '#92400e' }}>Vendor Details</Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
                <Box>
                  <Typography component="label" sx={{ ...labelSx, color: '#92400e' }}>Vendor Name</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedVendor.vendorName}</Typography>
                </Box>
                {selectedVendor.panNumber && (
                  <Box>
                    <Typography component="label" sx={{ ...labelSx, color: '#92400e' }}>PAN</Typography>
                    <Box sx={{
                      display: 'inline-block', px: 1, py: 0.2,
                      bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 1,
                      fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700,
                      color: '#c2410c', letterSpacing: '0.08em',
                    }}>
                      {selectedVendor.panNumber.toUpperCase()}
                    </Box>
                  </Box>
                )}
                <Box>
                  <Typography component="label" sx={{ ...labelSx, color: '#92400e' }}>TDS Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedVendor.tdsType || 'None'}</Typography>
                </Box>
              </Box>

              {/* Bank Details */}
              {(selectedVendor.bankName || selectedVendor.accountNumber) && (
                <>
                  <Divider sx={{ mb: 2, borderColor: '#fde68a' }} />
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#92400e', display: 'block', mb: 1.5 }}>
                    Bank Details
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    {selectedVendor.bankName && (
                      <Box>
                        <Typography component="label" sx={{ ...labelSx, color: '#92400e' }}>Bank</Typography>
                        <Typography variant="body2" fontWeight={600}>{selectedVendor.bankName}</Typography>
                      </Box>
                    )}
                    {selectedVendor.accountNumber && (
                      <Box>
                        <Typography component="label" sx={{ ...labelSx, color: '#92400e' }}>Account Number</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                          {selectedVendor.accountNumber}
                        </Typography>
                      </Box>
                    )}
                    {selectedVendor.ifscCode && (
                      <Box>
                        <Typography component="label" sx={{ ...labelSx, color: '#92400e' }}>IFSC Code</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                          {selectedVendor.ifscCode}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </Box>}
          </>
        )}

        {/* Placeholder when no vendor selected */}
        {!selectedVendor && !errors.vendorId && (
          <Box sx={{
            textAlign: 'center', py: 4, bgcolor: '#f8fafc',
            border: '1px dashed #cbd5e1', borderRadius: 2,
          }}>
            <Typography variant="body2" color="text.secondary">
              Select a vendor above to continue
            </Typography>
          </Box>
        )}

      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0',
            color: '#475569', borderRadius: 1.5, px: 3,
            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
          }}
        >
          Cancel
        </Button>
        {(isEdit || proceedToCreate) && (
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              textTransform: 'none', fontWeight: 600, bgcolor: '#FDE68A',
              color: '#1e293b', borderRadius: 1.5, px: 4, boxShadow: 'none',
              '&:hover': { bgcolor: '#FCD34D', boxShadow: 'none' },
              '&:disabled': { bgcolor: '#f1f5f9', color: '#94a3b8' },
            }}
          >
            {saving ? 'Saving...' : isEdit ? 'Update Work Order' : 'Save Work Order'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default WorkOrderModal;
