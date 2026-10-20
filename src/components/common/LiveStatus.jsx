import React from 'react';
import { Stack, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

// One line under a page title saying how current its list is, with a Refresh
// button. A failed check is said out loud: the list stays on screen, but it is
// no longer presented as current (never-show-stale-data; tracker P1).
export default function LiveStatus({ checkedAt, failed, onRefresh, refreshing }) {
  const time = checkedAt
    ? checkedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;
  return (
    <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
      {failed ? (
        <Typography role="status" sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#b45309' }}>
          {time
            ? `Couldn't check for updates since ${time}. This list may be out of date.`
            : "Couldn't check for updates. This list may be out of date."}
        </Typography>
      ) : (
        <Typography role="status" sx={{ fontSize: '0.78rem', color: '#64748b' }}>
          {time ? `Up to date as of ${time}` : 'Checking for updates…'}
        </Typography>
      )}
      <Tooltip title="Check for updates now">
        <span>
          <IconButton size="small" onClick={onRefresh} disabled={refreshing} aria-label="Refresh list">
            {refreshing ? <CircularProgress size={14} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
