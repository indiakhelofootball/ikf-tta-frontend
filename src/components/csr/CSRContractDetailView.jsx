import React from 'react';
import {
  Box, Typography, Divider, Stack, Link, List, ListItem, ListItemText,
  Chip, IconButton, Button, LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import { deliverableProgress, formatAmount } from './csrContractRules';

function Field({ label, value, children }) {
  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {children ?? <Typography variant="body2">{value || '—'}</Typography>}
    </Box>
  );
}

const STATUS_COLOR = {
  Completed: 'success',
  'In Progress': 'info',
  Pending: 'default',
};

export default function CSRContractDetailView({
  contract, canEdit, onAddDeliverable, onEditDeliverable, onDeleteDeliverable,
}) {
  if (!contract) return null;
  const deliverables = contract.deliverables || [];
  const progress = deliverableProgress(deliverables);

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
        <Field label="Reference" value={contract.reference} />
        <Field label="Title" value={contract.title} />
        <Field label="Amount" value={formatAmount(contract.amount)} />
        <Field label="Start" value={contract.startDate} />
        <Field label="End" value={contract.endDate} />
        <Field label="Document">
          {contract.contractDriveLink ? (
            <Link
              variant="body2"
              underline="hover"
              href={contract.contractDriveLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {contract.contractFileName || 'Open contract'}
            </Link>
          ) : (
            <Typography variant="body2">{contract.contractFileName || '—'}</Typography>
          )}
        </Field>
      </Stack>

      {contract.notes && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">Notes</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{contract.notes}</Typography>
        </Box>
      )}

      <Box sx={{ mt: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1 }}
        >
          <Typography variant="subtitle2">
            Deliverables ({progress.completed} of {progress.total} completed)
          </Typography>
          {canEdit && (
            <Button size="small" startIcon={<AddIcon />} onClick={() => onAddDeliverable(contract)}>
              Add Deliverable
            </Button>
          )}
        </Stack>

        {progress.total > 0 && (
          <LinearProgress
            variant="determinate"
            value={progress.percent}
            aria-label="Deliverable completion"
            // Pill radius comes from the theme; a 24px override on a 6px bar
            // was only ever rounding to the same shape less predictably.
            sx={{ mb: 1, height: 6 }}
          />
        )}

        {deliverables.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No deliverables recorded for this contract.
          </Typography>
        ) : (
          <List dense disablePadding>
            {deliverables.map((d) => {
              return (
                <ListItem
                  key={d.id}
                  disableGutters
                  secondaryAction={canEdit && (
                    <>
                      <IconButton
                        size="small"
                        aria-label={`Edit deliverable ${d.title}`}
                        onClick={() => onEditDeliverable(contract, d)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={`Delete deliverable ${d.title}`}
                        onClick={() => onDeleteDeliverable(d)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                >
                  <ListItemText
                    primary={d.title}
                    secondary={[
                      d.targetCount != null ? `${d.completedCount ?? 0} / ${d.targetCount}` : null,
                      d.dueDate ? `Due ${d.dueDate}` : null,
                      d.description || null,
                    ].filter(Boolean).join(' · ') || null}
                  />
                  <Chip
                    size="small"
                    label={d.status}
                    color={STATUS_COLOR[d.status] || 'default'}
                    sx={{ mr: 1 }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}
