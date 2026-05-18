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
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccountBalance as BankIcon,
  Delete as DeleteIcon,
  ReceiptLong as StatementIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
// vendorConstants no longer needed here

function VendorCard({ vendor, onEdit, onViewDetails, onDelete, onViewStatement }) {

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
        {/* Header: Name */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1e293b', lineHeight: 1.3, mb: 1.5 }}>
          {vendor.vendorName}
        </Typography>

        {/* Vendor Type */}
        <Chip
          label={vendor.vendorType}
          size="small"
          variant="outlined"
          sx={{
            alignSelf: 'flex-start',
            mb: 2,
            fontWeight: 500,
            fontSize: '0.8rem',
            borderColor: '#5B63D3',
            color: '#5B63D3',
            height: 26,
          }}
        />

        {vendor.entityName && (
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5, mt: -1 }}>
            {vendor.entityName}
          </Typography>
        )}

        {/* PAN / GST */}
        {(vendor.panNumber || vendor.gstNumber) && (
          <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
            {vendor.panNumber && (
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1 }}>PAN</Typography>
                  {vendor.panVerified && <CheckIcon sx={{ fontSize: 12, color: '#22c55e' }} />}
                </Stack>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.82rem', color: '#334155', fontFamily: 'monospace' }}>
                  {vendor.panNumber}
                </Typography>
              </Box>
            )}
            {vendor.gstNumber && (
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1 }}>GST</Typography>
                  {vendor.gstVerified && <CheckIcon sx={{ fontSize: 12, color: '#22c55e' }} />}
                </Stack>
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.82rem', color: '#334155', fontFamily: 'monospace' }}>
                  {vendor.gstNumber}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

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

          {/* Actions — 2×2 grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ViewIcon fontSize="small" />}
              onClick={() => onViewDetails(vendor)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                borderColor: '#e2e8f0',
                color: '#475569',
                borderRadius: 1.5,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
              }}
            >
              View
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => onEdit(vendor)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                borderColor: '#e2e8f0',
                color: '#475569',
                borderRadius: 1.5,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
              }}
            >
              Edit
            </Button>
            {onViewStatement && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<StatementIcon fontSize="small" />}
                onClick={() => onViewStatement(vendor)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  borderColor: '#e2e8f0',
                  color: '#5B63D3',
                  borderRadius: 1.5,
                  '&:hover': { borderColor: '#5B63D3', bgcolor: '#eef2ff' },
                }}
              >
                Statement
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              startIcon={<DeleteIcon fontSize="small" />}
              onClick={() => onDelete(vendor)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                borderColor: '#fecaca',
                color: '#dc2626',
                borderRadius: 1.5,
                '&:hover': { borderColor: '#dc2626', bgcolor: '#fef2f2' },
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default VendorCard;
