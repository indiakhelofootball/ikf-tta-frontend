import React from 'react';
import { Box, Typography, Divider, Stack } from '@mui/material';

function Field({ label, value }) {
  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export default function CSRProjectDetailView({ project }) {
  if (!project) return null;
  const amount =
    project.sanctionedAmount != null
      ? `₹${Number(project.sanctionedAmount).toLocaleString('en-IN')}`
      : '—';

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
        <Field label="Client / Funder" value={project.clientName} />
        <Field label="Sanctioned" value={amount} />
        <Field label="Status" value={project.status} />
        <Field label="Start" value={project.startDate} />
        <Field label="End" value={project.endDate} />
        <Field label="Work Order" value={project.workOrderId ? `#${project.workOrderId}` : null} />
      </Stack>
    </Box>
  );
}
