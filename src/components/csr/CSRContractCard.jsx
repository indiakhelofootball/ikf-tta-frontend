import React, { useState } from 'react';
import {
  Card, CardContent, Box, Typography, Chip, IconButton, Collapse, Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import CSRContractDetailView from './CSRContractDetailView';
import { deliverableRollup, deliverableProgress, formatAmount } from './csrContractRules';

const ROLLUP_COLOR = {
  Completed: 'success',
  'In Progress': 'info',
  Pending: 'warning',
  'No deliverables': 'default',
};

export default function CSRContractCard({
  contract, canEdit, onEdit, onDelete,
  onAddDeliverable, onEditDeliverable, onDeleteDeliverable,
}) {
  const [expanded, setExpanded] = useState(false);
  const rollup = deliverableRollup(contract.deliverables);
  const progress = deliverableProgress(contract.deliverables);

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>
              {contract.reference || contract.title || `Contract #${contract.id}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {[
                contract.reference ? contract.title : null,
                formatAmount(contract.amount),
                progress.total > 0 ? `${progress.completed}/${progress.total} deliverables` : null,
              ].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Chip size="small" label={rollup} color={ROLLUP_COLOR[rollup] || 'default'} />
          {canEdit && (
            <>
              <Tooltip title="Edit">
                <IconButton size="small" aria-label="Edit contract" onClick={() => onEdit(contract)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" aria-label="Delete contract" onClick={() => onDelete(contract)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Toggle contract details"
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
      </CardContent>
      <Collapse in={expanded} unmountOnExit>
        <CSRContractDetailView
          contract={contract}
          canEdit={canEdit}
          onAddDeliverable={onAddDeliverable}
          onEditDeliverable={onEditDeliverable}
          onDeleteDeliverable={onDeleteDeliverable}
        />
      </Collapse>
    </Card>
  );
}
