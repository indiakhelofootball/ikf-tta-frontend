import React from 'react';
import { Box, Typography, Divider, Stack, Link } from '@mui/material';

function Field({ label, value, children }) {
  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {children ?? <Typography variant="body2">{value || '—'}</Typography>}
    </Box>
  );
}

export default function CSRProjectDetailView({ project }) {
  if (!project) return null;
  const amount =
    project.sanctionedAmount != null
      ? `₹${Number(project.sanctionedAmount).toLocaleString('en-IN')}`
      : '—';
  const woLabel = [
    project.workOrderNumber || `#${project.workOrderId}`,
    project.workOrderVendorName,
  ].filter(Boolean).join(' — ');

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
        <Field label="Client / Funder" value={project.clientName} />
        <Field label="Sanctioned" value={amount} />
        <Field label="Status" value={project.status} />
        <Field label="Start" value={project.startDate} />
        <Field label="End" value={project.endDate} />
        <Field label="Work Order" value={project.workOrderId ? woLabel : ''} />
        <Field label="Contract">
          {project.workOrderContractLink ? (
            <Link
              variant="body2"
              underline="hover"
              href={project.workOrderContractLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open contract ↗
            </Link>
          ) : (
            <Typography variant="body2">—</Typography>
          )}
        </Field>
      </Stack>
      {project.description && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">Description</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{project.description}</Typography>
        </Box>
      )}
    </Box>
  );
}
