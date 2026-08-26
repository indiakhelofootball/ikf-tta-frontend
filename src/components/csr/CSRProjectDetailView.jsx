import React from 'react';
import { Box, Typography, Divider, Stack, Chip, Tooltip } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

import { certificateFreezeState } from './csrContractRules';

// The grant's place in the TTA catalogue: the same project-name + season pair
// TTA uses everywhere else. Both halves are optional and independently so —
// grants raised before the link existed carry neither — so whatever is present
// is shown and the caller decides how to say "nothing yet".
export function ttaProjectIdentity(project) {
  if (!project) return '';
  return [project.ttaProjectName, project.season].filter(Boolean).join(' · ');
}

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
  const freeze = certificateFreezeState(project);
  const identity = ttaProjectIdentity(project);

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
        <Field label="TTA Project">
          {identity ? (
            <Typography variant="body2">{identity}</Typography>
          ) : (
            // Not a dash. Every grant raised before this link existed is
            // unlinked, and a bare em dash would read as a bug on all of them —
            // this says which state it is and that a person has to resolve it.
            <Typography variant="body2" color="text.secondary">
              Not linked yet
            </Typography>
          )}
        </Field>
        <Field label="Client / Funder" value={project.clientName} />
        <Field label="Sanctioned" value={amount} />
        <Field label="Status" value={project.status} />
        <Field label="Start" value={project.startDate} />
        <Field label="End" value={project.endDate} />
        <Field label="Certificate">
          <Tooltip title={freeze.description}>
            <Chip
              size="small"
              label={freeze.label}
              icon={freeze.frozen ? <LockIcon fontSize="small" /> : undefined}
              color={freeze.frozen ? 'default' : 'success'}
              variant={freeze.frozen ? 'filled' : 'outlined'}
            />
          </Tooltip>
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
