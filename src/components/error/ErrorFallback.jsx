// src/components/error/ErrorFallback.jsx
import React from 'react';
import { Box, Container, Typography, Button, Paper, Stack } from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fafafa',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <ErrorIcon
            sx={{
              fontSize: 80,
              color: 'error.main',
              mb: 2,
            }}
          />

          <Typography variant="h4" fontWeight={700} gutterBottom>
            Oops! Something went wrong
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We're sorry for the inconvenience. The application encountered an unexpected error.
          </Typography>

          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && error && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                bgcolor: '#fef2f2',
                borderColor: '#fecaca',
                textAlign: 'left',
              }}
            >
              <Typography variant="caption" fontWeight={600} color="error.main" display="block" gutterBottom>
                Error Details (Development Only):
              </Typography>
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'error.dark',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                }}
              >
                {error.message}
              </Typography>
            </Paper>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={resetErrorBoundary}
              sx={{
                bgcolor: '#5B63D3',
                '&:hover': {
                  bgcolor: '#4A52C2',
                },
              }}
            >
              Try Again
            </Button>

            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => {
                window.location.href = '/dashboard';
              }}
            >
              Go to Dashboard
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            If this problem persists, please contact support.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default ErrorFallback;