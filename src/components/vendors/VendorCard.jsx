// src/components/vendors/VendorCard.jsx

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Box,
  Button,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as ViewIcon,
  VerifiedUser as VerifyIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccountBalance as BankIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { VENDOR_STATUS_COLORS } from './vendorConstants';

function VendorCard({ vendor, onEdit, onViewDetails, onVerify }) {
  const isRep = vendor.isRepSourced;
  const statusStyle = VENDOR_STATUS_COLORS[vendor.status] || VENDOR_STATUS_COLORS.Pending;

  const getDocIcon = (verified) =>
    verified ? (
      <CheckCircleIcon sx={{ fontSize: 20, color: '#22c55e' }} />
    ) : (
      <PendingIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
    );

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        borderColor: '#e2e8f0',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderColor: '#cbd5e1' },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header: Name + Status */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1e293b', lineHeight: 1.3 }}>
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
              height: 24,
              ml: 1,
              flexShrink: 0,
            }}
          />
        </Stack>

        {/* Vendor Type */}
        <Chip
          label={vendor.vendorType}
          size="small"
          variant="outlined"
          sx={{
            alignSelf: 'flex-start',
            mb: 2,
            fontWeight: 500,
            fontSize: '0.7rem',
            borderColor: '#5B63D3',
            color: '#5B63D3',
            height: 24,
          }}
        />

        {/* Document Verification */}
        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', mb: 1, display: 'block' }}>
          DOCUMENT VERIFICATION
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <Box
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: 1.5,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {getDocIcon(vendor.gstVerified)}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>GST</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                {vendor.gstNumber || 'N/A'}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: 1.5,
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {getDocIcon(vendor.panVerified)}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>PAN</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.7rem' }}>
                {vendor.panNumber || 'N/A'}
              </Typography>
            </Box>
          </Box>
        </Stack>

        {/* Contact Info */}
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={3}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PersonIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
              <Typography variant="caption" color="text.secondary">{vendor.contactPerson || 'N/A'}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PhoneIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
              <Typography variant="caption" color="text.secondary">{vendor.phone || 'N/A'}</Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={3}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <EmailIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
              <Typography variant="caption" color="text.secondary" noWrap>{vendor.email || 'N/A'}</Typography>
            </Stack>
            {vendor.bankName && (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <BankIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                <Typography variant="caption" color="text.secondary">{vendor.bankName}</Typography>
              </Stack>
            )}
          </Stack>
        </Stack>

        <Box sx={{ mt: 'auto' }}>
          <Divider sx={{ mb: 2 }} />

          {/* Actions */}
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ViewIcon fontSize="small" />}
              onClick={() => onViewDetails(vendor)}
              sx={{
                flex: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderColor: '#e2e8f0',
                color: '#475569',
                borderRadius: 1.5,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
              }}
            >
              View Details
            </Button>
            {!isRep && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon fontSize="small" />}
                onClick={() => onEdit(vendor)}
                sx={{
                  flex: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  borderRadius: 1.5,
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                }}
              >
                Edit
              </Button>
            )}
            {isRep && (
              <Typography
                variant="caption"
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  fontSize: '0.7rem',
                }}
              >
                Edit via REP Management
              </Typography>
            )}
            {!isRep && vendor.status === 'Pending' && (
              <Button
                size="small"
                variant="contained"
                startIcon={<VerifyIcon fontSize="small" />}
                onClick={() => onVerify(vendor)}
                sx={{
                  flex: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  bgcolor: '#5B63D3',
                  borderRadius: 1.5,
                  '&:hover': { bgcolor: '#4A52C2' },
                }}
              >
                Verify
              </Button>
            )}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export default VendorCard;
