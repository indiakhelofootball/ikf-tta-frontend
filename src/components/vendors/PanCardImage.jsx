// src/components/vendors/PanCardImage.jsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import { vendorsAPI } from '../../services/api';

// The vendor list no longer carries the PAN image, so it is fetched when a
// vendor is opened. Only for vendors whose stored PAN is an image: callers
// decide that from hasPanCard / panCardImagePrefix, never by trying to load.
export function usePanCardImage(vendor) {
  const id = vendor ? vendor._id || vendor.id : null;
  const version = vendor?.updatedAt;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading', src: null });

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    let objectUrl = null;
    setState({ status: 'loading', src: null });
    vendorsAPI
      .getPanCard(id, version)
      .then(({ blob }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: 'loaded', src: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', src: null });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, version, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

function PanCardImage({ vendor, alt, imgSx }) {
  const { status, src, retry } = usePanCardImage(vendor);
  const placeSx = {
    minWidth: imgSx.width, minHeight: imgSx.height,
    display: 'flex', alignItems: 'center', pr: 1.5,
  };

  if (status === 'loaded') {
    return <Box component="img" src={src} alt={alt} sx={imgSx} />;
  }
  if (status === 'error') {
    return (
      <Stack direction="row" spacing={1} role="alert" sx={placeSx}>
        <Typography variant="caption" sx={{ color: '#dc2626' }}>
          {"Couldn't load PAN card."}
        </Typography>
        <Button size="small" onClick={retry}
          sx={{ textTransform: 'none', fontWeight: 600, minWidth: 0, color: '#5B63D3' }}>
          Retry
        </Button>
      </Stack>
    );
  }
  return (
    <Stack direction="row" spacing={1} role="status" sx={placeSx}>
      <CircularProgress size={16} sx={{ color: '#5B63D3' }} />
      <Typography variant="caption" sx={{ color: '#5A6B82' }}>Loading PAN card…</Typography>
    </Stack>
  );
}

export default PanCardImage;
