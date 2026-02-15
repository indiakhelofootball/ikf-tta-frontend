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
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { VENDOR_TYPES } from './vendorConstants';

const initialFormData = {
  vendorName: '',
  vendorType: 'Other',
  gstNumber: '',
  panNumber: '',
  gstVerified: false,
  panVerified: false,
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
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

  const isEdit = !!vendor;

  useEffect(() => {
    if (vendor) {
      setFormData({
        vendorName: vendor.vendorName || '',
        vendorType: vendor.vendorType || 'Other',
        gstNumber: vendor.gstNumber || '',
        panNumber: vendor.panNumber || '',
        gstVerified: vendor.gstVerified || false,
        panVerified: vendor.panVerified || false,
        contactPerson: vendor.contactPerson || '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        bankName: vendor.bankName || '',
        accountNumber: vendor.accountNumber || '',
        ifscCode: vendor.ifscCode || '',
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [vendor, open]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.vendorName.trim()) newErrors.vendorName = 'Vendor name is required';
    if (!formData.vendorType) newErrors.vendorType = 'Vendor type is required';
    if (!formData.panNumber.trim()) newErrors.panNumber = 'PAN number is required';
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact person is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      ...formData,
      status: vendor?.status || 'Pending',
    });
  };

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
          {isEdit ? 'Edit Vendor' : 'Add New Vendor'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* BASIC INFORMATION */}
        <Typography variant="subtitle2" sx={sectionHeaderSx}>
          BASIC INFORMATION
        </Typography>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Vendor Name *</Typography>
            <TextField
              fullWidth size="small"
              placeholder="Enter vendor name"
              value={formData.vendorName}
              onChange={handleChange('vendorName')}
              error={!!errors.vendorName}
              helperText={errors.vendorName}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={fieldLabelSx}>Vendor Type *</Typography>
            <TextField
              select fullWidth size="small"
              value={formData.vendorType}
              onChange={handleChange('vendorType')}
              error={!!errors.vendorType}
              helperText={errors.vendorType}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            >
              {VENDOR_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
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
          <Grid item xs={12}>
            <Typography variant="caption" sx={fieldLabelSx}>Address</Typography>
            <TextField
              fullWidth size="small" multiline rows={3}
              placeholder="Enter address"
              value={formData.address}
              onChange={handleChange('address')}
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
            <TextField
              fullWidth size="small"
              placeholder="Enter bank name"
              value={formData.bankName}
              onChange={handleChange('bankName')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
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
          <Grid item xs={12}>
            <Typography variant="caption" sx={fieldLabelSx}>IFSC Code</Typography>
            <TextField
              fullWidth size="small"
              placeholder="Enter IFSC code"
              value={formData.ifscCode}
              onChange={handleChange('ifscCode')}
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
            bgcolor: '#5B63D3',
            borderRadius: 1.5,
            px: 4,
            '&:hover': { bgcolor: '#4A52C2' },
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VendorModal;
