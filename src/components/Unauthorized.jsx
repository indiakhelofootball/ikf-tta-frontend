// src/components/Unauthorized.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'var(--yellow-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Paper
        elevation={2}
        sx={{ p: 5, maxWidth: 440, width: '100%', textAlign: 'center' }}
      >
        {/* Icon */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <GppBadOutlinedIcon sx={{ fontSize: 40, color: '#EF4444' }} />
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 900, color: '#111827', mb: 1 }}>
          Access Denied
        </Typography>

        <Typography variant="body1" sx={{ color: '#5B6270', mb: 4, lineHeight: 1.6 }}>
          You don't have permission to access this page. Please contact your
          administrator if you believe this is an error.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{
              borderColor: '#E5E7EB',
              color: '#374151',
              '&:hover': { borderColor: '#D1D5DB', bgcolor: '#F9FAFB' },
            }}
          >
            Go Back
          </Button>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
          >
            Dashboard
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
