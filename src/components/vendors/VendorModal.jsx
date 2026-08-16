// src/components/vendors/VendorModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Grid, Button, Checkbox,
  FormControlLabel, IconButton, Divider, CircularProgress,
  Select, MenuItem, FormControl, Stack, Autocomplete, Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { vendorsAPI } from '../../services/api';
import { getVendorTypeNames, getEntityTypeNames, getFilteredVendorNames, getBankNamesList, getAccountTypesList } from '../../utils/adminStorage';
import useConfigVersion from '../../hooks/useConfigVersion';
import { getStateFromPinCode, getCitiesForState, INDIAN_STATES } from '../../utils/pinCodeToState';

const initialFormData = {
  vendorName: '', vendorType: '', companyType: '', entityName: '',
  gstNumber: '', panNumber: '',
  gstVerified: false, panVerified: false,
  contactPerson: '', phone: '', email: '', address: '', contactPinCode: '',
  state: '', city: '',
  bankName: '', accountHolderName: '', accountNumber: '', accountType: '', ifscCode: '',
  bankPinCode: '', branchAddress: '',
};

/* ── Style constants ── */
const sectionSx = {
  color: '#5B63D3', fontWeight: 700, mb: 2,
  textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: '0.75rem',
};
const fLabelSx = { mb: 0.5, display: 'block', fontWeight: 600, color: '#64748b', fontSize: '0.8rem' };
const fLabelDisabledSx = { ...fLabelSx, color: '#5A6B82' };
const disabledSx = { opacity: 0.45, pointerEvents: 'none', filter: 'grayscale(30%)' };
const inputSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.5 } };
const selectSx = { borderRadius: 1.5 };
const menuMaxH = { PaperProps: { sx: { maxHeight: 300 } } };

function VendorModal({ open, onClose, onSave, vendor, saving, vendors = [] }) {
  const isEdit = !!vendor;

  /* ── Search state ── */
  const [searchServiceType, setSearchServiceType] = useState('');
  const [searchEntityType, setSearchEntityType] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);

  /* ── Form state ── */
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [panCardImage, setPanCardImage] = useState(null);
  const [panCardImagePreview, setPanCardImagePreview] = useState(null);
  const [fileError, setFileError] = useState('');
  const [confirmedVendorName, setConfirmedVendorName] = useState('');

  const formActive = isEdit || !!confirmedVendorName;
  const lSx = formActive ? fLabelSx : fLabelDisabledSx;

  // cfgVersion — the config cache fills in after mount and used to notify nobody.
  const cfgVersion = useConfigVersion();
  const banks = useMemo(() => getBankNamesList(), [cfgVersion]);
  const accountTypeOptions = useMemo(() => getAccountTypesList(), [cfgVersion]);

  useEffect(() => {
    if (open) {
      if (vendor) { populateForm(vendor); }
      else {
        setFormData(initialFormData); setPanCardImage(null); setPanCardImagePreview(null);
        setSelectedVendor(null); setConfirmedVendorName('');
        setSearchServiceType(''); setSearchEntityType('');
        setSearchState(''); setSearchCity('');
      }
      setErrors({}); setFileError('');
    }
  }, [vendor, open]);

  const populateForm = (v) => {
    setFormData({
      vendorName: v.vendorName || '', vendorType: v.vendorType || '',
      companyType: v.companyType || '', entityName: v.entityName || '',
      gstNumber: v.gstNumber || '', panNumber: v.panNumber || '',
      tdsType: v.tdsType || 'None',  gstVerified: v.gstVerified || false,
      panVerified: v.panVerified || false, contactPerson: v.contactPerson || '',
      phone: v.phone || '', email: v.email || '', address: v.address || '',
      contactPinCode: v.contactPinCode || '', state: v.state || '', city: v.city || '',
      bankName: v.bankName || '', accountHolderName: v.accountHolderName || '',
      accountNumber: v.accountNumber || '',
      accountType: v.accountType || '', ifscCode: v.ifscCode || '',
      bankPinCode: v.bankPinCode || '', branchAddress: v.branchAddress || '',
    });
    setPanCardImagePreview(v.panCardImageUrl || null);
    setPanCardImage(null);
  };

  /* ── Search logic ── */
  // Get admin vendor names filtered by current search filters
  // Items with no serviceType/entityType match all (they're "Any")
  const adminVendorNames = useMemo(() => {
    const all = getFilteredVendorNames(null, null); // get all
    return all.filter(item => {
      const matchesService = !item.serviceType || !searchServiceType || item.serviceType === searchServiceType;
      const matchesEntity = !item.entityType || !searchEntityType || item.entityType === searchEntityType;
      return matchesService && matchesEntity;
    }).map(item => item.name);
  }, [searchServiceType, searchEntityType, cfgVersion]);
  const serviceTypeOptions = useMemo(() => getVendorTypeNames(), [cfgVersion]);
  const entityTypeOptions = useMemo(() => getEntityTypeNames(), [cfgVersion]);

  const filteredVendors = useMemo(() => {
    let pool = [...vendors];
    if (searchServiceType) pool = pool.filter(v => v.vendorType === searchServiceType);
    if (searchEntityType) pool = pool.filter(v => v.companyType === searchEntityType);
    if (searchState) pool = pool.filter(v => v.state === searchState);
    if (searchCity) pool = pool.filter(v => v.city === searchCity);
    return pool;
  }, [vendors, searchServiceType, searchEntityType, searchState, searchCity]);

  const searchCityOptions = useMemo(() => {
    if (!searchState) return [];
    let pool = [...vendors];
    if (searchServiceType) pool = pool.filter(v => v.vendorType === searchServiceType);
    if (searchEntityType) pool = pool.filter(v => v.companyType === searchEntityType);
    pool = pool.filter(v => v.state === searchState);
    const fromVendors = [...new Set(pool.map(v => v.city).filter(Boolean))];
    const staticCities = getCitiesForState(searchState);
    return [...new Set([...fromVendors, ...staticCities])].sort();
  }, [vendors, searchServiceType, searchEntityType, searchState]);

  const resetVendorSelection = () => {
    setSelectedVendor(null); setConfirmedVendorName('');
    setFormData(initialFormData); setPanCardImage(null); setPanCardImagePreview(null);
  };

  const handleServiceTypeChange = (val) => { setSearchServiceType(val); setSearchEntityType(''); setSearchState(''); setSearchCity(''); resetVendorSelection(); };
  const handleEntityTypeChange = (val) => { setSearchEntityType(val); setSearchState(''); setSearchCity(''); resetVendorSelection(); };
  const handleSearchStateChange = (val) => { setSearchState(val); setSearchCity(''); resetVendorSelection(); };
  const handleSearchCityChange = (val) => { setSearchCity(val); resetVendorSelection(); };


  /* ── PIN → State auto-fill ── */
  useEffect(() => {
    const pin = formData.contactPinCode;
    if (pin && pin.length === 6 && /^[1-9]\d{5}$/.test(pin)) {
      const derived = getStateFromPinCode(pin);
      if (derived && derived !== formData.state) setFormData(prev => ({ ...prev, state: derived }));
    }
  }, [formData.contactPinCode]);

  /* ── Form handlers ── */
  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const update = { [field]: value };
    // Auto-uncheck verified if the number is cleared
    if (field === 'gstNumber' && !value.trim()) update.gstVerified = false;
    if (field === 'panNumber' && !value.trim()) update.panVerified = false;
    setFormData(prev => ({ ...prev, ...update }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handlePanCardUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return; setFileError('');
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') { setFileError('PAN card must be an image (PNG/JPG) or PDF'); e.target.value = ''; return; }
    if (file.size > 3 * 1024 * 1024) { setFileError('PAN card file must be less than 3MB'); e.target.value = ''; return; }
    setPanCardImage(file);
    const r = new FileReader();
    r.onloadend = () => setPanCardImagePreview(r.result);
    r.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePanCard = () => { setPanCardImage(null); setPanCardImagePreview(null); setFileError(''); };

  const validate = () => {
    const e = {};
    if (!formData.panNumber.trim()) e.panNumber = 'PAN number is required';
    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(formData.panNumber.trim())) e.panNumber = 'Invalid PAN format (e.g. AABCU9603R)';
    if (formData.gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(formData.gstNumber.trim())) e.gstNumber = 'Invalid GST format (e.g. 27AABCU9603R1ZM)';
    if (!formData.contactPerson.trim()) e.contactPerson = 'Contact person is required';
    if (!formData.phone.trim()) e.phone = 'Phone is required';
    else { const d = formData.phone.replace(/\D/g, ''); if (d.length !== 10) e.phone = 'Phone must be exactly 10 digits'; else if (!/^[6-9]/.test(d)) e.phone = 'Phone must start with 6-9'; }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email';
    if (formData.ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifscCode.trim())) e.ifscCode = 'Invalid IFSC format (e.g. SBIN0001234)';
    if (formData.contactPinCode.trim() && !/^[1-9][0-9]{5}$/.test(formData.contactPinCode.trim())) e.contactPinCode = 'Invalid PIN code (must be 6 digits)';
    if (formData.bankPinCode.trim() && !/^[1-9][0-9]{5}$/.test(formData.bankPinCode.trim())) e.bankPinCode = 'Invalid PIN code (must be 6 digits)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      ...formData,
      vendorName: isEdit ? formData.vendorName : confirmedVendorName,
      vendorType: isEdit ? formData.vendorType : searchServiceType,
      companyType: isEdit ? formData.companyType : searchEntityType,
      status: 'Verified',
    };
    if (panCardImage) {
      data.panCardImageName = panCardImage.name;
      data.panCardImageUrl = panCardImagePreview;
    } else if (isEdit) {
      data.panCardImageName = vendor?.panCardImageName || '';
      data.panCardImageUrl = vendor?.panCardImageUrl || '';
    }
    const vendorId = vendor?._id || vendor?.id || selectedVendor?._id || selectedVendor?.id;
    onSave(data, vendorId);
  };

  const isPanCardPdf = panCardImagePreview && !panCardImagePreview.startsWith('data:image');

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2.5, maxHeight: '92vh' } }}>

      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
          {isEdit ? 'Edit Vendor' : 'Add Vendor'}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>

        {/* ══════════ SEARCH SECTION ══════════ */}
        {!isEdit && (
          <>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2 }}>
              <FilterIcon sx={{ fontSize: 16, color: '#5B63D3' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#5B63D3', fontSize: '0.7rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Find Vendor
              </Typography>
            </Stack>

            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
              {/* Row 1: Service Type | Entity Type */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ ...fLabelSx, fontSize: '0.75rem' }}>Service Type</Typography>
                  <FormControl fullWidth size="small">
                    <Select value={searchServiceType} onChange={(e) => handleServiceTypeChange(e.target.value)}
                      displayEmpty renderValue={(v) => v || <em style={{ color: '#5A6B82' }}>All service types</em>}
                      sx={selectSx} MenuProps={menuMaxH}>
                      <MenuItem value=""><em>All service types</em></MenuItem>
                      {serviceTypeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ ...fLabelSx, fontSize: '0.75rem' }}>Entity Type</Typography>
                  <FormControl fullWidth size="small">
                    <Select value={searchEntityType} onChange={(e) => handleEntityTypeChange(e.target.value)}
                      displayEmpty renderValue={(v) => v || <em style={{ color: '#5A6B82' }}>All entity types</em>}
                      sx={selectSx} MenuProps={menuMaxH}>
                      <MenuItem value=""><em>All entity types</em></MenuItem>
                      {entityTypeOptions.map(t => <MenuItem key={t} value={t} sx={{ fontSize: '0.85rem' }}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Row 2: Vendor Name (full width) */}
              <Box>
                <Typography variant="caption" sx={{ ...fLabelSx, fontSize: '0.75rem' }}>Vendor Name *</Typography>
                <Autocomplete freeSolo
                  options={(() => {
                    const existingNames = new Set(filteredVendors.map(v => v.vendorName?.toLowerCase()));
                    const newNameOptions = adminVendorNames
                      .filter(n => !existingNames.has(n.toLowerCase()))
                      .map(n => ({ _isAdminName: true, vendorName: n }));
                    return [...filteredVendors, ...newNameOptions];
                  })()}
                  getOptionLabel={(o) => (typeof o === 'string' ? o : o.vendorName || '')}
                  value={selectedVendor}
                  onChange={(e, value) => {
                    if (!value) { resetVendorSelection(); }
                    else if (typeof value === 'string') {
                      setSelectedVendor(null); setConfirmedVendorName(value.trim());
                      setFormData({ ...initialFormData, vendorName: value.trim() });
                      setPanCardImage(null); setPanCardImagePreview(null);
                    } else if (value._isAdminName) {
                      setSelectedVendor(null); setConfirmedVendorName(value.vendorName);
                      setFormData({ ...initialFormData, vendorName: value.vendorName });
                      setPanCardImage(null); setPanCardImagePreview(null);
                    } else {
                      setSelectedVendor(value); setConfirmedVendorName(value.vendorName);
                      populateForm(value);
                    }
                  }}
                  isOptionEqualToValue={(opt, val) => {
                    if (opt._isAdminName && val._isAdminName) return opt.vendorName === val.vendorName;
                    return (opt._id || opt.id) === (val._id || val.id);
                  }}
                  filterOptions={(options, { inputValue }) => {
                    if (!inputValue.trim()) return options;
                    const q = inputValue.toLowerCase();
                    return options.filter(o =>
                      o.vendorName?.toLowerCase().includes(q) ||
                      o.contactPerson?.toLowerCase().includes(q)
                    );
                  }}
                  noOptionsText="No vendor found — ask admin to add them first"
                  renderOption={(props, option) => {
                    const { key, ...rest } = props;
                    if (option._isAdminName) {
                      return (
                        <Box component="li" key={`admin-${option.vendorName}`} {...rest}
                          sx={{ py: 1, px: 2, borderBottom: '1px solid #f3f4f6', '&:hover': { backgroundColor: '#f0fdf4 !important' } }}>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{option.vendorName}</Typography>
                            <Typography variant="caption" sx={{ color: '#16a34a' }}>New vendor (from admin list)</Typography>
                          </Box>
                        </Box>
                      );
                    }
                    return (
                      <Box component="li" key={option._id || option.id} {...rest}
                        sx={{ py: 1, px: 2, borderBottom: '1px solid #f3f4f6', '&:hover': { backgroundColor: '#f5f3ff !important' } }}>
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
                    <TextField {...params} size="small" placeholder="Type to search or enter new vendor name..." sx={inputSx} />
                  )}
                  slotProps={{ popper: { sx: { zIndex: 1500 } } }}
                />
              </Box>
            </Box>

            {/* Status card */}
            {confirmedVendorName ? (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>
                      {confirmedVendorName.charAt(0).toUpperCase()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#1e293b' }}>{confirmedVendorName}</Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      {searchServiceType && (
                        <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>{searchServiceType}</Typography>
                      )}
                      {searchServiceType && searchEntityType && (
                        <Typography variant="caption" sx={{ color: '#5A6B82' }}>·</Typography>
                      )}
                      {searchEntityType && (
                        <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>{searchEntityType}</Typography>
                      )}
                      {!searchServiceType && !searchEntityType && (
                        <Typography variant="caption" sx={{ color: '#5B6270' }}>
                          {selectedVendor ? 'Existing vendor' : 'New vendor'}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ mb: 2, p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #e2e8f0' }}>
                <SearchIcon sx={{ fontSize: 28, color: '#cbd5e1', mb: 0.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Select or enter a vendor name above to proceed
                </Typography>
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {/* ══════════ FORM SECTION ══════════ */}
        <Box sx={formActive ? {} : disabledSx}>

          {fileError && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#dc2626' }}>{fileError}</Typography>
            </Box>
          )}

          {/* ── DOCUMENTS ── */}
          <Typography variant="subtitle2" sx={sectionSx}>DOCUMENTS</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="caption" sx={lSx}>GST Number</Typography>
              <TextField fullWidth size="small" placeholder="27AABCU9603R1ZX"
                value={formData.gstNumber} onChange={handleChange('gstNumber')}
                error={!!errors.gstNumber} helperText={errors.gstNumber} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>PAN Number *</Typography>
              <TextField fullWidth size="small" placeholder="AABCU9603R"
                value={formData.panNumber} onChange={handleChange('panNumber')}
                error={!!errors.panNumber} helperText={errors.panNumber} disabled={!formActive}
                inputProps={{ style: { textTransform: 'uppercase' } }} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>PAN Card Upload</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button component="label" variant="outlined" startIcon={<UploadIcon />} size="small"
                  disabled={!formActive} sx={{ borderRadius: 1.5, textTransform: 'none' }}>
                  Choose File
                  <input type="file" hidden accept="image/*,.pdf" onChange={handlePanCardUpload} />
                </Button>
                {panCardImagePreview && (
                  isPanCardPdf ? (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ p: 0.5, bgcolor: '#f0f9ff', borderRadius: 1, flex: 1, minWidth: 0 }}>
                      <FileIcon fontSize="small" color="primary" />
                      <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: '0.7rem' }}>{panCardImage?.name || vendor?.panCardImageName || 'PAN document attached'}</Typography>
                      <IconButton size="small" onClick={handleRemovePanCard}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                  ) : (
                    <Box sx={{ position: 'relative' }}>
                      <Box component="img" src={panCardImagePreview} alt="PAN"
                        sx={{ width: 60, height: 36, objectFit: 'cover', border: '1px solid #e5e7eb', borderRadius: 1 }} />
                      <IconButton size="small" onClick={handleRemovePanCard}
                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'white', p: 0.25, '&:hover': { bgcolor: '#fee2e2' } }}>
                        <DeleteIcon sx={{ fontSize: 14 }} color="error" />
                      </IconButton>
                    </Box>
                  )
                )}
              </Box>
            </Box>
            <Box>
              <FormControlLabel disabled={!formActive || !formData.gstNumber.trim()}
                control={<Checkbox checked={formData.gstVerified} onChange={handleChange('gstVerified')} sx={{ '&.Mui-checked': { color: '#5B63D3' } }} />}
                label={<Typography variant="body2" fontWeight={500} sx={{ color: formData.gstNumber.trim() ? '#334155' : '#cbd5e1' }}>GST Verified</Typography>} />
            </Box>
            <Box>
              <FormControlLabel disabled={!formActive || !formData.panNumber.trim()}
                control={<Checkbox checked={formData.panVerified} onChange={handleChange('panVerified')} sx={{ '&.Mui-checked': { color: '#5B63D3' } }} />}
                label={<Typography variant="body2" fontWeight={500} sx={{ color: formData.panNumber.trim() ? '#334155' : '#cbd5e1' }}>PAN Verified</Typography>} />
            </Box>
          </Box>

          {/* ── CONTACT DETAILS ── */}
          <Typography variant="subtitle2" sx={sectionSx}>CONTACT DETAILS</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
            <Box>
              <Typography variant="caption" sx={lSx}>Contact Person *</Typography>
              <TextField fullWidth size="small" placeholder="Enter contact person name"
                value={formData.contactPerson} onChange={handleChange('contactPerson')}
                error={!!errors.contactPerson} helperText={errors.contactPerson} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>Phone *</Typography>
              <TextField fullWidth size="small" placeholder="Enter phone number"
                value={formData.phone} onChange={handleChange('phone')}
                error={!!errors.phone} helperText={errors.phone} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>Email</Typography>
              <TextField fullWidth size="small" placeholder="Enter email address"
                value={formData.email} onChange={handleChange('email')}
                error={!!errors.email} helperText={errors.email} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>Pin Code</Typography>
              <TextField fullWidth size="small" placeholder="e.g. 400001"
                value={formData.contactPinCode} onChange={handleChange('contactPinCode')}
                error={!!errors.contactPinCode} helperText={errors.contactPinCode} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>State</Typography>
              <Autocomplete options={INDIAN_STATES} value={formData.state || null}
                onChange={(_, val) => setFormData(prev => ({ ...prev, state: val || '', city: '' }))}
                disabled={!formActive}
                renderInput={(params) => <TextField {...params} size="small" placeholder="Auto from PIN" sx={inputSx} />}
                slotProps={{ popper: { sx: { zIndex: 1500 } } }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>City / Area</Typography>
              <Autocomplete freeSolo options={getCitiesForState(formData.state)}
                value={formData.city || null}
                onChange={(_, val) => setFormData(prev => ({ ...prev, city: typeof val === 'string' ? val : val || '' }))}
                onInputChange={(_, val, reason) => { if (reason === 'input') setFormData(prev => ({ ...prev, city: val })); }}
                disabled={!formActive}
                renderInput={(params) => <TextField {...params} size="small" placeholder={formData.state ? 'Select or type city' : 'Select state first'} sx={inputSx} />}
                slotProps={{ popper: { sx: { zIndex: 1500 } } }} />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="caption" sx={lSx}>Address</Typography>
              <TextField fullWidth size="small" multiline rows={2} placeholder="Enter address"
                value={formData.address} onChange={handleChange('address')} disabled={!formActive} sx={inputSx} />
            </Box>
          </Box>

          {/* ── BANK DETAILS ── */}
          <Typography variant="subtitle2" sx={sectionSx}>
            BANK DETAILS{formData.panNumber && (
              <Typography component="span" sx={{
                fontWeight: 600, fontSize: '0.85rem', color: '#334155',
                textTransform: 'none', letterSpacing: 0, ml: 1
              }}>
                — linked to PAN {formData.panNumber.toUpperCase()}
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={lSx}>Bank Name</Typography>
              <Autocomplete options={banks} value={formData.bankName || null}
                onChange={(_, v) => setFormData(prev => ({ ...prev, bankName: v || '' }))}
                disabled={!formActive}
                renderInput={(params) => <TextField {...params} size="small" placeholder="Select bank" sx={inputSx} />}
                slotProps={{ popper: { sx: { zIndex: 1500 } } }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>Account Type</Typography>
              <FormControl fullWidth size="small">
                <Select value={formData.accountType} onChange={handleChange('accountType')}
                  displayEmpty disabled={!formActive}
                  renderValue={(v) => v || <em style={{ color: '#5A6B82' }}>Select account type</em>}
                  sx={selectSx}>
                  <MenuItem value=""><em>None</em></MenuItem>
                  {accountTypeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>Account Holder Name</Typography>
              <TextField fullWidth size="small" placeholder="Name as per bank account"
                value={formData.accountHolderName} onChange={handleChange('accountHolderName')} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>Account Number</Typography>
              <TextField fullWidth size="small" placeholder="Enter account number"
                value={formData.accountNumber} onChange={handleChange('accountNumber')} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>IFSC Code</Typography>
              <TextField fullWidth size="small" placeholder="e.g. SBIN0001234"
                value={formData.ifscCode} onChange={handleChange('ifscCode')}
                error={!!errors.ifscCode} helperText={errors.ifscCode} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>Branch Pin Code</Typography>
              <TextField fullWidth size="small" placeholder="e.g. 400001"
                value={formData.bankPinCode} onChange={handleChange('bankPinCode')}
                error={!!errors.bankPinCode} helperText={errors.bankPinCode} disabled={!formActive} sx={inputSx} />
            </Box>
            <Box>
              <Typography variant="caption" sx={lSx}>Branch Address</Typography>
              <TextField fullWidth size="small" placeholder="Enter branch address"
                value={formData.branchAddress} onChange={handleChange('branchAddress')} disabled={!formActive} sx={inputSx} />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined"
          sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569', borderRadius: 1.5, px: 3, '&:hover': { borderColor: '#5A6B82', bgcolor: '#f8fafc' } }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !formActive}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#FDE68A', borderRadius: 1.5, px: 4, '&:hover': { bgcolor: '#FCD34D' } }}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VendorModal;
