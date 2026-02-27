// src/components/vendors/VendorModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Grid,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Divider,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Autocomplete,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';

const BANKS = ['HDFC Bank'];

const TDS_TYPES = [
  'None',
  'TDS @ 1% (Sec 194C – Contractor)',
  'TDS @ 2% (Sec 194C – Company)',
  'TDS @ 2% (Sec 194I – Rent)',
  'TDS @ 10% (Sec 194J – Professional)',
  'TDS @ 10% (Sec 194H – Commission)',
];

const ACCOUNT_TYPES = [
  'Savings',
  'Current',
  'Overdraft',
  'Cash Credit',
  'Fixed Deposit',
];

const COMPANY_TYPES = [
  'Individual',
  'Sole Proprietorship',
  'Partnership Firm',
  'Private Limited',
  'Public Limited',
  'LLP',
  'One Person Company',
  'HUF',
  'Trust / NGO / Society',
];

const initialFormData = {
  vendorName: '',
  vendorType: '',
  companyType: '',
  gstNumber: '',
  panNumber: '',
  tdsType: 'None',
  gstVerified: false,
  panVerified: false,
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  contactPinCode: '',
  bankName: '',
  accountNumber: '',
  accountType: '',
  ifscCode: '',
  bankPinCode: '',
};

const sectionHeaderSx = {
  color: '#5B63D3',
  fontWeight: 700,
  mb: 2,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  fontSize: '0.75rem',
};

const fieldLabelSx = {
  mb: 0.5,
  display: 'block',
  fontWeight: 600,
  color: '#334155',
  fontSize: '0.8rem',
};

function VendorModal({ open, onClose, onSave, vendor, saving }) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [panCardImage, setPanCardImage] = useState(null);
  const [panCardImagePreview, setPanCardImagePreview] = useState(null);
  const [fileError, setFileError] = useState('');
  const isEdit = !!vendor;

  useEffect(() => {
    if (open) {
      if (vendor) {
        setFormData({
          vendorName: vendor.vendorName || '',
          vendorType: vendor.vendorType || '',
          companyType: vendor.companyType || '',
          gstNumber: vendor.gstNumber || '',
          panNumber: vendor.panNumber || '',
          tdsType: vendor.tdsType || 'None',
          gstVerified: vendor.gstVerified || false,
          panVerified: vendor.panVerified || false,
          contactPerson: vendor.contactPerson || '',
          phone: vendor.phone || '',
          email: vendor.email || '',
          address: vendor.address || '',
          contactPinCode: vendor.contactPinCode || '',
          bankName: vendor.bankName || '',
          accountNumber: vendor.accountNumber || '',
          accountType: vendor.accountType || '',
          ifscCode: vendor.ifscCode || '',
          bankPinCode: vendor.bankPinCode || '',
        });
        if (vendor.panCardImageUrl) {
          setPanCardImagePreview(vendor.panCardImageUrl);
        }
      } else {
        setFormData(initialFormData);
        setPanCardImage(null);
        setPanCardImagePreview(null);
      }
      setErrors({});
      setFileError('');
    }
  }, [vendor, open]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handlePanCardUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError('');

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setFileError('PAN card must be an image (PNG/JPG) or PDF');
      event.target.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setFileError('PAN card file must be less than 3MB');
      event.target.value = '';
      return;
    }

    setPanCardImage(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPanCardImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      // PDF — show filename only
      setPanCardImagePreview(file.name);
    }
    event.target.value = '';
  };

  const handleRemovePanCard = () => {
    setPanCardImage(null);
    setPanCardImagePreview(null);
    setFileError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.vendorName.trim()) newErrors.vendorName = 'Partner name is required';
    if (!formData.panNumber.trim()) {
      newErrors.panNumber = 'PAN number is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(formData.panNumber.trim())) {
      newErrors.panNumber = 'Invalid PAN format (e.g. AABCU9603R)';
    }
    if (formData.gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(formData.gstNumber.trim())) {
      newErrors.gstNumber = 'Invalid GST format (e.g. 27AABCU9603R1ZM)';
    }
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length !== 10) newErrors.phone = 'Phone must be exactly 10 digits';
      else if (!/^[6-9]/.test(digits)) newErrors.phone = 'Phone must start with 6-9';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email';
    }
    if (formData.ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifscCode.trim())) {
      newErrors.ifscCode = 'Invalid IFSC format (e.g. SBIN0001234)';
    }
    if (formData.contactPinCode.trim() && !/^[1-9][0-9]{5}$/.test(formData.contactPinCode.trim())) {
      newErrors.contactPinCode = 'Invalid PIN code (must be 6 digits)';
    }
    if (formData.bankPinCode.trim() && !/^[1-9][0-9]{5}$/.test(formData.bankPinCode.trim())) {
      newErrors.bankPinCode = 'Invalid PIN code (must be 6 digits)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const data = {
      ...formData,
      status: vendor?.status || 'Pending',
    };
    if (panCardImage) {
      data.panCardImageName = panCardImage.name;
      data.panCardImageUrl = panCardImagePreview;
    }
    onSave(data);
  };

  const isPanCardPdf = panCardImagePreview && !panCardImagePreview.startsWith('data:image');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2.5, maxHeight: '90vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
          {isEdit ? 'Edit Partner' : 'Add New Partner'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>

        {fileError && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5 }}>
            <Typography variant="caption" sx={{ color: '#dc2626' }}>{fileError}</Typography>
          </Box>
        )}

        {/* BASIC INFORMATION */}
        <Typography variant="subtitle2" sx={sectionHeaderSx}>
          BASIC INFORMATION
        </Typography>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Partner Name *</Typography>
            <TextField
              fullWidth size="small"
              placeholder="Enter partner name"
              value={formData.vendorName}
              onChange={handleChange('vendorName')}
              error={!!errors.vendorName}
              helperText={errors.vendorName}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Service Type</Typography>
            <TextField
              fullWidth size="small"
              placeholder="e.g. Printing, Logistics, Catering"
              value={formData.vendorType}
              onChange={handleChange('vendorType')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Company Type</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={formData.companyType}
                onChange={handleChange('companyType')}
                displayEmpty
                renderValue={(val) => val || <em style={{ color: '#94a3b8' }}>Select company type</em>}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {COMPANY_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* DOCUMENTS */}
        <Typography variant="subtitle2" sx={sectionHeaderSx}>
          DOCUMENTS
        </Typography>
        <Grid container spacing={2.5} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>GST Number</Typography>
            <TextField
              fullWidth size="small"
              placeholder="27AABCU9603R1ZX"
              value={formData.gstNumber}
              onChange={handleChange('gstNumber')}
              error={!!errors.gstNumber}
              helperText={errors.gstNumber}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>PAN Number *</Typography>
            <TextField
              fullWidth size="small"
              placeholder="AABCU9603R"
              value={formData.panNumber}
              onChange={handleChange('panNumber')}
              error={!!errors.panNumber}
              helperText={errors.panNumber}
              inputProps={{ style: { textTransform: 'uppercase' } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>

          {/* PAN Card Image Upload */}
          <Grid item xs={12}>
            <Typography variant="caption" sx={fieldLabelSx}>PAN Card Upload</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadIcon />}
                size="small"
                sx={{ justifyContent: 'flex-start', borderRadius: 1.5, maxWidth: 180 }}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf"
                  onChange={handlePanCardUpload}
                />
              </Button>
              {panCardImagePreview && (
                isPanCardPdf ? (
                  <Stack direction="row" spacing={1} alignItems="center"
                    sx={{ p: 1, bgcolor: '#f0f9ff', borderRadius: 1.5, maxWidth: 280 }}>
                    <FileIcon fontSize="small" color="primary" />
                    <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }}>
                      {typeof panCardImagePreview === 'string' && panCardImagePreview.length > 30
                        ? panCardImagePreview.substring(0, 30) + '...'
                        : panCardImagePreview}
                    </Typography>
                    <IconButton size="small" onClick={handleRemovePanCard}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ) : (
                  <Box sx={{ position: 'relative', width: 200 }}>
                    <Box
                      component="img"
                      src={panCardImagePreview}
                      alt="PAN Card"
                      sx={{
                        width: 200, height: 100, objectFit: 'cover',
                        border: '1px solid #e5e7eb', borderRadius: 1.5,
                        bgcolor: '#f9fafb',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemovePanCard}
                      sx={{
                        position: 'absolute', top: 4, right: 4,
                        bgcolor: 'white', '&:hover': { bgcolor: '#fee2e2' },
                      }}
                    >
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                )
              )}
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Upload PAN card image or PDF (max 3MB)
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" sx={fieldLabelSx}>TDS Type</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={formData.tdsType}
                onChange={handleChange('tdsType')}
                sx={{ borderRadius: 1.5 }}
              >
                {TDS_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.gstVerified}
                  onChange={handleChange('gstVerified')}
                  sx={{ '&.Mui-checked': { color: '#5B63D3' } }}
                />
              }
              label={<Typography variant="body2" fontWeight={500}>GST Verified</Typography>}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.panVerified}
                  onChange={handleChange('panVerified')}
                  sx={{ '&.Mui-checked': { color: '#5B63D3' } }}
                />
              }
              label={<Typography variant="body2" fontWeight={500}>PAN Verified</Typography>}
            />
          </Grid>
        </Grid>

        {/* CONTACT DETAILS */}
        <Typography variant="subtitle2" sx={{ ...sectionHeaderSx, mt: 2 }}>
          CONTACT DETAILS
        </Typography>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Contact Person *</Typography>
            <TextField
              fullWidth size="small"
              placeholder="Enter contact person name"
              value={formData.contactPerson}
              onChange={handleChange('contactPerson')}
              error={!!errors.contactPerson}
              helperText={errors.contactPerson}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Phone *</Typography>
            <TextField
              fullWidth size="small"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={handleChange('phone')}
              error={!!errors.phone}
              helperText={errors.phone}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" sx={fieldLabelSx}>Email *</Typography>
            <TextField
              fullWidth size="small"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <Typography variant="caption" sx={fieldLabelSx}>Address</Typography>
            <TextField
              fullWidth size="small" multiline rows={3}
              placeholder="Enter address"
              value={formData.address}
              onChange={handleChange('address')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" sx={fieldLabelSx}>Pin Code</Typography>
            <TextField
              fullWidth size="small"
              placeholder="e.g. 400001"
              value={formData.contactPinCode}
              onChange={handleChange('contactPinCode')}
              error={!!errors.contactPinCode}
              helperText={errors.contactPinCode}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
        </Grid>

        {/* BANK DETAILS */}
        <Typography variant="subtitle2" sx={sectionHeaderSx}>
          BANK DETAILS
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Bank Name</Typography>
            <Autocomplete
              options={BANKS}
              value={formData.bankName || null}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, bankName: newValue || '' }))}
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder="Select bank"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }} />
              )}
              slotProps={{ popper: { sx: { zIndex: 1500 } } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Account Type</Typography>
            <FormControl fullWidth size="small">
              <Select
                value={formData.accountType}
                onChange={handleChange('accountType')}
                displayEmpty
                renderValue={(val) => val || <em style={{ color: '#94a3b8' }}>Select account type</em>}
                sx={{ borderRadius: 1.5 }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {ACCOUNT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Account Number</Typography>
            <TextField
              fullWidth size="small"
              placeholder="Enter account number"
              value={formData.accountNumber}
              onChange={handleChange('accountNumber')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>IFSC Code</Typography>
            <TextField
              fullWidth size="small"
              placeholder="e.g. SBIN0001234"
              value={formData.ifscCode}
              onChange={handleChange('ifscCode')}
              error={!!errors.ifscCode}
              helperText={errors.ifscCode}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Branch Pin Code</Typography>
            <TextField
              fullWidth size="small"
              placeholder="e.g. 400001"
              value={formData.bankPinCode}
              onChange={handleChange('bankPinCode')}
              error={!!errors.bankPinCode}
              helperText={errors.bankPinCode}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderColor: '#e2e8f0',
            color: '#475569',
            borderRadius: 1.5,
            px: 3,
            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: '#FDE68A',
            borderRadius: 1.5,
            px: 4,
            '&:hover': { bgcolor: '#FCD34D' },
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VendorModal;
