// src/components/vendors/VendorDetailView.jsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  Stack,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { VENDOR_STATUS_COLORS } from './vendorConstants';

function VendorDetailView({ open, onClose, vendor, onEdit }) {
  if (!vendor) return null;

  const isRep = vendor.isRepSourced;
  const statusStyle = VENDOR_STATUS_COLORS[vendor.status] || VENDOR_STATUS_COLORS.Pending;

  const sectionSx = {
    p: 2.5,
    bgcolor: '#f8fafc',
    borderRadius: 2,
    border: '1px solid #e2e8f0',
    mb: 2.5,
  };

  const sectionLabelSx = {
    fontWeight: 700,
    color: '#64748b',
    fontSize: '0.7rem',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    mb: 1.5,
  };

  const getDocChip = (label, value, verified) => (
    <Stack direction="row" spacing={1} alignItems="center">
      {verified ? (
        <CheckCircleIcon sx={{ fontSize: 18, color: '#22c55e' }} />
      ) : (
        <PendingIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
      )}
      <Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={600}>{value || 'N/A'}</Typography>
      </Box>
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            {vendor.vendorName}
          </Typography>
          <Chip
            label={vendor.status}
            size="small"
            sx={{
              bgcolor: statusStyle.bg,
              color: statusStyle.color,
              border: `1px solid ${statusStyle.border}`,
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Basic Info */}
        <Typography variant="caption" sx={sectionLabelSx}>Basic Information</Typography>
        <Box sx={sectionSx}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Vendor Name</Typography>
              <Typography variant="body2" fontWeight={600}>{vendor.vendorName}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Vendor Type</Typography>
              <Chip
                label={vendor.vendorType}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 500, borderColor: '#5B63D3', color: '#5B63D3' }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Documents */}
        <Typography variant="caption" sx={sectionLabelSx}>Document Verification</Typography>
        <Box sx={sectionSx}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              {getDocChip('GST Number', vendor.gstNumber, vendor.gstVerified)}
            </Grid>
            <Grid item xs={6}>
              {getDocChip('PAN Number', vendor.panNumber, vendor.panVerified)}
            </Grid>
          </Grid>
        </Box>

        {/* Contact */}
        <Typography variant="caption" sx={sectionLabelSx}>Contact Details</Typography>
        <Box sx={sectionSx}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Contact Person</Typography>
              <Typography variant="body2" fontWeight={600}>{vendor.contactPerson || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Phone</Typography>
              <Typography variant="body2" fontWeight={600}>{vendor.phone || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Email</Typography>
              <Typography variant="body2" fontWeight={600}>{vendor.email || 'N/A'}</Typography>
            </Grid>
            {vendor.address && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Address</Typography>
                <Typography variant="body2">{vendor.address}</Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Bank */}
        {(vendor.bankName || vendor.accountNumber || vendor.ifscCode) && (
          <>
            <Typography variant="caption" sx={sectionLabelSx}>Bank Details</Typography>
            <Box sx={sectionSx}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Bank Name</Typography>
                  <Typography variant="body2" fontWeight={600}>{vendor.bankName || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Number</Typography>
                  <Typography variant="body2" fontWeight={600}>{vendor.accountNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">IFSC Code</Typography>
                  <Typography variant="body2" fontWeight={600}>{vendor.ifscCode || 'N/A'}</Typography>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
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
            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
          }}
        >
          Close
        </Button>
        {isRep ? (
          <Typography
            variant="caption"
            sx={{ color: '#94a3b8', fontStyle: 'italic', px: 2 }}
          >
            Edit this vendor from REP Management
          </Typography>
        ) : (
          <Button
            onClick={() => { onClose(); onEdit(vendor); }}
            variant="contained"
            startIcon={<EditIcon fontSize="small" />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#5B63D3',
              borderRadius: 1.5,
              px: 3,
              '&:hover': { bgcolor: '#4A52C2' },
            }}
          >
            Edit Vendor
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default VendorDetailView;
