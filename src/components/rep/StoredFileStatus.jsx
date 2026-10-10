// The two owner-approved states for a REP file that is fetched on open:
// loading, and a failed load with a Retry that refetches only that file.
import React from 'react';
import { Stack, CircularProgress, Typography, Button } from '@mui/material';

export function FileLoading({ label }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" role="status" sx={{ py: 0.5 }}>
      <CircularProgress size={16} />
      <Typography sx={{ fontSize: '0.85rem', color: '#475569' }}>{label}</Typography>
    </Stack>
  );
}

export function FileLoadFailed({ label, onRetry }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" role="alert" sx={{ py: 0.5 }}>
      <Typography sx={{ fontSize: '0.85rem', color: 'error.main' }}>{label}</Typography>
      <Button size="small" onClick={onRetry} sx={{ textTransform: 'none', fontWeight: 600 }}>
        Retry
      </Button>
    </Stack>
  );
}
