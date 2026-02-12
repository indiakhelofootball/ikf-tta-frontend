// src/components/error/ErrorBoundaryWrapper.jsx
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { logError } from '../../utils/errorLogger';

/**
 * Compact Error Fallback for Component-Level Errors
 */
function ComponentErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        textAlign: 'center',
        bgcolor: '#fef2f2',
        borderColor: '#fecaca',
      }}
    >
      <Typography variant="h6" color="error.main" gutterBottom>
        ⚠️ Component Error
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This component failed to load
      </Typography>
      {process.env.NODE_ENV === 'development' && (
        <Typography
          variant="caption"
          component="pre"
          sx={{
            display: 'block',
            textAlign: 'left',
            p: 1,
            bgcolor: 'white',
            borderRadius: 1,
            mb: 2,
            overflow: 'auto',
            fontFamily: 'monospace',
          }}
        >
          {error.message}
        </Typography>
      )}
      <Button
        variant="outlined"
        size="small"
        startIcon={<RefreshIcon />}
        onClick={resetErrorBoundary}
      >
        Retry
      </Button>
    </Paper>
  );
}

/**
 * Reusable Error Boundary Wrapper
 * 
 * Usage:
 * <ErrorBoundaryWrapper>
 *   <YourComponent />
 * </ErrorBoundaryWrapper>
 */
function ErrorBoundaryWrapper({ children, fallback }) {
  return (
    <ErrorBoundary
      FallbackComponent={fallback || ComponentErrorFallback}
      onError={logError}
      onReset={() => {
        // Reset any component state if needed
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundaryWrapper;