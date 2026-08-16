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
  Edit as EditIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import useGrants from '../../auth/useGrants';

function VendorDetailView({ open, onClose, vendor, onEdit }) {
  const { canEdit } = useGrants();
  if (!vendor) return null;

  const isRep = vendor.isRepSourced;

  const sectionSx = {
    p: 2.5,
    bgcolor: '#f8fafc',
    borderRadius: 2,
    border: '1px solid #e2e8f0',
    mb: 2.5,
  };

  const sectionLabelSx = {
    fontWeight: 700,
    color: '#5A6B82',
    fontSize: '0.82rem',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    mb: 1.5,
  };

  const captionSx = { display: 'block', color: '#5A6B82', fontSize: '0.82rem', mb: 0.25 };
  const valueSx = { color: '#334155', lineHeight: 1.6 };

  const isPanCardPdf = vendor.panCardImageUrl && !vendor.panCardImageUrl.startsWith('data:image');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
          {vendor.vendorName}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Basic Info */}
        <Typography variant="caption" sx={sectionLabelSx}>Basic Information</Typography>
        <Box sx={sectionSx}>
          <Grid container spacing={2.5}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={captionSx}>Vendor Name</Typography>
              <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.vendorName}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={captionSx}>Service Type</Typography>
              <Chip
                label={vendor.vendorType || 'N/A'}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 500, borderColor: '#5B63D3', color: '#5B63D3', mt: 0.25 }}
              />
            </Grid>
            {vendor.companyType && (
              <Grid item xs={6}>
                <Typography variant="caption" sx={captionSx}>Company Type</Typography>
                <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.companyType}</Typography>
              </Grid>
            )}
            {vendor.entityName && (
              <Grid item xs={6}>
                <Typography variant="caption" sx={captionSx}>Entity Name</Typography>
                <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.entityName}</Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Documents */}
        {(vendor.gstNumber || vendor.panNumber || vendor.tdsType) && (
          <>
            <Typography variant="caption" sx={sectionLabelSx}>Documents</Typography>
            <Box sx={sectionSx}>
              <Grid container spacing={2.5}>
                {vendor.gstNumber && (
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={captionSx}>GST Number</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ ...valueSx, fontFamily: 'monospace' }}>{vendor.gstNumber}</Typography>
                  </Grid>
                )}
                {vendor.panNumber && (
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={captionSx}>PAN Number</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ ...valueSx, fontFamily: 'monospace' }}>{vendor.panNumber}</Typography>
                  </Grid>
                )}
                {vendor.tdsType && vendor.tdsType !== 'None' && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={captionSx}>TDS Type</Typography>
                    <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.tdsType}</Typography>
                  </Grid>
                )}
                {vendor.panCardImageUrl && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ ...captionSx, mb: 0.5 }}>
                      PAN Card
                    </Typography>
                    {isPanCardPdf ? (
                      <Stack direction="row" spacing={1} alignItems="center"
                        sx={{ p: 1, bgcolor: '#f0f9ff', borderRadius: 1, maxWidth: 260 }}>
                        <FileIcon fontSize="small" color="primary" />
                        <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                          {vendor.panCardImageUrl.length > 30
                            ? vendor.panCardImageUrl.substring(0, 30) + '...'
                            : vendor.panCardImageUrl}
                        </Typography>
                      </Stack>
                    ) : (
                      <Box
                        component="img"
                        src={vendor.panCardImageUrl}
                        alt="PAN Card"
                        sx={{
                          width: 200, height: 100, objectFit: 'cover',
                          border: '1px solid #e5e7eb', borderRadius: 1.5,
                        }}
                      />
                    )}
                  </Grid>
                )}
              </Grid>
            </Box>
          </>
        )}

        {/* Contact */}
        <Typography variant="caption" sx={sectionLabelSx}>Contact Details</Typography>
        <Box sx={sectionSx}>
          <Grid container spacing={2.5}>
            <Grid item xs={6}>
              <Typography variant="caption" sx={captionSx}>Contact Person</Typography>
              <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.contactPerson || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={captionSx}>Phone</Typography>
              <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.phone || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" sx={captionSx}>Email</Typography>
              <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.email || 'N/A'}</Typography>
            </Grid>
            {vendor.address && (
              <Grid item xs={12}>
                <Typography variant="caption" sx={captionSx}>Address</Typography>
                <Typography variant="body2" sx={{ ...valueSx, fontWeight: 400 }}>{vendor.address}</Typography>
              </Grid>
            )}
            {vendor.contactPinCode && (
              <Grid item xs={6}>
                <Typography variant="caption" sx={captionSx}>Pin Code</Typography>
                <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.contactPinCode}</Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Bank */}
        {(vendor.bankName || vendor.accountNumber || vendor.ifscCode || vendor.accountType || vendor.bankPinCode) && (
          <>
            <Typography variant="caption" sx={sectionLabelSx}>
              Bank Details {vendor.panNumber && `(PAN: ${vendor.panNumber})`}
            </Typography>
            <Box sx={sectionSx}>
              <Grid container spacing={2.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={captionSx}>Bank Name</Typography>
                  <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.bankName || 'N/A'}</Typography>
                </Grid>
                {vendor.accountType && (
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={captionSx}>Account Type</Typography>
                    <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.accountType}</Typography>
                  </Grid>
                )}
                <Grid item xs={6}>
                  <Typography variant="caption" sx={captionSx}>Account Holder Name</Typography>
                  <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.accountHolderName || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={captionSx}>Account Number</Typography>
                  <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.accountNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={captionSx}>IFSC Code</Typography>
                  <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.ifscCode || 'N/A'}</Typography>
                </Grid>
                {vendor.bankPinCode && (
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={captionSx}>Branch Pin Code</Typography>
                    <Typography variant="body2" fontWeight={600} sx={valueSx}>{vendor.bankPinCode}</Typography>
                  </Grid>
                )}
                {vendor.branchAddress && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={captionSx}>Branch Address</Typography>
                    <Typography variant="body2" sx={{ ...valueSx, fontWeight: 400 }}>{vendor.branchAddress}</Typography>
                  </Grid>
                )}
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
            '&:hover': { borderColor: '#5A6B82', bgcolor: '#f8fafc' },
          }}
        >
          Close
        </Button>
        {isRep ? (
          <Typography
            variant="caption"
            sx={{ color: '#5A6B82', fontStyle: 'italic', px: 2 }}
          >
            Edit this vendor from REP Management
          </Typography>
        ) : canEdit('vendors') && (
          <Button
            onClick={() => { onClose(); onEdit(vendor); }}
            variant="contained"
            startIcon={<EditIcon fontSize="small" />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#FDE68A',
              borderRadius: 1.5,
              px: 3,
              '&:hover': { bgcolor: '#FCD34D' },
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
