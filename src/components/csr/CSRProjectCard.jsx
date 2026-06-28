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

import CSRProjectDetailView from './CSRProjectDetailView';

export default function CSRProjectCard({ project, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const amount =
    project.sanctionedAmount != null
      ? `₹${Number(project.sanctionedAmount).toLocaleString('en-IN')}`
      : '—';

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>{project.name}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {project.clientName} · {amount}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={project.status}
            color={project.status === 'Active' ? 'success' : 'default'}
          />
          {canEdit && (
            <>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(project)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => onDelete(project)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <IconButton size="small" onClick={() => setExpanded((v) => !v)} aria-label="Toggle details">
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
      </CardContent>
      <Collapse in={expanded} unmountOnExit>
        <CSRProjectDetailView project={project} />
      </Collapse>
    </Card>
  );
}
